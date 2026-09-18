// Validates every catalog record against its schema and checks referential
// integrity. Exit code 1 on any problem. Run: npm run validate
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { loadCatalog, loadSchema, KINDS } from "./catalog-lib.mjs";

const SCHEMA_FOR = { capabilities: "capability", sources: "source", techniques: "technique", models: "model", claims: "claim", adages: "adage" };
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(loadSchema("common"));
const validators = Object.fromEntries(Object.entries(SCHEMA_FOR).map(([k, s]) => [k, ajv.compile(loadSchema(s))]));

const cat = loadCatalog();
const problems = [];
const problem = (file, msg) => problems.push(`${file}: ${msg}`);

// 1. schema + id/filename agreement + duplicates
const ids = {};
for (const kind of KINDS) {
  ids[kind] = new Set();
  for (const rec of cat[kind]) {
    const ok = validators[kind](rec.data);
    if (!ok) for (const e of validators[kind].errors) problem(rec.file, `${e.instancePath || "/"} ${e.message}`);
    if (!rec.data || typeof rec.data !== "object") continue;
    if (rec.data.id !== rec.stem) problem(rec.file, `id "${rec.data.id}" does not match filename`);
    if (ids[kind].has(rec.data.id)) problem(rec.file, `duplicate id ${rec.data.id}`);
    ids[kind].add(rec.data.id);
  }
}

// 2. taxonomy (soft vocabulary — still validated as a closed list for now)
const tags = new Set((cat.taxonomy.groups ?? []).map((g) => g.id).concat((cat.taxonomy.contexts ?? []).map((c) => c.id)));
for (const g of cat.taxonomy.groups ?? []) if (!SLUG.test(g.id)) problem("taxonomy.yaml", `bad group id ${g.id}`);
for (const c of cat.taxonomy.contexts ?? []) if (!SLUG.test(c.id)) problem("taxonomy.yaml", `bad context id ${c.id}`);

const checkRef = (file, set, id, what) => { if (!set.has(id)) problem(file, `unknown ${what} "${id}"`); };

// 3. references
for (const cap of cat.capabilities) {
  const d = cap.data;
  for (const t of d.tags ?? []) checkRef(cap.file, tags, t, "tag");
  for (const t of d.techniques ?? []) checkRef(cap.file, ids.techniques, t, "technique");
  for (const r of d.related ?? []) checkRef(cap.file, ids.capabilities, r, "capability");
  if (d.parent) checkRef(cap.file, ids.capabilities, d.parent, "parent capability");
}
const addressedBy = new Map(cat.techniques.map((t) => [t.data.id, new Set(t.data.addresses ?? [])]));
for (const t of cat.techniques) {
  const d = t.data;
  for (const a of d.addresses ?? []) checkRef(t.file, ids.capabilities, a, "capability");
  for (const s of d.sources ?? []) checkRef(t.file, ids.sources, s, "source");
  for (const c of d.contexts ?? []) checkRef(t.file, tags, c, "context");
}
const today = new Date().toISOString().slice(0, 10);
for (const c of cat.claims) {
  const d = c.data;
  checkRef(c.file, ids.capabilities, d.capability, "capability");
  if (d.technique) {
    checkRef(c.file, ids.techniques, d.technique, "technique");
    // An efficacy claim asserts a technique moves a capability, so that
    // technique must actually address the capability the claim sits under.
    const addresses = addressedBy.get(d.technique);
    if (addresses && !addresses.has(d.capability)) problem(c.file, `efficacy claim references technique ${d.technique}, which does not list ${d.capability} in addresses`);
  }
  for (const t of d.tags ?? []) checkRef(c.file, tags, t, "tag");
  for (const s of d.sources) checkRef(c.file, ids.sources, s.source, "source");
  if (d.observed_on?.model) checkRef(c.file, ids.models, d.observed_on.model, "model");
  if (d.observed_on?.task_type) checkRef(c.file, tags, d.observed_on.task_type, "task_type");
  if (d.superseded_by) checkRef(c.file, ids.claims, d.superseded_by, "claim");
  if (d.last_checked_at > today) problem(c.file, `last_checked_at ${d.last_checked_at} is in the future`);
  if (d.last_new_evidence_at && d.last_new_evidence_at > today) problem(c.file, `last_new_evidence_at ${d.last_new_evidence_at} is in the future`);
  const hasContest = d.sources.some((s) => s.stance === "contests");
  if (d.contested && !d.disagreement_axis) problem(c.file, "contested but no disagreement_axis — a bare contested flag carries no information");
  if (d.contested && !hasContest) problem(c.file, "contested but no source has stance: contests");
  if (!d.contested && hasContest) problem(c.file, "has a contests-stance source but contested is false");
}
// technique back-links: a capability listing a technique must be in that technique's `addresses`
for (const cap of cat.capabilities) for (const t of cap.data.techniques ?? []) if (addressedBy.has(t) && !addressedBy.get(t).has(cap.data.id)) problem(cap.file, `technique ${t} does not list ${cap.data.id} in addresses`);

// applicability conditions describe a technique, so they need one
for (const c of cat.claims) if (c.data.conditions && !c.data.technique) problem(c.file, "conditions set on a claim with no technique");

// a capability's primary group must be a taxonomy group
const groupIds = new Set((cat.taxonomy.groups ?? []).map((g) => g.id));
for (const c of cat.capabilities) if (c.data.group && !groupIds.has(c.data.group)) problem(c.file, `unknown group "${c.data.group}"`);

// adage evidence must point at claims that exist
for (const a of cat.adages) {
  for (const e of a.data.evidence ?? []) checkRef(a.file, ids.claims, e.claim, "claim");
  for (const s of a.data.sources ?? []) checkRef(a.file, ids.sources, s, "source");
}

const counts = KINDS.map((k) => `${cat[k].length} ${k}`).join(", ");
if (problems.length) {
  console.error(`Catalog validation failed (${problems.length} problem${problems.length > 1 ? "s" : ""}):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`Catalog OK: ${counts}, ${tags.size} tags.`);
