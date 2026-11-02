# Initial heuristic mining — 2026-10-20

This is a first editorial pass over the existing claim catalog, not an exhaustive
re-read of ingested paper texts. No paid model calls were made and no candidate
was promoted into `catalog/heuristics`.

## Coverage and result

- sources: 584
- papers: 566
- claims: 520
- paperBackedClaims: 515
- paperRecordsWithClaims: 468
- rawExtractionPool: 245
- candidates: 18
- candidatesWithExistingHeuristicOverlap: 7
- candidatesWithSomeHumanReviewedSupport: 3
- distinctCandidateClaims: 20
- distinctCandidatePapers: 20

The 245-record raw extraction pool consists of paper-backed claims already
linked to a technique or carrying structured conditions. It is an intake pool,
not a count of unique heuristics. Other claims and papers without extracted
claims may yield more. The 18 candidates below were selected editorially for
agent/harness usefulness; they were not an automatic conversion of that pool.
Seven overlap existing heuristics, leaving 11 without an explicitly identified
existing-heuristic overlap in this pass. That is not proof of novelty. Related
candidates may merge. Twenty paper records supply the supporting/qualifying
claims, not twenty independent replications of each proposed rule.

Only three candidates have any supporting claim reviewed by a person; fifteen
have AI-reviewed support only. Human review is not replication. All 18 need
source checks, counterevidence searches and reproducible validation before
being treated as established guidance. Qualifications below are limitations or
scope distinctions, not necessarily direct refutations.

## Candidates

### 1. Distill lessons from failures as well as successes

For web and coding agents with persistent experience memory, retrieve concise strategies distilled from both successful and failed attempts rather than keeping only successful routines.

Boundary: Outcomes must be judgeable; the evidence does not establish transfer to tasks with ambiguous success.

- Basis: [distilling-lessons-from-failures-as-well-as-successes-beats-raw-trajectory-memory](../../../catalog/claims/distilling-lessons-from-failures-as-well-as-successes-beats-raw-trajectory-memory.yaml)
- Qualification: [experience-memory-tolerates-an-imperfect-self-judge](../../../catalog/claims/experience-memory-tolerates-an-imperfect-self-judge.yaml)
- Existing overlap: [practice-makes-perfect](../../../catalog/heuristics/practice-makes-perfect.yaml)

### 2. Keep evaluation tasks out of the improvement loop

When evolving a harness, use disjoint tasks for improvement and final evaluation; do not interpret a promotion set repeatedly consulted during selection as an untouched test.

Boundary: Disjoint evaluation limits one source of leakage; it does not establish generalization across every task or backbone.

- Basis: [evolving-agent-harness-2-000-executable-tasks-disjoint-evaluation](../../../catalog/claims/evolving-agent-harness-2-000-executable-tasks-disjoint-evaluation.yaml)
- Qualification: [a-fixed-model-can-improve-its-own-harness-with-a-regression-gated-loop](../../../catalog/claims/a-fixed-model-can-improve-its-own-harness-with-a-regression-gated-loop.yaml)
- Existing overlap: [hashimotos-rule](../../../catalog/heuristics/hashimotos-rule.yaml)

### 3. Promote a patch only after checking what it could break

For recurring agent workflows, test candidate skills on their targeted failures, protected regression cases, and negative controls before promotion.

Boundary: The most direct gated-versus-ungated evidence is from SEC-filing QA; independent cross-domain reproduction is still needed.

- Basis: [treating-post-deployment-improvement-scoped-behavioural-maintenance-where-each-recurring](../../../catalog/claims/treating-post-deployment-improvement-scoped-behavioural-maintenance-where-each-recurring.yaml)
- Qualification: [a-fixed-model-can-improve-its-own-harness-with-a-regression-gated-loop](../../../catalog/claims/a-fixed-model-can-improve-its-own-harness-with-a-regression-gated-loop.yaml)
- Existing overlap: [hashimotos-rule](../../../catalog/heuristics/hashimotos-rule.yaml)

### 4. Evolve harness modules separately before integrating

For modular coding and terminal-agent harnesses, compare independent module improvements with a joint rewrite before adopting a new harness.

Boundary: One evolving backbone supplies the main ablation; interactions between independently improved modules still need integration checks.

- Basis: [evolving-agent-harness-2-000-executable-tasks-disjoint-evaluation](../../../catalog/claims/evolving-agent-harness-2-000-executable-tasks-disjoint-evaluation.yaml)

### 5. Diagnose recurring failures before turning them into rules

When aggregating failure traces across tasks, add a separate attribution stage before writing harness edits so repeated symptoms do not simply become model-specific accommodations.

Boundary: One paper provides the comparison; its failure-attribution labels and taxonomy need independent checking.

- Basis: [agent-system-evolves-own-harness-failure-traces-batching-failures](../../../catalog/claims/agent-system-evolves-own-harness-failure-traces-batching-failures.yaml)

### 6. Ground self-correction in evidence beyond the answer

For reasoning tasks, require an external signal such as a test or verifier before treating self-critique as a reliable improvement.

Boundary: This concerns review-and-revise reasoning, not a claim that every model judgment is useless; aggregate experience-memory labeling may tolerate noise.

- Basis: [self-critique-without-grounding-unreliable](../../../catalog/claims/self-critique-without-grounding-unreliable.yaml)
- Qualification: [experience-memory-tolerates-an-imperfect-self-judge](../../../catalog/claims/experience-memory-tolerates-an-imperfect-self-judge.yaml)
- Existing overlap: [no-one-should-judge-their-own-cause](../../../catalog/heuristics/no-one-should-judge-their-own-cause.yaml)

### 7. Run available mechanical checks before model judgment

In a verify-and-fix loop, use relevant executable checks for properties they actually test, then calibrate any model judge used for the remaining properties.

Boundary: The ordering is partly mechanism-based guidance, not a universal measured ranking. Rule-dense long-context tasks may gain more from a clear checklist than extra verifier execution.

- Basis: [deterministic-sensors-should-precede-llm-judges](../../../catalog/claims/deterministic-sensors-should-precede-llm-judges.yaml)
- Qualification: [rubric-graded-long-context-tasks-most-gain-context-compilation-harness-comes-extracting](../../../catalog/claims/rubric-graded-long-context-tasks-most-gain-context-compilation-harness-comes-extracting.yaml)
- Existing overlap: [no-one-should-judge-their-own-cause](../../../catalog/heuristics/no-one-should-judge-their-own-cause.yaml)

### 8. Keep iterative UI repairs narrow

For screenshot-guided UI-to-code refinement, choose one scoped repair target per round and carry earlier targets forward as constraints.

Boundary: Evidence is from UI reconstruction benchmarks with substantial model-based judging; arbitrary product redesign is outside the tested setup.

- Basis: [ui-to-code-generation-where-rendered-screenshot-gives-genuine-external-feedback](../../../catalog/claims/ui-to-code-generation-where-rendered-screenshot-gives-genuine-external-feedback.yaml)

### 9. Represent unusable tool results as failures

When a tool cannot return a usable value, make the response envelope report an error rather than status:ok with missing or redacted data.

Boundary: The experiment used stub tools and limited human label validation. Production failure distributions and access-denied semantics need testing.

- Basis: [tool-call-forced-returns-unusable-payload-tool-augmented-agents-report](../../../catalog/claims/tool-call-forced-returns-unusable-payload-tool-augmented-agents-report.yaml)

### 10. Retrieve more history only while it helps

For retrieval-augmented personalization, compare adaptive stopping with a fixed retrieval budget rather than assuming more user history improves answers.

Boundary: The measured optimum depends on six LaMP tasks and frozen 8-9B generators; the reported best k is not a general default.

- Basis: [retrieval-augmented-personalization-frozen-8-9b-generator-prepending-more-retrieved-user-history](../../../catalog/claims/retrieval-augmented-personalization-frozen-8-9b-generator-prepending-more-retrieved-user-history.yaml)

### 11. Treat retrieval as an evidence channel with its own failure modes

When grounding answers in retrieved content, inspect source trust and conflicting accounts rather than assuming retrieval makes the answer reliable.

Boundary: Separate instructions from source data and evaluate the actual retrieval channel; ordinary relevant documents and adversarial content have different failure profiles.

- Basis: [retrieval-moves-the-trust-boundary-rather-than-removing-it](../../../catalog/claims/retrieval-moves-the-trust-boundary-rather-than-removing-it.yaml)

### 12. Measure whether a repository guide improves the work

Before growing a coding-agent context file, compare task outcomes and cost against a no-file baseline.

Boundary: The benchmark comparison is Python-only and not a test of every failure-specific practitioner guide. Do not generalize it into a ban on repository instructions.

- Basis: [repository-context-files-do-not-raise-task-success-on-benchmark-coding](../../../catalog/claims/repository-context-files-do-not-raise-task-success-on-benchmark-coding.yaml)
- Existing overlap: [hashimotos-rule](../../../catalog/heuristics/hashimotos-rule.yaml)

### 13. Measure task quality alongside token savings

When adopting an efficiency-oriented harness optimization, compare each component and the full stack on both task quality and resource use.

Boundary: The cited stack is a single-run study without variance; a small score decrease may be an acceptable deliberate trade, not a failure.

- Basis: [automated-search-over-agent-harness-mechanisms-gated-token-efficiency-only](../../../catalog/claims/automated-search-over-agent-harness-mechanisms-gated-token-efficiency-only.yaml)
- Existing overlap: [goodharts-law](../../../catalog/heuristics/goodharts-law.yaml)

### 14. Do not broadcast every agent context by default

In multi-agent tasks where one wrong fact can cascade, compare selective information sharing against full-context broadcast.

Boundary: The seeded-error effect was task-dependent, absent in the software setting, and measured with one model and small samples.

- Basis: [multi-agent-llm-systems-where-one-agent-starts-erroneous-shared](../../../catalog/claims/multi-agent-llm-systems-where-one-agent-starts-erroneous-shared.yaml)

### 15. Test coordination ideas against a matched architecture

For multi-agent literature synthesis, compare a learned coordinator with a simpler coordinator given the same workspace and action space.

Boundary: The reported learned-versus-LLM coordination difference is within potential judge noise; no general conclusion about all learned coordination follows.

- Basis: [multi-agent-literature-synthesis-pipelines-most-gain-over-fixed-role-based-pipeline](../../../catalog/claims/multi-agent-literature-synthesis-pipelines-most-gain-over-fixed-role-based-pipeline.yaml)

### 16. Compare agent pruning with a budget-matched random control

When optimizing a multi-agent topology, hold the backbone, roles, runtime and structural budget fixed and compare with random pruning.

Boundary: The finding concerns the tested methods and topologies; it is not proof that optimized pruning can never help.

- Basis: [multi-agent-pruning-methods-agentprune-agentdropout-agp-dagp-gptswarm-re-run](../../../catalog/claims/multi-agent-pruning-methods-agentprune-agentdropout-agp-dagp-gptswarm-re-run.yaml)

### 17. Check reasoning steps to localize the repair

For chain-of-thought verification, compare per-node consistency checks with whole-chain judging when locating an error is the goal.

Boundary: The gains concern public reasoning benchmarks, not arbitrary agent traces; the proposed attention mechanism was not directly isolated.

- Basis: [verifying-chain-thought-decomposing-into-nodes-asking-binary-consistency](../../../catalog/claims/verifying-chain-thought-decomposing-into-nodes-asking-binary-consistency.yaml)

### 18. Obtain an answer before supplying the preferred conclusion

When a task does not require the user’s opinion, withhold it until after the initial answer to reduce one trigger for sycophantic agreement.

Boundary: Personalization sometimes requires preferences. This is not a reason to omit relevant user requirements or a guarantee against every form of sycophancy.

- Basis: [withholding-the-users-opinion-is-the-no-training-alternative](../../../catalog/claims/withholding-the-users-opinion-is-the-no-training-alternative.yaml)

## Repeatable audit

Run `node scripts/audit-heuristic-candidates.mjs` to recompute coverage and
validate all candidate-to-claim/source links. Candidate text is in
`candidates.json`; the site renders that same file at `/heuristics/candidates`.
The audit checks provenance links, not whether the source really entails the
proposed heuristic.

## Next mining pass

Read the full texts behind promising clusters, search for contradicting and
null results, and explicitly compare candidates with existing heuristics.
Prioritize the 98 paper records without extracted claims, while remembering
that an unprocessed paper need not contain actionable guidance. Broader mining
should record source passages and separate paper observations, inferred rules,
and independent real-world validations. Add an automated proposal stage only
with a measured review rubric and deduplication; never promote on volume alone.


## Full-paper discovery follow-up — 2026-10-21

The initial 18 proposals remain editorial candidates based on existing claims.
The expanded workbench now separates these from full-paper extraction results
and reports live paper-by-paper coverage. See `discovery/heuristics/README.md`
for the resumable workflow and its first network-blocked run. The claims-level
counts in this report do not mean those papers were re-read.
