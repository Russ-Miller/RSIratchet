// Stage 1 of nightly ingestion: pull candidate papers from OpenAlex into a
// review queue. Free, no API key, no LLM cost. Deliberately does NOT write
// into catalog/ -- candidates are reviewed by a human before promotion.
//
//   node scripts/fetch-openalex.mjs                 # yesterday
//   node scripts/fetch-openalex.mjs --days 7        # last 7 days
//   node scripts/fetch-openalex.mjs --from 2026-09-01 --to 2026-09-04
//
// Writes pipeline/queue/<from>_<to>.yaml and records surfaced OpenAlex ids
// in pipeline/seen.json so re-runs never re-surface the same work.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { loadCatalog } from "./catalog-lib.mjs";
import { matchCapabilities } from "./match-lib.mjs";

const MAILTO = process.env.OPENALEX_MAILTO || "miller.russ@gmail.com";
const UA = `modelselfhelp/0.1 (mailto:${MAILTO})`;
const QUEUE_DIR = "pipeline/queue";
// OpenAlex source id for arXiv. Capability research lives here first, and
// filtering to it lifts precision far more than any keyword heuristic does:
// unfiltered recent windows are dominated by journal domain-application work
// plus Zenodo/bioRxiv/Preprints.org noise.
const ARXIV_SOURCE_ID = "S4306400194";
const SEEN_PATH = "pipeline/seen.json";

// Capability-focused query terms. Each runs as its own title+abstract search;
// results are merged and deduped. Tuned for "says something about a model
// capability", not "applies a model to a domain" -- stage 2 does that call.
const QUERIES = [
  "large language model evaluation",
  "large language model benchmark",
  "large language model reasoning",
  "large language model capability",
  "large language model limitation",
  "large language model failure",
  "language model hallucination",
  "language model agent evaluation",
];


// ---------------------------------------------------------------------------
// Free heuristic relevance scoring. No model calls -- keyword and topic
// signals only. The job is to RANK, never to discard: a medical hallucination
// benchmark is genuinely relevant, so domain terms only push an item down the
// queue rather than out of it.
// ---------------------------------------------------------------------------

// Language that suggests a claim about a model capability itself.
const CAPABILITY_SIGNALS = [
  [/\bbenchmark(s|ing)?\b/i, 3, "benchmark"],
  [/\b(evaluat\w+|assessment)\b/i, 1, "evaluation"],
  [/\bcapabilit(y|ies)\b/i, 3, "capability"],
  [/\b(limitation|shortcoming|weakness)\w*\b/i, 3, "limitation"],
  [/\b(fail(s|ure|ing)?|breaks? down|struggle\w*|cannot)\b/i, 3, "failure"],
  [/\bhallucinat\w+/i, 3, "hallucination"],
  [/\breasoning\b/i, 2, "reasoning"],
  [/\b(contaminat\w+|memoriz\w+|leakage)\b/i, 3, "contamination"],
  [/\b(robustness|generaliz\w+|out-of-distribution)\b/i, 2, "robustness"],
  [/\b(ablation|probing|interpretab\w+|mechanistic)\b/i, 3, "analysis"],
  [/\b(we (find|show|demonstrate)|our (results|analysis) (show|reveal))/i, 2, "finding"],
  [/\b(chain[- ]of[- ]thought|in[- ]context learning|prompt\w* (strategy|technique))\b/i, 2, "technique"],
  [/\b(agent(ic)?|tool[- ]use|tool[- ]calling|long[- ]context)\b/i, 2, "agentic"],
  [/\b(GPT-4|Claude|Llama|Gemini|Mistral|Qwen|frontier model)\b/i, 1, "named-model"],
];

// Work that moves a capability forward rather than only measuring it. Without
// these, technique/architecture papers score near zero purely for not being
// failure papers -- which would systematically under-rank the "what helps
// systems improve" half of the index.
const IMPROVEMENT_SIGNALS = [
  [/\b(outperform\w*|surpass\w*|state[- ]of[- ]the[- ]art|new SOTA)\b/i, 2, "outperforms"],
  [/\b(improv\w+|gain\w*|boost\w*|enhanc\w+)\b/i, 1, "improves"],
  [/\b(we (propose|introduce|present)|our (method|approach|framework))\b/i, 2, "proposes-method"],
  [/\b(fine[- ]tun\w+|post[- ]train\w+|instruction[- ]tun\w+|distill\w+|RLHF|preference optimization)\b/i, 3, "training-method"],
  [/\b(architecture|attention mechanism|decoding strateg\w+|inference[- ]time|quantiz\w+)\b/i, 2, "architecture"],
  [/\b(scal\w+ law|data budget|pre[- ]train\w+|compute[- ]optimal)\b/i, 2, "scaling"],
  [/\b(mitigat\w+|reduc\w+ (error|hallucinat\w+)|correct\w* )\b/i, 2, "mitigation"],
];

// Markers of "we applied an LLM inside domain X" rather than capability work.
const DOMAIN_SIGNALS = [
  [/\b(patient|clinical|hospital|medical|nurs\w+|diagnos\w+|health\w*)\b/i, -3, "clinical"],
  [/\b(student|classroom|teach\w+|curricul\w+|instructor|pedagog\w+)\b/i, -3, "education"],
  [/\b(marketing|advertis\w+|hospitality|tourism|e-commerce|customer engagement)\b/i, -4, "marketing"],
  [/\b(agricultur\w+|farming|crop|precision agriculture)\b/i, -4, "agriculture"],
  [/\b(legal|court|litigation|contract review)\b/i, -2, "legal"],
  [/\b(air traffic|aviation|manufactur\w+|supply chain|construction)\b/i, -3, "industry"],
  [/\b(recommend\w+ system|recommendation)\b/i, -2, "recsys"],
  [/\b(sentiment analysis|topic model\w*)\b/i, -2, "classic-nlp-task"],
  [/\bcase study\b/i, -2, "case-study"],
];

const DOMAIN_TOPICS = /health|medic|clinic|educat|translat|marketing|agricultur|tourism|nurs|dental|legal|finance|energy|construction/i;

// Topical match: which catalogued capabilities does this paper concern?
// Vocabulary comes from the capability records themselves (id, aliases,
// match_terms) so it stays with the content rather than drifting in code.
// This answers "what is it about", NOT "does it improve or degrade the
// capability" -- that direction is the semantic call stage 2 exists to make.
function scoreCandidate(c) {
  const haystack = `${c.title} ${c.abstract ?? ""}`;
  let score = 0;
  const signals = [];
  for (const [re, weight, label] of CAPABILITY_SIGNALS) {
    if (re.test(haystack)) { score += weight; signals.push(`+${label}`); }
  }
  for (const [re, weight, label] of IMPROVEMENT_SIGNALS) {
    if (re.test(haystack)) { score += weight; signals.push(`+${label}`); }
  }
  for (const [re, weight, label] of DOMAIN_SIGNALS) {
    if (re.test(haystack)) { score += weight; signals.push(`-${label}`); }
  }
  if (c.topic && DOMAIN_TOPICS.test(c.topic)) { score -= 4; signals.push("-domain-topic"); }
  // Only informative in --all-sources mode. With the arXiv filter on, every
  // candidate is an arXiv preprint, so this would be a constant offset that
  // inflates scores while ordering nothing.
  if (allSources && c.arxiv_id) { score += 3; signals.push("+arxiv"); }
  if (!c.abstract) { score -= 1; signals.push("-no-abstract"); }
  return { score, signals };
}

const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const iso = (d) => d.toISOString().slice(0, 10);

const allSources = args.includes("--all-sources");
let from = arg("from");
let to = arg("to");
if (!from) {
  // Trailing window, not just yesterday: OpenAlex ingests arXiv with a lag of
  // several days, so a 1-day window structurally misses it. A trailing window
  // plus the seen-ledger is self-healing -- papers get picked up whenever they
  // are finally indexed, and are never surfaced twice -- but only if the
  // window is wider than the lag: a paper indexed after a 7-day window had
  // moved past it was lost (2609.11801, seen 2026-09-18), hence 14.
  const days = Number(arg("days") ?? 14);
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  from = iso(start);
  to = to ?? iso(end);
}
to = to ?? iso(new Date());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Between result pages. OpenAlex's polite pool (we send a mailto UA) allows
// far more than this; nothing is waiting on a nightly job, so the cheapest
// insurance against a throttle is simply going slower.
const PAGE_DELAY_MS = Number(process.env.PAGE_DELAY_MS ?? 750);

async function getJson(url, attempts = 6) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    // Exponential, not linear. A linear ramp spends its whole budget inside
    // the window a throttle is still open, then gives up just as it lifts.
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.min(120000, 3000 * 2 ** (i - 1));
      console.error(`  HTTP ${res.status}, retry ${i}/${attempts} in ${wait / 1000}s`);
      await sleep(wait); continue;
    }
    console.error(`  HTTP ${res.status} ${url}`);
    return null;
  }
  return null;
}

/** OpenAlex ships abstracts as a word -> positions map; rebuild the text. */
function abstractText(inv) {
  if (!inv) return undefined;
  const words = [];
  for (const [word, positions] of Object.entries(inv)) for (const p of positions) words[p] = word;
  const text = words.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return text || undefined;
}

function arxivIdOf(work) {
  const doi = (work.ids?.doi ?? "").toLowerCase();
  const m = doi.match(/10\.48550\/arxiv\.(\d{4}\.\d{4,5})/);
  if (m) return m[1];
  for (const loc of work.locations ?? []) {
    const u = loc?.landing_page_url ?? "";
    const lm = u.match(/arxiv\.org\/abs\/(\d{4}\.\d{4,5})/);
    if (lm) return lm[1];
  }
  return undefined;
}

const normTitle = (t) => (t ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Never re-surface something already in the catalog or already queued.
const catalog = loadCatalog();
const haveArxiv = new Set(catalog.sources.map((s) => s.data.arxiv_id).filter(Boolean));
const haveTitles = new Set(catalog.sources.map((s) => normTitle(s.data.title)));
const seen = fs.existsSync(SEEN_PATH) ? JSON.parse(fs.readFileSync(SEEN_PATH, "utf8")) : { openalex_ids: [] };
const seenIds = new Set(seen.openalex_ids);

// --rescore: re-rank what is already queued against the current heuristic,
// without touching the network. Run this after changing the signal tables.
if (args.includes("--rescore")) {
  const files = fs.existsSync(QUEUE_DIR) ? fs.readdirSync(QUEUE_DIR).filter((f) => /\.ya?ml$/.test(f)) : [];
  if (!files.length) { console.log("No queue files to rescore."); process.exit(0); }
  for (const f of files) {
    const full = path.join(QUEUE_DIR, f);
    const parsed = YAML.parse(fs.readFileSync(full, "utf8"));
    const entries = parsed?.candidates ?? [];
    let moved = 0;
    for (const c of entries) {
      const before = c.score ?? 0;
      const { score, signals } = scoreCandidate(c);
      c.score = score;
      c.signals = signals;
      c.capabilities = matchCapabilities(c);
      if (score !== before) moved++;
    }
    const win = parsed?.window ?? { from: f.split("_")[0], to: (f.split("_")[1] ?? "").replace(/\.ya?ml$/, "") };
    writeQueueFile(full, win, entries, 0);
    const matched = entries.filter((c) => c.capabilities?.length).length;
    console.log(`${f}: rescored ${entries.length} candidates (${moved} changed), ${matched} matched to a capability`);
    for (const c of entries.slice(0, 10)) console.log(`  ${String(c.score).padStart(3)}  ${String(c.title).slice(0, 84)}`);
  }
  process.exit(0);
}

console.log(`Window ${from} .. ${to} — ${QUERIES.length} queries — ${allSources ? "ALL sources" : "arXiv only"}`);
const found = new Map();   // openalex id -> work

for (const query of QUERIES) {
  let cursor = "*";
  let pages = 0;
  let queryCount = 0;
  while (cursor && pages < 10) {
    const params = new URLSearchParams({
      filter: [
        `from_publication_date:${from}`,
        `to_publication_date:${to}`,
        `title_and_abstract.search:${query}`,
        ...(allSources ? [] : [`primary_location.source.id:${ARXIV_SOURCE_ID}`]),
      ].join(","),
      "per-page": "200",
      cursor,
      select: "id,doi,title,publication_date,authorships,primary_location,primary_topic,cited_by_count,abstract_inverted_index,locations,ids,type",
    });
    const data = await getJson(`https://api.openalex.org/works?${params}`);
    if (!data) break;
    for (const w of data.results ?? []) { found.set(w.id, w); queryCount++; }
    cursor = data.meta?.next_cursor;
    pages++;
    if (!data.results?.length) break;
    await sleep(PAGE_DELAY_MS);
  }
  console.log(`  ${String(queryCount).padStart(4)} raw  ${query}`);
}

// Dedupe and filter
const candidates = [];
const titlesThisRun = new Set();
let skippedSeen = 0, skippedHave = 0, skippedDupe = 0;

for (const w of found.values()) {
  const title = w.title ?? "";
  const nt = normTitle(title);
  const ax = arxivIdOf(w);
  if (seenIds.has(w.id)) { skippedSeen++; continue; }
  if ((ax && haveArxiv.has(ax)) || haveTitles.has(nt)) { skippedHave++; continue; }
  if (titlesThisRun.has(nt)) { skippedDupe++; continue; }   // OpenAlex has duplicate records
  titlesThisRun.add(nt);
  candidates.push({
    openalex_id: w.id,
    title,
    date: w.publication_date,
    arxiv_id: ax,
    doi: w.ids?.doi,
    authors: (w.authorships ?? []).slice(0, 6).map((a) => a.author?.display_name).filter(Boolean),
    venue: w.primary_location?.source?.display_name,
    topic: w.primary_topic?.display_name,
    cited_by_count: w.cited_by_count ?? 0,
    abstract: abstractText(w.abstract_inverted_index),
  });
}

for (const c of candidates) {
  const { score, signals } = scoreCandidate(c);
  c.score = score;
  c.signals = signals;
  c.capabilities = matchCapabilities(c);
}

function yamlStr(s) { return JSON.stringify(s ?? ""); }

function writeQueueFile(outPath, win, entries, addedCount) {
  entries.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.title ?? "").localeCompare(b.title ?? ""));
  const lines = [
    `# OpenAlex candidates, ${win.from} .. ${win.to}`,
    `# Stage 1 output: NOT reviewed, NOT in the catalog. Triage before promoting.`,
    `# ${entries.length} candidates (${addedCount} added by the latest run).`,
    `# Ranked by a free keyword/topic heuristic -- highest score first. The score`,
    `# only orders the queue; nothing is discarded, since a domain-flavored paper`,
    `# can still be real capability research.`,
    `window: { from: ${win.from}, to: ${win.to} }`,
    `generated_at: ${iso(new Date())}`,
    `candidates:`,
  ];
  for (const c of entries) {
    lines.push(`  - openalex_id: ${c.openalex_id}`);
    lines.push(`    score: ${c.score ?? 0}`);
    if (c.signals?.length) lines.push(`    signals: [${c.signals.join(", ")}]`);
    if (c.capabilities?.length) lines.push(`    capabilities: [${c.capabilities.join(", ")}]`);
    lines.push(`    title: ${yamlStr(c.title)}`);
    lines.push(`    date: ${c.date}`);
    if (c.arxiv_id) lines.push(`    arxiv_id: "${c.arxiv_id}"`);
    if (c.doi) lines.push(`    doi: ${c.doi}`);
    if (c.authors?.length) lines.push(`    authors: [${c.authors.map(yamlStr).join(", ")}]`);
    if (c.venue) lines.push(`    venue: ${yamlStr(c.venue)}`);
    if (c.topic) lines.push(`    topic: ${yamlStr(c.topic)}`);
    lines.push(`    cited_by_count: ${c.cited_by_count ?? 0}`);
    if (c.abstract) lines.push(`    abstract: ${yamlStr(String(c.abstract).slice(0, 1500))}`);
  }
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  return entries;
}

fs.mkdirSync(QUEUE_DIR, { recursive: true });
const outPath = path.join(QUEUE_DIR, `${from}_${to}.yaml`);

// Re-running a window merges with what is already queued rather than
// replacing it: OpenAlex is a live index, so a later run legitimately turns
// up stragglers. Parsing the prior file back keeps the whole queue sorted by
// score, not just each run's slice.
let merged = candidates;
if (fs.existsSync(outPath)) {
  const prior = YAML.parse(fs.readFileSync(outPath, "utf8"))?.candidates ?? [];
  const byId = new Map(prior.map((c) => [c.openalex_id, c]));
  for (const c of candidates) byId.set(c.openalex_id, c);
  merged = [...byId.values()];
}
writeQueueFile(outPath, { from, to }, merged, candidates.length);

for (const c of candidates) seenIds.add(c.openalex_id);
fs.writeFileSync(SEEN_PATH, JSON.stringify({ openalex_ids: [...seenIds] }, null, 2) + "\n");

console.log(`\n${found.size} unique works fetched`);
console.log(`  -${skippedSeen} already surfaced in a previous run`);
console.log(`  -${skippedHave} already in the catalog`);
console.log(`  -${skippedDupe} duplicate records within this run`);
console.log(`= ${candidates.length} new candidates -> ${outPath} (${merged.length} total in file)`);
// A zero-yield run is either a quiet window or OpenAlex's arXiv feed
// stalling; the previous run's yield is what tells them apart at a glance.
{
  const statsPath = "pipeline/fetch-stats.json";
  const prev = fs.existsSync(statsPath) ? JSON.parse(fs.readFileSync(statsPath, "utf8")) : null;
  if (candidates.length === 0 && prev) console.log(`  (0 new: every fetched work was already in the seen-ledger. Previous run on ${prev.date} found ${prev.new} new of ${prev.unique} unique; if this repeats, the upstream feed may have stalled.)`);
  fs.writeFileSync(statsPath, JSON.stringify({ date: new Date().toISOString().slice(0, 10), window: { from, to }, unique: found.size, new: candidates.length }, null, 2) + "\n");
}
const top = merged.slice(0, 10);
if (top.length) {
  console.log(`\nTop ${top.length} by heuristic score:`);
  for (const c of top) console.log(`  ${String(c.score).padStart(3)}  ${String(c.title).slice(0, 88)}`);
}
