# Full-paper heuristic discovery — 2026-10-21

Russ approved discovering candidate heuristics across all ingested research and
showing them on the site, with traceable source evidence, scope, and review status.

## Implemented

- A live discovery workbench at `/heuristics/candidates` separates the original
  18 claims-based editorial proposals from future full-paper extractions.
- All 566 paper records have inventory entries. The site calculates current
  coverage from the catalog, so newly ingested papers appear pending.
- Each paper outcome distinguishes candidates found, no actionable rule,
  unavailable full text, failed attempts, partial reads, and stale results.
- The resumable extractor uses full arXiv HTML where available. It checks paper
  title identity and source passages, records source text hashes and versions,
  requires model/workload scope and limitations, and distinguishes author-tested
  interventions from inferred guidance. No automatic authoritative promotion.
- Exact normalized rules merge with their source evidence; possible overlaps
  with existing heuristics are flagged. Semantic equivalence, inference quality,
  counterevidence, and independent validation still require review.
- Cached paper text is ignored by Git. Only short passages and original analysis
  enter the reviewable result files. The API key is read from the environment.
- Per-run limits, a configurable estimated spend ceiling, no automatic paid
  retries, a run lock, and a fetch-error circuit breaker bound execution.
- A manual-only GitHub workflow can run bounded batches and propose results
  through a PR. It adds no scheduled spending and was not run remotely.
- `npm run validate` now includes discovery data validation.

## Actual first-run outcome

The first all-paper attempt stopped after three arXiv fetch failures with
ENOTFOUND. No paper was read, no extraction was completed, and no model API tokens
were spent. 563 papers remain unattempted and three show failed attempts. There
are zero new full-paper candidates; the initial 18 remain labeled as editorial.

Network/DNS access to arXiv and the model provider is unavailable in this
execution environment. The full-paper mining requested by the user remains
incomplete until that connection works. This is not a negative result for any
paper, and the site does not display it as one.

## Verification

- Catalog and discovery validation passed.
- Embedding freshness passed; established catalog records were not changed.
- 27 unit tests passed, including grounding rejection, no-result distinction,
  source identity, text extraction, partial-read coverage, and grouping behavior.
- ESLint passed.
- Webpack production build, TypeScript, and static generation passed.
- Manual workflow YAML parses; only workflow_dispatch is enabled.
- Dry-run inventories and selects all 566 papers without network/model calls.
- Generated workbench HTML was checked for the expected coverage state and links.
- Browser visual/interactive QA remains blocked by the same sandbox restriction
  documented in the earlier site rework. The default Turbopack build also cannot
  bind its worker port here; Webpack builds succeed.

## Resume

See `discovery/heuristics/README.md` for full instructions. Once network works:

```sh
npm run discover-heuristics -- --paid-api --limit 10 --max-cost-usd 5
npm run validate:discovery
```

Check configured model availability and current provider pricing before a large
batch; the ceiling uses configured estimates and is not a billing guarantee.
Use `--all` for all remaining supported papers, subject to that ceiling, and
repeat to resume. Unsupported full-text formats stay visible for a later adapter
or manual read. No summaries are silently substituted for missing paper text.

No deployment, remote push, PR creation, or new paid API call was completed.
