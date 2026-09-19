// Promote pipeline/drafts into the catalog as unreviewed claims.
//
//   node scripts/file-drafts.mjs --dry-run
//   node scripts/file-drafts.mjs
//
// Every claim lands as status: pending-review. The rule for those is visible
// everywhere, authoritative nowhere -- they appear in lists, counts and the
// contested view, and are excluded only where a claim would silently decide
// something. See docs/spec.md.
//
// Free -- reads the queue and the drafts, writes YAML. No API calls.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { fetchTitles, sameTitle } from "./paper-text-lib.mjs";
import { loadCatalog } from "./catalog-lib.mjs";

const dryRun = process.argv.includes("--dry-run");
const DRAFTS = "pipeline/drafts", QUEUE = "pipeline/queue";
const TODAY = new Date().toISOString().slice(0, 10);

const catalog = loadCatalog();
const haveSource = new Set(catalog.sources.map((s) => s.data.id));
const haveClaim = new Set(catalog.claims.map((c) => c.data.id));
const capIds = new Set(catalog.capabilities.map((c) => c.data.id));
const techniques = new Map(catalog.techniques.map((t) => [t.data.id, t.data]));

const queue = new Map();
for (const f of fs.readdirSync(QUEUE).filter((f) => /\.ya?ml$/.test(f))) {
  const d = YAML.parse(fs.readFileSync(path.join(QUEUE, f), "utf8")) ?? {};
  for (const c of d.candidates ?? []) {
    if (c.arxiv_id) queue.set(c.arxiv_id, c);
    else if (String(c.openalex_id ?? "").startsWith("forwarded:")) queue.set(c.openalex_id.slice("forwarded:".length), c);
  }
}

const STOP = new Set("a an the of in on for to and is are that it its when with by as not but so at from can".split(" "));
// Punctuation inside a statement -- "(entailment, consistency, RAG)" -- left
// stray hyphens that broke the slug pattern. Collapse and trim them.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)
  .filter((w) => w && !STOP.has(w)).slice(0, 9).join("-")
  .replace(/-{2,}/g, "-").replace(/^-|-$/g, "");

const wrap = (text, indent = "  ") => {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ");
  const lines = []; let line = indent;
  for (const w of words) {
    if (line.length + w.length + 1 > 76) { lines.push(line); line = indent; }
    line += (line === indent ? "" : " ") + w;
  }
  if (line.trim()) lines.push(line);
  return lines.join("\n");
};

function clip(text, max) {
  const t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.trimEnd()) + " [truncated]";
}

let filed = 0, skipped = 0, techniquesFiled = 0;
const notes = [];

// OpenAlex sometimes attaches the wrong arXiv id to a record (a Zenodo essay
// was filed as 2606.21666 this way). The brief and claim are written from the
// real arXiv text, so a mismatch means the title and abstract are the wrong
// paper's. Ask arXiv for its titles once, in small batches, and refuse to
// file a draft whose queue title does not match.
const draftFiles = fs.readdirSync(DRAFTS).filter((f) => /\.ya?ml$/.test(f));
const toCheck = [...new Set(draftFiles.map((f) => YAML.parse(fs.readFileSync(path.join(DRAFTS, f), "utf8"))?.arxiv_id).filter(Boolean))]
  .filter((id) => !haveSource.has(`arxiv-${id.replace(/\./g, "-")}`));
const arxivTitle = new Map();
for (let i = 0; i < toCheck.length; i += 5) {
  const chunk = toCheck.slice(i, i + 5);
  try { for (const [k, v] of await fetchTitles(chunk)) arxivTitle.set(k, v); }
  catch (e) { console.log(`  title check unavailable for ${chunk.join(", ")}: ${e.message}`); }
  if (i + 5 < toCheck.length) await new Promise((r) => setTimeout(r, 3500));
}

for (const f of draftFiles) {
  const d = YAML.parse(fs.readFileSync(path.join(DRAFTS, f), "utf8"));
  // Non-arXiv forwarded papers carry source_id: the source already exists.
  const pid = d.arxiv_id ?? d.source_id;
  const sid = d.arxiv_id ? `arxiv-${d.arxiv_id.replace(/\./g, "-")}` : d.source_id;
  if (!pid) { skipped++; continue; }
  const cid = slug(d.statement);
  // A source may already exist (file-matched-sources files papers before any
  // claim is drafted); only an existing claim means this draft is done.
  if (haveClaim.has(cid)) { skipped++; continue; }
  if (!capIds.has(d.capability)) { notes.push(`${pid}: unknown capability ${d.capability}`); skipped++; continue; }
  const cand = queue.get(pid);
  if (!cand) { notes.push(`${pid}: no queue metadata`); skipped++; continue; }
  const real = d.arxiv_id ? arxivTitle.get(d.arxiv_id) : undefined;
  if (real && !sameTitle(real, cand.title)) {
    notes.push(`${pid}: queue title "${cand.title.slice(0, 60)}…" is not arXiv's "${real.slice(0, 60)}…" — wrong id attached upstream, not filed`);
    skipped++; continue;
  }

  // A technique link is only valid if that technique addresses this capability.
  // The drafter gets this wrong sometimes; an unreviewed link is recorded as a
  // comment rather than asserted.
  let techLine = "", techNote = "";
  const t = d.technique ? techniques.get(d.technique) : undefined;
  if (t && t.addresses.includes(d.capability)) techLine = `technique: ${d.technique}\n`;
  else if (d.technique) techNote = `Drafter linked technique "${d.technique}", which does not list this capability in addresses -- recorded, not asserted. `;

  // A technique the paper introduces is filed as a record, status proposed,
  // and this claim becomes its first efficacy evidence. Nobody has vouched
  // for it; readers say whether it held up, through the form on its page.
  let newTechnique = null;
  if (!techLine && d.proposed_technique && d.proposed_technique.length >= 3) {
    const tid = slug(d.proposed_technique).split("-").slice(0, 8).join("-");
    const existing = techniques.get(tid);
    if (existing) { if (existing.addresses.includes(d.capability)) techLine = `technique: ${tid}\n`; }
    else if (tid.length >= 3) {
      newTechnique = {
        id: tid, label: d.proposed_technique.slice(0, 60), summary: (d.technique_summary || `${d.proposed_technique}, as introduced by the paper it was drafted from.`).slice(0, 240),
        kind: d.technique_kind || "process", validated_by: d.technique_validated_by || "Not stated",
      };
      techniques.set(tid, { id: tid, addresses: [d.capability] });
      techLine = `technique: ${tid}\n`;
    }
  }

  const src = [
    `id: ${sid}`, "kind: paper", `title: ${JSON.stringify(cand.title)}`,
    `year: ${d.arxiv_id ? "20" + d.arxiv_id.slice(0, 2) : String(cand.date ?? TODAY).slice(0, 4)}`, `date: ${cand.date ?? TODAY}`,
    ...(d.arxiv_id ? [`arxiv_id: "${d.arxiv_id}"`, `url: https://arxiv.org/abs/${d.arxiv_id}`] : [`url: ${cand.doi ?? cand.url ?? ""}`]),
    "tags: [ingested]", "summary: >-", wrap((cand.abstract ?? cand.title).slice(0, 600)),
    `ingested_at: ${TODAY}`, "",
  ].join("\n");

  const claim = [
    `id: ${cid}`, `capability: ${d.capability}`, techLine.trim(),
    "statement: >-", wrap(d.statement),
    `kind: ${d.kind}`, `backing_strength: ${d.backing_strength}`,
    ...(d.scope_condition ? ["observed_on:", `  era: ${JSON.stringify(String(d.scope_condition).replace(/\s+/g, " ").slice(0, 180))}`] : []),
    "sources:", `  - source: ${sid}`, "    stance: supports", "    note: >-",
    // The note field caps at 600 characters; a drafted evidence_note can run
    // past it. Truncate on a sentence boundary rather than mid-word. When the
    // claim is a technique's evidence, say what the paper validated it with.
    wrap(clip((newTechnique ? `Validated by: ${newTechnique.validated_by}. ` : "") + (d.evidence_note || "Drafted from the paper."), 580), "      "),
    "contested: false", "status: pending-review", `last_checked_at: ${TODAY}`, "notes: >-",
    wrap(
      "Drafted from the paper by a model and filed unreviewed. Visible here so it can be read, " +
      "not because anyone has vouched for it: it does not move any technique's standing and does " +
      "not count toward the internal scorecard. " + techNote +
      `Drafted confidence: ${d.confidence ?? "unknown"}. ` +
      `Falsifier as drafted: ${String(d.falsifier ?? "none stated").replace(/\s+/g, " ")} ` +
      (d.stance_on_existing !== "neither" && d.related_claim_id
        ? `Drafted stance toward ${d.related_claim_id}: ${d.stance_on_existing} -- ${String(d.stance_reason ?? "").replace(/\s+/g, " ")} ` : "") +
      (d.proposed_technique && !techLine ? `Proposed technique, not catalogued: ${d.proposed_technique}. ` : "") +
      (d.problems?.length ? `Automatic check flagged: ${d.problems.join("; ")}. ` : "")
    ),
    "submitted_by: agent:claude-opus-5@Russ-Miller", "",
  ].filter((l) => l !== "").join("\n");

  if (!dryRun) {
    if (!haveSource.has(sid)) fs.writeFileSync(path.join("catalog/sources", `${sid}.yaml`), src);
    fs.writeFileSync(path.join("catalog/claims", `${cid}.yaml`), claim);
    if (newTechnique) {
      const tpath = path.join("catalog/techniques", `${newTechnique.id}.yaml`);
      if (!fs.existsSync(tpath)) fs.writeFileSync(tpath, [
        `id: ${newTechnique.id}`, `label: ${JSON.stringify(newTechnique.label)}`,
        "summary: >-", wrap(newTechnique.summary),
        "description: >-", wrap(`${newTechnique.summary} Filed by the drafting stage from ${cand.title} (${pid}) with status proposed: the paper introduces or tests it, and the claim drafted from the paper is its first evidence. The paper validated it by: ${newTechnique.validated_by}. Nobody has vouched for it; add support or contest it on this page.`),
        `addresses: [${d.capability}]`, `kind: ${newTechnique.kind}`, `sources: [${sid}]`,
        "status: proposed", "submitted_by: agent:claude-opus-5@Russ-Miller", "",
      ].join("\n"));
      techniquesFiled++;
    }
  }
  haveSource.add(sid); haveClaim.add(cid); filed++;
}

console.log(`${dryRun ? "[dry run] would file" : "filed"} ${filed} claim(s), ${techniquesFiled} technique(s), skipped ${skipped}`);
for (const n of notes) console.log(`  ${n}`);
if (filed && !dryRun) {
  // These sources land with the raw abstract as `summary` and no `brief`, so
  // their pages show no readable digest until summarize-sources runs. That gap
  // sat unnoticed for 74 papers; say so rather than leave it to be discovered.
  console.log(`\n${filed} new source(s) have no brief yet. Run:\n  npm run summarize -- --all`);
}
