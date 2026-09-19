// A flat, prebuilt index of everything worth finding, generated at build time
// and shipped to the browser as JSON.
//
// The whole catalog is a few hundred records, so there is no server and no
// search dependency: the page ships the index and scores in the browser. That
// keeps the site static, which is what makes it free to host and impossible to
// break with a bad query.
import { getAdages, getCapabilities, getClaims, getSources, getTechniques, isPending } from "./catalog";
import { packedFor } from "./embeddings";

export interface SearchRecord {
  /** c = capability, m = claim, t = technique, s = source. Short because this
   *  ships to every visitor. */
  k: "c" | "m" | "t" | "s" | "a";
  id: string;
  title: string;
  sub?: string;
  /** Lowercased haystack: everything worth matching on. */
  text: string;
  pending?: 1;
  /** Packed embedding, "<scale>|<base64 int8>", for meaning search. */
  v?: string;
}

const vec = (k: SearchRecord["k"], id: string) => {
  const p = packedFor(k, id);
  return p ? { v: `${p.s}|${p.q}` } : {};
};

export function buildSearchIndex(): SearchRecord[] {
  const out: SearchRecord[] = [];

  for (const c of getCapabilities()) {
    out.push({ k: "c", id: c.id, title: c.label, sub: c.summary, ...vec("c", c.id),
      text: [c.id, c.ref, c.label, c.summary, c.description, ...(c.aliases ?? []), ...(c.match_terms ?? []), ...(c.tags ?? [])].join(" ").toLowerCase() });
  }
  for (const t of getTechniques()) {
    out.push({ k: "t", id: t.id, title: t.label, sub: t.summary, ...vec("t", t.id),
      text: [t.id, t.ref, t.label, t.summary, t.description, ...(t.addresses ?? [])].join(" ").toLowerCase() });
  }
  for (const m of getClaims()) {
    out.push({ k: "m", id: m.id, title: m.statement, sub: m.capability, ...vec("m", m.id),
      text: [m.ref, m.statement, m.capability, m.technique ?? "", m.notes ?? "", m.observed_on?.era ?? "", ...m.sources.map((s) => s.note)].join(" ").toLowerCase(),
      ...(isPending(m) ? { pending: 1 as const } : {}) });
  }
  for (const s of getSources()) {
    out.push({ k: "s", id: s.id, title: s.title, ...vec("s", s.id), sub: s.authors?.[0] ? `${s.authors[0]}${s.authors.length > 1 ? " et al." : ""}${s.year ? `, ${s.year}` : ""}` : s.kind,
      text: [s.ref, s.title, s.summary ?? "", ...(s.authors ?? []), s.arxiv_id ?? "", ...(s.tags ?? [])].join(" ").toLowerCase() });
  }
  for (const a of getAdages()) {
    out.push({ k: "a", id: a.id, title: a.label, sub: a.statement, ...vec("a", a.id),
      text: [a.id, a.ref, a.label, a.statement, a.origin, a.transfer, ...(a.aliases ?? [])].join(" ").toLowerCase() });
  }
  return out;
}
