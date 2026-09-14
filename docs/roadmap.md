# Roadmap

Each milestone is one branch, one pull request, one report in
`docs/reports/`. Definition of done must be checkable without a human.

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

| idea | why it fits | why wait | revisit when |
|---|---|---|---|
| Tasks as a join to capabilities, seeded from Epoch's "O*NET for AI R&D" (https://epoch.ai/gradient-updates/toward-an-onet-for-ai-rnd, 2026-09) | Their taxonomy is the task side of O*NET without the abilities layer; our capabilities are that layer with evidence. A task entry with `requires: [capability ids]` turns their subjective 0–5 automation rating into a derived, contestable claim with a named bottleneck, and inverts into "which tasks does this unsolved capability block". Our nightly pipeline already performs several of their tasks, so we could rate it on their scale as own-observation claims. | Their list is a first draft with an open feedback round and, by their own account, may not survive AI progressing by non-human routes. Treat it as a source, not a schema. | Their taxonomy stabilises after feedback, or we want the economic view of "what to improve next". Pilot first: map the dozen tasks the pipeline touches. |
| Contradiction candidates from embeddings | High-similarity claim pairs with opposing direction are the "file the incumbent, then contest it" cases nobody will find by reading 167 claims. | Nothing blocks it; it is next in line. | Now, unless redirected. |
| Duplicate detection when filing drafts | Same vectors; stops the AI-reviewed pile growing with restatements. | Prevents future noise rather than surfacing findings. | After contradiction candidates. |
| Mine model cards for limitations, not strengths (2026-09-12) | A card's "Limitations" and "Out-of-scope" sections are statements against the vendor's interest, so they are unusually strong evidence of a weakness; strength claims and benchmark tables are self-serving and stay out. Flow: fetch card via the Hugging Face API → archive as vendor-doc with a content hash → run the limitations text through the stage-2 classifier → file observation claims under the matching capability, era-bound to the model, reviewed by AI → `advise` supplies the techniques. Cards also index the technical report behind the numbers, which is the source to fetch. | Behind contradiction candidates and the summarizer fixes. Cards are edited without notice, so the drift check has to run; start with about ten frontier open models, not the hub. | After those two land, or when a proposed capability needs evidence faster than papers supply it. |
| Timelier ingestion (2026-09-14, Russ still thinking) | OpenAlex indexes arXiv several days late and its "added since" filter is paid, so the nightly window lags by days; a morning run found nothing new. Options, all free to fetch: (a) arXiv's own daily Atom feeds per category (cs.CL, cs.AI, cs.LG, cs.SE, cs.CR), announced around 00:00 UTC, 400–600 papers a day screened by the term matcher, about $0.50 a day more classification at batch rates; (b) Hugging Face daily papers as a human-curated score boost; (c) alert services that "forward in" links the way Russ does by hand — Google Alerts on capability terms and technique names, or an AI-based watcher over X, newsletters and blogs — landing in the same intake as `enqueue-arxiv.mjs` and `add-link.mjs`, which is the only path that reaches posts, model cards and vendor docs. Keep OpenAlex for the backfill and citation counts. | Russ wants time to weigh them; (c) needs an account or a watcher to be chosen. | When Russ decides, or the next time a lead arrives days late. |
| Remote MCP at rsiratchet.com/mcp | Lets Claude.ai and other people's agents use the catalog. | Query embedding needs either the model in a serverless function (cold starts) or an embedding API key. Keyword-only would work today. | When someone other than Russ wants it. |
| Summarizer figure fixes | Extractor drops appendices after "References"; JSON escapes written literally; flags are inert; sensor has no tests. Three of four current flags trace to this. | Not blocked; proposal written 2026-09-12 in conversation, evidence via `advise`. | Next pipeline session. |
