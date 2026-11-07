// Offline triage of existing paper-backed claims. Does not re-read papers or promote content.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readdirSync(path.join(root, "catalog", name)).filter((n) => n.endsWith(".yaml"))
  .map((n) => YAML.parse(fs.readFileSync(path.join(root, "catalog", name, n), "utf8")));
const claims = read("claims"), sources = read("sources"), heuristics = read("heuristics");
const claimById = new Map(claims.map((c) => [c.id, c]));
const sourceById = new Map(sources.map((s) => [s.id, s]));
const paperBacked = claims.filter((c) => c.sources.some((s) => sourceById.get(s.source)?.kind === "paper"));
const extractionPool = paperBacked.filter((c) => c.technique || c.conditions);
const candidates = JSON.parse(fs.readFileSync(path.join(root, "docs/examples/heuristic-mining/candidates.json"), "utf8"));
const ids = new Set();
const candidateSources = new Set();
const candidateClaims = new Set();
let withReviewedSupport = 0;
for (const c of candidates) {
  if (ids.has(c.id)) throw new Error(`Duplicate candidate: ${c.id}`);
  ids.add(c.id);
  if (!c.supports.length || !c.rule || !c.boundary) throw new Error(`Incomplete candidate: ${c.id}`);
  if (c.overlaps_heuristic && !heuristics.some((h) => h.id === c.overlaps_heuristic)) throw new Error(`Unknown overlapping heuristic: ${c.id}`);
  if (c.supports.some((id) => claimById.get(id)?.status === "active")) withReviewedSupport++;
  for (const id of [...c.supports, ...c.qualifies]) {
    const claim = claimById.get(id);
    if (!claim) throw new Error(`Unknown claim ${id}`);
    candidateClaims.add(id);
    for (const s of claim.sources) {
      if (!sourceById.has(s.source)) throw new Error(`Unknown source ${s.source}`);
      if (sourceById.get(s.source).kind === "paper") candidateSources.add(s.source);
    }
  }
  if (!c.supports.some((id) => claimById.get(id).sources.some((s) => sourceById.get(s.source)?.kind === "paper"))) throw new Error(`No paper support: ${c.id}`);
}
console.log(JSON.stringify({
  sources: sources.length, papers: sources.filter((s) => s.kind === "paper").length,
  claims: claims.length, paperBackedClaims: paperBacked.length,
  paperRecordsWithClaims: new Set(paperBacked.flatMap((c) => c.sources.filter((s) => sourceById.get(s.source)?.kind === "paper").map((s) => s.source))).size,
  rawExtractionPool: extractionPool.length,
  candidates: candidates.length, candidatesWithExistingHeuristicOverlap: candidates.filter((c) => c.overlaps_heuristic).length,
  candidatesWithSomeHumanReviewedSupport: withReviewedSupport,
  distinctCandidateClaims: candidateClaims.size, distinctCandidatePapers: candidateSources.size,
  caveat: "First editorial pass over catalog claims, not exhaustive full-text mining. Candidates are unvalidated proposals; related rules may merge. Source records are not independently verified replications.",
}, null, 2));
