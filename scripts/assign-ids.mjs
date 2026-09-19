// Stable identifiers. Every record gets a short opaque `ref` (CAP-0034,
// CLM-0191, TEC-0027, SRC-0201, ADG-0025, MOD-0003) that never changes and is
// never reused, so the catalog can be cited from outside and a rename of the
// human-readable slug breaks nothing. /id/<ref> redirects to the record.
//
// The ref lives in the record's YAML. catalog/ids.yaml is the allocation
// ledger: the next number per kind, and ref -> slug for every ref ever
// issued, including records since deleted (kept so a number is never reused).
//
//   node scripts/assign-ids.mjs          # assign refs to records lacking one
//   node scripts/assign-ids.mjs --check  # exit 1 if anything is missing or inconsistent
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { loadCatalog, CATALOG } from "./catalog-lib.mjs";

export const PREFIX = { capabilities: "CAP", claims: "CLM", techniques: "TEC", sources: "SRC", adages: "ADG", models: "MOD" };
export const REF_RE = /^(CAP|CLM|TEC|SRC|ADG|MOD)-\d{4}$/;
const LEDGER = path.join(CATALOG, "ids.yaml");

const check = process.argv.includes("--check");
const ledger = fs.existsSync(LEDGER) ? YAML.parse(fs.readFileSync(LEDGER, "utf8")) : { next: {}, refs: {} };
ledger.next ??= {}; ledger.refs ??= {};
const cat = loadCatalog();
const problems = [];
let assigned = 0;

for (const [kind, prefix] of Object.entries(PREFIX)) {
  ledger.next[prefix] ??= 1;
  // Initial backfill is alphabetical by slug; after that, arrival order.
  const recs = [...(cat[kind] ?? [])].sort((a, b) => a.data.id.localeCompare(b.data.id));
  for (const rec of recs) {
    const ref = rec.data.ref;
    if (ref) {
      if (!REF_RE.test(ref) || !ref.startsWith(prefix + "-")) problems.push(`${rec.file}: ref ${ref} is not a ${prefix} ref`);
      else if (ledger.refs[ref] && ledger.refs[ref] !== rec.data.id) problems.push(`${rec.file}: ref ${ref} is issued to ${ledger.refs[ref]} in ids.yaml`);
      else if (!ledger.refs[ref]) {
        if (check) problems.push(`${rec.file}: ref ${ref} is not in ids.yaml`);
        else ledger.refs[ref] = rec.data.id;
      }
      continue;
    }
    if (check) { problems.push(`${rec.file}: no ref — run: npm run ids`); continue; }
    const n = ledger.next[prefix]++;
    const newRef = `${prefix}-${String(n).padStart(4, "0")}`;
    ledger.refs[newRef] = rec.data.id;
    // Insert textually after the id line so the rest of the file is untouched.
    const file = path.join(CATALOG, rec.file);
    const text = fs.readFileSync(file, "utf8");
    const out = text.replace(/^(id:[^\n]*\n)/m, `$1ref: ${newRef}\n`);
    if (out === text) { problems.push(`${rec.file}: could not find id line to insert ref`); continue; }
    fs.writeFileSync(file, out);
    assigned++;
  }
  // next must be past every issued number
  const max = Math.max(0, ...Object.keys(ledger.refs).filter((r) => r.startsWith(prefix + "-")).map((r) => Number(r.slice(4))));
  if (ledger.next[prefix] <= max) ledger.next[prefix] = max + 1;
}

// Duplicate refs across files
const seen = new Map();
for (const kind of Object.keys(PREFIX)) for (const rec of cat[kind] ?? []) {
  const r = rec.data.ref; if (!r) continue;
  if (seen.has(r)) problems.push(`${rec.file}: ref ${r} also used by ${seen.get(r)}`); else seen.set(r, rec.file);
}

if (problems.length) { for (const p of problems) console.error(p); process.exit(1); }
if (!check) {
  const sorted = { next: ledger.next, refs: Object.fromEntries(Object.entries(ledger.refs).sort(([a], [b]) => a.localeCompare(b))) };
  fs.writeFileSync(LEDGER, "# Allocation ledger for stable refs. Numbers are never reused; a deleted\n# record keeps its line here. Written by scripts/assign-ids.mjs.\n" + YAML.stringify(sorted, { lineWidth: 0 }));
  console.log(`assigned ${assigned} ref(s); ledger has ${Object.keys(ledger.refs).length}`);
} else console.log(`refs ok: ${seen.size} records`);
