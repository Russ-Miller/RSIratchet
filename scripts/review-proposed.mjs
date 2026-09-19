// For every proposed capability, gather up to N papers and ask, per paper,
// whether it SUPPORTS treating the capability as a real, distinct competence
// or failure mode worth tracking, CONTESTS that (models do not fail this
// way, or it is a subset of an existing capability), or is neutral. Writes
// pipeline/proposed-review-<date>.json for a human to decide on. New papers
// found on OpenAlex are also queued so the normal pipeline can draft them.
//
//   node --env-file=.env scripts/review-proposed.mjs [--per 6] [--only <cap-id>]
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { loadCatalog } from "./catalog-lib.mjs";

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const PER = Number(arg("per") ?? 6);
const ONLY = arg("only") ? new Set(arg("only").split(",")) : null;
const TODAY = new Date().toISOString().slice(0, 10);
const MODEL = "claude-opus-5";
const UA = `rsiratchet/0.1 (mailto:${process.env.OPENALEX_MAILTO || "miller.russ@gmail.com"})`;
const OUT = `pipeline/proposed-review-${TODAY}.json`;
const QUEUE_FILE = `pipeline/queue/review_${TODAY}.yaml`;

const cat = loadCatalog();
const caps = cat.capabilities.map((c) => c.data);
const proposed = caps.filter((c) => c.status === "proposed" && (!ONLY || ONLY.has(c.id)));
const active = caps.filter((c) => c.status === "active");
const sources = new Map(cat.sources.map((s) => [s.data.id, s.data]));
const claims = cat.claims.map((c) => c.data);

// Queue candidates, keyed by arxiv id or openalex id.
const queue = [];
for (const f of fs.readdirSync("pipeline/queue").filter((f) => /\.ya?ml$/.test(f))) {
  const d = YAML.parse(fs.readFileSync(path.join("pipeline/queue", f), "utf8")) ?? {};
  for (const c of d.candidates ?? []) queue.push(c);
}

function abstractText(inv) {
  if (!inv) return undefined;
  const words = [];
  for (const [word, positions] of Object.entries(inv)) for (const p of positions) words[p] = word;
  return words.filter(Boolean).join(" ").replace(/\s+/g, " ").trim() || undefined;
}
function arxivIdOf(w) {
  const m = (w.ids?.doi ?? "").toLowerCase().match(/10\.48550\/arxiv\.(\d{4}\.\d{4,5})/);
  if (m) return m[1];
  for (const loc of w.locations ?? []) { const lm = (loc?.landing_page_url ?? "").match(/arxiv\.org\/abs\/(\d{4}\.\d{4,5})/); if (lm) return lm[1]; }
  return undefined;
}
async function openalex(query, n) {
  const params = new URLSearchParams({
    // Relevance order (OpenAlex's default for `search`), not citations: the
    // most-cited hits for any query are the same handful of surveys.
    search: query, per_page: String(n),
    filter: "from_publication_date:2024-01-01,type:article|preprint",
    select: "id,doi,title,publication_date,authorships,cited_by_count,abstract_inverted_index,locations,ids",
  });
  const res = await fetch(`https://api.openalex.org/works?${params}`, { headers: { "User-Agent": UA } });
  if (!res.ok) { console.log(`  openalex ${res.status} for "${query.slice(0, 40)}"`); return []; }
  const j = await res.json();
  return (j.results ?? []).map((w) => ({
    openalex_id: w.id, title: w.title, date: w.publication_date, doi: w.ids?.doi, arxiv_id: arxivIdOf(w),
    authors: (w.authorships ?? []).slice(0, 6).map((a) => a.author?.display_name).filter(Boolean),
    cited_by_count: w.cited_by_count, abstract: abstractText(w.abstract_inverted_index),
  })).filter((w) => w.title && w.abstract);
}

async function s2(query, n) {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&year=2023-&limit=${n}&fields=title,abstract,year,publicationDate,externalIds,citationCount,authors`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 15000 * (attempt + 1))); continue; }
    if (!res.ok) { console.log(`  s2 ${res.status} for "${query.slice(0, 40)}"`); return []; }
    const j = await res.json();
    return (j.data ?? []).map((w) => ({
      openalex_id: `s2:${w.paperId}`, title: w.title, date: w.publicationDate ?? (w.year ? `${w.year}-01-01` : undefined),
      doi: w.externalIds?.DOI ? `https://doi.org/${w.externalIds.DOI}` : undefined, arxiv_id: w.externalIds?.ArXiv,
      authors: (w.authors ?? []).slice(0, 6).map((a) => a.name), cited_by_count: w.citationCount, abstract: w.abstract,
    })).filter((w) => w.title && w.abstract);
  }
  return [];
}

const Verdict = z.object({
  relevant: z.boolean().describe("Whether the paper is actually about this competence or failure mode, not merely adjacent."),
  stance: z.enum(["supports", "contests", "neutral"]).describe("supports: evidence this is a real, distinct competence or failure mode worth tracking on its own (measures it, shows models failing or improving on it specifically). contests: evidence against — models do not fail this way, the effect disappears under a fair test, or it is not distinct from an existing capability named below. neutral: relevant but bears neither way."),
  strength: z.preprocess((v) => ({ weak: 1, slight: 2, moderate: 3, strong: 4, decisive: 5 })[String(v).toLowerCase()] ?? Number(v), z.number().int().min(1).max(5)).describe("How strongly the paper bears on the question, an integer 1 (weak) to 5 (decisive). Measured beats argued; a direct test beats a mention."),
  finding: z.string().describe("One sentence, the paper's finding as it bears on this capability. Concrete: what was measured, on what, and which way it went."),
  subsumed_by: z.preprocess((v) => (v == null ? "" : String(v)), z.string()).describe("If the paper suggests this is really an existing capability, that capability's id from the list; else empty string."),
});
const client = new Anthropic();

async function judge(cap, paper) {
  const existing = active.map((c) => `${c.id}: ${c.label}`).join("\n");
  const shared = `## Proposed capability
id: ${cap.id}
label: ${cap.label}
summary: ${cap.summary}
scope: ${cap.discriminator ?? "(none stated)"}

## Existing capabilities (for the "subsumed" question)
${existing}`;
  const prompt = `## Paper
title: ${paper.title}
date: ${paper.date ?? ""}
abstract: ${paper.abstract ?? paper.summary ?? ""}

Judge whether this paper SUPPORTS treating the proposed capability as a real, distinct thing worth tracking, CONTESTS that, or is neutral. Be strict about "contests": only when the paper's evidence actually cuts against the capability being real or distinct. Return JSON with keys relevant (boolean), stance, strength (integer 1-5), finding, subsumed_by.`;
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 400,
    system: "You judge papers for a catalogue of what language models are good and bad at. Answer with one JSON object and nothing else.",
    messages: [{ role: "user", content: [
      { type: "text", text: shared, cache_control: { type: "ephemeral" } },
      { type: "text", text: prompt },
    ] }],
  });
  const text = (msg.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  try { return Verdict.parse(JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "")); }
  catch (e) { if (process.env.DEBUG_REVIEW) console.log("  parse failed:", text.slice(0, 300), String(e).slice(0, 200)); return null; }
}

const MIN = Number(arg("min-support") ?? 0);
const prior = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
// Keep prior results for capabilities not in this run, and for ones that already meet --min-support.
const keep = new Map((prior?.capabilities ?? []).filter((c) => (ONLY && !ONLY.has(c.id)) || (MIN > 0 && c.supports >= MIN)).map((c) => [c.id, c]));
const review = { generated_at: TODAY, model: MODEL, capabilities: [...keep.values()] };
const newQueue = { window: { from: TODAY, to: TODAY }, generated_at: TODAY, forwarded: true, note: "Found by review-proposed.mjs while gathering evidence for proposed capabilities.", candidates: [] };
let calls = 0;

for (const cap of proposed) {
  if (keep.has(cap.id)) { console.log(`${cap.id}: kept from earlier run`); continue; }
  // Known papers: on the capability, via its claims, and queue papers judged about it.
  const known = new Map();
  const add = (p) => { const k = p.arxiv_id ?? p.openalex_id ?? p.id; if (k && !known.has(k)) known.set(k, p); };
  for (const sid of cap.sources ?? []) { const s = sources.get(sid); if (s) add({ id: sid, title: s.title, date: s.date, abstract: s.summary, url: s.url, arxiv_id: s.arxiv_id, from: "catalog" }); }
  for (const cl of claims.filter((c) => c.capability === cap.id)) for (const l of cl.sources) { const s = sources.get(l.source); if (s) add({ id: l.source, title: s.title, date: s.date, abstract: s.summary, url: s.url, arxiv_id: s.arxiv_id, from: "claim" }); }
  for (const c of queue) {
    const v = (c.verdicts ?? []).find((v) => v.capability === cap.id && v.about_capability);
    if (v || (c.proposal?.proposed_id && [cap.id, ...(cap.merged_ids ?? [])].includes(c.proposal.proposed_id))) add({ ...c, from: "queue", url: c.arxiv_id ? `https://arxiv.org/abs/${c.arxiv_id}` : c.doi });
  }
  let papers = [...known.values()];
  // Top up from OpenAlex.
  if (papers.length < PER + 2) {
    // Relevance-ranked search phrased the way a paper title would be, not
    // the way a capability label reads. Citation-ranked search returns the
    // same generic surveys for every query.
    const terms = (cap.match_terms ?? []).slice(0, 2);
    const q = `large language models ${terms.length ? terms.join(" ") : cap.label}`;
    let found = await s2(q, 12);
    if (found.length < 4) { console.log(`  s2 gave ${found.length}; using OpenAlex relevance search`); found = [...found, ...(await openalex(q, 12))]; }
    for (const w of found) {
      const k = w.arxiv_id ?? w.openalex_id;
      if (known.has(k) || (w.arxiv_id && sources.has(`arxiv-${w.arxiv_id.replace(".", "-")}`))) continue;
      known.set(k, { ...w, from: "search", url: w.arxiv_id ? `https://arxiv.org/abs/${w.arxiv_id}` : w.doi, _raw: w });
      if (known.size >= PER + 4) break;
    }
    papers = [...known.values()];
  }
  const judged = [];
  for (const p of papers.slice(0, PER + 4)) {
    const v = await judge(cap, p); calls++;
    if (!v) continue;
    judged.push({ title: p.title, url: p.url ?? (p.arxiv_id ? `https://arxiv.org/abs/${p.arxiv_id}` : ""), date: p.date, from: p.from, arxiv_id: p.arxiv_id, ...v });
    if (v.relevant && p.from === "search" && p._raw) {
      const w = p._raw;
      newQueue.candidates.push({ openalex_id: w.openalex_id, score: 0, signals: ["review-proposed"], capabilities: [cap.id], title: w.title, date: w.date, arxiv_id: w.arxiv_id, doi: w.doi, authors: w.authors, cited_by_count: w.cited_by_count, abstract: w.abstract });
    }
  }
  const relevant = judged.filter((j) => j.relevant).sort((a, b) => b.strength - a.strength);
  const supports = relevant.filter((j) => j.stance === "supports");
  const contests = relevant.filter((j) => j.stance === "contests");
  const shown = [...supports, ...contests, ...relevant.filter((j) => j.stance === "neutral")].slice(0, 5);
  review.capabilities.push({
    id: cap.id, ref: cap.ref, label: cap.label, summary: cap.summary,
    claims: claims.filter((c) => c.capability === cap.id).length, sources: (cap.sources ?? []).length,
    papers_considered: judged.length, supports: supports.length, contests: contests.length,
    best_supports: supports[0] ?? null, best_contests: contests[0] ?? null,
    subsumed_hints: [...new Set(relevant.map((j) => j.subsumed_by).filter(Boolean))],
    papers: shown,
  });
  console.log(`${cap.id}: ${judged.length} judged, ${supports.length} support, ${contests.length} contest${contests.length ? "" : " (none found)"}`);
}
review.capabilities.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(OUT, JSON.stringify(review, null, 2));
if (newQueue.candidates.length) {
  const existing = fs.existsSync(QUEUE_FILE) ? YAML.parse(fs.readFileSync(QUEUE_FILE, "utf8")) : null;
  if (existing) { const have = new Set(existing.candidates.map((c) => c.arxiv_id ?? c.openalex_id)); for (const c of newQueue.candidates) if (!have.has(c.arxiv_id ?? c.openalex_id)) existing.candidates.push(c); fs.writeFileSync(QUEUE_FILE, YAML.stringify(existing, { lineWidth: 100 })); }
  else fs.writeFileSync(QUEUE_FILE, YAML.stringify(newQueue, { lineWidth: 100 }));
}
console.log(`\n${calls} judgements; wrote ${OUT}${newQueue.candidates.length ? ` and queued ${newQueue.candidates.length} new paper(s) in ${QUEUE_FILE}` : ""}`);
