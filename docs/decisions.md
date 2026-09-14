# Decision log

Short entries, newest first. Record the decision and the reason, not the
debate.

## 2026-09-02 — Catalog content lives in git, accounts in Postgres
Content as YAML in the repo gives provenance, review by pull request, and
agent contribution through the same path as humans. Postgres is only for
accounts, tokens and rate limits. Revisit when PR volume outgrows review.

## 2026-09-02 — Vercel + Neon over Fly.io
Per-PR preview deployments and database branching fit the one-milestone-
per-night workflow. Long-running work (pipeline) goes to GitHub Actions.

## 2026-09-02 — Stack
Next.js + TypeScript, Drizzle + Postgres, Auth.js with GitHub, YAML catalog
validated by JSON Schema, Python pipeline, MCP over streamable HTTP in the
same app.

## 2026-09-02 — No agent detection
Agents identify themselves by token in exchange for higher limits and
attribution. Heuristic detection is unreliable and adversarial.

## 2026-09-02 — Weakness vs Claim split
Weaknesses are timeless patterns; claims are model × version × context ×
date and are expected to be superseded. "Bad at math" was true in 2022 and
false by 2024; the split keeps the catalog honest over time.

## 2026-09-02 — Name the failure, describe the capability
Each weakness entry carries both `description` (what good looks like) and
`failure_looks_like` (concrete symptoms). The second is what makes an entry
testable and what an agent needs to decide whether it applies.

## 2026-09-03 — Renamed Weakness to Capability; claims get a 1-10 score
The entity is now named neutrally because several entries (secure-coding,
goal-conflict-safety) are behavioral/safety properties, not pure cognitive
weaknesses, and because it lets the catalog note that humans share some of
these gaps too (e.g. digit arithmetic) rather than implying AI is uniquely
bad. Claims replace the negative-only `severity` enum with a `score`
(1-10, 1=weak_performance_looks_like, 10=strong_performance_looks_like) —
this also makes evidence `stance` (supports/counters) redundant, since a
claim's score plus its date already shows the trend directly, so evidence
is now a plain citation with no stance. No fixed rubric for the rungs
between 1 and 10 yet; deferred until real disagreement between scores
shows it's needed.

## 2026-09-03 — Importance claims planned, reusing the Claim shape; both stay on a 1-10 scale for now
Considered up/down voting on capability importance ("does this matter more
in domain X than Y"), rejected in favor of an evidence-backed Importance
entry keyed to (capability, context) instead of a raw vote count — a vote
is trivially gameable and carries no provenance, while reusing the scored,
cited, provenanced Claim pattern costs little extra and fits the review
pipeline already planned for milestone 4. Not building this yet; capturing
the design intent so it isn't lost. Accepted evidence kinds for an
Importance claim, roughly ranked strongest to weakest: failure-analysis
papers (quantify how often the capability's failure caused breakage in
that domain), regulatory/standards documents naming it as critical,
task-composition studies (share of real tasks in a domain depending on
it), and practitioner surveys (weaker, self-report). Whether Importance
should be 1-10 like Performance or a coarser tier (Low/Moderate/
High/Critical) is still open — deferred alongside the performance-score
rubric (see the 2026-09-03 Capability rename entry above) so both
scales get designed together rather than twice. Raw benchmark numbers (e.g. "82.3% on
GSM8K") stay in the evidence `note` regardless of scale chosen; the
score is a legible summary, not a replacement for the underlying figure.

## 2026-09-03 — Capability requests are a separate lightweight record; admin is one boolean flag
A request to add a new capability doesn't require the requester to write
strong/weak anchors or find evidence — that would block casual, valuable
suggestions. So a request is its own small record (label, rationale,
optional links, status pending/accepted/declined/duplicate), not a
`catalog/capabilities/*.yaml` stub; the catalog stays made only of
fully-formed, evidence-backed entries. An admin turns an accepted request
into a real Capability. Admin access is a single `is_admin` boolean on the
account, set by hand for now — explicitly not a roles/permissions system;
that stays a non-goal. Admin write endpoints bypass the `proposed`
moderation state entirely, formalizing the earlier "maintainer" persona
into something with real API access rather than only GitHub PR review.
Open and deliberately unresolved: whether an admin's direct edit commits
to git (keeping git as the catalog's source of truth) or whether
capabilities move to a database once this exists — ties into the earlier
"git as the database... revisit when PR volume outgrows review" decision.

## 2026-09-03 — Bootstrap admin granted by GitHub login, not email
Considered seeding the first admin ("Captain of the Ship") tied to an
email address, rejected because GitHub OAuth only returns an email if the
account exposes one — a private-email setting would silently break the
match even if that email is verified on the account. GitHub login is
always returned and needs no extra scope, so `ADMIN_GITHUB_LOGINS` (an
env var allowlist, starting with `Russ-Miller`) is checked at login time
and upserts `is_admin=true` on match — live, not a pre-seeded row, so it
doesn't depend on seeding order relative to first login.

## 2026-09-03 — Personal-study reframe (major, ~180 degrees on scoring)
The project's purpose was reframed from "CWE for AI model capabilities,
agent-developer-first SaaS" to primarily a personal study tool — curiosity
-driven, "the neuroscience of LLMs," built for the author's own thinking
first. Other humans and eventually agents are hoped-for second-order
beneficiaries, not the v1 design target; the reasoning (the user's own):
the most useful tools were usually built because their creator wanted one
for themselves.

Consequences, each reversing or substantially revising an earlier
decision in this log:
- **Score retired.** The 1-10 capability score (2026-09-02 entry) is
  dropped for v1: scoring invites Goodharting invisibly from inside the
  loop, and quantitative numbers aren't portable across model version,
  decoding config, or benchmark quirks. Replaced by qualitative,
  directional claims with visible provenance.
- **Claim redefined.** A Claim is no longer a (capability, model,
  version, context, date) performance data point — it's a directional,
  scoped statement ("X degrades on tasks where Y"), the primary content
  unit. Capability becomes a topic page that lists claims (progressive
  disclosure), not a scored thing.
- **Sources, not Evidence-on-the-claim.** Renamed Paper → Source,
  generalized to cover the author's own observations under the same
  schema (so a lower-rigor parallel notes system doesn't develop). Claims
  reference sources; a source fixed once fixes every claim citing it.
- **Contested claims get structure**: both-side sourced citations plus a
  suspected disagreement axis (model scale, task family, operationalization,
  success criterion), explicitly flagged when it's a guess — not a bare
  boolean.
- **Durable vs. perishable is now a schema field** (`kind`:
  mechanism/observation), not just a tag, so perishable model-specific
  findings can't quietly contaminate durable mechanism-level knowledge.
- **Taxonomy demoted to a view.** The rigid single `group` field becomes
  soft, re-assignable `tags` — folk categories like "reasoning" probably
  carve the space badly and are expected to be re-carved at least twice.
- **Ongoing re-evaluation designed in** (schema + views only for v1):
  `last_checked_at`/`last_new_evidence_at` on claims, a recent-activity
  view, a sources view, and a 14-day staleness view. The actual daily
  internet-scouring automation is explicitly later-phase, gated on real
  engineering and API-cost decisions — same posture as the original arXiv
  pipeline.
- **The entire contributor-platform surface** (accounts, admin CRUD,
  capability requests, bootstrap-admin-by-GitHub-login, the agent-facing
  MCP/advise API) is preserved in spec.md §9 as later-phase design, not
  deleted — the thinking behind it is still sound, just not v1 priority.
  When it happens, agent-facing framing must be symptom → intervention,
  phrased as actions, never as a property of the model.
- Deferred, explicitly not v1: prediction-before-test as an entry type
  (record expectations before checking, since memory edits priors to
  match outcomes).

Execution note: rather than migrate all ~90 existing catalog files
against a schema that was still being nailed down, this pass rewrote
spec.md and the schemas and produced one fully worked example
(self-repair, under docs/examples/) for review before the bulk migration.
`catalog/` and the deployed site still reflect the pre-reframe model as of
this entry; `npm test` stays green because nothing under catalog/,
scripts/, or src/ was touched this round.

## 2026-09-03 — Citation recency as a visual signal, not an auto-hide rule
Added `citations_total`/`citations_recent_12mo`/`citations_checked_at` to
Source, fetched from Semantic Scholar's free API (`scripts/
fetch-citations.mjs`, no LLM cost, run by hand). This is a much narrower,
cheaper check than the daily-scouring re-evaluation pipeline deferred to
later-phase in spec §6/§9 — one API lookup per paper, not a search/
discovery job — so it didn't need to wait for that automation.

Considered and declined for now: an LLM call to judge whether newer
evidence has substantively superseded an older paper. Recent-citation
count is a proxy for "still discussed," not "still true" — a source can
stay well-cited while being cited critically — so it's used to prioritize
what a human looks at, not to auto-decide relevance. A source is only
ever visually "quiet" (no citations in 12 months, 2+ years old) when
citation data has actually been checked; unchecked sources are never
treated as stale by default, since absence of data isn't evidence of
staleness.

UI: quiet sources are pushed behind a native `<details>` disclosure on
claim pages ("+N older, quieter sources") rather than hidden outright —
the links stay, just deprioritized. The Sources index shows all sources
always, with quiet rows dimmed rather than collapsed, since browsing
everything is that page's job.

## 2026-09-04 — Citation refresh deferred; must be slow and incremental when built
Noted, not built: citation data on Source will go stale like claims do,
and re-evaluating a claim should eventually include re-checking its
sources' citation activity. When this is built, it cannot be a
straightforward re-run of `fetch-citations.mjs` on everything — the
initial fetch already showed this network hits Semantic Scholar's rate
limit hard (many papers needed 6-8 retries with minutes of backoff
each, across three separate runs to get from 0 to 57 of 60 sources
checked). The refresh needs to run as a slow background process, one
source at a time, real delay between requests, resumable, prioritizing
the oldest `citations_checked_at` first — likely tied to the same
later-phase automation as the 14-day claim staleness re-check, not a
naive full re-scan.

## 2026-09-04 — Technique efficacy is a Claim, not a field on the Technique
The core job is a four-stage lifecycle: where systems are weak, what
holds them back, what overcomes it, and whether that actually held up.
Stage 4 is the one most indexes get wrong -- an announced fix may be a
false alarm, or far more often may work only under conditions nobody
stated up front.

So efficacy gets modeled as a Claim with a new optional `technique`
field, not as a property of the Technique record. Technique previously
could express efficacy only through `status: disputed` plus a free-text
`caveats` string -- exactly the bare-boolean failure mode already
rejected for claims on 2026-09-03. Routing efficacy through Claim
inherits sources-with-stance, disagreement_axis, and scope conditions in
the statement for free. A Technique record says what the technique is and
where the code lives; a claim referencing it says what it does, for which
capability, under what conditions.

Validation enforces that an efficacy claim's technique actually lists the
claim's capability in its `addresses`, so the two can't drift apart.
First example filed: external-feedback-repair works only with real
grounding -- genuinely contested, with Reflexion and the self-correction
critique paper supporting from opposite directions and Self-Refine
contesting the scope.

## 2026-09-04 — Nightly ingestion: filter to arXiv, use a trailing window
Stage 1 of ingestion pulls from OpenAlex into pipeline/queue/, never into
catalog/. Two findings from measuring it, both of which changed the
design:

**Filter to the arXiv source.** Unfiltered, a recent window is dominated
by journal domain-application work -- LLMs applied to air traffic
control, pediatrics, nutrition estimation, hospitality marketing -- plus
Zenodo/bioRxiv/Preprints.org noise. Precision was roughly 10-15 percent
and a free keyword heuristic only lifted it to maybe 30. Restricting to
OpenAlex's arXiv source id took the top of the queue to essentially all
genuine capability research. Deduplication also got easier: the
duplicate-record rate fell from about 20 percent to 1 percent, since the
journal/Zenodo layer is where the duplicates live. `--all-sources`
disables the filter when a wider sweep is wanted.

**Use a trailing window, not yesterday.** OpenAlex ingests arXiv with a
lag of several days; a 1-day window returned zero arXiv works while the
same query over a two-week window returned 1261. So the default window is
the trailing 7 days. Combined with the committed seen-ledger this is
self-healing: a paper is picked up whenever it finally lands in the
index, and is never surfaced twice.

The keyword heuristic is kept, but demoted -- it now orders the queue
rather than rescuing precision, and it never discards, since a
domain-flavored paper (a clinical reasoning benchmark, say) can still be
real capability research.

Remaining problem is volume, not precision: about 98 arXiv candidates a
day are genuinely on-topic. That is simply the publication rate of the
field. Stage 2 classification, if built, is therefore about choosing
which of these deserve a claim, not about filtering out garbage.

## 2026-09-04 — Queue grouped by capability; direction deferred to stage 2
The heuristic score turned out to screen rather than rank. Sampling the
queue showed the negative (domain) signals do the real work, while the
positive ones pile up on nearly everything: once the arXiv filter and
domain penalties remove the junk, what remains is a flat field of
genuinely relevant capability research. Papers at the median scored as
well as the top -- a mitigation-with-side-effect paper on sycophancy,
directly on-catalog, sat mid-queue under a pile of higher scores.

So the queue is now grouped by which capability a paper concerns, matched
against vocabulary carried on the capability records themselves (id,
aliases, and a new optional match_terms field) rather than hardcoded in
the crawler. 214 of 689 candidates matched. Score is retained but
demoted to ordering within a group.

The matching is deliberately topical only: it answers what a paper is
about, never whether the paper improves a capability, degrades it, or
merely measures it. That direction is the eventual goal -- it is what
distinguishes a mechanism claim from an efficacy claim, and a supporting
efficacy claim from a contesting one -- but reading it out of an abstract
needs a model, not keywords. Topical pre-matching also narrows what stage
2 has to judge: instead of "is this relevant at all" across every
candidate, the question becomes "for this paper already matched to
sycophancy, does it improve, degrade, or measure?"

## 2026-09-04 — Capability discriminators; topical matching tightened
Two changes to how ingestion candidates get matched to capabilities.

**Matching now weights the title.** A capability term in the title is
strong evidence the paper is about it; a term buried in an abstract is
often a passing mention, since a model technical report will name half a
dozen capabilities it benchmarked without being about any of them. An
abstract-only match now requires two or more occurrences of the
capability's vocabulary. Measured effect on a 689-candidate queue:
matched fell from 214 to 95, and a model technical report that had
matched two capabilities on single passing mentions correctly dropped
out, while a genuinely cross-cutting context-management paper kept its
multiple matches. An earlier, stricter variant (two distinct terms rather
than two occurrences) over-corrected -- 80 matched and cross-cutting
signal nearly gone.

Also removed three over-broad match terms found by tracing false
positives: "vulnerability" from secure-coding (ordinary English in this
literature), "guardrail" from goal-conflict-safety, and "counting" from
arithmetic (was catching visual object counting).

**Capabilities carry a `discriminator`.** Optional prose stating the
inclusion/exclusion boundary, written for whatever decides whether a
paper is really about the capability -- stage 2 eventually, a human
reviewer today. Crucially it records known near-misses, since those are
what a name alone cannot convey: arithmetic excludes visual object
counting, secure-coding excludes the generic word "vulnerability",
goal-conflict-safety excludes content moderation and refusal behavior.
The false positives found while debugging the matcher are exactly the
material these should capture, so they were seeded from real evidence
rather than invented.

Editing these through an admin UI remains deferred with the rest of auth
(spec section 9). Today they are edited as YAML in git, which already has
authentication and an audit trail.

## 2026-09-04 — Stage 2: direction classification against held claims
Built. For each (candidate, matched capability) pair, a model call judges
whether the paper is genuinely about the capability (using that
capability's discriminator), whether it improves/degrades/measures it,
and -- the point of the exercise -- whether it contradicts a claim the
catalog already holds. Verdicts are written back into the queue file, not
into catalog/; nothing is promoted without review.

Model is claude-opus-5 at effort low with structured outputs, the system
prompt cached across the run. Measured on the full queue: 93 pairs for
$0.88, about $0.0095 each. Cost was never the constraint -- the free
topical matcher had already cut 689 candidates to 95, which is where the
7x saving came from.

The prompt is deliberately biased toward conservatism, because a false
"contradicts" is worse than a missed one: it says discussing the same
topic is not contradiction, reserves degrades for real evidence of
regression, and states that an empty claim id beats a wrong one. Result
on 99 verdicts: 37 improves, 20 measures, 7 degrades, 35 judged not
actually about the capability they matched -- that last number is the
keyword matcher's residual false-positive rate, now visible rather than
silent.

Two genuine challenges surfaced against held claims, both checked by
hand and sound. The sycophancy one caught a shared-mechanism argument:
anti-sycophancy training also impairs legitimate belief updating, which
cuts against the held claim that synthetic-data fine-tuning simply
reduces sycophancy.

A /contested view collects it all: incoming challenges from the queue,
and contested claims already in the catalog with their axis of
disagreement. Capability and claim lists carry contested counts, and
claims sort contested-first.

## 2026-09-04 — Technique carries what it is; Claim carries whether it works
The split was only half-implemented. Two fields on Technique were still
making efficacy assertions:

`status` had values accepted/proposed/disputed/retired. Seventeen
techniques were "accepted", which asserts the technique works -- with no
source, no scope, and no way to contest it. Exactly the unfalsifiable
property the design rejects. Replaced with active/superseded, describing
the record's lifecycle rather than any verdict.

`caveats` (on 15 of 21) mixed two different things. "Requires
fine-tuning access" is a prerequisite -- part of what the technique is.
"Without a real external signal the loop tends to make answers worse" is
a scoped directional claim about when it fails, which belongs in a claim
with sources. Split by hand: prerequisites became a new `requires` field,
and the twelve efficacy statements moved to
docs/technique-efficacy-backlog.md rather than being deleted or
invented into claims without sources.

Parking them was the honest option. Several were practitioner knowledge
with no published study ("no controlled study isolates its effect"),
which is a statement about backing strength -- so filing them as claims
needs either a real source or an own-observation source the user
actually made, not one fabricated on their behalf.

## 2026-09-04 — Modality is a field, not a split, except where mechanisms differ
The catalog was implicitly text-only. Rather than declaring that, a
`modality` field now records where a capability is genuinely bound to one
— `text | image | audio | video | action`, optional and multi-valued.

Only six of the nineteen existing capabilities got one. Reversal curse,
arithmetic, code generation, long-context degradation, secure coding and
hallucination are text-bound by construction. The rest — sycophancy,
tool-use, prompt injection, state tracking, procedure following — are the
same capability whatever comes in the input, and tagging them `[text]`
would have asserted a boundary that isn't there. Absent means
modality-agnostic, not unknown.

Four capabilities were added from the stage-2b proposals, all of which
had been blocked on this decision: audio-understanding,
video-temporal-reasoning, visual-grounding, embodied-control.

The interesting one is visual-grounding. It could have been
`hallucination` with `modality: [image]`, since the failure looks the
same — asserting what isn't there. It's separate because the mechanism
and the mitigations differ: text hallucination is addressed with
retrieval and verification, while visual ungroundedness is about whether
the model attends to image evidence at all or falls back on language
priors about what usually appears in such a scene. Same criterion already
used for every other split — different mechanism, different capability —
so a shared surface symptom isn't enough to merge them. They're linked
via `related` instead.

Likewise embodied-control is not tool-use. A tool call succeeds or
returns an error; a knocked-over object stays knocked over.
Irreversibility and continuous partial state are what make it a distinct
problem.

## 2026-09-04 — An unbacked technique is a research brief, but only if someone looked
Clearing the efficacy backlog left one technique — `reread-before-edit` —
with no supporting study, and a supplied citation (FastContext) that was
a real paper on an adjacent subject and would have read as support
without being any. Rejecting it raised the better question: a technique
nobody has measured is an opportunity, and the app should say so.

The trap is that "no efficacy claim" has three causes that look identical
in the data. Genuinely unstudied. Studied, but I haven't found it. Or
argued from mechanism and never quantified. Only the first is a research
opportunity, and a count of zero cannot tell them apart — so a view that
lumped them would assert "nobody has researched this" with nothing behind
it. That is the same unfalsifiable move as the `status: accepted` field
this catalog already deleted, run in reverse.

What makes the absence real is recording the search. New optional
`evidence_search` on Technique: `searched_on`, a `note` saying what was
looked for, and `nearest_miss` entries pairing a paper with why it does
not fit. `reread-before-edit` now carries the FastContext dead end and a
sketch of the experiment that would settle it — rate of silently wrong
edits with and without the read-recency precondition, same task set.

`/open-questions` derives the rest: 1 searched-and-open, 9 not yet
searched, 3 argued-not-measured. Nothing new is stored for sections 2 and
3; they fall out of claims that already exist. The section headings carry
the distinction rather than a tooltip, because the whole value of the
page is that the three states are not the same claim.

This also gives the gamification idea from docs/reputation-notes.md a
unit that resists gaming: an open question with a documented search
behind it is something a person can actually close, and closing one is
checkable in a way that "contributed a citation" is not.

## 2026-09-04 — Asking the open question in the other direction
Three additions, one theme: the catalog knows more about its own gaps
than it was showing.

**Evidence activity per claim.** The sources list already showed citation
recency per paper; a claim rests on several. Aggregated as the *max*
across its sources, not the sum — one paper the field is still citing
means the evidence base is live, and adding counts across papers would
report a number no one measured. Sources never fetched are excluded
rather than counted as zero, and a claim with none checked says so
explicitly. A blank cell reads as "no citations"; it actually meant "not
looked up", and those are different.

**Contested-only filtering** on the capability and claim lists. Done with
a `data-contested` attribute per row and one CSS rule, so the pages stay
fully static and the filter ships no second copy of the data.

**Capabilities with no measured mitigation** on /open-questions. The
existing sections ask "does this technique work"; this asks "does
anything work". A capability qualifies when claims establish the problem
and no technique addressing it has an efficacy claim with measured
backing. Split the same way as the technique sections, because
`no-technique` and `none-measured` invite different work: the second is a
citation away from closing, the first would be new knowledge. Currently 3
and 7, against 9 capabilities that do have a measured fix — a ratio worth
watching, since it is the closest thing here to a map of what is actually
unsolved.

Reusing one `isMeasured` predicate across both views matters more than it
looks. It means "measured" cannot drift between the two pages, and it
puts real weight on the mechanism-reasoning backing strength: a claim
filed that way deliberately does not count as a fix, which is why filing
those honestly earlier today paid off immediately.

## 2026-09-04 — Open questions became a lens, not a destination
The three /open-questions sections were only visible on /open-questions,
which framed them as a separate list of chores. The interesting reading is
comparative: "seven capabilities have no measured mitigation" means
something only next to the nine that do.

So the same cuts are now filters on the Capabilities, Claims and
Techniques tabs, and each /open-questions section links to its own
filtered view. Checkboxes became a segmented bar — All first, then one
button per cut with its count — because these are alternative views of one
list, not independent booleans to combine, and a row of checkboxes implies
an AND nobody wants.

The part worth keeping honest: the filters call the same helpers the
sections do (`openQuestions`, `unmitigatedCapabilities`), so a button's
count and a section's count cannot disagree. The alternative — a filter
predicate written inline per page — would have been three chances to
define "measured" slightly differently, which is exactly how a catalog
starts lying to itself.

Filter state lives in the query string rather than component state alone.
That is what makes the cross-links work, and it means a filtered view is
something you can send someone.

## 2026-09-04 — UI voice: explain the gap, don't argue about it
Russ rewrote the /open-questions copy and the difference is worth naming,
because it will apply to every page eventually.

The old copy argued with itself. It reached for the project's internal
reasoning ("the same unfalsifiable move as `status: accepted`, just
inverted"), used em-dashes to stack clauses, and wrote from "I". That
reads as a designer defending a decision to another designer.

The new copy explains. Short declarative sentences, one idea each. First
person plural, because a reader looking at a catalog wants to know what
*we* found, not what I did. And the distinction that motivated the whole
page survives in plain words: "If we searched the literature and found
nothing, that tells us something about the state of the research. If we
simply haven't investigated a technique yet, that only tells us we haven't
looked at it."

That is the same argument, and it lands harder without the jargon. The
rule going forward: the reasoning belongs in docs/decisions.md, the
consequence belongs in the UI.

**Style, not vocabulary.** The first pass at this got it wrong by
rewriting the nouns too: "technique" drifted to "mitigation", "nearest
miss" to "closest paper we found", "unmeasured" to "untested". Those are
schema words. Technique, claim, capability, source, measured, contested,
mechanism — a reader who learns them on one page should find the same
words on the next, and `nearest_miss` is a literal field name.

One of the swaps was worse than drift. "Would bear on" became "Would help
with", which asserts the technique helps — the exact claim this catalog
refuses to make about a technique nothing has measured. The copy would
have contradicted the section it sat in.

So: sentence style changed, vocabulary restored. Applied to the Open
Questions tab only for now; the other tabs still carry the older voice.

## 2026-09-04 — Weaknesses looking for techniques, not problems looking for mitigations
Two vocabulary corrections from Russ, both about framing rather than
wording.

**"Mitigation" is out.** It imports risk-management framing: hazards to be
contained. That is not what this is. The work is finding what makes a
capability better — innovation and answers, not damage control. The word
is "technique", which is also the entity name, so the copy now matches the
schema. `unmitigatedCapabilities()` became `unsolvedCapabilities()`.

Kept where it is accurate rather than framing: papers say "mitigate
hallucination", so the ingestion scorer still matches the term, capability
discriminators still describe papers that mitigate something, and the
judge-bias claims still say a bias was mitigated. Those describe the
literature; they are not the site's voice.

**"Problem" became "weakness."** Russ's reasoning: a model not performing
to the level you would expect is not a problem, it is a weakness. That
also restores continuity with the original reframe — Weakness was renamed
to Capability so the axis could stay neutral, and a weakness is a
*position* on that axis rather than an entity. Calling it a problem
quietly re-introduces the thing that rename removed.

Worth noting both corrections came from copy I had written around text
Russ supplied. His paragraphs used "mitigation" too; the difference is he
recognized it as wrong when he saw it rendered. Reading the page as a
reader catches framing errors that reading the diff does not.

## 2026-09-04 — Briefs instead of abstracts, with a number check
Russ finds Rohan Paul's paper posts easier to process than abstracts and
wants one for every paper here. Reverse-engineered the format from four
full X posts (read with the Chrome extension, since X walls the timeline
after ~6 posts logged out) and six longer newsletter write-ups, wrote it
up in docs/prompts/paper-summary.md, and implemented it as
scripts/summarize-sources.mjs writing to a new `brief` field.

Two things make that format work, and only one of them is style. Figures
are comparative rather than adjectival — "drops from 69.3 to 33.0 when
Gemini 3.1 Pro becomes the executor", not "degrades substantially". And
every summary states its own boundary, which is what makes the rest read
as credible instead of promotional. That second habit is the same instinct
as backing_strength and the scope conditions in every claim statement
here, arrived at independently by someone writing for a different reason.

**The risk this creates.** The style runs on dense figures. The generator
is handed an abstract that frequently has none. That is a direct
invitation to invent numbers, inside a catalog whose entire value is
provenance — the same failure mode as the plausible-but-wrong citation
rejected earlier today, except manufactured by us rather than supplied.

So the prompt forbids ungrounded figures and requires the model to list
what it used, and then every number in the output is checked against the
abstract independently. Unmatched figures go to
`brief_unverified_figures` and render as a warning on the source page. The
second guard is the one that counts: it does not depend on the model
having complied with the first. The first run caught one flag immediately
— which turned out to be the extractor reading "3" out of "GPT-3.", fixed
with a lookbehind. Worth noting the failure mode: a checker with false
positives is worse than none, because real inventions get lost among them.

Not done: briefs for queue candidates, which is where papers are actually
triaged. That is ~145 candidates at roughly $0.01 each per run, on a set
that churns nightly, so it is a spending decision rather than a technical
one.

## 2026-09-05 — Testing the catalog against cases where the answer is known
Russ asked whether we can validate any of this: find findings later shown
false or weaker, check whether the papers that overturned them are here,
and whether the catalog reflects them properly.

docs/known-reversals.yaml is a held-out set of four such cases, each with
its reversing paper verified against arXiv. scripts/backtest.mjs asks two
separate questions of each:

1. Did the catalog **catch** it — is the reversing paper here, cited with
   stance `contests`, on a claim marked contested with a stated axis?
2. Would ingestion **surface** it — does the paper's title match a
   capability?

The second matters more. A miss on the first is a filing gap, fixable in
an afternoon. A miss on the second is a standing blind spot no diligence
closes.

Result: 2 caught, 2 missed. Both misses are structural rather than
behind-on-work. Nothing in the index covers whether a measurement choice
manufactures a finding (the emergent-abilities-as-metric-artifact result),
or whether stated reasoning reflects the computation (chain-of-thought
unfaithfulness). Both are failure modes of *evidence*, which this catalog
runs on end to end, so the blind spot is aimed squarely at our own
foundations.

**A mistake worth recording.** The first version of the reach test
reimplemented the matcher by hand, got the title rule wrong, and reported
that neither caught case would have been surfaced — a dramatic finding
that was entirely an artifact of the copy. The matcher now lives in
scripts/match-lib.mjs and both the pipeline and the backtest import it. A
second implementation of a rule answers a subtly different question than
the first, and the difference shows up as a false finding rather than an
error.

**Directional standing.** `techniqueStanding()` reads a technique's
evidence as one of unmeasured / argued / supported / narrowed / contested,
derived from its claims rather than stored. Categorical on purpose: a
number here would be the Goodhart trap the project deleted with eval
scoring, and would invite tuning the catalog to move it.

`narrowed` is the one worth having. It means a contesting source is on
file but the claim was never marked contested — usually because the scope
condition absorbed the objection. That is how a technique quietly gets
weaker without anyone saying so.

## 2026-09-05 — Closing the two blind spots the backtest named
Added `explanation-faithfulness` and `evaluation-validity`, the two
capabilities the backtest showed nothing in the index covered.

The backtest result after adding them is the useful part, because it moved
one thing and not the other. Ingestion reach went from "title alone would
not match any capability" to matching both new capabilities — the pipeline
would now surface those papers. The grade stayed `missed`, because catching
a reversal also requires the paper filed as a source and a claim citing it
with stance `contests`. That split is exactly the distinction the backtest
was built to draw: the matcher gap is closed, the filing gap is not.

`evaluation-validity` sits oddly beside the others and the description says
so. It is not a property of a model. But every claim in this index rests on
some measurement, so it is the one capability whose failures propagate into
all the rest — including into the briefs, whose figures we check precisely
because a measurement can be wrong in ways prose hides.

Also fixed the layout the additions exposed. The capability table's header
cells had no horizontal gutters, so "Claims Contested Status" ran together;
and the nav, at eight links, overflowed a phone viewport and pushed the
whole page sideways. The nav bug was mine, from adding Open questions. A nav
that overflows breaks every screen, not just its own, so it now wraps.

## 2026-09-06 — Two ambitions recorded, with their failure modes
Russ named two long-range goals: the system improving itself by querying
its own catalog for techniques with supported claims, and other AIs
contributing research findings altruistically. Written up in
docs/ambitions.md rather than the roadmap, because neither is scoped work
— they are recorded to explain why provenance fields, machine-readable
content and the backtest earn their keep now, while one person uses this.

The second is not new. Agents contributing was in the first sketch, which
is why submitted_by already accepts agent:<name>@<owner> and sourceLink
carries submitted_by and added_at. Worth recording that the current schema
anticipated it.

What the write-up adds is the failure mode for each, since that is the
part that shapes decisions.

**Self-improvement is a closed loop.** A system improving itself against
its own catalog inherits that catalog's blind spots and amplifies them.
The backtest is the natural check: a step that leaves `npm run backtest`
worse off is rejected whatever else it improved, and it must run against
the same held-out set rather than one the system picked. Also the third
appearance of Goodhart in this project — after eval scoring and
contributor reputation — with the same answer each time: reward what
survives contest, not what scores well. And a self-improvement result is
an own-observation claim, the weakest backing strength, on purpose.

**Agent contribution fails on arithmetic, not on API design.** Submission
is free for an agent and expensive for a reviewer, so any design where
review is the bottleneck loses. The reputation notes already reached the
answer that applies here unchanged: reward resolution that survives, never
submission count.

The sharper point is that "altruistically" is a motivation, not a security
assumption. A contested-claim structure with sources on both sides gives
the same answer whether a submitter is generous or adversarial, and that
indifference is the feature. What makes agent contribution worth wanting
is narrower and better than volume: refutation is counter-cyclical —
everyone is incentivised to publish techniques that work and almost nobody
to publish that a popular one does not — and agents with no career stake
are well placed to do that unglamorous half.

Both ambitions are the same loop at different scales, and both rest on one
bet: that a claim here is worth more than a claim elsewhere because it
carries its scope condition, its backing strength, and whatever cuts
against it. That bet is testable now, and the backtest is the measure.

**Revised the same day, on Russ's push.** The first draft catalogued
obstacles without proposing ways through them, which is the wrong posture
for a research project — the obstacles are why the research is necessary,
not arguments against it. Rewritten so every obstacle carries an attack.

Three of those attacks are worth more than the rest.

*A falsification quota.* Require each self-improvement cycle to also
attempt N refutations of claims currently held. A loop that must spend
effort trying to break its own beliefs is self-correcting by construction
rather than by supervision.

*Invert what triggers review.* Do not review agent submissions on
submission. Let a claim sit marked unreviewed until something contests it,
then review the disagreement. Review cost scales with conflict instead of
volume, which dissolves the arithmetic objection rather than mitigating
it.

*Instrument rather than ask.* This corrects yesterday's claim that a
self-improvement result is condemned to `own-observation`. The pipeline
already emits signals that owe nothing to narration — backtest coverage,
off-topic rate, ungrounded-figure count, cost per accepted claim. Measured
against a held-out set with a stated falsifier, a self-improvement result
has the same standing as any single-paper experimental claim. The weak
backing was a consequence of asking the system to describe itself, and
instrumentation removes the need to ask.

And the structural point the first draft missed: the two ambitions solve
each other. Independent instances contributing and contesting are the
external check that breaks the self-improvement loop's closed circle, and
a system that improves its own verification is what raises review
throughput enough to accept open contribution. Each is the other's missing
capability, which is the argument for pursuing both rather than either.

## 2026-09-06 — The sign on the wall
Russ asked for a metaphorical sign somewhere in the project: *focus on the
art of the possible — ultimately, and it will take time, iteration and
effort, there is a way. Unless there isn't, but let's prove that rather
than give in easily.*

Put in three places, deliberately. At the top of CLAUDE.md, because that
is the wall actually looked at while working here. As the epigraph of
docs/ambitions.md, because that document exists to hold things not yet
possible. And at the foot of /open-questions, because that page is
literally a list of gaps nobody has closed, and a list of gaps needs to
say what it is for.

The second clause is the one that earns it a place in this project. It is
a falsifier, not a hedge. "There is a way" is a claim, and this catalogue
holds that a claim is worth having only when someone could show it wrong —
so the honest response is to try hard to break it, not to assume it and
not to abandon it. That makes the sign consistent with the schema rather
than merely motivational, which matters, because a slogan that contradicted
the epistemics would corrode them.

The operational form: when something looks blocked, say what would have to
be true for it to be possible, and go test that. "This cannot work because
X" is unfinished until X has been checked.

## 2026-09-07 — File the incumbent, then contest it
Russ and I independently drafted records for the same two papers. We agreed
on almost everything — capability, kind, backing strength, the technique,
the core finding. We disagreed twice on `stance_on_existing`, and both
disagreements were the same disagreement.

He marked both papers `contests` and left `related_claim_id` blank, because
what each contests is not in this index: single-factor prompt evaluation in
one case, position-shuffling heuristics and context-aware decoding in the
other. I marked one `supports` and one `neither`, because I was answering
"stance on a claim we hold" while he was answering "stance on what is
currently believed."

His reading is the more useful one, and the gap is structural. The catalog
only ever filed claims it endorsed, so contesting evidence had nothing to
attach to. That is also why the backtest grades known reversals as missed
even when the reversing paper is on file: nothing records the position
being reversed.

So the rule, demonstrated here: **when a paper contests something, file the
incumbent claim first, with its own source, then attach the contest.** The
catalog should hold positions it does not endorse. That is what makes
`contested: true` with sources on both sides mean anything at all, and it
is what the disagreement_axis field is for.

Filed: `putting-relevant-passages-first-mitigates-position-effects` under
long-context-degradation, supported by Lost in the Middle and contested by
the new knowledge-conflicts paper, with a guessed axis — that the
supporting result places one relevant passage among distractors while the
contesting one places several incompatible passages of equal legitimacy, so
ordering may be a remedy for distraction and not for conflict. Separately,
`first-evidence-dominance-is-representational-not-decoding` holds the new
paper's own positive finding, because where a bias lives and whether a
remedy works are different assertions.

`reorder-context-by-relevance` moved from "nothing measured" to
"contested" as a result, which is the first time a technique's standing has
changed from evidence rather than from filing.

Also worth recording: the confidence field has no stated definition, and we
diverged on it both times — he weighted replication breadth, I weighted
dataset realism. Two data points is enough to say the field needs a rule.

## 2026-09-07 — Informal sources, and naming our own green boxes
Two changes from one X post.

**`kind: post`.** A Source can now be informal writing. Posts are good at
exactly what papers are bad at for our purposes: they carry the incumbent
beliefs nobody writes a paper to assert, they carry negative results, and
practitioners state scope conditions that papers generalise away. Given
yesterday's rule — file the incumbent, then contest it — informal writing
is the natural supply of incumbents.

They are weak as backing and the schema says so: own-observation is the
ceiling, never replicated. And `archived_text` with `retrieved_at` is
*required*, enforced by a conditional in the schema and verified by
deleting the field and watching validation fail. Papers can be re-fetched
years later; posts are edited and deleted, and a citation that quietly
stops being checkable is worse than one never made. This project has
already been handed two fabricated paper titles; an unarchived post would
be the same failure with no way to detect it.

**Our own green boxes.** Cheryl Wu's critique of OpenAI's
research-acceleration disclosure gave a sharper version of an argument
already in docs/ambitions.md, plus a method: draw the causal graph, colour
each node by whether you have data on it. Her point compresses to one
line — effort spent is not effect achieved — and everything OpenAI
reported was upstream of the loop the claim was about.

Applied to us, honestly: everything we measure is an input. Candidates
fetched, drafts produced, cost per paper, tokens. `npm run backtest` is the
only outcome measure in the project. Cost per paper is our tokens-and-
lines-of-code — real, reportable, evidence of nothing.

So ambition 1 is now stated as Wu's blue arrow drawn for us: does a
technique taken from this catalogue, applied to a stage of this pipeline,
move a held-out outcome? And the first experiment names its outcome
variable up front — stage-2 about_capability false-positive rate on a
fixed held-out set — rather than reporting how much work happened.

Worth noting what just occurred: an informal source materially improved
the project's own reasoning within a day of being written. That is the
argument for `kind: post`, made by the first instance of it.

## 2026-09-07 — A review page, because review is the bottleneck
The drafter can produce claims far faster than anyone can read them, which
makes "more drafts" an input rather than progress — our own green box, in
the language filed this morning. The outcome variable is claims filed that
survive contest, and the only thing between a draft and that is a human
verdict. So the highest-leverage build was not more pipeline.

/drafts renders each proposal with the three things a verdict actually
needs: the statement, the capability, and — collapsed but present — every
claim that capability already holds. The stance question is unanswerable
without that last part, and reading it out of YAML meant opening several
files per draft.

Verdicts are accept / edit / reject plus a note, kept in localStorage and
exported as text to paste back into the conversation. The site is static
and has nowhere to POST, and inventing a backend for this would be the
later-phase platform work the reframe deliberately deferred. Pasting text
is honest about the architecture and keeps filing a deliberate act, which
is the property worth protecting.

Flagged drafts sort first, since those are the ones that must not be
skimmed.

Two things worth recording from building it. The setState-in-effect lint
error appeared again, in the same shape as the filter bar: mirroring
external state into React state and syncing it in an effect. The fix was
the same, useSyncExternalStore over localStorage, with a cached raw string
so getSnapshot returns a stable reference. Twice now means it is a pattern
to reach for first, not a rule to work around.

And the drafts vanished mid-build: an earlier `git add -A` had committed
them onto a feature branch, so checking out main deleted them. Untracked
working files that matter should be either committed deliberately or kept
outside the repo, not left to whichever branch happened to capture them.

## 2026-09-07 — Pin what we actually read
The Elasticity RSI paper says on its own title page that the latest version
lives in a public repo, and the commit history shows it revised roughly
fortnightly — four times between 19 June and 13 July. Our source record
cited a URL that serves whatever the current version happens to be, and the
claim filed from it quotes two numbers, 9% and 15%, that are precisely the
kind a revision moves.

arXiv solves this with a version in the id. Nothing solves it for a PDF in a
repo, an institute-hosted preprint, or any document behind a stable address.

So sources may now pin `content_url` and `content_sha256`, and
`npm run check-sources` re-fetches them and reports what moved, naming the
claims that rest on each. Free, no key, and wired into the nightly with
continue-on-error, because a changed source is news rather than a broken
build.

The design decision worth recording: when a source changes, the recorded
hash is **not** updated. It marks the version the claims were written
against, and overwriting it would erase exactly the fact that matters — that
those claims now rest on something nobody has read. Only
`content_changed_at` is added.

Verified both paths, since a checker that only passes is not evidence of
anything: corrupting the stored hash produced "CHANGED", named both
dependent claims, and exited non-zero; restoring it produced "unchanged".

This is the second instance of the same problem and the second answer of the
same shape. `kind: post` requires archived text because posts vanish; this
pins a hash because documents mutate. A citation must not be able to quietly
stop meaning what it meant.

## 2026-09-07 — Ingest unreviewed, but make it inert
Russ read the drafts and said he needs more time before he can judge them,
so they should be ingested as pending review rather than sat on. That is
the right call — a draft outside the catalog is invisible, and eight of
them in a directory decay into a chore nobody starts.

The design question is what "pending" means, and there is only one answer
that is not a lie. If an unreviewed claim can change what the catalog
asserts, then ingesting it *is* endorsing it and the label is decoration.

So `status: pending-review` joins the claim enum, and everything downstream
of a verdict now reads `reviewedClaims()`:

- `claimsAboutTechnique` — so a technique's standing cannot move on
  evidence nobody has checked
- `contestedClaims` — so an unreviewed disagreement is not a disagreement
- `unsolvedCapabilities` — so a pending claim does not establish that a
  weakness is documented
- the backtest — a pending claim citing a reversing paper has caught
  nothing

Locked in by a test rather than by intention: it asserts that no pending
claim appears in any technique's standing, in the reviewed set, or as
contested. The counts moved as they should — 93 claims, 85 reviewed.

Provenance is `agent:claude-opus-5@Russ-Miller`, the first real use of the
agent format the schema has carried since the first sketch. Which makes
these eight a small rehearsal for ambition 2: unreviewed agent-submitted
claims sitting in the catalog, visible, inert, waiting on judgment.

Validation caught something on the way in. Two drafts linked a technique
whose `addresses` does not include the claim's capability —
chain-of-thought to hallucination, checklist-decomposition to
long-context-degradation. Both are plausible-sounding and unreviewed, so
the link is recorded as a comment rather than asserted. Either the drafter
was wrong or the technique record is too narrow, and that is exactly the
kind of question review exists to settle.

## 2026-09-08 — Vendor guidance as its own source kind
Anthropic's context-engineering post for the Claude 5 generation is a good
source and a badly-shaped one, which is why it gets `kind: vendor-doc`
rather than being filed as a post.

The evidence profile is genuinely unusual. It is privileged about the
artifact — nobody outside can measure what a model was trained to do. It is
structurally weak on efficacy: "no measurable loss on our coding
evaluations" has no visible baseline, ablation or independent run, which by
this catalog's own standard is close to unfalsifiable. It is interested, not
dishonestly but directionally: a vendor recommends what shows its models
well and lowers its support burden. And it is perishable, scoped to one
family at one moment.

So: capped at single-paper when it reports a measurement,
mechanism-reasoning when it only asserts, never replicated. Archived and
hash-pinned like a post, because marketing pages are rewritten in place.

Worth stating the conflict plainly: this is my vendor writing about me, so
my read on its authority is not disinterested either.

**The find.** The post names six former best practices as myths, and one of
them lands on a claim we already hold. It says earlier models were "more
likely to listen to instructions at the end of their context window than at
the start" and that the repeats this justified were deleted for Claude 5
with no measurable loss. So
`putting-relevant-passages-first-mitigates-position-effects` is now a
three-way contest: Lost in the Middle measuring the effect, the 2026
conflict paper showing reordering does not fix it under conflict, and the
builder saying the effect is being trained away.

The axis had to be rewritten with two dimensions. What the other passages
are, and which model generation — and they cut across each other, so all
three positions can hold at once about different models at different times.
That is the strongest argument yet that this claim is closer to observation
than to mechanism, and it is recorded in the axis rather than acted on.

**And the stance confusion again, now three times.** My first draft marked
the vendor doc as contesting a claim it actually supports; what it contests
is a practice, and the practice is not filed. Validation caught it —
contests-stance source with contested: false. Same gap Russ hit on both
review papers. The incumbent worth filing is "worked examples are how you
teach tool use", but the only evidence it was ever the rule is this source
saying so, and one source cannot hold both stances on one claim.

Filed pending-review, including the ones I wrote. Exempting my own filings
from the status would make it a label for other people's work.

**The checker caught my own mistake, twice, which is the best evidence it
works.** I pinned a byte hash on the vendor page. It reported "changed" on
the next run — because a related-posts carousel in the page furniture had
rotated while the article had not moved a word. A byte hash is right for a
PDF and wrong for a page.

So text sources are now checked by how much of the archived text is still
published, not by bytes. That found a second mistake: I had stored the
archive pre-wrapped at 76 characters, so collapsing whitespace produced
artifacts like "for- claude-5" that could never match the live page.
Retention read 10% on a page that had not changed at all. Archives are now
stored one line per paragraph, unwrapped, so both sides normalise the same
way.

With that fixed a clean page returns 98-99%, and the floor sits at 0.98 —
tested by injecting one fabricated sentence, which drops it to 96.8% and
fires. The first floor of 0.95 swallowed exactly the case that matters, a
vendor quietly rewording one claim.

Third time this project has learned the same lesson: a checker that only
ever passes is not evidence of anything. Test the failure path.

## 2026-09-08 — Visible everywhere, authoritative nowhere
Russ pushed back on my framing. I had said: stop building verification
machinery until the index is worth verifying. He said: make a useful list
of capabilities, claims, disputed claims, techniques and sources that is
interesting even if unverified.

Those are not the same and his is better. Mine is a sequencing claim that
still treats verification as the destination. His makes usefulness the
destination and verification optional — which means the moment they
conflict, usefulness wins.

They were about to conflict. `contestedClaims()` filtered out pending
claims, and after the bulk ingest roughly 47% of the catalog is pending. So
/contested — the page whose entire job is showing where evidence disagrees
— would have hidden about half the disagreements in the index. Verification
machinery quietly destroying the thing it was protecting.

The line is redrawn as: **unreviewed claims are visible everywhere and
authoritative nowhere.**

Visible in lists, counts, capability pages and /contested, badged. Hiding
them would make the catalog look emptier than it is, and at half the
content that is a large lie told by omission.

Excluded only where a claim would silently decide something: a technique's
standing, and the backtest scorecard. A verdict derived from unchecked
content is a verdict nobody made.

Also moved: whether a capability has a documented weakness now counts
unreviewed claims. That question is descriptive — did anyone find something
here — not a verdict, and answering it "no" while holding three unreviewed
claims on the topic was simply wrong.

And a naming problem worth admitting. "pending-review" implies a queue that
will be worked. It will not be; there is more worth indexing than one
person can check, so unreviewed is a normal permanent state. /how-this-works
now says that outright rather than implying a backlog that is being cleared.

## 2026-09-08 — MVP: someone other than Russ can use it, and can push back
Russ made the point that we need a working slice others can use, with him
as customer zero rather than the only customer. Two gaps stood out, and
they map onto the two halves of that.

**Nobody could find anything.** 160 claims, 141 sources, no search. A
visitor arrives with a problem — "my agent loses track of state" — not with
a capability slug. /search indexes every capability, claim, technique and
source and scores in the browser: every query term must appear, title
matches outrank body matches, shorter titles win ties. About fifty lines
and no dependency, which the repo's own rule asks for. The index is a few
hundred records, so it ships whole and the site stays static.

**Nobody could tell us we were wrong.** That is the more important half.
/how-this-works already admits that the weakest thing about this catalog is
that both sides of every contested claim were assembled by the same person.
Every claim page now carries "Contest this claim", opening a prefilled
GitHub issue.

The prefill is the part that matters. "Report a problem" collects vague
complaints; asking specifically which of four things is wrong — the finding,
the scope, the sourcing, or something else — and then asking for the source
that cuts against it collects something filable. GitHub is also the right
medium rather than a workaround: a challenge should be public, attributable
and durable, like the claims it argues with.

What this does not have: any way to observe use. No analytics, and I would
rather have one person's argument than a thousand anonymous pageviews, so
the feedback path came first. If nobody ever opens an issue, that is a
finding too.

## 2026-09-09 — Buzz does not work; forwarding does
Russ suggested featuring a paper on the front page, picked by whether it had
generated discussion on X or Reddit — attention elsewhere as a proxy for
"worth reading."

Good idea, and the automated version does not work. Measured rather than
assumed:

- **X** cannot be queried. The API is paid and restricted, and the browser
  extension needs a person driving it.
- **Reddit** returns 403 to unauthenticated JSON now, whatever user agent you
  send. That endpoint used to be open; it is not.
- **Hacker News** is queryable, free and keyless — and the discussion is not
  there. SWE-bench drew 2 points. Lost in the Middle drew 15. Individual
  preprints are not what Hacker News talks about.

The finding nearly went the other way, which is worth recording. A loose
title search returned a 440-point story and the script picked it as buzz for
a paper it had nothing to do with — Algolia matches on any word. That would
have gone on the front page as evidence of attention. The matcher now
requires the hit's link to carry the arXiv id or its title to share most of
its words with ours, verified against SWE-bench and Lost in the Middle,
which it finds correctly.

So the slot picks by catalog signal instead: a paper that argues with
something already held ranks first, then one that is among the first filings
under a thin capability, then recency. Today it picked the knowledge-conflict
paper, because it contests a claim we hold — which is the right answer for
the right reason.

**And Russ's second suggestion is better than either.** He offered to forward
links as he finds them. That is a person who reads X doing the selection,
which is exactly the job the automated signal could not do.
`scripts/add-link.mjs` takes a URL: arXiv becomes a paper record with real
metadata, anything else is fetched, archived verbatim and hash-pinned, and
either way it goes into the front-page slot. It creates the source only —
drafting a claim stays separate, so nothing gets asserted as a side effect of
saving a link.

## 2026-09-09 — Capabilities can be proposed too; no voting
Russ: drop the candidate-capabilities staging area, add them to the list,
and give people a way to ask for one to be revised or removed.

Right, and consistent with a rule already made. Claims got `pending-review`
on the argument that an index is useful before it is verified and hiding
half of it is a lie by omission. Capabilities were still gated by hand,
sitting in `pipeline/capability-shortlist.yaml` as "suggestions, not
capabilities" — the same staging problem with a different name.

So `status: proposed` joins the capability enum and the nine remaining
shortlisted candidates are now capabilities. Each says on its own page that
a pipeline added it because several papers converged on the framing, and
that it may be two topics, a duplicate, or not a topic at all.

They are excluded from `unsolvedCapabilities()`, on the same line as
pending claims: a proposed capability having no measured mitigation says
nothing, because nobody has decided it is a real topic yet. Visible
everywhere, authoritative nowhere.

**On thumbs up and down, a caution using Russ's own reasoning.** The
decision log for 2026-09-03 records rejecting up/down voting on capability
importance because "a vote is trivially gameable and carries no
provenance". That argument has not weakened. A vote count would also be the
only number on a site that deliberately has no scores, and the first thing
anyone optimises.

The comment half of his suggestion is the valuable half, and it is built:
"Suggest a change" on every capability page opens a prefilled GitHub issue
asking which of five things is wrong — not a topic, duplicate, should be
split, boundary wrong, name misleading — and then asking why. Same pattern
as "Contest this claim". A disagreement with a reason attached is worth
more than a thousand anonymous clicks, and it can be filed; a thumbs-down
cannot.

If a signal of "how many people think this matters" turns out to be needed
later, the design already exists and is better: Importance as an
evidence-backed claim keyed to a capability and a context, in spec §9.

## 2026-09-09 — Search on every list; /contested folded into /claims
Three changes from one conversation.

**Type-to-filter on the capability, claim, technique and source lists.**
Rows carry a `data-search` haystack and a client component marks
non-matching ones so CSS hides them — the same shape as the filter bar, and
they compose without either knowing about the other. No second copy of the
data ships and the pages stay static. Ids are in the haystack because people
paste them out of a URL.

Two bugs found by testing rather than by reading. The count reported text
matches, so "6 of 160" could sit above an empty list when a filter was also
active; it now counts what is actually on screen. And the count went stale
when a filter changed without the query changing, so a MutationObserver on
the wrapper triggers a recount.

Third appearance of the setState-in-effect lint error, and this time it
said something. The count is derived from DOM the effect just touched, so
routing it back through React state was always the wrong shape. It is
written straight into a span now. An effect that updates an external system
and reports what it did is what effects are for.

**/contested is gone.** Everything it showed is a filter on /claims, and a
whole route to express one predicate was not paying for itself. The amber
card treatment came across, and so did the axis of disagreement — which was
the real content of that page, not the list.

Its one unique section, incoming challenges from the queue, moved to
/queue, where it belongs: those are unreviewed candidates, not claims.

**And a hover card that did not say what it described.** Beside a claim, a
tooltip reading "very heavily cited in the last 12 months" looks like it
describes the claim. It describes one source. Both citation cards now name
what they are about — "This source: <title>" and "How much the field cites
the sources under this claim". The information was right and the referent
was missing, which is the kind of thing only a reader notices.

## 2026-09-11 — Harness engineering: a vocabulary for the ratchet
Russ forwarded a nine-page synthesis, "Harness Engineering — Agent = Model
+ Harness", for two reasons: to catalog, and because it suggests a
vocabulary and an approach for the recursive-self-improvement ambition.
Both held up, with one thing to be straight about first.

**Provenance.** The document looks like a paper — IEEE layout, a Google
wordmark on every page — and says in its own front matter that it is
"independently compiled … not affiliated with Google, OpenAI, Anthropic,
or HashiCorp — and not endorsed." No author is named. Every number in it
is cited to a blog post, a Medium article or a company engineering post.
So it is filed as `kind: post`, archived and hash-pinned, and every claim
drawn from it is `mechanism-reasoning`, pending review, with a note that
the figures are secondhand. The framework is the value; the numbers are
someone else's until their sources are filed directly.

**Catalogued.** Five techniques the index lacked and the playbook names
cleanly: guide-file, computational-sensors-first, independent-verifier,
capability-budget, file-checkpoint. Four claims, two of which reinforce
the held claim that self-repair needs an external signal — from the
sensor side (deterministic checks are that signal) and the multi-agent
side (the producer is a biased judge). One claim under
evaluation-validity that an agentic benchmark score reported for "a model"
is a score for a model-plus-harness, if harness-only changes really can
move it 44 points.

**The vocabulary.** This is what Russ saw, and it is right. The six layers
— guides, sensors, loop, memory, permissions, observability — map onto
machinery this catalog already has, and the mapping is written into
docs/ambitions.md as a table. Two distinctions were worth adopting
outright: computational versus inferential sensors, which names the
ordering the backtest and the classifier had already fallen into; and the
ratchet, whose six steps describe what most entries in this log have been
doing without a name for it. A fabricated title became verify-papers. A
misread figure became a lookbehind. A hand-copied matcher became a shared
module. Failures converted into infrastructure rather than remembered —
that is the ratchet, and this document gave it a word.

What it makes precise: "the system improves itself" now means the system
runs the ratchet on its own failures, and the outcome to watch is the
playbook's real metric — completed work needing no manual intervention that
still produced acceptable evidence — never tokens or calls. Wu's blue
arrow, from the other direction.

Its own caution carries over: the harness does not fix bad objectives. A
good loop around the wrong target produces reliable garbage and the sensors
validate it. Goodhart, fourth appearance. The held-out set stays small,
external and unoptimised for exactly this reason.

## 2026-09-11 — The playbook's references: seven verified, six archived, one unreachable
Russ asked whether the harness-engineering synthesis, not being a real
paper, had citations worth cataloguing. It had fifteen, all blog posts and
company engineering pages, and the ones carrying its numbers are exactly
what its claims needed — every figure in the playbook is secondhand until
its source is filed.

Seven checked out with real URLs, verified by search before anything was
written; after last week's two fabricated titles, nothing goes in
unverified. Six are archived: Hashimoto's origin of the ratchet, the OpenAI
post that coined the term, Böckeler's guides-and-sensors piece plus her
follow-up on sensors, LangChain's Terminal Bench account, and Bölük's
sixteen-models-one-afternoon result. The four playbook claims now cite
their primaries, and one figure got smaller in the process: LangChain's own
post says 52.8 to 66.5, +13.7 points, where the playbook's retelling led
with the rank change. Primaries are more modest than summaries of them.

Two are not archived, for reasons worth recording. openai.com refuses every
non-browser fetcher, and the browser extension returns long pages in
truncated chunks, so that record carries a partial verbatim archive with
the gap declared and no content hash. medium.com refuses every fetcher and
the extension's domain policy blocks it outright, so Masood's post — the
source of the 44-point GAIA figure — is not filed at all. A post cannot be
filed without its text, and the claim that leans on that number says so
rather than borrowing the figure from the playbook.

The search also surfaced two arXiv papers the playbook did not cite, and
one is the first ambition already built: Self-Harness, a fixed model
improving its own scaffolding under a regression gate, all nine pairs
improving. Its authors name their own weakness — the gate reads the
held-out split — and it is the closed-loop trap this project's ambitions
document describes. Filed with a claim and a technique, and written into
docs/ambitions.md as prior art.

Three things the browser tools taught, for next time. Clipboard writes need
document focus and clicking to get it froze the renderer. Script results
are capped near a thousand characters regardless of what is returned. And
a domain allowlist in the extension is a policy, not an auth failure —
Russ asked how to allow medium.com, which is the right question.

## 2026-09-11 — Masood in full, and what its references did to today's filings
Russ logged into Medium and the extension read the whole article: 66,770
characters, 98 references. Two things came out of it, and both cut against
work filed earlier the same day, which is the right direction for a
catalogue to be surprised in.

**The GAIA figure was never Masood's.** He cites it to Princeton's HAL
leaderboard, where 74.55% is HAL's own Generalist Agent on Claude Sonnet
4.5 and 30.91% is Hugging Face's Open Deep Research on the same model —
confirmed on the live page. So the playbook relayed Masood, and Masood
relayed HAL. The leaderboard is now filed as the primary, and one of the
two harnesses being HAL's own is recorded where a reader will see it.

**Three arXiv papers he cites are the primaries the playbook lacked.**
Harness-Bench (2605.27922) is a controlled measurement of harness effects
across models — 5,194 trajectories — concluding that capability should be
reported per model-harness configuration. That is the evaluation-validity
claim's thesis, measured, and the claim moved from mechanism-reasoning to
single-paper on its strength: the first claim from this thread to earn
that. SWE-agent (2405.15793) grounds a tool-use claim that a designed
interface roughly doubles performance over raw shell.

**And ETH Zurich's AGENTS.md study (2602.11988) contests the guide-file
technique filed this morning.** Four agents, two benchmarks, three
conditions: context files do not raise task success, cost about 20% more,
and agent-generated ones hurt slightly in five of eight settings. The
agents obey the files — that is why they spend more — so the files simply
do not carry success-relevant information. Masood's retelling was rosier
than the paper. Filed as an incumbent-plus-contest claim with a guessed
axis: the study measures success on unseen tasks with generic or generated
files, while the practitioner claim is about recurrence of one team's
specific past failures in one repository. If that holds, the technique's
value is in what goes in the file, not in having one — and the technique
record now says so.

The playbook's own ratchet, applied to the playbook: two of its four
claims got their real primaries, one got contested, and the vocabulary
survived intact.

## 2026-09-11 — Name: RSI Ratchet

The site is named **RSI Ratchet** (domains rsiratchet.com and rsiratchet.ai).
The name says what the catalog is for: each filed claim, technique standing and
backtest result is a pawl — a step that should not slip back — in a recursive
self-improvement loop (see ambitions.md). "modelselfhelp" stays as the repo,
package and Vercel slug until the domains are attached.

## 2026-09-11 — Embeddings: local model, vectors in the catalog

Every record gets a 384-dimension vector from `Xenova/all-MiniLM-L6-v2`, run
locally by `scripts/embed.mjs` (no API, no key, no token cost) and committed
as `catalog/embeddings.json` (int8, ~220 KB). `npm run check-embeddings` fails
the test suite when a vector is missing or stale; the nightly job re-embeds
before deploying.

Two uses so far. **Related claims** on every claim page: nearest five by
cosine, floor 0.45, order shown but the score is not, since a number would
read as a verdict. **Meaning search** as a toggle beside every search box:
the same model loads in the browser from a CDN on first use (~23 MB, cached),
embeds the query, and ranks rows scoring at least 80% of the best hit (absolute floor 0.3). Keyword stays the default
because it is exact and explainable.

Ranked results on list pages reorder the DOM rows and restore the original
order on clear; CSS `order` was ruled out because two of the lists are tables.

Next uses, not built: duplicate detection when filing drafts, contradiction
candidates (high similarity, opposite stance), and a better first pass in the
paper classifier than the term matcher.

## 2026-09-11 — Adages: human laws, tested against models

New catalog kind `adages` (`catalog/adages/*.yaml`, `adage.schema.json`): a
law or rule of thumb from human systems, its origin, a **transfer** argument
saying why it should or should not apply to models (the mechanism, not the
analogy), and an **evidence** list of claims in this catalog, each with a
verdict: `holds`, `breaks` or `narrows`.

Standing (`adageStanding`) comes from reviewed claims only, same rule as
techniques: untested / holds / narrowed / breaks / mixed. Pending claims are
listed and marked but move nothing. The list page's first pill is "Breaks
somewhere" because the breaks are the content nobody else collects: an adage
that holds says what was already believed, one that breaks says how models
differ from people. Detail pages list breaks before holds for the same
reason.

Seeded with six: Goodhart's law, Hashimoto's ratchet, no one should be judge
in their own cause, two heads are better than one, first impressions last,
practice makes perfect. The user has a longer list to follow. Claims that
serve as evidence show "Evidence for: …" on their page.

## 2026-09-12 — Adages: the software-laws list, triaged

Nineteen entries added from Russ's software adages list (Obsidian, mirrored
from the 2013 Blogger post), on top of the six seeds. Candidate claims for
each were found with the catalog's own embeddings, then read and assigned a
verdict by hand; no claim was filed or altered to fit an adage.

Selection rule: an adage is filed if a mechanism can be stated for why it
should or should not transfer to models, whether or not evidence exists yet.
Filed with evidence: Brandolini, Postel (breaks, all pending), Boyd, Ashby's
requisite variety, good regulator theorem, Ashby's law of experience, Simon,
Lehman, Thomas theorem, Humphrey (with Ziv as alias), Hanlon, law of
triviality (splits by role: holds for model-as-judge, breaks for
model-as-producer), Braess, Linus. Filed untested with a research brief:
Hyrum, Conway, Parkinson, Kerckhoffs (Shannon's maxim as alias), Amdahl.
Folded as aliases: Campbell's law and the cobra effect into Goodhart; Parnas
into Hashimoto's ratchet; law of requisite complexity into Ashby.

Skipped, with the reason, so the list can be overruled: hardware and
economics laws with no behavioural content (Bell, Kryder, Moore-family,
Landauer, Shannon's channel law, universal scalability, Zipf, Littlewood,
Stein, CAP, Rice, Demeter, Helland); organisational jokes and observations
whose subject is people in institutions rather than any system (Al's law,
Larman, Acheson, Benchley, Norman, AviD, Krulak, Atwood, Hofstadter,
Sturgeon); Knuth and Wirth, whose model-side reading duplicates Lehman and
the catalog's own measure-first rule; the analogies and paradoxes (Ship of
Theseus, Ellsberg, Simpson's, principle of charity, fundamental theorem),
which are not claims about behaviour.

## 2026-09-12 — "Reviewed by AI", not "unreviewed"

The review label now says who has read a claim rather than what it lacks.
A claim drafted from a source by a model shows **Reviewed by AI**; one a
person has also read shows **Reviewed by AI and Russ Miller**. The words
"unreviewed", "pending review" and "not yet checked" are gone from the site,
along with the blue warning box on AI-reviewed claims. Everything was already
visible; the framing made it sound unfinished, and it is not: an AI-reviewed
claim is complete and consumable.

Nothing changes in what counts. The internal status is still
`pending-review` / `active`, and only human-reviewed claims move technique
standing, adage standing and the backtest. The claim schema gains an optional
`reviewed_by` list of provenance strings for recording reviewers explicitly;
absent, it is derived from `submitted_by` (a human submitter has reviewed
what they submitted; an agent submitter means AI review only), which matches
every claim in the catalog today. Claims list gets a second pill, "Reviewed
by AI and a person", beside "Reviewed by AI".

## 2026-09-12 — MCP server, local first

`scripts/mcp-server.mts` serves the catalog over stdio to Claude Code or any
MCP client on the same machine, reading the checkout directly and reusing
`src/lib` for standings, related claims and the search index, so it can
never disagree with the site. Six tools: `search` (keyword and meaning
merged, same cutoff as the site), `get`, `technique_standing`,
`related_claims`, `list`, `open_questions`. No key; the meaning model runs
locally. Registered at user scope so it works from any directory.

The remote version (rsiratchet.com/mcp, for Claude.ai and other people's
agents) waits on a decision about query embedding: run the model in a
serverless function and accept cold starts, or call an embedding API with a
server key. Keyword-only remote would work today.

## 2026-09-12 — Applicability conditions on efficacy claims

Efficacy claims (those naming a technique) gain an optional `conditions`
block: `effect` (helps / narrows / no-effect / hurts), `needs` (a
controlled list: external signal, executable environment, retrieval
corpus, fine-tuning access, separate model, evaluation split, complete
mediation, raw history), `helps_most` (weaker / stronger / independent),
`cost` (low / moderate / high) and `fails_when` (the stated failure
condition). All 26 efficacy claims filled from their own statements; a
field is absent when the claim does not say. Conditions live on the claim,
not the technique, because they are evidence: the technique page and the
MCP `advise` tool aggregate them from human-reviewed claims only.

The rule for filling one: nothing goes in that the claim does not state or
clearly imply. The point is to make scope filterable, not to add opinions.

## 2026-09-12 — `advise` in the MCP server

Situation in, techniques out. It finds the capabilities a situation is
about (meaning search leads, because surface words like "docs" otherwise
crowd out the failure the sentence describes), gathers every technique that
addresses them, and reports each with its standing, aggregated conditions
from human-reviewed claims, a fit check against what the caller's
environment has and can afford, the evidence with its failure conditions,
the counter-evidence, and any AI-reviewed evidence separately. Ordering is
categorical: usable first, then by state of evidence. There is no score,
for the reason the second-opinion critique itself gave: whether a technique
helps is a function of task, model and environment, not a property of the
technique.

Known limit: the small local embedding model does not map idioms
("makes things up") to the capability; plain descriptions of the failure
do. The tool description tells callers to name the failure plainly and to
put model and environment in the structured fields. Capability embeddings
now include aliases and the discriminator, which helps the site search too.

## 2026-09-12 — The capability map, and an open-ended list as a stated goal

Russ's tree of what a model has to be able to do (reasoning, knowledge,
coding, agentic, context, verification; 22 leaves) becomes the map. Ten
groups in `taxonomy.yaml`: his six plus behavior, security, evaluation and
perception, which hold 14 existing capabilities the tree did not cover.
Each capability now names one `group` as its primary home, so the map on
the home page has no duplicates; tags stay soft for cross-listing.

Thirteen leaves had no entry and are filed as `proposed`, each with a
discriminator separating it from its nearest neighbour (planning from
long-horizon execution; error detection from critique from fact
verification; debugging from self-repair; factual recall from
hallucination). The point of filing before evidence: the pipeline can only
match papers to capabilities that exist, and an empty entry advertises the
gap. The spec now says the list is open-ended by design.

Where the map and the content model rub: "verification" as a capability
the model has (error detection, critique, calibration) sits beside
verification as what the harness does to the model (sensors, verifiers).
The discriminators keep LLM-as-judge papers under critique and
harness-design papers under the technique they describe.

## 2026-09-13 — Backfill the back catalogue a week at a time

Two things asked for and one refused by the data. Refused: a 24-hour
nightly window. OpenAlex indexes arXiv days late, so a one-day window on
publication date returns nothing (today it returned zero), and the
"added since" filter that would fix it is a paid feature. The seven-day
trailing window stays; overlap costs nothing because the seen-ledger drops
already-surfaced works before any paid stage.

Built: `scripts/backfill.mjs`, one historical seven-day window per night by
default, walking backwards from where the trailing window began toward
2023-01-01, cursor in `pipeline/backfill.json` on the state branch. A
historical week yields about 430 candidates, 108 matching a capability,
which at full throttle is about $5 a night and roughly $1,000 to reach
2023. So each window is pruned before queueing: the top 40 matched
candidates by heuristic score (about 45 classify items, $0.60) and the top
30 unmatched, which feed the capability-proposal stage. About $2 a night;
`backfill_weeks` and `backfill_top` are workflow inputs. The classifier now
takes the newest window first so backfill never spends tonight's budget,
and its cap rises from 60 to 100. Papers before December 2023 have no
arXiv HTML, so their briefs come from the abstract, marked as such.

Also fixed: the run log's "classified: N verdicts" counter grepped a line
shape the queue does not use and always said 1; and a zero-yield fetch now
prints the previous run's yield so a stalled upstream feed is
distinguishable from a quiet week.

## 2026-09-13 — Batches for the paid stages; backfill floor moved to 2026

The three per-item stages (classify, briefs, drafts) now go through the
Message Batches API at half price. `scripts/batch-lib.mjs` submits a stage's
requests as one batch, waits up to 25 minutes, and applies what came back;
a batch that outlives the deadline is recorded in `pipeline/batches.json`
on the state branch and collected first thing on the next run, with its
items excluded from resubmission in between. So a slow batch costs a night
of latency and never a lost or doubled request. Structured outputs work in
batches; the parse helper does not, so results are parsed and validated
against the same schemas by hand. Measured: two classify verdicts came back
in 152 s at $0.009 each against $0.014 before; the deferred path was
forced with a zero-minute deadline and collected on the following run.

The capability-proposal stage stays synchronous: it is a tenth of a dollar
a night and its consolidation step depends on the previous call.

Backfill now stops at 2026-01-01 rather than 2023: about 36 weeks, a month
and a bit of nights at one window each, roughly $1 a night at batch rates.
Job timeout raised to 150 minutes to cover three stages each waiting on a
batch.

Not done yet, deliberately: a cheaper model for the classifier. Haiku 4.5
would cut that stage by 80%, but the decision rests on the held-out
comparison against the 80 hand verdicts, which is the experiment already
designed for the classifier.

## 2026-09-14 — Forwarded papers go through the pipeline; the nightly files what it writes

Two papers forwarded today. Duan et al.'s RSI survey is filed by hand with
two claims (bounded domains near their benchmark ceilings while stateful
agent work lags; a single aggregate score conceals trajectory shape) and a
note in ambitions.md placing this pipeline at L1 on their five-level
autonomy scale. The DAIR harness-engineering collection (21 papers; six
already filed, the "how you know it worked" one being METR's, filed
yesterday) goes through the pipeline: `scripts/enqueue-arxiv.mjs` creates
the source from the abstract page and a queue entry, and the nightly does
the rest at batch rates. The term matcher could route none of the
"let the harness learn" papers, so `harness-self-improvement` is filed as
a proposed capability and those entries were routed by hand, which a
forwarded paper earns.

Found on the way: the nightly wrote briefs into catalog/ and then persisted
only pipeline/, so every brief it wrote in CI was discarded, and drafting
and filing were never in the job. Now: classify → propose → draft → file →
briefs → embed → validate, and anything written under catalog/ goes out as
a pull request on a `nightly-catalog-<date>` branch, never to main. The
deploy step deploys main as it stands; merging the PR and deploying is the
morning's job. If the token is not allowed to open PRs (a repository
setting), the branch is pushed and the log carries the compare link.

## 2026-09-14 — An admin sign-in for the working pages

Everything right of Adages in the nav (open questions, queue, drafts, how
this works) is now hidden unless the admin is signed in, and the pages
themselves are gated by `src/proxy.ts`, which redirects to `/login`. One
account, seeded from the environment: `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`
(scrypt, colon-separated because dotenv loaders expand `$name` in values),
`AUTH_SECRET` (signs a stateless session cookie, 30 days). No database, no
accounts table. The gate keeps the working views out of visitors' way; the
catalog stays public by design, and the login route answers wrong email and
wrong password identically.

Reset by email is not built: it would need an email provider account. The
reset channel is the machine with the checkout: `npm run admin:password`
(add `--vercel` to push the new hash to production, then deploy). The site
went from fully static to static plus a proxy on four paths and two route
handlers; every catalog page is still a static file.
