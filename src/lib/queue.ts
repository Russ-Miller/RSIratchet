// Reads the stage-1 ingestion queue (pipeline/queue/*.yaml) for the review
// page. Separate from the catalog loader on purpose: these are unreviewed
// candidates, not content, and must never be confused with catalog sources.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export type Direction = "improves" | "degrades" | "measures" | "not_applicable";

export interface Verdict {
  capability: string;
  about_capability: boolean;
  direction: Direction;
  confidence: "high" | "medium" | "low";
  rationale: string;
  contradicts_claim_id?: string;
  supports_claim_id?: string;
  scope_condition?: string;
  classified_at?: string;
  model?: string;
}

export interface QueueCandidate {
  openalex_id: string;
  score?: number;
  signals?: string[];
  title: string;
  date?: string;
  arxiv_id?: string;
  doi?: string;
  authors?: string[];
  venue?: string;
  topic?: string;
  cited_by_count?: number;
  abstract?: string;
  /** Catalogued capabilities this paper is ABOUT. Topical only -- says nothing
   *  about whether the paper improves, degrades, or merely measures them. */
  capabilities?: string[];
  /** Stage-2 direction judgments, one per matched capability. */
  verdicts?: Verdict[];
  /** Which queue file this came from, e.g. "2026-08-25_2026-09-01". */
  window: string;
}

const QUEUE_DIR = path.join(process.cwd(), "pipeline", "queue");

export function loadQueue(): { candidates: QueueCandidate[]; windows: string[]; generatedAt?: string } {
  if (!fs.existsSync(QUEUE_DIR)) return { candidates: [], windows: [] };
  const files = fs.readdirSync(QUEUE_DIR).filter((f) => /\.ya?ml$/.test(f)).sort();
  const candidates: QueueCandidate[] = [];
  const windows: string[] = [];
  let generatedAt: string | undefined;
  for (const f of files) {
    const parsed = YAML.parse(fs.readFileSync(path.join(QUEUE_DIR, f), "utf8"));
    const window = f.replace(/\.ya?ml$/, "");
    windows.push(window);
    if (parsed?.generated_at) generatedAt = String(parsed.generated_at);
    for (const c of parsed?.candidates ?? []) candidates.push({ ...c, window });
  }
  candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.title ?? "").localeCompare(b.title ?? ""));
  return { candidates, windows, generatedAt };
}

/**
 * Incoming candidates whose stage-2 verdict says they contradict a claim the
 * catalog already holds -- the sharpest signal the queue produces.
 */
export function challengers(candidates: QueueCandidate[]): { candidate: QueueCandidate; verdict: Verdict }[] {
  const out: { candidate: QueueCandidate; verdict: Verdict }[] = [];
  for (const c of candidates) {
    for (const v of c.verdicts ?? []) {
      if (v.contradicts_claim_id) out.push({ candidate: c, verdict: v });
    }
  }
  return out;
}

/** The stage-2 verdict for a given capability, if one has been made. */
export function verdictFor(c: QueueCandidate, capabilityId: string): Verdict | undefined {
  return (c.verdicts ?? []).find((v) => v.capability === capabilityId);
}

/**
 * Group candidates by the capability they concern, largest group first, with
 * unmatched candidates last -- those are the ones suggesting a capability the
 * catalog does not track yet.
 */
export function groupByCapability(candidates: QueueCandidate[]) {
  const groups = new Map<string, QueueCandidate[]>();
  const unmatched: QueueCandidate[] = [];
  for (const c of candidates) {
    if (!c.capabilities?.length) { unmatched.push(c); continue; }
    for (const cap of c.capabilities) {
      if (!groups.has(cap)) groups.set(cap, []);
      groups.get(cap)!.push(c);
    }
  }
  const ordered = [...groups.entries()]
    .map(([id, items]) => ({ id, items: items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) }))
    .sort((a, b) => b.items.length - a.items.length);
  return { groups: ordered, unmatched: unmatched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) };
}

/** External link for a candidate: arXiv abstract page when we have an id, else the DOI. */
export function candidateUrl(c: QueueCandidate): string | undefined {
  if (c.arxiv_id) return `https://arxiv.org/abs/${c.arxiv_id}`;
  return c.doi ?? undefined;
}

export interface CapabilityCandidate {
  id: string;
  label: string;
  scope_note?: string;
  paper_count?: number;
  merged_from?: string[];
  note?: string;
}

/**
 * The consolidated shortlist of capabilities the catalog does not yet track,
 * mined from unmatched ingestion candidates. Suggestions awaiting judgment --
 * deliberately not part of the catalog.
 */
export function capabilityShortlist(): CapabilityCandidate[] {
  const p = path.join(process.cwd(), "pipeline", "capability-shortlist.yaml");
  if (!fs.existsSync(p)) return [];
  const parsed = YAML.parse(fs.readFileSync(p, "utf8"));
  return (parsed?.recommended ?? []) as CapabilityCandidate[];
}

/**
 * Queue papers pointing at a capability that have not yet become a source in
 * the catalog. This is what a proposed capability rests on, and what an
 * active one has waiting. Judged ones (a stage-2 verdict) first, then by
 * date, newest first.
 */
export function queueForCapability(capabilityId: string, catalogArxivIds: Set<string>): { candidate: QueueCandidate; verdict?: Verdict }[] {
  const out: { candidate: QueueCandidate; verdict?: Verdict }[] = [];
  const seen = new Set<string>();
  for (const c of loadQueue().candidates) {
    const key = c.arxiv_id ?? c.openalex_id;
    if (seen.has(key)) continue;
    if (c.arxiv_id && catalogArxivIds.has(c.arxiv_id)) continue;
    const v = verdictFor(c, capabilityId);
    const tagged = (c.capabilities ?? []).includes(capabilityId);
    if (!tagged && !v) continue;
    if (v && !v.about_capability) continue;
    seen.add(key);
    out.push({ candidate: c, verdict: v });
  }
  return out.sort((a, b) => (b.verdict ? 1 : 0) - (a.verdict ? 1 : 0) || (b.candidate.date ?? "").localeCompare(a.candidate.date ?? ""));
}
