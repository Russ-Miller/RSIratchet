import { describe, it, expect } from "vitest";
import { StoredRecord, candidateKey, extractPaperText, groupCandidates, hash, sourceFingerprint, summarizeDiscovery, reviewedText, validateDiscovery } from "./heuristic-discovery-lib.mjs";

// Synthetic fixtures: these statements are not research findings.
const text = "In this synthetic test, a bounded retry improved completion on the toy workload. ";
const candidate = {
  title: "Synthetic bounded retry", rule: "For the toy workload, compare bounded retry with a single attempt.",
  basis: "author-tested", passage: "a bounded retry improved completion on the toy workload",
  location: "Synthetic fixture", finding: "A toy intervention was compared.",
  models: ["toy model"], workloads: ["toy workload"], conditions: "A synthetic test only.",
  limitations: "Not a real finding.", validation_test: "Rerun the synthetic fixture.", overlaps_heuristics: [],
};
const result = (c = candidate) => ({ outcome: "candidates", reason: "A synthetic candidate.", candidates: [c] });
const record = (overrides = {}) => ({ version: 1, source: "toy-source", fingerprint: hash("toy"), attempted_at: "2026-10-21T12:00:00.000Z", status: "candidates", reason: "Synthetic fixture", candidates: [candidate], model: "toy-model", text_url: "https://example.org/toy", text_sha256: hash(text), retrieved_at: "2026-10-21T12:00:00.000Z", supplied_chars: text.length, total_chars: text.length, truncated: false, ...overrides });

describe("heuristic evidence admission", () => {
  it("accepts a grounded proposal without treating it as validated guidance", () => {
    expect(validateDiscovery(result(), text, []).candidates[0].basis).toBe("author-tested");
  });
  it("rejects fabricated supporting passages", () => {
    expect(() => validateDiscovery(result({ ...candidate, passage: "A perfect success rate was achieved." }), text, [])).toThrow(/not found/);
  });
  it("rejects unknown existing-heuristic links", () => {
    expect(() => validateDiscovery(result({ ...candidate, overlaps_heuristics: ["imaginary-rule"] }), text, [])).toThrow(/Unknown/);
  });
  it("keeps a genuine no-candidate outcome separate from a failed extraction", () => {
    expect(validateDiscovery({ outcome: "none", reason: "No actionable intervention.", candidates: [] }, text, []).outcome).toBe("none");
    expect(() => validateDiscovery({ ...result(), outcome: "none" }, text, [])).toThrow(/contradicts/);
  });
  it("rejects long quotations even when present", () => {
    const quote = Array.from({ length: 26 }, (_, i) => `word${i}`).join(" ");
    expect(() => validateDiscovery(result({ ...candidate, passage: quote }), quote, [])).toThrow(/25 words/);
  });
});

describe("paper provenance and coverage", () => {
  it("does not mistake landing pages and short placeholders for full text", () => {
    expect(extractPaperText("<html><body>Paper not available</body></html>")).toBeNull();
    expect(extractPaperText("<article>No HTML for this paper</article>")).toBeNull();
  });
  it("preserves document text while dropping scripts and duplicate formula annotations", () => {
    const html = `<article><h2>Results</h2><p>${text.repeat(70)} &amp; evidence</p><script>ignore me</script><annotation>duplicate formula</annotation></article>`;
    const parsed = extractPaperText(html);
    expect(parsed).toContain("& evidence"); expect(parsed).not.toContain("ignore me"); expect(parsed).not.toContain("duplicate formula");
  });
  it("invalidates completed work when a pinned source or discovery version changes", () => {
    const s = { id: "toy", title: "Toy paper", arxiv_id: "2501.00001", content_sha256: "first" };
    expect(sourceFingerprint(s)).not.toBe(sourceFingerprint({ ...s, content_sha256: "second" }));
  });
  it("rejects missing provenance and falsely claimed complete reads", () => {
    expect(StoredRecord.safeParse(record({ text_sha256: undefined })).success).toBe(false);
    expect(StoredRecord.safeParse(record({ supplied_chars: 50, truncated: false })).success).toBe(false);
    expect(StoredRecord.safeParse(record({ supplied_chars: 50, truncated: true })).success).toBe(true);
  });
  it("rejects a success record with no proposals and accepts an explicit fetch failure", () => {
    expect(StoredRecord.safeParse(record({ candidates: [] })).success).toBe(false);
    expect(StoredRecord.safeParse({ version: 1, source: "toy", fingerprint: hash("toy"), attempted_at: "2026-10-21T12:00:00.000Z", status: "failed", reason: "Fetch unavailable", candidates: [] }).success).toBe(true);
  });
});

describe("candidate grouping", () => {
  it("merges exact repeated rules while retaining both sources", () => {
    const groups = groupCandidates([record(), record({ source: "another-source" })]);
    expect(groups).toHaveLength(1); expect(groups[0].evidence.map((e) => e.source)).toEqual(["toy-source", "another-source"]);
  });
  it("does not merge different workload scopes or publish failed/stale results", () => {
    expect(candidateKey(candidate.rule)).not.toBe(candidateKey(candidate.rule.replace("toy workload", "production workload")));
    expect(groupCandidates([record({ status: "failed", candidates: [] })])).toHaveLength(0);
  });
});


describe("honest paper coverage", () => {
  it("never counts missing, failed, unavailable, stale, or partial-negative results as completed negatives", () => {
    const papers = [
      { state: "pending", result: null }, { state: "failed", result: null },
      { state: "unavailable", result: null },
      { state: "stale", result: record() },
      { state: "none", result: record({ status: "none", candidates: [], truncated: true }) },
      { state: "none", result: record({ status: "none", candidates: [], truncated: false }) },
      { state: "candidates", result: record() },
    ];
    const { groups, counts } = summarizeDiscovery(papers);
    expect(counts).toMatchObject({ total: 7, completed: 2, partial: 1, noCandidate: 1, failed: 1, unavailable: 1, stale: 1, pending: 1 });
    expect(groups).toHaveLength(1);
    expect(groups[0].evidence).toHaveLength(1);
    expect(counts.completed + counts.partial + counts.failed + counts.unavailable + counts.stale + counts.pending).toBe(counts.total);
  });
});


describe("session review provenance", () => {
  it("grounds session proposals only in inspected ranges, excluding skipped text", () => {
    const document = "Inspected evidence. SKIPPED CLAIM. Later inspected evidence.";
    const segments = [{ start: 0, end: 19 }, { start: 35, end: document.length }];
    const inspected = reviewedText({ review_segments: segments }, document);
    expect(inspected).toContain("Inspected evidence.");
    expect(inspected).not.toContain("SKIPPED CLAIM");
    expect(() => validateDiscovery(result({ ...candidate, passage: "SKIPPED CLAIM" }), inspected, [])).toThrow(/not found/);
  });
  it("rejects overlapping review ranges and inconsistent character counts", () => {
    const r = record({ review_method: "codex-session", review_scope: "Inspected two excerpts.", review_segments: [{ start: 0, end: 20 }, { start: 10, end: 30 }], supplied_chars: 42, truncated: true });
    expect(StoredRecord.safeParse(r).success).toBe(false);
    expect(StoredRecord.safeParse(record({ review_segments: [{ start: 0, end: 10 }], supplied_chars: 11, truncated: true })).success).toBe(false);
  });
});

// This guard must reject a plain invocation before API-key checks or any request.
describe("paid extraction opt-in", () => {
  it("refuses to run separately billed extraction without an explicit flag", async () => {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    await expect(promisify(execFile)(process.execPath, ["scripts/discover-heuristics.mjs"], { cwd: process.cwd(), env: { ...process.env, ANTHROPIC_API_KEY: "" } })).rejects.toThrow(/disabled by default/);
  });
});
