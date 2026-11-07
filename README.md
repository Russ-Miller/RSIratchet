# RSI Ratchet

A shared reasoning bank for agents: heuristics grounded in research, with evidence about when they help and where they fail. The catalog is available today; shared agent validation is being developed.

Site: https://rsiratchet.com (rsiratchet.ai to follow). Repo: github.com/Russ-Miller/RSIratchet. Package and Vercel project keep the `modelselfhelp` slug.

Status: pre-alpha. Spec and scaffold in progress.

## Why this and not a paper index

Papers with Code (and feeds like Hugging Face Papers) tell you which
papers exist about a topic. RSI Ratchet tells you what they found, and
under what conditions it stops being true. The unit is a **claim**, not a
paper: "chain-of-thought helps on math, not on planning", with the papers
for and against attached and a falsifier stated. Anyone, human or agent,
can add support or contest it. Techniques get their standing from those
claims, so "does this fix actually work?" returns evidence, not a reading
list. When a claim breaks, that is kept as the most valuable thing on the
site, not deleted. See `docs/spec.md`, "What this is, versus a paper feed".

## License

Code and content have separate terms:

- **Code** (`src/`, `scripts/`, `.github/`, config, excluding embedded catalog content and site prose): [MIT](LICENSE).
- **New original content** (`catalog/`, `docs/`, site prose and content outputs): [RSI Ratchet Content Terms](LICENSE-CONTENT). Public content may be read and applied internally, including in commercial agents and harnesses; protected content may not be redistributed or resold without permission.
- **Fresh findings:** new heuristics, techniques, claims, and original validation annotations may be reserved for paid or contribution-credit access under separate agreements. Public access does not grant redistribution rights. Access controls and credit accounting are not yet implemented by this license change.
- **Legacy content:** material already released under CC BY 4.0 keeps that license. The pre-transition snapshot is `cf33e049c16ba272b7be9b5fb00b223ce85cf6fd`; see the [legacy license](LICENSE-CONTENT-LEGACY-CC-BY-4.0). New terms apply only to new protectable material, not unchanged legacy text.
- **Third-party material and underlying knowledge:** research papers and archived source text retain their own rights. Facts, ideas, methods, and discoveries are not claimed as proprietary.

New content contributions require the rights described in the contribution section of the Content Terms, including commercial distribution and sublicensing while contributors retain ownership. Intake must obtain agreement before relying on that grant. Contribution credits will need separate program terms.

## For agents without MCP

- `https://rsiratchet.com/index.json`: the whole catalog as one JSON file (refs, labels, summaries, counts, links), rebuilt on every deploy.
- `https://rsiratchet.com/llms.txt`: a plain-text front door describing the records and how they relate.
- `https://rsiratchet.com/id/<ref>`: stable refs (CAP-, CLM-, TEC-, SRC-, ADG-nnnn) redirect to the record.

## MCP server

The catalog is available to Claude Code (or any MCP client) as a local
server that reads this checkout directly:

```
claude mcp add -s user rsiratchet -- npx --prefix /path/to/repo tsx /path/to/repo/scripts/mcp-server.mts
```

Tools: `search` (words and meaning, merged), `advise` (situation in,
techniques out with conditions, cost, failure modes and counter-evidence,
ranked categorically, never scored), `get`, `technique_standing`,
`related_claims`, `list`, `open_questions`. No API key; meaning search runs
the same local model as the site.


## Discover candidate heuristics

The research workbench at `/heuristics/candidates` separates paper-text discoveries
from initial editorial proposals and shows an outcome for every ingested paper.
Candidates never become established guidance automatically.

The selected workflow is review within the Codex session, in batches of five
papers followed by a subscription-usage checkpoint. Prepare documents without
model-provider calls:

```sh
npm run prepare-heuristic-reviews -- --ids source-id,source-id
npm run validate:discovery
```

Session reviews record the actual inspected ranges and distinguish selected
sections from complete paper reads. The separately billed extractor is stopped
and refuses paid calls unless explicitly enabled with `--paid-api`.
See [discovery documentation](discovery/heuristics/README.md) and the
[first session batch](discovery/heuristics/session-batches/2026-10-22-01.md).
