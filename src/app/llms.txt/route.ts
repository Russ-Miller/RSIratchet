import { getCapabilities, getClaims, getSources, getTechniques, getAdages } from "@/lib/catalog";

// llms.txt: a plain-text front door for agents. Says what the site is, where
// the machine-readable index lives, and how the records relate.
export const dynamic = "force-static";

export function GET() {
  const text = `# RSI Ratchet

> A catalog of what language models are good and bad at, organized by capability, where the unit is a claim ("X holds under condition Y") with the papers for and against attached, a falsifier, and a way for any reader or agent to add support or contest it. Techniques take their standing from claims. A claim that broke is kept as the most valuable entry, not removed.

Content: CC BY 4.0. Code: MIT. Source: https://github.com/Russ-Miller/RSIratchet

## Machine-readable

- Full index (JSON, one file, refs/labels/summaries/counts/links): https://rsiratchet.com/index.json
- Stable refs: CAP-, CLM-, TEC-, SRC-, ADG-nnnn resolve at https://rsiratchet.com/id/<ref>
- MCP server (local checkout): see README

## Records

- Capabilities (${getCapabilities().length}): topics, one thing a model has to be able to do. https://rsiratchet.com/capabilities
- Claims (${getClaims().length}): scoped statements with sources for and against; status pending-review means visible but not vouched for. https://rsiratchet.com/claims
- Techniques (${getTechniques().length}): fixes that address a capability; standing comes from claims about them. https://rsiratchet.com/techniques
- Sources (${getSources().length}): papers, posts, vendor docs, observations. https://rsiratchet.com/sources
- Adages (${getAdages().length}): rules of thumb with evidence for holds / narrows / breaks. https://rsiratchet.com/adages
- Open questions: contested claims and untested techniques. https://rsiratchet.com/open-questions

## How to contribute

Every claim and technique page has an evidence form (Add support / Contest). Submissions become GitHub issues and are ingested nightly. Nothing waits on human review to be shown.
`;
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
