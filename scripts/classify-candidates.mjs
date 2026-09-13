// Stage 2 of ingestion: judge DIRECTION for candidates already matched to a
// capability. Stage 1 (fetch-openalex.mjs) answers "what is this paper about";
// this answers "does it improve the capability, degrade it, or merely measure
// it -- and does it contradict a claim already in the catalog".
//
//   node scripts/classify-candidates.mjs --dry-run          # print a prompt, spend nothing
//   node scripts/classify-candidates.mjs --limit 10         # classify 10, report cost
//   node scripts/classify-candidates.mjs --capability sycophancy
//   node scripts/classify-candidates.mjs                    # everything unclassified
//
// Costs real money. Defaults to --limit 10 so a stray run cannot bill the
// whole queue; pass --all to lift the cap deliberately.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { loadCatalog } from "./catalog-lib.mjs";

const MODEL = "claude-opus-5";
// Per-MTok rates for MODEL, used only to report what a run cost.
const PRICE_IN = 5.0, PRICE_OUT = 25.0;
const QUEUE_DIR = "pipeline/queue";

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes("--dry-run");
const onlyCapability = arg("capability");
const limit = args.includes("--all") ? Infinity : Number(arg("limit") ?? 10);
// Between API calls. Nothing waits on a nightly job, and a steady trickle is
// far cheaper than discovering a rate limit 40 calls into a paid batch.
const delayMs = Number(arg("delay") ?? 1000);

const Verdict = z.object({
  about_capability: z.boolean()
    .describe("True only if the paper is genuinely ABOUT this capability per its scope boundary, not merely mentioning it."),
  direction: z.enum(["improves", "degrades", "measures", "not_applicable"])
    .describe("improves: reports a technique/change that makes models better at it. degrades: reports something that makes models worse, including a side effect of a fix. measures: characterizes or benchmarks it without proposing or breaking anything. not_applicable: when about_capability is false."),
  contradicts_claim_id: z.string()
    .describe("Id of an existing catalog claim this paper's findings contradict, or empty string if none. Only fill this when the paper genuinely cuts against the claim, not merely when it discusses the same topic."),
  supports_claim_id: z.string()
    .describe("Id of an existing catalog claim this paper's findings corroborate, or empty string if none."),
  scope_condition: z.string()
    .describe("The conditions under which the finding holds -- model class, task family, setup. Empty string if the paper does not state one."),
  rationale: z.string().describe("One sentence, grounded in the abstract, justifying the direction."),
  confidence: z.enum(["high", "medium", "low"]),
});

const SYSTEM = `You triage new papers for a personal research index that tracks what AI
models are good and bad at.

The index is organized by capability. For each capability it holds claims:
directional, scoped statements about what is true of models, each backed by
sources. Your job is to judge a single paper against a single capability.

Two judgments matter most, and both are easy to get wrong by being too generous:

1. Is the paper genuinely ABOUT this capability? Use the capability's scope
   boundary. A paper that applies models inside some domain, and mentions the
   capability in passing while benchmarking, is NOT about it. Say so.

2. Does it contradict an existing claim? Only when the finding genuinely cuts
   against what the claim asserts. Discussing the same topic is not
   contradiction. A paper reporting that a known fix has a side effect DOES
   contradict a claim that the fix simply works.

Prefer "measures" for the many papers that benchmark or characterize without
proposing a change or reporting a regression. Reserve "degrades" for real
evidence something makes models worse, including the side-effect case.
Be conservative: an empty claim id is a better answer than a wrong one.`;

function buildPrompt(candidate, capability, claims) {
  const claimBlock = claims.length
    ? claims.map((c) => {
        const contested = c.contested ? " [already marked contested]" : "";
        return `- id: ${c.id}${contested}\n  ${c.statement.replace(/\s+/g, " ").trim()}`;
      }).join("\n")
    : "(no claims recorded for this capability yet)";

  return `## Capability: ${capability.label} (${capability.id})

${capability.summary}

### Scope boundary
${capability.discriminator ?? "(none recorded -- judge from the summary above)"}

### Claims already in the index for this capability
${claimBlock}

## Paper under review

Title: ${candidate.title}
${candidate.date ? `Date: ${candidate.date}\n` : ""}Abstract: ${candidate.abstract ?? "(no abstract available)"}

Judge this paper against the capability above.`;
}

// ---------------------------------------------------------------------------

const catalog = loadCatalog();
const capabilities = new Map(catalog.capabilities.map((c) => [c.data.id, c.data]));
const claimsByCapability = new Map();
for (const c of catalog.claims) {
  const list = claimsByCapability.get(c.data.capability) ?? [];
  list.push(c.data);
  claimsByCapability.set(c.data.capability, list);
}

// Newest window first, so a backfilled week never spends the classify
// budget before tonight's papers have had their turn.
const files = fs.existsSync(QUEUE_DIR) ? fs.readdirSync(QUEUE_DIR).filter((f) => /\.ya?ml$/.test(f)).sort().reverse() : [];
if (!files.length) { console.log("No queue files."); process.exit(0); }

// One work item per (candidate, matched capability) pair.
const work = [];
const queues = new Map();
for (const f of files) {
  const full = path.join(QUEUE_DIR, f);
  const parsed = YAML.parse(fs.readFileSync(full, "utf8"));
  queues.set(full, parsed);
  for (const c of parsed?.candidates ?? []) {
    for (const capId of c.capabilities ?? []) {
      if (onlyCapability && capId !== onlyCapability) continue;
      if ((c.verdicts ?? []).some((v) => v.capability === capId)) continue;   // already judged
      if (!capabilities.has(capId)) continue;
      work.push({ file: full, candidate: c, capId });
    }
  }
}

console.log(`${work.length} unclassified (candidate x capability) pairs${onlyCapability ? ` for ${onlyCapability}` : ""}`);
if (!work.length) process.exit(0);

const batch = work.slice(0, limit === Infinity ? work.length : limit);
console.log(`Processing ${batch.length}${batch.length < work.length ? ` of ${work.length}` : ""} with ${MODEL}\n`);

if (dryRun) {
  const { candidate, capId } = batch[0];
  console.log("=== DRY RUN: prompt for the first item, no API call ===\n");
  console.log(SYSTEM);
  console.log("\n--- user ---\n");
  console.log(buildPrompt(candidate, capabilities.get(capId), claimsByCapability.get(capId) ?? []));
  process.exit(0);
}

const client = new Anthropic();
let inTokens = 0, outTokens = 0, cacheRead = 0, errors = 0;

for (const [i, item] of batch.entries()) {
  const cap = capabilities.get(item.capId);
  const claims = claimsByCapability.get(item.capId) ?? [];
  process.stdout.write(`[${i + 1}/${batch.length}] ${item.capId} :: ${String(item.candidate.title).slice(0, 58)}\n`);
  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      // Classification, not deep reasoning -- low effort is the right cost/quality point.
      output_config: { effort: "low", format: zodOutputFormat(Verdict) },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildPrompt(item.candidate, cap, claims) }],
    });
    inTokens += res.usage?.input_tokens ?? 0;
    outTokens += res.usage?.output_tokens ?? 0;
    cacheRead += res.usage?.cache_read_input_tokens ?? 0;

    const v = res.parsed_output;
    if (!v) { console.log("      parse failed, skipped"); errors++; continue; }

    const verdict = {
      capability: item.capId,
      about_capability: v.about_capability,
      direction: v.direction,
      confidence: v.confidence,
      rationale: v.rationale,
    };
    if (v.contradicts_claim_id) verdict.contradicts_claim_id = v.contradicts_claim_id;
    if (v.supports_claim_id) verdict.supports_claim_id = v.supports_claim_id;
    if (v.scope_condition) verdict.scope_condition = v.scope_condition;
    verdict.classified_at = new Date().toISOString().slice(0, 10);
    verdict.model = MODEL;

    item.candidate.verdicts = [...(item.candidate.verdicts ?? []), verdict];

    const flag = !v.about_capability ? "off-topic"
      : v.contradicts_claim_id ? `CONTRADICTS ${v.contradicts_claim_id}`
      : v.direction;
    console.log(`      -> ${flag} (${v.confidence})`);
  } catch (err) {
    errors++;
    console.error(`      error: ${err?.message ?? err}`);
  }
  if (i < batch.length - 1) await new Promise((r) => setTimeout(r, delayMs));
}

// Rewrite queue files with verdicts attached. Re-serializing via YAML.stringify
// rather than the hand-rolled writer in fetch-openalex.mjs, because verdicts are
// nested and that writer only knows the flat candidate shape.
for (const [file, parsed] of queues) {
  fs.writeFileSync(file, YAML.stringify(parsed, { lineWidth: 100 }));
}

const cost = (inTokens / 1e6) * PRICE_IN + (outTokens / 1e6) * PRICE_OUT;
console.log(`\ntokens: ${inTokens} in (${cacheRead} cached) / ${outTokens} out`);
console.log(`cost:   $${cost.toFixed(4)} for ${batch.length} items  ≈ $${(cost / Math.max(batch.length, 1)).toFixed(4)} each`);
if (errors) console.log(`errors: ${errors}`);
const remaining = work.length - batch.length;
if (remaining > 0) console.log(`${remaining} still unclassified — rerun, or pass --all`);
