import fs from "node:fs";
import path from "node:path";
import { loadCatalog, ROOT } from "./catalog-lib.mjs";
import { DISCOVERY_VERSION, StoredRecord, hash, normalize, sourceFingerprint, reviewedText, validateDiscovery } from "./heuristic-discovery-lib.mjs";

const cat = loadCatalog();
const papers = cat.sources.map((s) => s.data).filter((s) => s.kind === "paper");
const known = new Map(papers.map((s) => [s.id, s]));
const heuristics = cat.heuristics.map((h) => h.data.id);
const root = path.join(ROOT, "discovery/heuristics");
const inventory = JSON.parse(fs.readFileSync(path.join(root, "inventory.json"), "utf8"));
if (inventory.version !== DISCOVERY_VERSION || !Array.isArray(inventory.sources)) throw new Error("Invalid inventory");
const inventoryIds = new Set();
for (const p of inventory.sources) {
  if (inventoryIds.has(p.source) || !known.has(p.source)) throw new Error(`Invalid inventory source: ${p.source}`);
  inventoryIds.add(p.source);
}
let results = 0, grounded = 0, stale = 0;
for (const name of fs.readdirSync(path.join(root, "papers")).filter((s) => s.endsWith(".json"))) {
  const record = StoredRecord.parse(JSON.parse(fs.readFileSync(path.join(root, "papers", name), "utf8")));
  if (name !== `${record.source}.json` || !known.has(record.source)) throw new Error(`Invalid record source: ${name}`);
  if (record.fingerprint !== sourceFingerprint(known.get(record.source))) { stale++; continue; }
  if (record.candidates.some((c) => c.overlaps_heuristics.some((h) => !heuristics.includes(h)))) throw new Error(`Invalid heuristic overlap: ${name}`);
  for (const c of record.candidates) if (normalize(c.passage).split(" ").length > 25) throw new Error(`Excessive excerpt: ${name}`);
  const cached = path.join(ROOT, ".cache/heuristic-discovery", name);
  if (["candidates", "none"].includes(record.status) && fs.existsSync(cached)) {
    const text = JSON.parse(fs.readFileSync(cached, "utf8"));
    if (text.text_sha256 !== record.text_sha256 || hash(text.text) !== record.text_sha256) throw new Error(`Cached text hash mismatch: ${name}`);
    validateDiscovery({ outcome: record.status === "none" ? "none" : "candidates", reason: record.reason, candidates: record.candidates }, reviewedText(record, text.text), heuristics);
    grounded++;
  }
  results++;
}
console.log(`Discovery OK: ${papers.length} live papers, ${inventoryIds.size} inventoried, ${results} current outcomes, ${stale} stale; ${grounded} cached texts rechecked. ${papers.length - inventoryIds.size} new papers await inventory refresh.`);
