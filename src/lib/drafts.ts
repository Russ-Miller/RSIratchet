// Read-only access to pipeline/drafts for the review page.
//
// Drafts are deliberately NOT catalog content and do not live under catalog/.
// They are proposals waiting on a human verdict, and the review page exists so
// that verdict takes minutes rather than an evening of reading YAML.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export interface Draft {
  /** arXiv id, or for a forwarded non-arXiv paper the source id. */
  arxiv_id?: string;
  source_id?: string;
  title: string;
  url?: string;
  drafted_at?: string;
  drafted_from?: "full-text" | "abstract";
  model?: string;
  capability: string;
  statement: string;
  kind: "mechanism" | "observation";
  backing_strength: string;
  scope_condition?: string;
  technique?: string;
  proposed_technique?: string;
  stance_on_existing: "supports" | "contests" | "neither";
  related_claim_id?: string;
  stance_reason?: string;
  falsifier?: string;
  evidence_note?: string;
  confidence?: "high" | "medium" | "low";
  /** Checks that ran outside the model. Non-empty means read before trusting. */
  problems?: string[];
}

const DRAFTS_DIR = path.join(process.cwd(), "pipeline", "drafts");

export function getDrafts(): Draft[] {
  if (!fs.existsSync(DRAFTS_DIR)) return [];
  return fs.readdirSync(DRAFTS_DIR)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => YAML.parse(fs.readFileSync(path.join(DRAFTS_DIR, f), "utf8")) as Draft)
    // Flagged drafts first: they are the ones that must not be skimmed.
    .sort((a, b) => Number(!!b.problems?.length) - Number(!!a.problems?.length)
      || (a.arxiv_id ?? a.source_id ?? "").localeCompare(b.arxiv_id ?? b.source_id ?? ""));
}
