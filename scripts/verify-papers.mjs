// Verifies every paper with an arxiv_id against the arXiv API: the title in
// the catalog must match arXiv's (normalized). Guards against invented
// citations. Run: npm run verify-papers   (needs network)
//   --changed <git-ref>  check only sources added or modified since that ref
//                        (pull requests: the full pass takes ~20 minutes)
//   --files a.yaml,b.yaml  check only these (paths under catalog/sources)
// A catalog title that matches an earlier arXiv version is a rename by the
// authors, not a bad citation: reported, not failed.
import { execFileSync } from "node:child_process";
import { loadCatalog } from "./catalog-lib.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Primary source. Returns Map<arxivId, title> or null if arXiv rate-limits.
async function fetchArxiv(ids) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`https://export.arxiv.org/api/query?id_list=${ids}&max_results=${CHUNK}`, { headers: { "User-Agent": UA } });
    if (res.status === 429) { console.error(`arXiv HTTP 429 (attempt ${attempt})`); await sleep(5000 * attempt); continue; }
    if (!res.ok) { console.error(`arXiv HTTP ${res.status}`); return null; }
    const xml = await res.text();
    const byId = new Map();
    for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const e = m[1];
      const id = (e.match(/<id>https?:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/) ?? [])[1]?.replace(/v\d+$/, "");
      const title = (e.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? "";
      if (id) byId.set(id, title.replace(/\s+/g, " ").trim());
    }
    return byId;
  }
  console.error("arXiv rate-limited; falling back to Semantic Scholar for this batch");
  return null;
}

// Fallback source: Semantic Scholar batch endpoint, which carries arXiv titles.
async function fetchSemanticScholar(batch) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,externalIds", {
      method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ ids: batch.map((p) => `ArXiv:${p.data.arxiv_id.replace(/v\d+$/, "")}`) }),
    });
    if (res.ok) {
      const byId = new Map();
      for (const r of await res.json()) if (r?.externalIds?.ArXiv) byId.set(r.externalIds.ArXiv, r.title);
      return byId;
    }
    console.error(`Semantic Scholar HTTP ${res.status} (attempt ${attempt})`);
    await sleep(10000 * attempt);
  }
  return null;
}

// Compare what a title says, not how it is encoded: HTML entities
// ("Don&#39;t") and LaTeX markup ("EXAM$^2$: $\\underline{Ex}tending$") are
// renderings of the same title. Then ignore punctuation, hyphens, spacing.
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const norm = (s) => String(s)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
  .replace(/\\[a-zA-Z]+/g, "").replace(/[$^_{}]/g, "")
  .toLowerCase().replace(/[^a-z0-9]/g, "");
const changedAt = process.argv.indexOf("--changed");
const changed = changedAt < 0 ? null : new Set(execFileSync("git", ["diff", "--name-only", "--diff-filter=AM", process.argv[changedAt + 1], "--", "catalog/sources"], { encoding: "utf8" })
  .split("\n").filter(Boolean).map((f) => f.replace(/^catalog\//, "")));
const filesAt = process.argv.indexOf("--files");
const only = filesAt < 0 ? changed : new Set(process.argv[filesAt + 1].split(",").map((f) => `sources/${f.replace(/^(catalog\/)?sources\//, "")}`));
const papers = loadCatalog().sources.filter((p) => p.data.arxiv_id && (!only || only.has(p.file)));

// Title of one specific version, e.g. 2605.01203v1, to tell a rename from a
// wrong citation. null if arXiv does not answer.
async function versionTitle(id) {
  const t = (await fetchArxiv(id))?.get(id.replace(/v\d+$/, ""));
  return t ?? null;
}
const renamed = [];
const CHUNK = 5; // arXiv rate-limits aggressively; keep batches small
const UA = "modelselfhelp-verify/0.1 (+https://github.com/Russ-Miller/RSIratchet)";
let failures = 0;
let unverified = 0;
for (let i = 0; i < papers.length; i += CHUNK) {
  const batch = papers.slice(i, i + CHUNK);
  const ids = batch.map((p) => p.data.arxiv_id.replace(/v\d+$/, "")).join(",");
  const byId = (await fetchArxiv(ids)) ?? (await fetchSemanticScholar(batch));
  if (!byId) { unverified += batch.length; console.error(`UNVERIFIED (both sources unavailable): ${batch.map((p) => p.file).join(", ")}`); continue; }
  for (const p of batch) {
    const want = p.data.arxiv_id.replace(/v\d+$/, "");
    const got = byId.get(want);
    if (!got) { failures++; console.error(`MISSING  ${p.file}: arXiv returned no entry for ${want}`); continue; }
    if (norm(got) === norm(p.data.title)) continue;
    await sleep(3500);
    const v1 = await versionTitle(`${want}v1`);
    if (v1 && norm(v1) === norm(p.data.title)) { renamed.push(p.file); console.warn(`RENAMED  ${p.file}: catalog has the v1 title; arXiv now has\n  ${got}`); continue; }
    failures++; console.error(`MISMATCH ${p.file}\n  catalog: ${p.data.title}\n  arxiv:   ${got}${v1 ? `\n  v1:      ${v1}` : ""}`);
  }
  if (i + CHUNK < papers.length) await sleep(6000); // arXiv asks for 3s between requests; be generous
}
if (failures) { console.error(`${failures} of ${papers.length} papers failed verification.`); process.exit(1); }
if (unverified) { console.error(`${unverified} of ${papers.length} papers could not be checked (sources unavailable); rerun later.`); process.exit(2); }
if (renamed.length) console.warn(`${renamed.length} renamed by their authors since filing (catalog title matches v1).`);
console.log(`All ${papers.length} arXiv papers verified against arXiv titles.`);
