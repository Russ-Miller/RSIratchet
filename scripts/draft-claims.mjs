// Stage 3 of ingestion: turn a triaged candidate into DRAFT catalog records.
//
//   node --env-file=.env scripts/draft-claims.mjs --id 2609.03148
//   node --env-file=.env scripts/draft-claims.mjs --limit 5
//
// Stage 2 tags a paper (about_capability, direction, contradicts/supports).
// This writes what those tags imply: a proposed claim statement with its scope
// condition, the technique it uses, and a stance toward a specific existing
// claim with the reason.
//
// DRAFTS ONLY. Output goes to pipeline/drafts/, never to catalog/. Filing is a
// human act, and this exists to remove the typing from it, not the judgment.
//
// Why the caution is not decorative: stage 2's own numbers put its
// about_capability false-positive rate between 35% and 57%. A wrong tag is
// something you skim past. A drafted sentence asserting that a paper contests
// a claim you hold reads as authoritative and could become catalog content by
// inattention. So the prompt defaults to "neither", demands the contradiction
// be direct, and every draft has to say what would falsify it.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { runBatch, collectPending, pendingKeys, parseStructured, batchCost } from "./batch-lib.mjs";
import { loadCatalog } from "./catalog-lib.mjs";
import { fetchFullText, fetchAbstracts, unverified } from "./paper-text-lib.mjs";

const MODEL = "claude-opus-5";
const PRICE_IN = 5.0, PRICE_OUT = 25.0;
const QUEUE_DIR = "pipeline/queue";
const OUT_DIR = "pipeline/drafts";
fs.mkdirSync(OUT_DIR, { recursive: true });

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const onlyId = arg("id");
const limit = Number(arg("limit") ?? 3);
const dryRun = args.includes("--dry-run");
const redo = args.includes("--redo");
// arXiv throttles hard on full-text fetches, and a bulk run has all night.
const delayMs = Number(arg("delay") ?? 8000);

const Draft = z.object({
  capability: z.string().describe("Slug of the existing capability this belongs under. Must be one of the ids listed."),
  statement: z.string().describe("The claim: one directional, scoped sentence about what is true of models or of a technique. The scope condition — model class, task family, setup — must be inside the sentence, not appended. Not a description of the paper."),
  kind: z.enum(["mechanism", "observation"]).describe("mechanism: explains WHY, expected to outlive model generations. observation: how a specific model or era behaves, expected to rot."),
  backing_strength: z.enum(["single-paper", "replicated", "mechanism-reasoning"])
    .describe("What warrants it. single-paper unless this paper itself replicates an independent result. Never own-observation — that requires an observation the catalog's owner personally made."),
  scope_condition: z.string().describe("Conditions under which the finding holds, stated plainly. Empty string if the paper states none, which is itself worth knowing."),
  technique: z.string().describe("Slug of an existing technique this claim is about, or empty string. Only when the claim is about whether that technique works."),
  proposed_technique: z.string().describe("If the paper introduces or tests a technique not in the catalog, a short plain-English name for it (under 60 characters, imperative if possible, e.g. 'Train on semantic equivalence, not string match'). Empty string otherwise."),
  technique_summary: z.string().describe("One sentence: what the proposed technique does to the model, the prompt, or the system around it. Empty when proposed_technique is empty."),
  technique_kind: z.enum(["prompting", "retrieval", "tooling", "training", "decoding", "architecture", "process", ""]).describe("Which kind of intervention the proposed technique is. Empty when none."),
  technique_validated_by: z.string().describe("How the paper checked that the technique works: the metric, the baseline, the test set, the equivalence check. 'Not measured' if the paper only argues for it. Empty when no technique."),
  stance_on_existing: z.enum(["supports", "contests", "neither"])
    .describe("Whether this paper's finding bears on a claim already held. Default to neither. 'contests' only when the finding genuinely cuts against what the claim asserts — discussing the same topic is not contesting, and neither is finding a limit the claim already scopes for."),
  related_claim_id: z.string().describe("Id of that existing claim, or empty string when stance is neither."),
  stance_reason: z.string().describe("One sentence saying exactly what in the paper bears on that claim. Empty when stance is neither."),
  falsifier: z.string().describe("What result would show this claim is wrong. A claim with no answer here is not yet a claim."),
  evidence_note: z.string().describe("How well evidenced: measured or argued, on what, how many, what the baseline was, and what the design does or does not isolate."),
  confidence: z.enum(["high", "medium", "low"]),
});

const SYSTEM = `You draft candidate records for a catalogue of what language models are good
and bad at. A human files them; you remove the typing, never the judgment.

The catalogue's unit is a CLAIM: a directional, scoped statement, not a
description of a paper and not a benchmark number. "Accuracy drops as inputs
grow, and worst for information in the middle of the context" is a claim.
"This paper studies long-context performance" is not.

Rules that matter more than fluency:

1. The scope condition goes INSIDE the statement. A claim without it gets
   misapplied later, which is the failure this format exists to prevent.
2. Distinguish mechanism from observation. A mechanism claim explains why and
   outlives a model generation. An observation describes how some model or era
   behaves and is expected to rot. Getting this wrong contaminates durable
   knowledge with perishable content.
3. Be conservative about contesting. Default to "neither". A paper contests a
   held claim only when its finding genuinely cuts against what that claim
   asserts. Working on the same topic is not contesting. Finding a limit the
   claim already scopes for is not contesting. An empty answer is better than
   a wrong one.
4. Never assert a number that is not in the source text you were given.
5. Every claim needs a falsifier. If you cannot say what result would show it
   wrong, you have written a topic, not a claim.

Write plainly. Short declarative sentences. No "significantly", "notably",
"novel", "robust", "we show".`;

function buildPrompt(cand, capabilities, techniques, claims, text) {
  const capList = capabilities.map((c) => `- ${c.id}: ${c.label} — ${c.summary}${c.discriminator ? `\n    scope: ${c.discriminator.replace(/\s+/g, " ").trim()}` : ""}`).join("\n");
  const techList = techniques.map((t) => `- ${t.id}: ${t.label}`).join("\n");
  const claimList = claims.map((c) => `- ${c.id} [${c.capability}] ${c.statement.replace(/\s+/g, " ").trim()}`).join("\n");
  return `## Capabilities in the catalogue
${capList}

## Techniques in the catalogue
${techList}

## Claims already held
${claimList}

## Paper
Title: ${cand.title}
${cand.arxiv_id ? `arXiv: ${cand.arxiv_id}\n` : ""}${(cand.verdicts ?? []).map((v) => `Stage-2 triage: ${v.capability} / ${v.direction} — ${v.rationale}`).join("\n")}

Source text (all you have; do not use anything you may recall about this paper):
${text}

Draft one claim from this paper.`;
}

// ---------------------------------------------------------------------------

const catalog = loadCatalog();
// Proposed capabilities are included on purpose: a claim filed under one is
// pending-review like any other, and the page is how a reader judges whether
// the capability is real. Only parked ones are excluded.
const capabilities = catalog.capabilities.map((c) => c.data).filter((c) => c.status === "active" || c.status === "proposed");
const techniques = catalog.techniques.map((t) => t.data);
const claims = catalog.claims.map((c) => c.data);
const capIds = new Set(capabilities.map((c) => c.id));
const claimIds = new Set(claims.map((c) => c.id));

const files = fs.existsSync(QUEUE_DIR) ? fs.readdirSync(QUEUE_DIR).filter((f) => /\.ya?ml$/.test(f)) : [];
// Forwarded papers that are not on arXiv carry openalex_id "forwarded:<source id>";
// they are keyed by that and drafted from their abstract.
const keyOf = (c) => c.arxiv_id ?? (String(c.openalex_id ?? "").startsWith("forwarded:") ? c.openalex_id.slice("forwarded:".length) : undefined);
const inFlight = new Set(pendingKeys("draft").map((k) => k.arxiv_id));
const byArxiv = new Map();
const work = [];
for (const f of files) {
  const parsed = YAML.parse(fs.readFileSync(path.join(QUEUE_DIR, f), "utf8"));
  for (const c of parsed?.candidates ?? []) {
    const ck = keyOf(c);
    if (!ck) continue;
    byArxiv.set(ck, c);
    if (onlyId) { if (ck === onlyId) work.push(c); continue; }
    // Already drafted is already done; a bulk re-run should cost nothing for
    // work that exists.
    if (!redo && fs.existsSync(path.join(OUT_DIR, `${ck}.yaml`))) continue;
    if (inFlight.has(ck)) continue;                   // submitted in an earlier run, not yet back
    if ((c.verdicts ?? []).some((v) => v.about_capability)) work.push(c);
  }
}
if (!work.length && !inFlight.size) { console.log(onlyId ? `No queue candidate with arxiv_id ${onlyId}` : "No triaged candidates."); process.exit(0); }

const batch = work.slice(0, limit);
console.log(`Drafting ${batch.length} of ${work.length} candidate(s) with ${MODEL}\n`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const client = new Anthropic();
let errors = 0;
const usage = { input: 0, output: 0 };
const addUsage = (u) => { usage.input += u.input; usage.output += u.output; errors += u.errored; };

// Applying a result re-fetches the text it was drafted from, for the figure
// check; the candidate is found by arXiv id so an earlier run's batch lands.
async function apply({ key, message }) {
  const id = key.arxiv_id;
  const cand = byArxiv.get(id);
  if (!cand) { console.log(`${id}: candidate no longer queued, result dropped`); return; }
  const d = parseStructured(message, Draft);
  if (!d) { console.log(`${id}: parse failed`); errors++; return; }
  const isArxiv = !!cand.arxiv_id;
  let text = key.kind === "full-text" && isArxiv ? await fetchFullText(id).catch(() => null) : null;
  if (!text) text = (isArxiv ? (await fetchAbstracts([id]).catch(() => new Map())).get(id) : undefined) ?? cand.abstract ?? "";

  // Checks the model cannot mark its own homework on.
  const problems = [];
  if (!capIds.has(d.capability)) problems.push(`capability "${d.capability}" is not in the catalogue`);
  if (d.related_claim_id && !claimIds.has(d.related_claim_id)) problems.push(`related_claim_id "${d.related_claim_id}" does not exist`);
  if (d.stance_on_existing !== "neither" && !d.related_claim_id) problems.push(`stance is ${d.stance_on_existing} but no claim named`);
  if (!d.falsifier?.trim()) problems.push("no falsifier");
  const ungrounded = unverified(`${d.statement} ${d.evidence_note}`, text);
  if (ungrounded.length) problems.push(`figures not in the source: ${ungrounded.join(", ")}`);

  const out = {
    ...(cand.arxiv_id ? { arxiv_id: id } : { source_id: id }), title: cand.title, url: cand.url ?? cand.doi ?? (cand.arxiv_id ? `https://arxiv.org/abs/${id}` : undefined),
    drafted_at: new Date().toISOString().slice(0, 10), drafted_from: key.kind, model: MODEL,
    status: "draft — not filed. Review, edit, then move into catalog/ by hand.",
    ...d,
    problems: problems.length ? problems : undefined,
  };
  fs.writeFileSync(path.join(OUT_DIR, `${id}.yaml`), YAML.stringify(out, { lineWidth: 78 }));
  console.log(`${id} :: ${String(cand.title).slice(0, 58)}\n  drafted from ${key.kind} -> ${OUT_DIR}/${id}.yaml` + (problems.length ? `  [${problems.length} problem(s)]` : ""));
}

const earlier = await collectPending(client, "draft");
for (const r of earlier.results) await apply(r);
addUsage(earlier.usage);

const requests = [];
for (const cand of batch) {
  const id = keyOf(cand);
  let text = cand.arxiv_id ? await fetchFullText(id).catch(() => null) : null;
  let kind = "full-text";
  if (!text) { text = (cand.arxiv_id ? (await fetchAbstracts([id]).catch(() => new Map())).get(id) : undefined) ?? cand.abstract; kind = "abstract"; }
  if (!text) { console.log(`${id}: no text available, skipped`); errors++; continue; }
  if (dryRun) {
    console.log(SYSTEM + "\n--- user ---\n" + buildPrompt(cand, capabilities, techniques, claims, text).slice(0, 4000));
    process.exit(0);
  }
  requests.push({
    key: { arxiv_id: id, kind },
    params: {
      model: MODEL,
      max_tokens: 3000,
      output_config: { effort: "low", format: zodOutputFormat(Draft) },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildPrompt(cand, capabilities, techniques, claims, text) }],
    },
  });
  await new Promise((r) => setTimeout(r, delayMs));   // pacing arXiv, not the API
}
const fresh = await runBatch(client, "draft", requests, { deadlineMs: Number(arg("deadline-min") ?? 25) * 60_000 });
for (const r of fresh.results) await apply(r);
addUsage(fresh.usage);

const cost = batchCost(usage, PRICE_IN, PRICE_OUT);
console.log(`\ntokens: ${usage.input} in / ${usage.output} out   cost: $${cost.toFixed(4)}  (batch, 50% rate)`);
if (fresh.pendingId) console.log(`pending: ${requests.length} request(s) in batch ${fresh.pendingId}, collected next run`);
if (errors) console.log(`errors: ${errors}`);
console.log(`\nDrafts are NOT catalog content. Read ${OUT_DIR}/, edit, then file by hand.`);
