/** Editorial reading aids for existing records, not additional evidence or verdicts. */
export const HEURISTIC_APPLICATIONS: Record<string, { title: string; guidance: string }> = {
  "no-one-should-judge-their-own-cause": {
    title: "Verify consequential outputs with independent evidence",
    guidance: "For consequential checks, use a test, a verifier, or evidence beyond the model’s own critique. A second opinion can repeat the same mistake.",
  },
  "hashimotos-rule": {
    title: "Turn recurring failures into lasting fixes",
    guidance: "For repeated workflows, put the correction into a check, tool, or harness change that future runs inherit. Test it against regressions before keeping it.",
  },
  "practice-makes-perfect": {
    title: "Preserve lessons across attempts, then test transfer",
    guidance: "A fixed model does not learn across sessions on its own. Preserve useful strategies in memory or the harness, and check whether they help on new tasks.",
  },
  "goodharts-law": {
    title: "Check outcomes behind proxy metrics",
    guidance: "When optimizing a score, test whether the underlying work is improving too. A better benchmark result can hide a worse system.",
  },
};
