import { NextResponse } from "next/server";
import { adageStanding, claimsAboutTechnique, claimsCiting, claimsFor, getAdages, getCapabilities, getClaims, getSources, getTechniques, sourcesFor, techniquesFor } from "@/lib/catalog";

// A machine-readable index of the whole catalog, built once at deploy time.
// Same content as the pages, minus prose: refs, labels, summaries, counts and
// links. An agent that is not running the MCP server can fetch this one file.
export const dynamic = "force-static";

const SITE = "https://rsiratchet.com";

export function GET() {
  const capabilities = getCapabilities().map((c) => ({
    ref: c.ref, id: c.id, label: c.label, summary: c.summary, group: c.group ?? null, status: c.status,
    aliases: c.aliases ?? [], tags: c.tags ?? [], parent: c.parent ?? null,
    counts: { claims: claimsFor(c.id).length, contested: claimsFor(c.id).filter((x) => x.contested).length, techniques: techniquesFor(c.id).length, sources: sourcesFor(c.id).length },
    url: `${SITE}/capabilities/${c.id}`,
  }));
  const techniques = getTechniques().map((t) => {
    const about = claimsAboutTechnique(t.id);
    return {
      ref: t.ref, id: t.id, label: t.label, summary: t.summary, kind: t.kind, status: t.status, addresses: t.addresses,
      counts: { claims: about.length, sources: (t.sources ?? []).length },
      url: `${SITE}/techniques/${t.id}`,
    };
  });
  const claims = getClaims().map((c) => ({
    ref: c.ref, id: c.id, capability: c.capability, technique: c.technique ?? null, statement: c.statement, kind: c.kind,
    backing_strength: c.backing_strength, contested: c.contested, status: c.status,
    sources: c.sources.map((s) => ({ source: s.source, stance: s.stance })),
    url: `${SITE}/claims/${c.id}`,
  }));
  const sources = getSources().map((s) => ({
    ref: s.ref, id: s.id, kind: s.kind, title: s.title, year: s.year ?? null, arxiv_id: s.arxiv_id ?? null, external_url: s.url ?? null,
    counts: { claims: claimsCiting(s.id).length },
    url: `${SITE}/sources/${s.id}`,
  }));
  const adages = getAdages().map((a) => ({
    ref: a.ref, id: a.id, label: a.label, statement: a.statement, standing: adageStanding(a),
    counts: { evidence: (a.evidence ?? []).length }, url: `${SITE}/adages/${a.id}`,
  }));
  return NextResponse.json({
    site: SITE, generated_at: new Date().toISOString().slice(0, 10), license: { code: "MIT", content: "CC BY 4.0" },
    ref_lookup: `${SITE}/id/<ref>`,
    counts: { capabilities: capabilities.length, techniques: techniques.length, claims: claims.length, sources: sources.length, adages: adages.length },
    capabilities, techniques, claims, sources, adages,
  });
}
