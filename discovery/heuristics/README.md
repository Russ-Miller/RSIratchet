# Paper-to-heuristic discovery

This workbench is separate from `catalog/heuristics`. Nothing here affects
heuristic standing, default search, the public JSON catalog, or MCP advice.
The site renders outcomes at `/heuristics/candidates` alongside the initial
18 editorial proposals, which were based on existing claims rather than a
fresh paper-text pass.

## What is recorded

- `inventory.json` records every ingested paper and a fingerprint of its source
  identity, title, URL, pinned hash, and discovery protocol version.
- `papers/<source-id>.json` records an attempted paper read: `candidates`, `none`,
  `unavailable`, or `failed`. Missing records mean not attempted. Fingerprint
  mismatches mean another pass is needed; their old proposals are excluded.
- `last-run.json` records progress, token usage, configured cost estimates, and
  why the run stopped. Dates are UTC.
- Downloaded paper text stays under ignored `.cache/heuristic-discovery/`.
  Only short source passages and original analysis are published. Third-party
  paper excerpts retain their original rights, not the service's content terms.

The page calculates coverage against the current catalog, so new papers appear
as pending immediately even before the inventory is refreshed. Source metadata
changes invalidate old results. Paper revisions under an unversioned URL still
need an explicit refreshed fetch (`--force`); a source fingerprint alone does
not detect unseen upstream changes. Where the HTML identifies its arXiv version,
the result links to that version and also stores a SHA-256 of extracted text.

## Review within the Codex subscription

This is the selected workflow from 2026-10-22 onward. Review 5–10 papers per
batch within the current Codex session, save inspected ranges and candidate
records, and stop for a `/status` allowance check. Context usage is part of the
subscription allowance; it is not tracked as an external API token bill.

`npm run prepare-heuristic-reviews -- --ids source-id,source-id` downloads and
caches up to ten selected papers without loading an API key or calling any model.
The current session reads the paper sections and authors proposals. Session
records identify `review_method: codex-session`, the exact text ranges read, and
the scope of review. Selected-section reviews count as partial, not complete.
The same schema, source fingerprint and passage-grounding checks apply.

The paid extractor is disabled by default and requires `--paid-api`. Its manually
triggered GitHub workflow retains that explicit opt-in, with budget inputs; it
is not the subscription workflow. Do not run it without a new API-spend budget.

## Run and resume

```sh
npm run discover-heuristics -- --inventory-only
npm run discover-heuristics -- --paid-api --limit 10 --max-cost-usd 5
npm run validate:discovery
```

The extractor uses `ANTHROPIC_API_KEY` and `HEURISTIC_MODEL` (or the existing
pipeline's `claude-opus-5` default). The model must be available to the account
and support structured output. Validate the model and applicable pricing with
the provider before a large run. No provider model availability is assumed by
an inventory-only run.

To attempt every remaining supported paper, use `--all` with an explicit cost
ceiling. A ceiling can stop the pass before all papers are attempted. Repeat
the command to resume; completed results are not regenerated. Pending papers
are prioritized ahead of failed retries. An unavailable paper is not retried
unless its metadata changes or `--retry-unavailable` is provided, avoiding a
queue that repeatedly gets stuck on unsupported old papers.

Options:

- `--id <source-id>`: select a specific paper.
- `--force`: refresh already-processed sources, including upstream revisions.
- `--retry-unavailable`: retry missing HTML/manual-adapter cases.
- `--max-chars 120000`: text supplied per paper. Longer documents are explicitly
  marked partial. Increase this within the model's context capacity to revisit
  partial reads; an increased cap makes those records eligible again.
- `--delay-ms 3500`: pacing between arXiv fetches.
- `--model <model-id>`: override the model.
- `--input-usd-per-million` and `--output-usd-per-million`: configure the estimate.
  Defaults 5 and 25 mirror existing project assumptions; they are not a promise
  of provider pricing. The ceiling is an estimated application guard, not a
  provider-enforced billing limit. Unaccounted failed calls reserve their full
  allowance before the run stops. There are no automatic paid retries.
- `--dry-run`: inventory and select work without fetches or model calls.

A run lock in `.cache/heuristic-discovery/` prevents concurrent local runs on
the same output. After an interrupted process, confirm it is no longer running
before removing a stale lock. The local text cache may be reused on resume.

## Admission and interpretation

The extractor accepts at most three scoped rules per paper, including none.
Each proposal distinguishes an author-tested intervention from an inferred
recommendation, states models, workloads, setup, limitations, and a validation
experiment, and includes a verbatim passage of at most 25 words. The passage
must occur in the actual supplied text. A failed grounding or schema check is
an extraction failure, never a negative finding.

A full-text pass means the extracted HTML article text was supplied. It does
not guarantee complete equation/image extraction, semantic correctness, or
independent validation. `none` from partial text never counts as a complete
no-actionable-heuristic finding. Unsupported HTML or non-arXiv papers remain
unavailable until a text adapter or manual read is supplied; abstracts and
existing summaries are not silently substituted for full paper text.

Identical normalized rules merge into one displayed candidate with separate
source evidence. Similar rules are not automatically merged across different
model/workload scopes. Existing heuristic overlaps are tentative. The next
review step should compare semantics and counterevidence before merging or
promoting anything. A completed pass is not independent replication.

The validator checks record schemas, source and heuristic references, quote
length, and consistency of provenance. When the ignored text cache is present,
it also rechecks grounded passages. It cannot recheck text grounding on a clean
checkout without downloading the exact original text. Raw proposals remain
unvalidated regardless of these mechanical checks.

## Initial blocked run (historical)

The first all-paper attempt inventoried 566 paper records. Three initial fetches
failed with DNS errors; the circuit breaker stopped the run. Zero papers were
read and zero API tokens were spent. The 18 earlier editorial proposals remain
visible and explicitly separate. The other 563 papers are unattempted, not
negative results. Full-paper mining remains incomplete until network access is
available and the resumable command is run.


## Session batch 1 — 2026-10-22

Five focused reviews completed within the Codex session, producing nine
candidate proposals. No model API calls were made in this batch. Exact inspected
ranges are stored per paper; these are partial reviews, not complete appendix
reads or independent reproductions. See `session-batches/2026-10-22-01.md`.
The previous API run remains stopped; its history is preserved under `runs/`.
