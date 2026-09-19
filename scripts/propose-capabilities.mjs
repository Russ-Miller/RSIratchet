// Stage 2b: mine the UNMATCHED pile for capabilities the catalog doesn't track.
// Stage 2 judges candidates against capabilities you already have; it is blind
// to everything that matched nothing. This asks, for those papers, "does this
// suggest a capability not in the list, and what would you call it" -- then
// clusters the proposals so a name recurring across many papers surfaces while
// one-offs stay quiet.
//
//   node scripts/propose-capabilities.mjs --dry-run
//   node scripts/propose-capabilities.mjs --limit 100
//   node scripts/propose-capabilities.mjs --all
//
// Papers are batched per request (the existing-capability list is the bulk of
// the prompt, so amortizing it across a batch is most of the cost saving).
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { loadCatalog } from "./catalog-lib.mjs";

const MODEL = "claude-opus-5";
const PRICE_IN = 5.0, PRICE_OUT = 25.0;
const QUEUE_DIR = "pipeline/queue";
const OUT_PATH = "pipeline/proposed-capabilities.yaml";
const BATCH_SIZE = 8;

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes("--dry-run");
const consolidate = args.includes("--consolidate");
const limit = args.includes("--all") ? Infinity : Number(arg("limit") ?? 40);
const onlyWindow = arg("window"); // restrict to one queue file, e.g. forwarded_2026-09-19, so hand-forwarded papers are not starved by score ordering

const Proposal = z.object({
  results: z.array(z.object({
    index: z.number().describe("The paper's number in the batch, as given."),
    suggests_new_capability: z.boolean()
      .describe("True only if this paper studies a model capability that none of the existing capabilities covers. False for domain applications, and false when an existing capability already covers it."),
    proposed_id: z.string()
      .describe("kebab-case slug for the capability, or empty string. Name the capability, never the paper or its method."),
    proposed_label: z.string()
      .describe("Short plain-English name for what a model is being good or bad at, or empty string."),
    scope_note: z.string().describe("One sentence on what would and would not count, or empty string."),
    rationale: z.string().describe("One sentence tying it to this paper, or empty string."),
  })),
});

const SYSTEM = `You help maintain a personal research index of AI model capabilities --
the things models are good or bad at.

You will be given the capabilities the index already tracks, then a batch of
papers that matched none of them. For each paper, decide whether it studies a
model capability the index is missing.

Be strict. Most papers will be false, for one of two reasons:

- It is a DOMAIN APPLICATION. Using a model for radiology, agriculture, legal
  review, or education is not a capability. The capability would be whatever
  underlying thing the model must be good at, and usually the index already
  has it.
- An EXISTING capability already covers it, perhaps under different wording.
  Check the list before proposing.

When you do propose one, name the capability, not the paper and not its
method. "Compile by training" is a technique; the capability it exercises is
whether a compressed model keeps the behavior it was trained from. Prefer
names a researcher outside this project would recognize. Use the same style as
the existing ids: short, kebab-case, a noun phrase.

A wrong proposal costs more than a missed one -- the index is small and
deliberately curated.`;

function existingBlock(existing) {
  const list = existing.map((c) => `- ${c.id}: ${c.label} — ${c.summary}`).join("\n");
  return `## Capabilities the index already tracks\n\n${list}`;
}
function papersBlock(batch) {
  const papers = batch.map((c, i) =>
    `### Paper ${i + 1}\nTitle: ${c.title}\nAbstract: ${(c.abstract ?? "(none)").slice(0, 900)}`
  ).join("\n\n");
  return `## Papers that matched none of them\n\n${papers}\n\nJudge each paper. Return one result per paper, using the index numbers above.`;
}
function buildPrompt(existing, batch) { return `${existingBlock(existing)}\n\n${papersBlock(batch)}`; }

// Clustering proposals by exact id barely works: the model names each paper
// afresh, so near-synonyms ("belief-revision" vs "knowledge-injection-
// generalization") never merge. This second pass reads the raw names back and
// consolidates them semantically into a shortlist worth acting on.
const Consolidated = z.object({
  capabilities: z.array(z.object({
    id: z.string().describe("kebab-case slug in the style of the existing capability ids."),
    label: z.string().describe("Short plain-English name for what a model is good or bad at."),
    scope_note: z.string().describe("One sentence on what would and would not count."),
    merged_from: z.array(z.string()).describe("The proposed ids folded into this one."),
    paper_count: z.number().describe("Total papers across the merged proposals."),
    worth_adding: z.boolean().describe("True only if this is a coherent capability with enough evidence to be worth tracking, not a one-off framing."),
    note: z.string().describe("One sentence: why worth adding, or why not."),
  })),
});

const CONSOLIDATE_SYSTEM = `You are consolidating raw capability-name proposals into a shortlist.

Each proposal came from a single paper, so the same underlying capability
appears several times under different names. Merge near-synonyms into one
entry, keeping the clearest name.

Then judge each merged capability: is it worth adding to a small, deliberately
curated index? Set worth_adding true only for coherent capabilities with real
recurring evidence. Set it false for one-off framings, for things that are
really techniques or task domains rather than capabilities, and for anything an
existing capability already covers.

Prefer fewer, better entries. A shortlist of five the maintainer acts on beats
thirty they ignore.`;

// ---------------------------------------------------------------------------

const catalog = loadCatalog();
const existing = catalog.capabilities.map((c) => c.data);

if (consolidate) {
  if (!fs.existsSync(OUT_PATH)) { console.log(`No ${OUT_PATH} yet -- run a proposal pass first.`); process.exit(0); }
  const prior = YAML.parse(fs.readFileSync(OUT_PATH, "utf8"));
  const raw = (prior?.clusters ?? []).map((c) =>
    `- ${c.proposed_id} ("${c.proposed_label}", ${c.paper_count} paper${c.paper_count === 1 ? "" : "s"}): ${c.scope_note ?? ""}`
  ).join("\n");
  const existingList = existing.map((c) => `- ${c.id}: ${c.label}`).join("\n");
  const client2 = new Anthropic();
  const res = await client2.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "medium", format: zodOutputFormat(Consolidated) },
    system: CONSOLIDATE_SYSTEM,
    messages: [{ role: "user", content: `## Capabilities already in the index\n\n${existingList}\n\n## Raw proposals to consolidate\n\n${raw}` }],
  });
  const out = res.parsed_output?.capabilities ?? [];
  const keep = out.filter((c) => c.worth_adding).sort((a, b) => b.paper_count - a.paper_count);
  const drop = out.filter((c) => !c.worth_adding);
  const cost2 = ((res.usage?.input_tokens ?? 0) / 1e6) * PRICE_IN + ((res.usage?.output_tokens ?? 0) / 1e6) * PRICE_OUT;

  const l = [
    `# Consolidated capability candidates. Suggestions, not capabilities.`,
    `generated_at: ${new Date().toISOString().slice(0, 10)}`,
    `from_raw_proposals: ${(prior?.clusters ?? []).length}`,
    `recommended:`,
  ];
  for (const c of keep) {
    l.push(`  - id: ${c.id}`);
    l.push(`    label: ${JSON.stringify(c.label)}`);
    l.push(`    scope_note: ${JSON.stringify(c.scope_note)}`);
    l.push(`    paper_count: ${c.paper_count}`);
    l.push(`    merged_from: [${c.merged_from.join(", ")}]`);
    l.push(`    note: ${JSON.stringify(c.note)}`);
  }
  l.push(`set_aside:`);
  for (const c of drop) {
    l.push(`  - id: ${c.id}`);
    l.push(`    note: ${JSON.stringify(c.note)}`);
  }
  fs.writeFileSync("pipeline/capability-shortlist.yaml", l.join("\n") + "\n");
  console.log(`Consolidated ${(prior?.clusters ?? []).length} raw names -> ${keep.length} recommended, ${drop.length} set aside`);
  console.log(`cost: $${cost2.toFixed(4)}\n`);
  for (const c of keep) console.log(`  ${String(c.paper_count).padStart(3)}  ${c.id}  —  ${c.label}\n       ${c.note}`);
  console.log(`\nwritten to pipeline/capability-shortlist.yaml`);
  process.exit(0);
}

const files = fs.existsSync(QUEUE_DIR) ? fs.readdirSync(QUEUE_DIR).filter((f) => /\.ya?ml$/.test(f)) : [];
const queues = new Map();
const unmatched = [];
for (const f of files) {
  const full = path.join(QUEUE_DIR, f);
  const parsed = YAML.parse(fs.readFileSync(full, "utf8"));
  queues.set(full, parsed);
  if (onlyWindow && !f.startsWith(onlyWindow)) continue;
  for (const c of parsed?.candidates ?? []) {
    if ((c.capabilities ?? []).length) continue;
    if (c.proposal) continue;                       // already considered
    unmatched.push(c);
  }
}
// Highest-scoring first: the heuristic is a weak relevance proxy, but spending
// the budget on the least junk-looking end of the pile is better than random.
unmatched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

console.log(`${unmatched.length} unmatched candidates without a proposal`);
if (!unmatched.length) process.exit(0);

const pool = unmatched.slice(0, limit === Infinity ? unmatched.length : limit);
const batches = [];
for (let i = 0; i < pool.length; i += BATCH_SIZE) batches.push(pool.slice(i, i + BATCH_SIZE));
console.log(`Considering ${pool.length} in ${batches.length} batches of up to ${BATCH_SIZE}\n`);

if (dryRun) {
  console.log("=== DRY RUN: first batch prompt, no API call ===\n");
  console.log(SYSTEM);
  console.log("\n--- user ---\n");
  console.log(buildPrompt(existing, batches[0]).slice(0, 3000));
  process.exit(0);
}

// Between batched API calls. A nightly job has all night; hitting a rate
// limit halfway through a paid pass costs more than the wait ever will.
const delayMs = Number(process.env.PROPOSE_DELAY_MS ?? 2000);

const client = new Anthropic();
let inTokens = 0, outTokens = 0, cacheRead = 0, errors = 0;
const proposals = [];

for (const [bi, batch] of batches.entries()) {
  process.stdout.write(`[batch ${bi + 1}/${batches.length}] ${batch.length} papers ... `);
  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(Proposal) },
      system: [{ type: "text", text: SYSTEM }],
      messages: [{ role: "user", content: [
        { type: "text", text: existingBlock(existing), cache_control: { type: "ephemeral" } },
        { type: "text", text: papersBlock(batch) },
      ] }],
    });
    inTokens += res.usage?.input_tokens ?? 0;
    outTokens += res.usage?.output_tokens ?? 0;
    cacheRead += res.usage?.cache_read_input_tokens ?? 0;

    const results = res.parsed_output?.results ?? [];
    let hits = 0;
    for (const r of results) {
      const cand = batch[r.index - 1];
      if (!cand) continue;
      cand.proposal = r.suggests_new_capability
        ? { proposed_id: r.proposed_id, proposed_label: r.proposed_label, scope_note: r.scope_note, rationale: r.rationale }
        : { suggests_new_capability: false };
      if (r.suggests_new_capability && r.proposed_id) {
        hits++;
        proposals.push({ ...r, title: cand.title, arxiv_id: cand.arxiv_id });
      }
    }
    console.log(`${hits} proposal${hits === 1 ? "" : "s"}`);
  } catch (err) {
    errors++;
    console.log(`error: ${err?.message ?? err}`);
  }
  if (bi < batches.length - 1) await new Promise((r) => setTimeout(r, delayMs));
}

for (const [file, parsed] of queues) fs.writeFileSync(file, YAML.stringify(parsed, { lineWidth: 100 }));

// Cluster by proposed id. A name recurring across papers is a real candidate;
// a singleton is usually one author's framing.
const clusters = new Map();
for (const p of proposals) {
  const key = p.proposed_id.toLowerCase().trim();
  if (!clusters.has(key)) clusters.set(key, { id: key, label: p.proposed_label, scope: p.scope_note, papers: [] });
  clusters.get(key).papers.push({ title: p.title, arxiv_id: p.arxiv_id, rationale: p.rationale });
}
const ranked = [...clusters.values()].sort((a, b) => b.papers.length - a.papers.length);

const lines = [
  `# Proposed capabilities mined from unmatched ingestion candidates.`,
  `# NOT capabilities -- suggestions awaiting your judgment. A name recurring`,
  `# across several papers is a real candidate; a singleton is usually one`,
  `# author's framing.`,
  `generated_at: ${new Date().toISOString().slice(0, 10)}`,
  `considered: ${pool.length}`,
  `proposals: ${proposals.length}`,
  `clusters:`,
];
for (const c of ranked) {
  lines.push(`  - proposed_id: ${c.id}`);
  lines.push(`    proposed_label: ${JSON.stringify(c.label)}`);
  lines.push(`    scope_note: ${JSON.stringify(c.scope)}`);
  lines.push(`    paper_count: ${c.papers.length}`);
  lines.push(`    papers:`);
  for (const p of c.papers.slice(0, 8)) {
    lines.push(`      - title: ${JSON.stringify(p.title)}`);
    if (p.arxiv_id) lines.push(`        arxiv_id: "${p.arxiv_id}"`);
  }
}
fs.writeFileSync(OUT_PATH, lines.join("\n") + "\n");

const cost = (inTokens / 1e6) * PRICE_IN + (outTokens / 1e6) * PRICE_OUT;
console.log(`\n${proposals.length} proposals across ${pool.length} papers -> ${ranked.length} distinct names`);
console.log(`tokens: ${inTokens} in (${cacheRead} cached) / ${outTokens} out`);
console.log(`cost:   $${cost.toFixed(4)}  ≈ $${(cost / Math.max(pool.length, 1)).toFixed(5)} per paper`);
if (errors) console.log(`errors: ${errors}`);
console.log(`\nTop recurring names:`);
for (const c of ranked.slice(0, 12)) console.log(`  ${String(c.papers.length).padStart(3)}  ${c.id}  —  ${c.label}`);
console.log(`\nwritten to ${OUT_PATH}`);
