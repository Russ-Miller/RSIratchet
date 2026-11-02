# Roadmap

Each milestone is one branch, one pull request, one report in
`docs/reports/`. Definition of done must be checkable without a human.

Current priority (2026-10-20): rework the service around heuristics and a shared
reasoning bank for agents. Improve the public UI and writing, mine candidate
heuristics from existing research, and define evidence returned from agent use.
Accounts, subscriptions, billing, and contribution-credit accounting are deferred.
The current delivery sequence is below. The earlier personal-study milestones
are preserved afterward as historical context.

## Current delivery sequence: claim admission and heuristic promotion (2026-10-24)

**Claim admission and promotion into broader heuristic guidance are separate
decisions, with separate evidence, records, and release gates.** Accepting an
accurate report of a study does not establish a generally useful decision rule.
Neither a paper’s publication nor agreement between AI reviewers automatically
promotes a claim into the reasoning bank’s recommended guidance.

| milestone | done when |
|---|---|
| A1 — Calibrate source-faithful claim admission | A versioned rubric and independent review workflow run in shadow mode on a held-out, human-adjudicated set. Tests include reversed results, wrong models, omitted conditions, contradictory tables, null results, and unsupported causal/general claims. False acceptance, false rejection, escalation, review coverage, and cost are reported by error type. Numerical release thresholds and audit sampling rates are fixed before evaluating the held-out set; the gate passes those thresholds before automatic writes are enabled. |
| A2 — Bounded automatic claim admission | Only scoped reports of research findings can be admitted automatically. Every admitted claim has source/version/hash, passage or table locator, intervention and actual comparator, model/workload, outcome, limitations, extraction and review provenance, and a recorded decision. A separate reviewer checks entailment and contradictory evidence in the paper. Missing context, conflicting numbers, uncertain support, or reviewer disagreement route to pending review. Independent replication remains a separately evidenced field. Random and targeted audits can reopen or withdraw claims; automatic admission can be disabled without losing the audit trail. |
| H1 — Separate promotion into heuristic guidance | The promotion workflow below is implemented and tested. No claim-admission event, reviewer score, source count, or author-tested label can bypass it. A candidate remains excluded from default heuristic recommendations until its own promotion decision is recorded. Promotion can narrow, defer, or reject a rule, not just approve it. |
| H2 — Calibrate and extend promotion automation | Begin with explicit curator decisions and shadow automated recommendations. Evaluate false promotions, missed useful rules, scope inflation, and failures on new model/workload combinations against adjudicated cases and agent replays. Publish the rubric, model/prompt versions, evidence coverage, uncertainty, total cost, and promotion error rates. Automatic promotion is a later release decision requiring predeclared thresholds on fresh evaluation data; A2 does not authorize it. |

### H1: promotion into broader guidance is a substantive research decision

A promotion dossier must answer all of the following:

- **What decision does the rule change?** Name the intervention, baseline,
  expected benefit, resource trade-off, and a falsifiable failure condition.
  A restatement of a benchmark score is not sufficient.
- **Where is it supported?** Link accepted supporting, qualifying, and
  contesting claims. Distinguish author-tested interventions from inferred
  recommendations, and separate independent replications from repeated reports
  of the same experiment. Preserve negative and null results.
- **How far does the recommendation reach?** Declare the tested models,
  workloads, harness versions, budgets, and conditions, alongside the proposed
  applicability. Explicitly identify every extrapolation. A single study can
  support narrow guidance; it cannot silently become a universal rule. Paper
  count or model-reviewer consensus alone is not a promotion criterion.
- **Does the evidence justify that scope?** Check original methods and relevant
  tables/figures, baseline strength, matched resources, evaluation-set reuse,
  leakage, uncertainty, and component-versus-combined-method attribution. Search
  for counterevidence and record the search coverage. An absent replication
  search must remain “not assessed,” not “no replication exists.”
- **Has transfer actually been tested?** For claims of applicability beyond the
  studied setup, require evidence covering that extension or a representative
  replay/evaluation with the target model and workload. Otherwise narrow the
  rule or keep the extension pending. Report success, regressions, failure
  conditions, and total evaluation cost; do not require new replication merely
  to acknowledge an author-tested result within its original scope.
- **What is the decision and who owns it?** Record promote-with-scope, narrow,
  defer, or reject; the rationale, reviewer identity/type, rubric version,
  evidence versions, unresolved objections, and date. An automatically admitted
  claim cannot set this decision implicitly.

Promoted guidance must expose paper evidence, independent replication,
applicability, and curation status as separate dimensions on the site and in
machine-readable/MCP results. A consumer must be able to tell that a rule is
supported in one setup but unassessed in theirs. Inferred guidance must remain
labeled as inferred even after curation.

**Promotion is reversible.** Agent reports and new papers can qualify or contest
an existing rule. A source correction, model/harness change, failed replay, or
new contradictory result triggers reassessment; retain the previous version,
reason for change, and rollback history. Withdrawal from default recommendations
must not erase the failure evidence. Agent-contributed outcomes need provenance
and reproducible setup checks before they change a rule’s evidence standing.

H1 acceptance checks must demonstrate that an accepted single-study claim does
not automatically appear in default heuristic/MCP recommendations; unsupported
scope expansion is blocked or narrowed; inferred and author-tested evidence stay
distinct; counterevidence can reopen a promoted rule; and stale source evidence
cannot silently retain its previous promotion decision.

Rationale: King and Worthington’s [AI review study](https://gking.harvard.edu/files/peerless.pdf)
supports investigating automated scrutiny. It evaluates review quality and does
not establish an automated claim-admission or heuristic-promotion gate. A1–H2
are our proposed workflows, to be evaluated on our own content.

These are planned milestones, not implemented acceptance automation. Existing
review semantics stay in force until the schema, consumers, and checks change
together. Accounts and billing remain deferred; no scheduled or separately
billed model usage is enabled by this roadmap entry.

## Historical personal-study sequence

Re-sequenced 2026-09-03 for the personal-study reframe (see decision log).
Milestones 1r-4r below supersede the old 2-5; the old 2-5 content is kept
as "Later phase" since the design still stands, just deprioritized.

| # | milestone | done when |
|---|---|---|
| 1 | Spec, schemas, seed catalog, validation, scaffold (superseded, see 1r) | `npm test` green; ≥10 capabilities with verified citations; CI runs on PRs — **done, but content model has since changed** |
| 1r | Reframe: new schema + one worked example | spec.md v0.3 in place (done); `docs/examples/` has a fully worked capability+claims+sources under the new model, reviewed |
| 2r | Bulk migration | all existing capabilities/claims/sources/techniques migrated to the new schema; `catalog/schema/` is the new schema; `npm test` green again |
| 3r | Site rebuilt around the new model | routes in spec §8 (capability→claim progressive disclosure, sources view, recent-activity view, stale view); deployed |
| 4r | Manual re-check workflow | a way to mark a claim checked and record `last_checked_at`/`last_new_evidence_at` by hand; no automation yet |
| 5r+ | Catalog growth | claims and sources added as genuinely studied, at whatever pace that happens |

## Later phase (design preserved in spec.md §9, not scheduled)

| milestone | done when |
|---|---|
| Read API and MCP server | spec §9 read endpoints and MCP tools work; example agent script runs the `advise` call |
| Accounts, tokens, writes | GitHub login; `is_admin` via `ADMIN_GITHUB_LOGINS`; write endpoints; capability requests; admin CRUD |
| Automated re-evaluation pipeline | daily sweep for new evidence on existing claims; 14-day staleness re-checks; cost measured on a sample before scaling |
| Prediction-before-test | a way to record an expectation before checking it |

External prerequisites, when each phase is actually picked up:
- Site deploy: Vercel account linked to the repo (already done).
- Accounts/writes: GitHub OAuth app, database, secrets in `.env`.
- Automated pipeline: Anthropic API key in `.env` and as a GitHub Actions
  secret.

## To revisit (ideas with a reason to wait, and what would end the wait)

TODO (2026-10-20): Rethink the name and brand as the service becomes a shared reasoning bank for agents, centered on heuristics distilled from research and validated through agent experience. Consider keeping RSI Ratchet, shortening to Ratchet with a clear descriptor, or using RatchetBank. Check name, domain, and trademark availability before deciding. Keep the current name and domains until then; this does not block the content and UI rework.

| idea | why it fits | why wait | revisit when |
|---|---|---|---|
| Tasks as a join to capabilities, seeded from Epoch's "O*NET for AI R&D" (https://epoch.ai/gradient-updates/toward-an-onet-for-ai-rnd, 2026-09) | Their taxonomy is the task side of O*NET without the abilities layer; our capabilities are that layer with evidence. A task entry with `requires: [capability ids]` turns their subjective 0–5 automation rating into a derived, contestable claim with a named bottleneck, and inverts into "which tasks does this unsolved capability block". Our nightly pipeline already performs several of their tasks, so we could rate it on their scale as own-observation claims. | Their list is a first draft with an open feedback round and, by their own account, may not survive AI progressing by non-human routes. Treat it as a source, not a schema. | Their taxonomy stabilises after feedback, or we want the economic view of "what to improve next". Pilot first: map the dozen tasks the pipeline touches. |
| Test whether models overrate what works (2026-10-19) | Lee 2026 argues models trained on a literature that hides failures inherit its optimism; the Ratchet page states the hypothesis, the experiment and the prediction in advance. Ask models from several families whether filed techniques help and when they fail, score against the catalog's evidence (contested claims and failure conditions above all). | Needs a scoring rubric, an independent judge model, and a person's spot check; same calibration need as the classifier experiment. | Next experiment after the classifier held-out set, or before it if Russ prefers. |
| Contradiction candidates from embeddings | High-similarity claim pairs with opposing direction are the "file the incumbent, then contest it" cases nobody will find by reading 167 claims. | Nothing blocks it; it is next in line. | Now, unless redirected. |
| Duplicate detection when filing drafts | Same vectors; stops the AI-reviewed pile growing with restatements. | Prevents future noise rather than surfacing findings. | After contradiction candidates. |
| Mine model cards for limitations, not strengths (2026-09-12) | A card's "Limitations" and "Out-of-scope" sections are statements against the vendor's interest, so they are unusually strong evidence of a weakness; strength claims and benchmark tables are self-serving and stay out. Flow: fetch card via the Hugging Face API → archive as vendor-doc with a content hash → run the limitations text through the stage-2 classifier → file observation claims under the matching capability, era-bound to the model, reviewed by AI → `advise` supplies the techniques. Cards also index the technical report behind the numbers, which is the source to fetch. | Behind contradiction candidates and the summarizer fixes. Cards are edited without notice, so the drift check has to run; start with about ten frontier open models, not the hub. | After those two land, or when a proposed capability needs evidence faster than papers supply it. |
| Timelier ingestion (2026-09-14, Russ still thinking) | OpenAlex indexes arXiv several days late and its "added since" filter is paid, so the nightly window lags by days; a morning run found nothing new. Options, all free to fetch: (a) arXiv's own daily Atom feeds per category (cs.CL, cs.AI, cs.LG, cs.SE, cs.CR), announced around 00:00 UTC, 400–600 papers a day screened by the term matcher, about $0.50 a day more classification at batch rates; (b) Hugging Face daily papers as a human-curated score boost; (c) alert services that "forward in" links the way Russ does by hand — Google Alerts on capability terms and technique names, or an AI-based watcher over X, newsletters and blogs — landing in the same intake as `enqueue-arxiv.mjs` and `add-link.mjs`, which is the only path that reaches posts, model cards and vendor docs. Keep OpenAlex for the backfill and citation counts. | Russ wants time to weigh them; (c) needs an account or a watcher to be chosen. | When Russ decides, or the next time a lead arrives days late. |
| Remote MCP at rsiratchet.com/mcp | Lets Claude.ai and other people's agents use the catalog. | Query embedding needs either the model in a serverless function (cold starts) or an embedding API key. Keyword-only would work today. | When someone other than Russ wants it. |
| Summarizer figure fixes | Extractor drops appendices after "References"; JSON escapes written literally; flags are inert; sensor has no tests. Three of four current flags trace to this. | Not blocked; proposal written 2026-09-12 in conversation, evidence via `advise`. | Next pipeline session. |
