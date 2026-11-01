import type { Heuristic, Capability, Claim } from "@/lib/catalog";

const REPO = "https://github.com/Russ-Miller/RSIratchet";

/**
 * The only route by which anyone but the author can tell this catalog it is
 * wrong. There is no backend, so it opens a prefilled GitHub issue -- which is
 * also the right medium: a challenge should be public, attributable and
 * durable, exactly like the claims it argues with.
 *
 * The prefill matters more than the button. "Report a problem" gets vague
 * complaints; asking for the source that cuts against a claim gets something
 * filable.
 */
export function ChallengeLink({ claim }: { claim: Claim }) {
  const body = `Claim: ${claim.id}
${claim.statement.replace(/\s+/g, " ").trim()}

**What is wrong with it?** (delete what does not apply)
- The finding does not hold — here is a source that cuts against it:
- The scope is wrong — it holds, but not under the conditions stated:
- The sources do not say this:
- Something else:

**Evidence** (a link, a paper, or something you ran yourself — an observation
with the setup written down counts):

**Who you are** (optional, for attribution if this gets filed):
`;
  const url = `${REPO}/issues/new?title=${encodeURIComponent(`Challenge: ${claim.id}`)}&body=${encodeURIComponent(body)}&labels=challenge`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500">
      <span aria-hidden>&darr;</span> Contest this claim
    </a>
  );
}

/**
 * The same route for a capability: is this a real topic, is the boundary
 * right, should it be merged or dropped. Proposed capabilities were added by a
 * pipeline noticing a recurring framing, so they especially need somewhere for
 * "no, that is two things" to land.
 */
export function CapabilityChallengeLink({ capability }: { capability: Capability }) {
  const body = `Capability: ${capability.id} (${capability.status})
${capability.summary.replace(/\s+/g, " ").trim()}

**What should change?** (delete what does not apply)
- This is not a real topic — it should be dropped:
- This is really the same thing as another capability — merge it with:
- This is two things and should be split into:
- The boundary is wrong — it should include / exclude:
- The name or wording is misleading:

**Why** (a paper, an example, or a case the current wording handles badly):

**Who you are** (optional, for attribution):
`;
  const url = `${REPO}/issues/new?title=${encodeURIComponent(`Capability: ${capability.id}`)}&body=${encodeURIComponent(body)}&labels=capability`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500">
      <span aria-hidden>&#8646;</span> Suggest a change
    </a>
  );
}

/**
 * For a heuristic the useful challenge is evidence either way: a case where
 * it held, a case where it broke, or a reason the transfer argument is wrong.
 * Breaks are the ones worth the most, so the template asks for them first.
 */
export function HeuristicChallengeLink({ heuristic }: { heuristic: Heuristic }) {
  const body = `Heuristic: ${heuristic.id}
${heuristic.statement.replace(/\s+/g, " ").trim()}

**What do you have?** (delete what does not apply)
- A case where it breaks for models — what happened, and under what conditions:
- A case where it holds — measured, not just plausible:
- The transfer argument is wrong — the mechanism given does not apply because:
- It holds only under a condition the entry does not state:

**Evidence** (a link, a paper, or something you ran yourself — an observation
with the setup written down counts):

**Who you are** (optional, for attribution if this gets filed):
`;
  const url = `${REPO}/issues/new?title=${encodeURIComponent(`Heuristic: ${heuristic.id}`)}&body=${encodeURIComponent(body)}&labels=challenge`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500">
      <span aria-hidden>&darr;</span> Add a case where it holds or breaks
    </a>
  );
}
