// Shared between the build-time embedder, the freshness check and (via a
// near-identical copy in src/lib) the site. One place defines what text a
// record is embedded from and how a vector is packed.
import crypto from "node:crypto";

export const MODEL = "Xenova/all-MiniLM-L6-v2";
export const DTYPE = "q8";
export const DIM = 384;

/** The text a record is embedded from: title plus the prose that says what it is. */
export function recordTexts(cat) {
  // scripts/catalog-lib wraps each record as {file, stem, data}; the app's
  // loader returns the record itself. Accept both.
  const rows = (xs) => xs.map((x) => (x && "data" in x && x.data ? x.data : x));
  const out = [];
  // Aliases and the discriminator carry the everyday phrasings ("making
  // things up") that label and summary do not; without them a colloquial
  // description of a failure lands on the wrong capability.
  for (const c of rows(cat.capabilities)) out.push({ key: `c:${c.id}`, text: [c.label, ...(c.aliases ?? []), c.summary, c.discriminator, c.description].filter(Boolean).join(". ") });
  for (const t of rows(cat.techniques)) out.push({ key: `t:${t.id}`, text: [t.label, t.summary, t.description].filter(Boolean).join(". ") });
  for (const m of rows(cat.claims)) out.push({ key: `m:${m.id}`, text: [m.statement, m.notes].filter(Boolean).join(". ") });
  for (const s of rows(cat.sources)) out.push({ key: `s:${s.id}`, text: [s.title, s.summary].filter(Boolean).join(". ") });
  for (const a of rows(cat.heuristics ?? [])) out.push({ key: `a:${a.id}`, text: [a.label, a.statement, a.transfer].filter(Boolean).join(". ") });
  return out;
}

export const textHash = (text) => crypto.createHash("sha1").update(text).digest("hex").slice(0, 12);

/** Pack a unit vector as int8 with a per-vector scale, base64 encoded. */
export function pack(vec) {
  let max = 0;
  for (const x of vec) max = Math.max(max, Math.abs(x));
  const scale = max / 127 || 1;
  const q = new Int8Array(vec.length);
  for (let i = 0; i < vec.length; i++) q[i] = Math.round(vec[i] / scale);
  return { s: Number(scale.toPrecision(6)), q: Buffer.from(q.buffer).toString("base64") };
}
