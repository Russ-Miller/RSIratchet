// Re-run capability matching over every queue candidate against the CURRENT
// catalog. Matching normally happens once, at fetch time, so a paper that
// arrived before a capability existed never gets tagged with it — which is
// exactly the paper that motivated proposing the capability. Adds new matches
// only; never removes. Stage 2 then judges the new pairs on its next run.
//
//   node scripts/rematch-queue.mjs
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { matchCapabilities } from "./match-lib.mjs";

const QUEUE_DIR = "pipeline/queue";
const files = fs.existsSync(QUEUE_DIR) ? fs.readdirSync(QUEUE_DIR).filter((f) => /\.ya?ml$/.test(f)).sort() : [];
let added = 0, papers = 0;
const byCap = {};
for (const f of files) {
  const file = path.join(QUEUE_DIR, f);
  const parsed = YAML.parse(fs.readFileSync(file, "utf8"));
  let changed = false;
  for (const c of parsed?.candidates ?? []) {
    const have = new Set(c.capabilities ?? []);
    const fresh = matchCapabilities(c).filter((id) => !have.has(id));
    if (!fresh.length) continue;
    c.capabilities = [...have, ...fresh];
    changed = true; papers++; added += fresh.length;
    for (const id of fresh) (byCap[id] ??= []).push(c.arxiv_id ?? c.openalex_id);
  }
  if (changed) fs.writeFileSync(file, YAML.stringify(parsed, { lineWidth: 100 }));
}
console.log(`rematch: ${added} new capability tag(s) on ${papers} paper(s)`);
for (const [id, ids] of Object.entries(byCap)) console.log(`  ${id}: ${ids.join(", ")}`);
