# Heuristic-first service rework — 2026-10-20

The public site now introduces RSI Ratchet as a shared reasoning bank for
agents. The homepage leads with practical readings of existing heuristics,
explains how research and agent experience could refine guidance, and explicitly
preserves unsuccessful attempts as useful evidence. It distinguishes today's
catalog and local read-only MCP server from future automated agent write-back.

Primary navigation emphasizes heuristics, research, and how the service works.
Capabilities, claims, techniques, and sources remain accessible in the footer,
search, and contextual evidence links. The About page and catalog introductions
were rewritten for brevity. A warm paper/green visual system, responsive layouts,
keyboard focus styles, and a skip link apply across the site. Existing record
identifiers, catalog content, evidence calculations, and forms remain intact.
Editorial application summaries are explicitly labeled, not new measured claims.
The existing distilled-heuristic filter now has the missing CSS hide rule.

## Candidate mining

The first editorial mining pass proposes 18 candidates from claims already
extracted from papers. Seven overlap existing heuristics; three have some
human-reviewed support. All are unvalidated proposals, kept outside the catalog
and its search/MCP output. The candidate workbench at `/heuristics/candidates`
links each proposal to its basis, qualifications, and scope limitations.

See `docs/examples/heuristic-mining/README.md` for coverage, all candidates, and
the limits of this pass. `node scripts/audit-heuristic-candidates.mjs` checks
references and recomputes coverage without model/API calls. Full paper texts
were not re-read and this count is not an estimate of the total extractable.

## Verification

- Catalog validation and embedding freshness passed; no catalog records changed.
- Existing unit suite: 14 tests passed.
- ESLint passed.
- Production compilation, TypeScript, and static generation passed using
  `npx next build --webpack` (1,435 generated pages).
- Generated HTML checks on ten representative routes found one H1 per page and
  resolving internal links and fragment targets.
- Candidate audit passed: 18 candidates, 20 referenced claims, 20 distinct
  paper records; paper-backed extraction pool is 245 claims.
- Default Turbopack build is blocked here by sandbox denial of its local port
  binding. The Webpack build succeeds without changing the production script.
- Browser visual and interactive checks remain unverified: Chromium launch is
  denied by the macOS sandbox. Responsive behavior is implemented but was not
  visually confirmed in this environment.

Accounts, subscriptions, billing, credit accounting, hosted MCP, and automated
agent submissions are deferred. Branding remains unchanged pending its TODO.
No deployment, paid processing, Git commit, or remote push was performed.
