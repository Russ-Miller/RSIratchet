import fs from "node:fs";
import path from "node:path";
import { getHeuristics, getSources } from "@/lib/catalog";
import { StoredRecord, summarizeDiscovery, sourceFingerprint } from "../../scripts/heuristic-discovery-lib.mjs";

export interface DiscoveredProposal {
  title: string; rule: string; basis: "author-tested" | "inferred";
  passage: string; location: string; finding: string; models: string[];
  workloads: string[]; conditions: string; limitations: string;
  validation_test: string; overlaps_heuristics: string[];
}
export interface PaperReview {
  version: number; source: string; fingerprint: string; attempted_at: string;
  status: "candidates" | "none" | "unavailable" | "failed";
  reason: string; candidates: DiscoveredProposal[];
  text_url?: string; text_sha256?: string; retrieved_at?: string;
  model?: string; truncated?: boolean; review_method?: "codex-session" | "anthropic-api"; review_scope?: string;
}
export interface DiscoveredGroup {
  id: string; title: string; rule: string;
  evidence: (DiscoveredProposal & { source: string; text_url: string; text_sha256: string; extracted_at: string; truncated: boolean; review_method?: "codex-session" | "anthropic-api"; review_scope?: string })[];
}

/** Derive coverage from the live catalog, so newly ingested papers automatically appear as pending. */
export function getDiscovery() {
  const root = path.join(process.cwd(), "discovery/heuristics");
  const heuristics = new Set(getHeuristics().map((h) => h.id));
  const papers = getSources().filter((s) => s.kind === "paper").map((source) => {
    const file = path.join(root, "papers", `${source.id}.json`);
    let result: PaperReview | null = null;
    let state: PaperReview["status"] | "pending" | "stale" | "invalid" = "pending";
    if (fs.existsSync(file)) {
      try {
        result = StoredRecord.parse(JSON.parse(fs.readFileSync(file, "utf8"))) as PaperReview;
        if (result.source !== source.id || result.candidates.some((c) => c.overlaps_heuristics.some((h) => !heuristics.has(h)))) throw new Error("Invalid source or heuristic link");
        state = result.fingerprint === sourceFingerprint(source) ? result.status : "stale";
      } catch { state = "invalid"; result = null; }
    }
    return { source, state, result };
  });
  const summary = summarizeDiscovery(papers);
  const groups = summary.groups as DiscoveredGroup[];
  const counts = summary.counts;
  let lastRun: { finished_at?: string; stopped_reason?: string | null } | null = null;
  const runFile = path.join(root, "last-run.json");
  if (fs.existsSync(runFile)) lastRun = JSON.parse(fs.readFileSync(runFile, "utf8"));
  return { papers, groups, counts, lastRun };
}
