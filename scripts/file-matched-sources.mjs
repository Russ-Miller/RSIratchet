// Papers the classifier judged to be ABOUT a capability become sources on
// that capability at once, instead of waiting for a claim to be drafted from
// them. A capability page then shows its evidence directly, which is the
// only evidence a proposed capability has. Drafting still happens later and
// cites the same source id, at which point the paper shows through the claim.
//
// Guarded the same way file-drafts is: the queue title must match arXiv's,
// or the paper is skipped (OpenAlex mis-attaches ids).
//
//   node scripts/file-matched-sources.mjs [--limit N] [--dry-run]
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { loadCatalog } from "./catalog-lib.mjs";
import { fetchTitles, sameTitle } from "./paper-text-lib.mjs";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const limit = Number(args[args.indexOf("--limit") + 1]) || 40;
const TODAY = new Date().toISOString().slice(0, 10);
const QUEUE = "pipeline/queue";

const cat = loadCatalog();
const capFiles = new Map(cat.capabilities.map((c) => [c.data.id, { file: path.join("catalog", c.file), data: c.data }]));
const haveSource = new Set(cat.sources.map((s) => s.data.id));
const citedBy = new Map(); // sourceId -> Set(capabilityId) through claims
for (const c of cat.claims) for (const l of c.data.sources ?? []) (citedBy.get(l.source) ?? citedBy.set(l.source, new Set()).get(l.source)).add(c.data.capability);

const wrap = (t, ind = "  ") => {
  const words = String(t).replace(/\s+/g, " ").trim().split(" ");
  const out = []; let line = ind;
  for (const w of words) { if (line.length + w.length + 1 > 76) { out.push(line); line = ind; } line += (line === ind ? "" : " ") + w; }
  if (line.trim()) out.push(line);
  return out.join("\n");
};

// Collect (paper, capability) pairs with a positive verdict not yet on the capability.
const work = [];
for (const f of fs.readdirSync(QUEUE).filter((f) => /\.ya?ml$/.test(f)).sort()) {
  const d = YAML.parse(fs.readFileSync(path.join(QUEUE, f), "utf8")) ?? {};
  for (const c of d.candidates ?? []) {
    if (!c.arxiv_id) continue;
    const sid = `arxiv-${c.arxiv_id.replace(/\./g, "-")}`;
    // Two kinds of positive judgement: a stage-2 verdict, or the proposer
    // having created (or folded into) this capability from this very paper.
    const judgements = (c.verdicts ?? []).filter((v) => v.about_capability).map((v) => ({ capId: v.capability, v }));
    const pid = c.proposal?.proposed_id;
    if (pid) {
      const home = [...capFiles.values()].find((x) => x.data.id === pid || (x.data.merged_ids ?? []).includes(pid));
      if (home) judgements.push({ capId: home.data.id, v: { direction: "proposed", confidence: "high", rationale: c.proposal.rationale ?? "" } });
    }
    const seen = new Set();
    for (const { capId, v } of judgements) {
      if (seen.has(capId)) continue; seen.add(capId);
      const cap = capFiles.get(capId);
      if (!cap) continue;
      if ((cap.data.sources ?? []).includes(sid)) continue;
      // The same paper can sit in several queue files (weekly, review, session
      // sweeps) under different candidate records. The work list is built
      // before anything is written, so the includes() check above cannot see
      // an earlier pair from this run; check the list itself.
      if (work.some((w) => w.sid === sid && w.cap === cap)) continue;
      if (citedBy.get(sid)?.has(capId)) continue;   // already shows through a claim
      work.push({ c, sid, cap, v: { ...v, capability: capId } });
    }
  }
}
console.log(`${work.length} paper–capability pair(s) to file`);
const batch = work.slice(0, limit);

// Title check for papers that would be new sources.
const newIds = [...new Set(batch.filter((w) => !haveSource.has(w.sid)).map((w) => w.c.arxiv_id))];
const arxivTitle = new Map();
for (let i = 0; i < newIds.length; i += 5) {
  const chunk = newIds.slice(i, i + 5);
  try { for (const [k, val] of await fetchTitles(chunk)) arxivTitle.set(k, val); }
  catch (e) { console.log(`  title check unavailable for ${chunk.join(", ")}: ${e.message}`); }
  if (i + 5 < newIds.length) await new Promise((r) => setTimeout(r, 3500));
}

let filed = 0, skipped = 0;
const touched = new Map(); // capId -> [sids]
for (const { c, sid, cap, v } of batch) {
  if (!haveSource.has(sid)) {
    const real = arxivTitle.get(c.arxiv_id);
    if (!real) { console.log(`  ${c.arxiv_id}: arXiv title unavailable, skipped this run`); skipped++; continue; }
    if (!sameTitle(real, c.title)) { console.log(`  ${c.arxiv_id}: queue title does not match arXiv, not filed`); skipped++; continue; }
    if (!dry) {
      fs.writeFileSync(path.join("catalog/sources", `${sid}.yaml`), [
        `id: ${sid}`, "kind: paper", `title: ${JSON.stringify(c.title)}`,
        ...(c.authors?.length ? [`authors: ${JSON.stringify(c.authors.slice(0, 12))}`] : []),
        `year: 20${c.arxiv_id.slice(0, 2)}`, `date: ${c.date ?? TODAY}`,
        `arxiv_id: "${c.arxiv_id}"`, `url: https://arxiv.org/abs/${c.arxiv_id}`,
        "tags: [ingested]", "summary: >-", wrap((c.abstract ?? c.title).slice(0, 600)),
        "notes: >-", wrap(v.direction === "proposed"
          ? `Filed as a source on ${v.capability}: this paper is one of those the pipeline proposed the capability from. ${String(v.rationale ?? "").replace(/\s+/g, " ").slice(0, 300)} No claim has been drafted from it yet.`
          : `Filed as a source on ${v.capability} from the classifier's judgement that the paper is about it (${v.direction}, ${v.confidence}): ${String(v.rationale ?? "").replace(/\s+/g, " ").slice(0, 300)} No claim has been drafted from it yet.`),
        `ingested_at: ${TODAY}`, "",
      ].join("\n"));
      haveSource.add(sid);
    }
  }
  if (!dry) {
    let y = fs.readFileSync(cap.file, "utf8");
    if (/^sources:\s*\[/m.test(y)) y = y.replace(/^sources:\s*\[([^\]]*)\]/m, (m, inner) => `sources: [${inner.trim() ? inner.trim() + ", " : ""}${sid}]`);
    else if (/^sources:\s*$/m.test(y)) y = y.replace(/^(sources:\s*\n(?:  - .*\n)*)/m, `$1  - ${sid}\n`);
    else y = y.replace(/^(status:)/m, `sources: [${sid}]\n$1`);
    fs.writeFileSync(cap.file, y);
    cap.data.sources = [...(cap.data.sources ?? []), sid];
  }
  (touched.get(v.capability) ?? touched.set(v.capability, []).get(v.capability)).push(sid);
  filed++;
}
for (const [capId, sids] of touched) console.log(`  ${capId}: +${sids.length}`);
console.log(`filed ${filed}, skipped ${skipped}${dry ? " (dry run)" : ""}${work.length > batch.length ? `, ${work.length - batch.length} more next run` : ""}`);
