# RSI Ratchet — working rules for Claude

## The sign on the wall

**Focus on the art of the possible.** Ultimately — and it will take time,
iteration, and effort — *there is a way.* Unless there isn't, in which
case prove that, rather than giving in easily.

Read the second sentence as carefully as the first. It is not a hedge, it
is a falsifier, and it is what separates this from mere optimism: "there
is a way" is a claim, and the honest response to a claim is to try hard to
break it, not to assume it or to abandon it. Every obstacle written down
in `docs/ambitions.md` carries an attack for this reason. Cataloguing a
wall without proposing a door is the wrong posture here — the walls are
why the work is necessary, not arguments against it.

Concretely, when something looks blocked: say what would have to be true
for it to be possible, and go test that. "This cannot work because X" is
only finished if X has been checked.

## What this is
A shared reasoning bank for agents and harnesses, centered on practical
heuristics grounded in research and eventually validated through agent use.
The personal-study framing is superseded (2026-10-20). Heuristics lead the public
experience; capabilities, claims, techniques, and sources provide depth.
Distinguish the current read-only local MCP server and issue-based submissions
from planned automated agent write-back. Accounts, subscriptions, billing, and
contribution-credit accounting are deferred. Keep the current brand pending the
roadmap TODO. Read `docs/spec.md`; inspect the live schema rather than relying
on historical migration notes. New content follows LICENSE-CONTENT; existing
CC BY grants and third-party rights are preserved.

## Next.js
The installed Next.js is newer than training data. Read `AGENTS.md` and the
bundled docs in `node_modules/next/dist/docs/` before writing app code.

## Layout
- `docs/` — spec, roadmap, decision log. The spec is the source of truth.
- `docs/examples/` — draft schema/content for changes still under review,
  kept separate from `catalog/` so `npm test` never goes red for a draft.
- `catalog/` — the content, as YAML validated by JSON Schema. Git is the
  database for catalog content. See `docs/spec.md` for the entity model.
- `src/` — Next.js app (site, API routes, MCP endpoint — the MCP/API
  surface is later-phase per spec §9, not v1).
- `scripts/` — validation and maintenance scripts (`npm run validate`,
  `npm run verify-papers`, `node scripts/fetch-citations.mjs`). The last
  one is a cheap, narrow citation-recency check (Semantic Scholar, no LLM
  cost) — not the same thing as the later-phase daily-scouring pipeline
  in spec §6/§9, and doesn't need to wait for it.
- `pipeline/` — later-phase automated re-evaluation (spec §6, §9); not
  yet present.

## Workflow
- One milestone per branch, named `mN-short-name`. Never commit to `main`.
- Open a pull request when the milestone is done; leave a report in
  `docs/reports/mN.md` summarizing what was built, what was skipped, and why.
- `npm test` must pass before opening a PR. It runs catalog validation,
  unit tests, lint and a production build.
- Commit messages: imperative subject, blank line, short body. End with
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Never write secrets into the repo. `.env` is untracked; `.env.example`
  documents the keys.

## When in doubt
- Prefer the simpler option and note it in the milestone report.
- Do not invent papers, arXiv IDs, results, repos, or personal
  observations. Every paper-kind source must pass `npm run verify-papers`
  (title check against arXiv). An observation-kind source records what
  the user actually noticed — never fabricate one on their behalf; if a
  worked example needs an illustrative observation, mark it plainly as a
  placeholder rather than presenting it as something the user said.
- Do not add a dependency for something that takes under fifty lines.
- If an external account, secret, or human decision blocks part of a
  milestone, finish everything else and state the blocker in the report.
- Content wording: plain English, name the mechanism or the finding
  concretely, avoid hype. A claim without its scope condition gets
  misapplied later — always write the scope into the statement itself.

## Catalog conventions
- Slugs are lowercase kebab-case and are permanent once merged.
- A **Capability** (`catalog/capabilities/`) is a topic page: `id`,
  `label`, `summary`, `description`, `tags` (soft, re-assignable — not a
  rigid single `group`), `status` (`active`/`parked`). It lists claims; it
  is not itself scored.
- A **Claim** (`catalog/claims/`) is the primary content unit: a
  directional, scoped statement (`statement`), not a performance number.
  Carries `kind` (`mechanism` = durable / `observation` = perishable,
  tied to a specific model or era — keep these structurally distinct so
  perishable content doesn't contaminate durable knowledge),
  `backing_strength` (`single-paper`/`replicated`/`mechanism-reasoning`/
  `own-observation` — a category, not a score), and `sources` (a list of
  `{source, stance: supports|contests, note}`). A contested claim needs
  sources on both sides plus a `disagreement_axis` explaining the
  suspected reason for disagreement, explicitly flagged `is_guess` when
  it is one — never a bare `contested: true` with nothing backing it.
- A **Source** (`catalog/sources/`) is a paper or the user's own
  observation, same schema, distinguished by `kind`. Claims reference
  sources, not the other way round — fix a source once, every claim
  citing it benefits.
- A **Technique** is not a source; it links to the capabilities it
  improves and should point at runnable code.
