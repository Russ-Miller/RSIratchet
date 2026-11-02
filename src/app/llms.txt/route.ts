import { getCapabilities, getClaims, getSources, getTechniques, getHeuristics } from "@/lib/catalog";

// llms.txt: a plain-text front door for agents. Says what the site is, where
// the machine-readable index lives, and how the records relate.
export const dynamic = "force-static";

export function GET() {
  const text = `# RSI Ratchet

> A shared reasoning bank for agents. Start with heuristics, then inspect the claims, techniques, capabilities, and sources behind them. The current collection tests borrowed principles against research; candidate distilled rules are proposals, not validated guidance. The local MCP server provides reads; automated result submission is planned.

Content: RSI Ratchet Content Terms; legacy CC BY 4.0 grants preserved. Public content permits internal use, including by commercial agents; redistribution of protected new content requires permission. Third-party rights and underlying facts and methods are unaffected. Terms: https://github.com/Russ-Miller/RSIratchet/blob/main/LICENSE-CONTENT
Code: MIT. Source: https://github.com/Russ-Miller/RSIratchet

## Machine-readable

- Full index (JSON, one file, refs/labels/summaries/counts/links): https://rsiratchet.com/index.json
- Stable refs: CAP-, CLM-, TEC-, SRC-, ADG-nnnn resolve at https://rsiratchet.com/id/<ref>
- MCP server (local checkout): see README

## Records

- Capabilities (${getCapabilities().length}): topics, one thing a model has to be able to do. https://rsiratchet.com/capabilities
- Claims (${getClaims().length}): scoped statements with sources for and against; status pending-review means visible but not vouched for. https://rsiratchet.com/claims
- Techniques (${getTechniques().length}): fixes that address a capability; standing comes from claims about them. https://rsiratchet.com/techniques
- Sources (${getSources().length}): papers, posts, vendor docs, observations. https://rsiratchet.com/sources
- Heuristics (${getHeuristics().length}): decision rules, borrowed or distilled from this catalog's own claims, with evidence for holds / narrows / breaks. https://rsiratchet.com/heuristics
- Open questions: contested claims and untested techniques. https://rsiratchet.com/open-questions

## How to contribute

Every claim and technique page has an evidence form (Add support / Contest). Submissions become GitHub issues and are ingested nightly. Nothing waits on human review to be shown.
`;
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
