// Read-only access to the YAML catalog for the site.
// Loaded once per process at build/request time; the catalog is small.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export type SourceKind = "paper" | "observation" | "post" | "vendor-doc";
export type Stance = "supports" | "contests";
export type ClaimKind = "mechanism" | "observation";
export type BackingStrength = "single-paper" | "replicated" | "mechanism-reasoning" | "own-observation";
/** `proposed` is mined from the literature and added without anyone endorsing
 *  it -- the capability equivalent of a pending-review claim. */
export type CapabilityStatus = "proposed" | "active" | "parked";
/** `pending-review` is ingested but not endorsed: browsable, and deliberately
 *  inert everywhere a claim would otherwise carry weight. */
export type ClaimStatus = "pending-review" | "active" | "superseded" | "retired";
/** Record lifecycle, deliberately NOT a verdict on whether the technique works.
 *  Efficacy lives in claims that reference the technique. */
export type TechniqueStatus = "active" | "superseded";

export interface SourceLink {
  source: string; stance: Stance; note: string;
  /** Who added this citation and when. Optional, but the only record of the
   *  single most creditworthy act in the index: adding a contesting source to
   *  a claim someone else made. See docs/reputation-notes.md. */
  submitted_by?: string; added_at?: string;
}
export interface DisagreementAxis { description: string; is_guess: boolean }
export interface ObservedOn { model?: string; era?: string; task_type?: string }

export interface Capability {
  id: string; label: string; summary: string; description: string;
  tags?: string[]; parent?: string; aliases?: string[]; techniques?: string[]; related?: string[];
  /** Vocabulary used to topically match ingestion candidates to this capability. */
  match_terms?: string[];
  /** Inclusion/exclusion boundary for this capability, including known
   *  near-misses. Written for a classifier deciding whether a paper is really
   *  about this capability, and useful to a human reviewer for the same call. */
  discriminator?: string;
  status: CapabilityStatus; submitted_by: string;
  /** Primary home among taxonomy groups; tags may name others. */
  group?: string;
}
export interface Source {
  id: string; kind: SourceKind; title: string; authors?: string[]; year?: number; date?: string;
  arxiv_id?: string; url?: string; venue?: string; summary?: string; tags?: string[]; code_url?: string;
  ingested_at: string;
  citations_total?: number; citations_recent_12mo?: number; citations_checked_at?: string;
  semantic_scholar_id?: string;
  /** Reader-facing digest in the house style, generated from the abstract by
   *  scripts/summarize-sources.mjs. `summary` stays a hand-written gloss. */
  brief?: string; brief_generated_at?: string; brief_model?: string;
  /** Figures in `brief` that are not in the abstract it came from. Non-empty
   *  means the digest is suspect and must be read before it is trusted. */
  brief_unverified_figures?: string[];
}
export type Effect = "helps" | "narrows" | "no-effect" | "hurts";
export type Need = "external-signal" | "executable-environment" | "retrieval-corpus" | "fine-tuning-access" | "separate-model" | "evaluation-split" | "complete-mediation" | "raw-history";
export type HelpsMost = "weaker-models" | "stronger-models" | "independent";
export type Cost = "low" | "moderate" | "high";
/** Applicability of a technique as one efficacy claim states it. See claim.schema.json. */
export interface Conditions { effect: Effect; needs?: Need[]; helps_most?: HelpsMost; cost?: Cost; fails_when: string }

export const NEED_LABEL: Record<Need, string> = {
  "external-signal": "an external signal (a test, a compiler, an environment outcome)",
  "executable-environment": "an environment where code can run",
  "retrieval-corpus": "documents or an index to retrieve from",
  "fine-tuning-access": "access to train the weights",
  "separate-model": "a second model with its own context",
  "evaluation-split": "a held-out evaluation set",
  "complete-mediation": "a harness that sees every side effect",
  "raw-history": "the unsummarised record kept retrievable",
};
export const EFFECT_LABEL: Record<Effect, string> = { helps: "helps", narrows: "helps, narrowly", "no-effect": "no effect", hurts: "hurts" };

export interface Claim {
  id: string; capability: string; statement: string; tags?: string[];
  /** Set when this claim asserts a technique moves the capability, and under what conditions. */
  technique?: string;
  conditions?: Conditions;
  kind: ClaimKind; backing_strength: BackingStrength; observed_on?: ObservedOn;
  sources: SourceLink[]; contested: boolean; disagreement_axis?: DisagreementAxis;
  status: ClaimStatus; superseded_by?: string;
  last_checked_at: string; last_new_evidence_at?: string; notes?: string; submitted_by: string;
  reviewed_by?: string[];
}
export interface Repo { url: string; note: string; verified_on?: string }
export interface NearestMiss { source?: string; title?: string; url?: string; why_it_does_not_fit: string }
/** A record of having looked for efficacy evidence and come up empty. Absent
 *  means nobody has looked -- a different state from a documented dead end,
 *  and the whole point of the distinction. */
export interface EvidenceSearch { searched_on: string; note: string; nearest_miss?: NearestMiss[] }
export type AdageVerdict = "holds" | "breaks" | "narrows";
export interface AdageEvidence { claim: string; verdict: AdageVerdict; note: string }
export interface Adage {
  id: string; label: string; aliases?: string[]; statement: string; origin: string; transfer: string;
  sources?: string[];
  evidence?: AdageEvidence[];
  evidence_search?: { searched_on: string; note: string; nearest_miss?: string[] };
  status: "active" | "retired"; submitted_by: string; notes?: string;
}

export interface Technique {
  id: string; label: string; summary: string; description: string; addresses: string[];
  kind: "prompting" | "retrieval" | "tooling" | "training" | "decoding" | "architecture" | "process";
  sources?: string[]; repos?: Repo[]; contexts?: string[];
  /** Prerequisites and applicability -- what you need to use it. Never efficacy. */
  requires?: string;
  evidence_search?: EvidenceSearch;
  status: TechniqueStatus; submitted_by: string;
}
export interface ModelVersion { id: string; label: string; released?: string; card?: string }
export interface Model { id: string; label: string; vendor: string; url?: string; versions: ModelVersion[] }
export interface TaxonomyEntry { id: string; label: string; description: string }

/**
 * Model versions named in a piece of prose (usually a claim's observed_on.era)
 * that have a card on file. Matching on the version label is deliberately
 * dumb: the era field is free text, and a link to the wrong card would be
 * worse than none, so only an exact label match counts.
 */
export function cardsNamedIn(text: string | undefined): ModelVersion[] {
  if (!text) return [];
  const out: ModelVersion[] = [];
  for (const m of loadCatalog().models) for (const v of m.versions) if (v.card && text.includes(v.label)) out.push(v);
  return out;
}
export interface Taxonomy { groups: TaxonomyEntry[]; contexts: TaxonomyEntry[] }

export interface Catalog {
  taxonomy: Taxonomy;
  capabilities: Capability[]; claims: Claim[]; sources: Source[]; techniques: Technique[]; models: Model[];
  adages: Adage[];
}

const CATALOG_DIR = path.join(process.cwd(), "catalog");

function readDir<T>(dir: string): T[] {
  const full = path.join(CATALOG_DIR, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full)
    .filter((f) => /\.ya?ml$/.test(f))
    .sort()
    .map((f) => YAML.parse(fs.readFileSync(path.join(full, f), "utf8")) as T);
}

let cache: Catalog | null = null;

export function loadCatalog(): Catalog {
  if (cache) return cache;
  cache = {
    taxonomy: YAML.parse(fs.readFileSync(path.join(CATALOG_DIR, "taxonomy.yaml"), "utf8")) as Taxonomy,
    capabilities: readDir<Capability>("capabilities"),
    claims: readDir<Claim>("claims"),
    sources: readDir<Source>("sources"),
    techniques: readDir<Technique>("techniques"),
    models: readDir<Model>("models"),
    adages: readDir<Adage>("adages"),
  };
  return cache;
}

/** Sorted by the label, because that is what the reader sees. Files sort by
 *  id, and an id rarely resembles its label -- "arithmetic" displays as
 *  "Digit-level arithmetic" -- so file order looks like no order at all. */
export const getCapabilities = () =>
  [...loadCatalog().capabilities].sort((a, b) => a.label.localeCompare(b.label));
export const getCapability = (id: string) => loadCatalog().capabilities.find((c) => c.id === id);
export const isProposed = (c: Capability) => c.status === "proposed";
export const getClaims = () => loadCatalog().claims;
/** Ingested but not yet endorsed by a human. */
export const isPending = (c: Claim) => c.status === "pending-review";
/** "human:Russ-Miller" -> "Russ Miller"; "agent:claude-opus-5@x" -> "Claude Opus 5". */
export function displayName(prov: string): string {
  const [kind, rest] = prov.split(":", 2);
  // "claude-fable-5-1" -> "claude fable 5.1": a hyphen between digits is a version dot.
  const name = (rest ?? prov).split("@")[0].replace(/(\d)-(?=\d)/g, "$1.").replace(/-/g, " ");
  return kind === "agent" ? name.replace(/\b\w/g, (ch) => ch.toUpperCase()) : name;
}

/**
 * Who has read a claim. Explicit `reviewed_by` wins; otherwise it is derived:
 * every claim was drafted or checked by a model, and a human submitter has
 * by definition reviewed what they submitted. The label describes who has
 * read it, not a deficiency -- a claim reviewed by AI alone is complete and
 * consumable; a person reading it is what adds it to standings.
 */
export function reviewers(c: Claim): { humans: string[]; agents: string[] } {
  const list = c.reviewed_by ?? [c.submitted_by];
  return {
    humans: list.filter((p) => p.startsWith("human:")),
    agents: list.filter((p) => p.startsWith("agent:")),
  };
}
export function reviewLabel(c: Claim): string {
  const { humans } = reviewers(c);
  return humans.length ? `Reviewed by AI and ${humans.map(displayName).join(", ")}` : "Reviewed by AI";
}

/**
 * Claims that carry authority. The line is: unreviewed claims are VISIBLE
 * EVERYWHERE and AUTHORITATIVE NOWHERE.
 *
 * Visible, because the index is useful before it is verified -- that is the
 * whole proposition. Hiding unreviewed content from browsing views would make
 * the catalog look emptier than it is, and with roughly half of it unreviewed
 * that is a large lie told by omission.
 *
 * Not authoritative, because a verdict derived from unchecked content is a
 * verdict nobody made. So this is used only where a claim would silently
 * decide something: a technique's standing, and the backtest scorecard.
 * Listing, counting and browsing use every claim, marked.
 */
export const reviewedClaims = () => loadCatalog().claims.filter((c) => !isPending(c));
export const getClaim = (id: string) => loadCatalog().claims.find((c) => c.id === id);
export const getSources = () =>
  [...loadCatalog().sources].sort((a, b) => a.title.localeCompare(b.title));
export const getSource = (id: string) => loadCatalog().sources.find((s) => s.id === id);
export const getTechniques = () =>
  [...loadCatalog().techniques].sort((a, b) => a.label.localeCompare(b.label));
export const getTechnique = (id: string) => loadCatalog().techniques.find((t) => t.id === id);
export const getAdages = () => [...loadCatalog().adages].sort((a, b) => a.label.localeCompare(b.label));
export const getAdage = (id: string) => loadCatalog().adages.find((a) => a.id === id);
export const getModel = (id: string) => loadCatalog().models.find((m) => m.id === id);
export const getTagLabel = (id: string) => {
  const t = loadCatalog().taxonomy;
  return t.groups.find((g) => g.id === id)?.label ?? t.contexts.find((c) => c.id === id)?.label ?? id;
};

export const claimsFor = (capabilityId: string) => loadCatalog().claims.filter((c) => c.capability === capabilityId);
/** Efficacy claims: assertions that this technique moves some capability. */
export const claimsAboutTechnique = (techniqueId: string) => reviewedClaims().filter((c) => c.technique === techniqueId);
export const techniquesFor = (capabilityId: string) =>
  getTechniques().filter((t) => t.addresses.includes(capabilityId));

/** Every claim that cites a given source, alongside the stance that claim's citation carries. */
export function claimsCiting(sourceId: string): { claim: Claim; stance: Stance }[] {
  const out: { claim: Claim; stance: Stance }[] = [];
  for (const claim of loadCatalog().claims) {
    const link = claim.sources.find((s) => s.source === sourceId);
    if (link) out.push({ claim, stance: link.stance });
  }
  return out;
}

/** Capabilities grouped by their first tag (loose grouping — tags are soft, see spec §7). */
export function capabilitiesByGroup(): { group: TaxonomyEntry; capabilities: Capability[] }[] {
  const { taxonomy, capabilities } = loadCatalog();
  const sorted = [...capabilities].sort((a, b) => a.label.localeCompare(b.label));
  // One primary home per capability so the map has no duplicates; a
  // capability with no `group` falls back to its first group-valued tag.
  const home = (c: Capability) => c.group ?? c.tags?.find((t) => taxonomy.groups.some((g) => g.id === t));
  return taxonomy.groups
    .map((group) => ({ group, capabilities: sorted.filter((c) => home(c) === group.id) }))
    .filter((g) => g.capabilities.length > 0);
}

/** Claims marked contested, i.e. carrying sources on both sides. */
/** Every contested claim, unreviewed ones included and badged. Filtering these
 *  out would hide half the disagreements in the index, which is the opposite
 *  of what the page is for. */
export const contestedClaims = () => loadCatalog().claims.filter((c) => c.contested);

/** Capabilities that hold at least one contested claim, with those claims. */
export function capabilitiesWithDispute(): { capability: Capability; claims: Claim[] }[] {
  const byCapability = new Map<string, Claim[]>();
  for (const c of contestedClaims()) {
    if (!byCapability.has(c.capability)) byCapability.set(c.capability, []);
    byCapability.get(c.capability)!.push(c);
  }
  return [...byCapability.entries()]
    .map(([id, claims]) => ({ capability: getCapability(id)!, claims }))
    .filter((x) => x.capability)
    .sort((a, b) => b.claims.length - a.claims.length);
}

/** Claims sorted by most-recently-checked first, for a recent-activity-style view. */
export function claimsByRecency(): Claim[] {
  return [...loadCatalog().claims].sort((a, b) => (b.last_checked_at || "").localeCompare(a.last_checked_at || ""));
}

/** Sources sorted by most-recently-ingested first. */
export function sourcesByRecency(): Source[] {
  return [...loadCatalog().sources].sort((a, b) => (b.ingested_at || "").localeCompare(a.ingested_at || ""));
}

/**
 * A source is "quiet" when we've checked its citation activity, it's had
 * no citations in the last 12 months, and it's at least 2 years old. Only
 * ever true when citations_checked_at is present — a source we haven't
 * checked yet is never treated as quiet, since absence of data isn't
 * evidence of staleness.
 */
export function isQuietSource(s: Source): boolean {
  if (!s.citations_checked_at) return false;
  const pubYear = s.year ?? (s.date ? Number(s.date.slice(0, 4)) : undefined);
  const age = pubYear ? new Date().getFullYear() - pubYear : 0;
  return (s.citations_recent_12mo ?? 0) === 0 && age >= 2;
}

/**
 * Techniques with no efficacy claim behind them, split by whether anyone has
 * actually looked. The distinction is the point: an empty cell can mean the
 * literature is silent or only that this catalog is. A documented search is a
 * negative result with provenance and reads as a research brief; no search is
 * just an unchecked box, and the view must not advertise the second as the
 * first.
 */
export type OpenKind = "searched" | "unsearched" | "asserted-not-measured";
export interface OpenQuestion { technique: Technique; kind: OpenKind; claims: Claim[] }

export function openQuestions(): OpenQuestion[] {
  const rank: Record<OpenKind, number> = { searched: 0, unsearched: 1, "asserted-not-measured": 2 };
  const out: OpenQuestion[] = [];
  for (const technique of loadCatalog().techniques) {
    if (technique.status !== "active") continue;
    const claims = claimsAboutTechnique(technique.id);
    if (claims.length === 0) {
      out.push({ technique, kind: technique.evidence_search ? "searched" : "unsearched", claims });
    } else if (!claims.some(isMeasured)) {
      // Believed for a structural reason, never measured. A weaker opening
      // than silence, but still an opening.
      out.push({ technique, kind: "asserted-not-measured", claims });
    }
  }
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || a.technique.label.localeCompare(b.technique.label));
}

/** Backing strengths where somebody actually measured the effect, as opposed
 *  to arguing it from how the technique works. */
const MEASURED: BackingStrength[] = ["single-paper", "replicated", "own-observation"];
const isMeasured = (c: Claim) => MEASURED.includes(c.backing_strength);

/**
 * Aggregate citation activity for the sources a claim rests on. Uses the
 * liveliest source rather than a total: one paper the field is still citing
 * means the evidence base is live, and summing across papers would invent a
 * figure nobody reported. Only counts sources whose citations have been
 * checked -- unchecked is not the same as quiet.
 */
export interface ClaimActivity { checked: Source[]; unchecked: number; maxRecent: number; allQuiet: boolean }
export function claimActivity(claim: Claim): ClaimActivity | null {
  const sources = claim.sources.map((s) => getSource(s.source)).filter((s): s is Source => !!s);
  const checked = sources.filter((s) => s.citations_checked_at);
  if (checked.length === 0) return null;
  return {
    checked: [...checked].sort((a, b) => (b.citations_recent_12mo ?? 0) - (a.citations_recent_12mo ?? 0)),
    unchecked: sources.length - checked.length,
    maxRecent: Math.max(...checked.map((s) => s.citations_recent_12mo ?? 0)),
    allQuiet: checked.every(isQuietSource),
  };
}

/**
 * Capabilities with a documented weakness and nothing known to close it. A
 * weakness is a position on the capability, not a separate entity -- the axis
 * stays neutral, which is why this reads off claims rather than a flag.
 * The counterpart to openQuestions(): that view asks whether a technique
 * works, this one asks whether anything works at all. Split the same way,
 * because "no technique catalogued" and "techniques catalogued, none measured"
 * are different invitations.
 */
export type UnsolvedKind = "no-technique" | "none-measured";
export interface Unsolved { capability: Capability; kind: UnsolvedKind; claims: Claim[]; techniques: Technique[] }

export function unsolvedCapabilities(): Unsolved[] {
  const out: Unsolved[] = [];
  for (const capability of loadCatalog().capabilities) {
    // Only endorsed capabilities. A proposed one having no mitigation says
    // nothing -- nobody has decided it is a real topic yet.
    if (capability.status !== "active") continue;
    // Descriptive, not a verdict: an unreviewed claim still documents that
    // someone found something here, which is what this test is asking.
    const claims = claimsFor(capability.id);
    if (claims.length === 0) continue; // no documented weakness yet, so nothing to solve
    const techniques = techniquesFor(capability.id).filter((t) => t.status === "active");
    if (techniques.some((t) => claimsAboutTechnique(t.id).some(isMeasured))) continue;
    out.push({
      capability,
      kind: techniques.length === 0 ? "no-technique" : "none-measured",
      claims,
      techniques,
    });
  }
  return out.sort((a, b) => b.claims.length - a.claims.length || a.capability.label.localeCompare(b.capability.label));
}

/**
 * Row tags driving the list filters (src/components/filter-bar.tsx). These
 * deliberately reuse the same predicates as openQuestions() and
 * unsolvedCapabilities() rather than recomputing something similar, so a
 * filter on the Capabilities or Techniques tab shows exactly the set the
 * /open-questions section of the same name shows.
 */
export function capabilityTags(c: Capability): string {
  const tags: string[] = [];
  if (isProposed(c)) tags.push("proposed");
  if (claimsFor(c.id).some((x) => x.contested)) tags.push("contested");
  const u = unsolvedCapabilities().find((x) => x.capability.id === c.id);
  if (u) tags.push(u.kind);
  return tags.join(" ");
}

/**
 * Where an adage stands against models, from reviewed claims only, same rule
 * as technique standing: unreviewed evidence is shown on the page but moves
 * nothing. "untested" is the research brief; "breaks" and "mixed" are where
 * the catalog says something no essay on the adage says.
 */
export type AdageStanding = "untested" | "holds" | "narrowed" | "breaks" | "mixed";
export const ADAGE_STANDING_LABEL: Record<AdageStanding, string> = {
  untested: "Untested", holds: "Holds", narrowed: "Holds, narrowed", breaks: "Breaks", mixed: "Mixed",
};
export function adageStanding(a: Adage): AdageStanding {
  const reviewed = new Set(reviewedClaims().map((c) => c.id));
  const v = (a.evidence ?? []).filter((e) => reviewed.has(e.claim)).map((e) => e.verdict);
  if (!v.length) return "untested";
  const holds = v.includes("holds"), breaks = v.includes("breaks"), narrows = v.includes("narrows");
  if (holds && breaks) return "mixed";
  if (breaks) return "breaks";
  if (narrows) return "narrowed";
  return "holds";
}
export function adageTags(a: Adage): string {
  const tags: string[] = [adageStanding(a)];
  if ((a.evidence ?? []).some((e) => e.verdict === "breaks")) tags.push("any-break");
  return tags.join(" ");
}
/** Adages a claim serves as evidence for, with the verdict it carries. */
export function adagesForClaim(claimId: string): { adage: Adage; verdict: AdageVerdict }[] {
  const out: { adage: Adage; verdict: AdageVerdict }[] = [];
  for (const a of loadCatalog().adages) for (const e of a.evidence ?? []) if (e.claim === claimId) out.push({ adage: a, verdict: e.verdict });
  return out;
}

export function techniqueTags(t: Technique): string {
  const q = openQuestions().find((x) => x.technique.id === t.id);
  if (!q) return "";
  return q.kind === "asserted-not-measured" ? "argued" : q.kind;
}

export function claimTags(c: Claim): string {
  const tags: string[] = [];
  if (isPending(c)) tags.push("pending"); else tags.push("human");
  if (c.contested) tags.push("contested");
  if (c.backing_strength === "mechanism-reasoning") tags.push("argued");
  return tags.join(" ");
}

/**
 * How a technique's evidence currently stands. Deliberately categorical and
 * derived rather than a score: a number here would be the same Goodhart trap
 * the project removed when it deleted eval scoring, and would invite tuning
 * the catalog to move it. This is a reading of what has been filed, not a
 * verdict on the technique, and it changes only when evidence changes.
 *
 * `narrowed` is the interesting one. It means a contesting source is on file
 * but the claim was not marked contested -- the usual reason is that the
 * scope condition absorbed the objection rather than the disagreement staying
 * open. That is the quiet way a technique gets weaker without anyone saying so.
 */
export type Standing = "unmeasured" | "argued" | "supported" | "narrowed" | "contested";
export interface TechniqueStanding {
  standing: Standing;
  claims: Claim[];
  supporting: number;
  contesting: number;
  /** Most recent date any claim about it saw new evidence, or was last checked. */
  lastMoved?: string;
}

export function techniqueStanding(techniqueId: string): TechniqueStanding {
  const claims = claimsAboutTechnique(techniqueId);
  let supporting = 0, contesting = 0;
  for (const c of claims) for (const s of c.sources) {
    if (s.stance === "contests") contesting++; else supporting++;
  }
  const dates = claims.map((c) => c.last_new_evidence_at || c.last_checked_at).filter(Boolean).sort();
  const lastMoved = dates[dates.length - 1];

  const standing: Standing =
    claims.length === 0 ? "unmeasured"
      : claims.some((c) => c.contested) ? "contested"
        : !claims.some(isMeasured) ? "argued"
          : contesting > 0 ? "narrowed"
            : "supported";

  return { standing, claims, supporting, contesting, lastMoved };
}

/**
 * What the reviewed efficacy claims say about when a technique applies,
 * aggregated for the technique page and the advise tool. Union of needs,
 * the range of stated costs, every stated failure condition with its claim.
 * Unreviewed claims are returned separately so a caller can show them
 * without letting them decide anything.
 */
export interface TechniqueConditions {
  needs: Need[];
  costs: Cost[];
  helps_most: HelpsMost[];
  effects: { claim: Claim; effect: Effect; fails_when: string }[];
  unreviewed: { claim: Claim; effect: Effect; fails_when: string }[];
}
export function techniqueConditions(techniqueId: string): TechniqueConditions {
  const all = loadCatalog().claims.filter((c) => c.technique === techniqueId && c.conditions);
  const out: TechniqueConditions = { needs: [], costs: [], helps_most: [], effects: [], unreviewed: [] };
  for (const c of all) {
    const k = c.conditions!;
    const row = { claim: c, effect: k.effect, fails_when: k.fails_when };
    if (isPending(c)) { out.unreviewed.push(row); continue; }
    out.effects.push(row);
    for (const n of k.needs ?? []) if (!out.needs.includes(n)) out.needs.push(n);
    if (k.cost && !out.costs.includes(k.cost)) out.costs.push(k.cost);
    if (k.helps_most && !out.helps_most.includes(k.helps_most)) out.helps_most.push(k.helps_most);
  }
  return out;
}

export const STANDING_LABEL: Record<Standing, string> = {
  unmeasured: "nothing measured",
  argued: "argued, not measured",
  supported: "supported so far",
  narrowed: "narrowed by later evidence",
  contested: "contested",
};
