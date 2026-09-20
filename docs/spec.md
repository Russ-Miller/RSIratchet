# RSI Ratchet — product and data specification

Version 0.3, 2026-09-03. This document is the source of truth. Change it in
the same pull request as the code that changes behavior.

**Status note (2026-09-03):** this version is a substantial rewrite — see
`docs/decisions.md`, "Personal-study reframe," for why. The live catalog
under `catalog/` and the deployed site still reflect the *previous* model
(Weakness→Capability with a 1-10 score) as of this writing. A worked
example of the new model lives under `docs/examples/` pending review;
`catalog/` itself gets migrated in the next pass. If the two disagree,
this document describes where the project is headed, not necessarily
what's live right now — check `catalog/schema/` directly to see which
schema is actually in force.

## 1. Purpose

This is primarily a personal study tool: a place to organize what I
actually understand about LLM capabilities as I learn it — "the
neuroscience of LLMs." Curiosity-driven, not built to a spec for a
hypothetical audience. The reasoning: the most useful tools were usually
built because their creator wanted such a tool for themselves; build the
version that's genuinely useful to me, and it will serve others better
than one designed for an imagined user from day one.

Two things follow from that:

1. **v1 optimizes for one reader: me, thinking.** Progressive disclosure
   (capability → claims → backing detail), honest epistemic status on
   every claim, and structure that makes it easy to revise my own mind —
   not conversion funnels or contributor onboarding.
2. **Everyone else is a hoped-for second-order benefit, not the design
   target** — first other humans curious about the same questions, and
   only after that, agentic systems that might use this as an input. Both
   are welcome, neither drives v1 decisions. Concretely: the earlier
   contributor-platform design (accounts, admin CRUD, capability requests,
   an MCP server framed around "what should I as an agent do") is real
   and stays documented (§9), but it's explicitly a later phase, not v1.

### What this is, versus a paper feed

Worth stating plainly, because the difference drives what gets ingested
and how it's organized. Feeds like Hugging Face's Daily Papers are a
crowd-sourced view of what is *new and in vogue* — a genuinely useful
signal, organized by recency and popularity. That is not what this is.

This is an index of **capabilities**, and of the research that helps
someone understand, for a given capability:

- what emerging work is making systems **better** at it, and
- what **holds systems back** — the research that spotlights the
  weaknesses, kept alongside rather than filtered out as bad news.

The organizing axis is the capability, not the publication date and not
the upvote count. A five-year-old paper that still explains why something
fails belongs here; a paper trending today that doesn't change what's
known about any capability does not. Popularity is a *discovery* signal
worth using to find candidates (see §6), never the structure itself.

**Versus Papers with Code** (the original, retired 2025, and the
unofficial revival at paperswithcode.co): those index *papers* by task,
with code links and, in the original, leaderboards of numbers. The unit
there is a paper or a benchmark row. The unit here is a **claim**: "X holds
under condition Y", with the papers for and against attached, a falsifier,
and a way for any reader or agent to add support or contest it. A paper
index tells you what has been written about a topic; this tells you what
was found and where it stops being true. Techniques take their standing
from those claims, so "does this fix work?" gets an answer with evidence
rather than a reading list. And a break, a claim or technique or rule that
turned out not to hold, is recorded as the most valuable entry, not
removed. The elevator version: *Papers with Code tells you which papers
exist about a topic; RSI Ratchet tells you what they found and under what
conditions it stops being true.*

The longer-term thought, still explicitly second-order per the point
above: an agentic system working to improve itself could consult this
index for exactly that pairing — what improves a capability, and what
currently limits it. That possibility shapes nothing about v1 beyond
keeping the content machine-readable, which git-backed YAML already is.

### The lifecycle this is built to track

The core job, stated as a sequence, because each stage needs different
structure and the last two are the ones most indexes get wrong:

1. **Where systems are weak.** Which capabilities they underperform at —
   the entry point, and the reason the catalog is organized by capability.
2. **What holds them back.** The best current understanding of *why* the
   limitation exists — mechanism, not just a benchmark number. This is
   the part that actually informs someone trying to fix it, and it is
   what `kind: mechanism` claims exist to hold. A score tells you a model
   is bad at something; a mechanism claim tells you what you're up
   against.
3. **What overcomes it.** When someone does move a capability forward,
   this should surface it so the news travels — that's the point of
   indexing techniques alongside the weaknesses they address.
4. **Whether it actually held up.** An announced fix may be a false
   alarm, or — far more often — may work only under conditions nobody
   stated up front. So an efficacy assertion has to be contestable and
   scope-bearing in exactly the way any other claim is: sources on both
   sides, a suspected axis of disagreement, and the *when and where* it
   helps written into the statement itself.

Stage 4 is why efficacy is modeled as a **Claim**, not as a property of a
Technique. A Technique record says what the technique *is* and where the
code lives; a claim referencing it says what it *does*, for which
capability, under what conditions — and inherits contested/
disagreement_axis/scope-condition machinery for free. "Technique X fixes
weakness Y" asserted as a bare field on the technique would be precisely
the unfalsifiable, un-nuanced statement this format exists to prevent.

## 2. What changed from the first draft, and why

The project's first pass (through 2026-09-02) modeled this as "CWE for
model capabilities" — a contribution platform for agent developers, with
capabilities scored 1-10 per model version. That framing is retired for
v1. Specifics:

- **No numeric score.** A repository that optimizes toward an eval score
  Goodharts, and the degradation is invisible from inside the loop.
  Quantitative capability numbers also aren't portable — they're
  entangled with model version, decoding configuration, and benchmark
  quirks in ways a bare "6/10" hides. Qualitative claims with visible
  provenance are more honest about their own epistemic status.
- **The Claim, not the score, is the unit of content.** A claim is a
  directional statement with its scope condition attached: "chain-of-
  thought degrades performance on tasks where verbalization disrupts an
  otherwise intuitive judgment," never "CoT is sometimes bad." A claim
  written without its scope gets misapplied later — that's the failure
  mode this format exists to prevent.
- **Sources are first-class; claims reference them, not the reverse.** If
  a claim owned its citations directly with no independent source record,
  one flawed paper backing six claims would be six things to find and fix
  later instead of one. My own observations are sources too, under the
  same schema as papers — otherwise a parallel, less-rigorous personal-
  notes system develops, and I'd end up biased toward whichever is easier
  to write into.
- **Ongoing re-evaluation, not one-time cataloging.** The system should
  keep looking for evidence that supports or contests existing claims, not
  just discover new capabilities once. See §6.
- **Contested claims need real structure**, not a boolean. See §5, Claim.
- **Durable and perishable knowledge are structurally separated.**
  Mechanism-level findings (why a phenomenon happens) tend to survive
  model generations; model-specific performance observations don't. Claims
  carry a `kind` for exactly this reason — see §5.
- **Taxonomy is a view, not the primary structure.** Folk categories like
  "reasoning" or "instruction following" probably carve the space badly,
  and re-carving should be a re-tagging exercise, not a migration.

## 3. First users

Me, first. If this becomes useful to other curious humans reading the
site, or later to agents via an API, that's a genuine but secondary goal —
see §9 for what that later phase could look like and why it's deferred.

## 4. Entity model

Content entities live in `catalog/` as YAML, one file per record. Every
content record has an `id` slug that's permanent once merged.

### Capability  (`catalog/capabilities/<id>.yaml`)
A topic — a named area of interest that groups claims for progressive
disclosure. Not scored; the capability page's job is to list its claims,
not to render a verdict.

| field | type | notes |
|---|---|---|
| id | slug | permanent |
| label | string | plain-English name |
| summary | string | one sentence — what this topic is about |
| description | string | a paragraph of context; what's interesting about this area |
| tags | slug[] | soft, freely re-assignable labels — see §7. Not a single required parent group. |
| group | slug? | primary home among the taxonomy groups, for the map (§7). Tags may still name other groups. |
| modality | enum[]? | `text` / `image` / `audio` / `video` / `action`. Only where the capability is genuinely modality-bound; omit when it cuts across modalities. |
| match_terms | string[]? | phrases the ingestion keyword matcher looks for — see §6 |
| discriminator | string? | in-scope / out-of-scope boundary, written for the stage-2 classifier and for me |
| parent | slug? | optional parent capability, for variants |
| aliases | string[]? | other names used in the literature |
| techniques | slug[]? | techniques relevant to this capability |
| related | slug[]? | other capabilities |
| status | enum | `proposed` (filed as a leaf of the map or by the pipeline, not yet endorsed), `active` (currently tracked) or `parked` (noted, not being actively studied) |
| submitted_by | string | provenance, see §8 |

**The list is open-ended by design.** A stated goal of the catalog
(2026-09-12) is to curate what is, in the limit, an unbounded list of
things a model has to be able to do. The taxonomy groups are the map; a
capability with no claims is a research brief, visibly marked `proposed`,
not a mistake to be tidied. Filing a leaf before there is evidence for it
is encouraged, because the pipeline can only match papers to capabilities
that exist, and because an empty entry advertises the gap.

### Claim  (`catalog/claims/<id>.yaml`)
The primary content unit: a directional, scoped statement, not a data
point. The `id` is a slug derived from the statement itself (e.g.
`self-repair-needs-external-signal`), not from a model/version/date
combination the way the old Claim id was.

| field | type | notes |
|---|---|---|
| id | slug | derived from the statement |
| capability | slug | the Capability this claim sits under |
| statement | string | the directional, scoped claim itself — see §2 |
| technique | slug? | present when this is an **efficacy claim**: an assertion that a technique in `catalog/techniques/` moves the capability, and under what conditions. Makes "X overcomes Y" contestable and scope-bearing like any other claim rather than an unfalsifiable field on the technique — see §1, stage 4. |
| tags | slug[]? | additional soft labels beyond the capability's own |
| kind | enum | `mechanism` (durable — why something happens) or `observation` (perishable — how a specific model/era performs). See §5. |
| backing_strength | enum | `single-paper`, `replicated`, `mechanism-reasoning`, or `own-observation` — categorical, not a score. What kind of support this claim has, overall. |
| observed_on | object? | loose, categorical, not a hard link: `{ model?: slug, era?: string, task_type?: slug }`. Most meaningful for `kind: observation`; often absent for `kind: mechanism`. `model` optionally references `catalog/models/`; `task_type` optionally references a context in `catalog/taxonomy.yaml`. |
| sources | SourceLink[] | see below, minItems 1 |
| contested | boolean | default false — see §5 |
| disagreement_axis | object? | required in spirit (not enforced by schema) when `contested: true` — see §5 |
| status | enum | `active`, `superseded`, or `retired` |
| superseded_by | slug? | a later claim |
| last_checked_at | date | when this claim was last checked against new evidence |
| last_new_evidence_at | date? | when new evidence was last actually found, if ever |
| notes | string? | free-form |
| submitted_by | string | provenance, see §8 |

**SourceLink** (an entry in `sources`):

| field | type | notes |
|---|---|---|
| source | slug | must exist in `catalog/sources/` |
| stance | enum | `supports` or `contests` |
| note | string | what specifically this source shows for *this* claim |

### Source  (`catalog/sources/<id>.yaml`)
A citable thing a claim can point to — a published paper or my own
observation, same schema either way, distinguished only by `kind`. This
is the "first-class, claims reference it" object from §2: fix a source
once here, not once per claim that cites it.

| field | type | notes |
|---|---|---|
| id | slug | `arxiv-<number>` for arXiv papers; a descriptive slug otherwise |
| kind | enum | `paper` or `observation` (room to extend later — a blog post, a benchmark release) |
| title | string | for an observation, a short description of what was noticed |
| authors | string[]? | required in spirit for `paper`, N/A for `observation` |
| year | integer? | |
| date | date? | more precise than `year`; natural for an observation |
| arxiv_id | string? | `paper` only |
| url | string? | an observation may have none |
| venue | string? | |
| summary | string? | the abstract for a paper; the actual content for an observation |
| tags | string[]? | |
| code_url | string? | |
| ingested_at | date | when this source entered the catalog — distinct from `date`/`year`, which is when the source itself was created. Powers the sources view (§8) and the recent-activity view (§6). |
| citations_total | integer? | `paper` sources only, from Semantic Scholar's `citationCount`. A recency/relevance signal, not a truth signal — a paper can stay well-cited while being cited critically. |
| citations_recent_12mo | integer? | count of citations with a publication date in the last 365 days, as of `citations_checked_at`. The more useful of the two numbers: total citations conflates "was once important" with "still discussed." |
| citations_checked_at | date? | when citation data was last fetched (`scripts/fetch-citations.mjs`, run by hand for now — this is a much cheaper, narrower check than the daily-scouring pipeline in §6/§9, and doesn't need to wait for that automation). |
| semantic_scholar_id | string? | Semantic Scholar's own paper id, captured for free in the same citation-fetch response. Makes the citation badge a link back to Semantic Scholar — attribution for the data, not just decoration. |

### Model  (`catalog/models/<id>.yaml`)
Unchanged in shape from the previous draft: a model family with versions
(`id`, `label`, `vendor`, `versions: [{id, label, released?}]`, `url?`).
Kept as loose reference vocabulary — a claim's `observed_on.model` may
point here, but nothing requires it to, and there's no exact
version+date+context triple a claim must supply the way the old
score-bearing Claim did.

### Technique  (`catalog/techniques/<id>.yaml`)
`id`, `label`, `summary`, `description`, `addresses` (capability slugs),
`kind` (`prompting`/`retrieval`/`tooling`/`training`/`decoding`/
`architecture`/`process`), `sources` (source slugs — renamed from
`papers`), `repos` (`{url, note, verified_on?}`), `contexts`, `requires`,
`evidence_search?`, `status`, `submitted_by`.

A Technique describes *what it is*, never whether it works — that is a
Claim carrying `technique`. Two fields exist to keep that boundary from
eroding:

- **`requires`** is prerequisites and applicability ("needs fine-tuning
  access", "needs a sandboxed interpreter"). It replaced `caveats`, which
  had been mixing prerequisites with unsourced efficacy assertions.
- **`evidence_search`** (`{searched_on, note, nearest_miss?}`) records
  having *looked* for efficacy evidence and come up empty. Each
  `nearest_miss` is `{source? | title? | url?, why_it_does_not_fit}`.
  This is what makes an absence usable: "searched, still open, and here
  is the nearest paper and why it isn't support" is a research brief,
  where a technique with no claims and no search is only an unchecked box
  in *this* catalog and says nothing about the literature. The two states
  must never be displayed as the same thing — see §7.

`status` is `active`/`superseded`: record lifecycle, not a verdict.

### Pinning what we actually read
arXiv puts a version in the id, so a paper cited here stays readable. Other
sources do not. A PDF served from a repository, a preprint on an institute
site, a doc behind a stable URL — those change underneath the same address
with nothing to notice it. The Elasticity RSI paper is revised roughly
fortnightly, and the figures our claim quotes are exactly the kind that get
revised.

So a source may carry `content_url` (the exact file read, where that differs
from the landing page), `content_sha256`, and `content_checked_at`.
`npm run check-sources` re-fetches each one and reports any that changed,
naming the claims that rest on it; the nightly runs it and writes the result
into the run log.

When a source changes, `content_changed_at` is recorded and the pinned hash
is **left alone**. It marks the version the claims were written against.
Overwriting it would erase the evidence that those claims now rest on
something nobody has read.

Companion to the archiving rule below: that one handles sources that vanish,
this handles sources that mutate. Both exist so a citation cannot quietly
stop meaning what it meant when it was made.

### Vendor guidance (`kind: vendor-doc`)
Documentation published by the party that builds the model. It has an
unusual evidence profile and the schema records it rather than averaging
it away.

**Privileged** about the artifact. Nobody outside can measure what a model
was trained to do; the builder can. That is genuinely better evidence than
any external study on those questions.

**Structurally weak** on efficacy. "No measurable loss on our coding
evaluations" cannot be checked from outside — no baseline, no ablation, no
independent run. By this catalog's own standard that is close to
unfalsifiable, whatever its accuracy.

**Interested.** A vendor recommends what shows its models well and lowers
its support burden. Not an accusation; a direction of bias worth encoding.

**Perishable.** Scoped to a model family at a moment, so `observation` with
the era recorded, not `mechanism`.

Backing ceiling: `single-paper` when it reports an actual measurement,
`mechanism-reasoning` when it only asserts, never `replicated` — a vendor
confirming its own guidance is not replication. `archived_text` and
`retrieved_at` are required as for posts, and `content_sha256` applies:
marketing pages are rewritten in place.

Their real value here is supply of incumbents. Vendor guidance is what
practice becomes, so a doc that names its own former advice as myth hands
over several incumbent positions at once, attested by the party best placed
to know they were held.

### Informal sources (`kind: post`)
A Source can be a post — a thread, a blog entry, a forum comment — as well
as a paper or the user's own observation. Informal writing is good at
things papers are bad at: it carries the *incumbent* beliefs nobody
publishes a paper to assert, it carries negative results ("we tried it, it
did not hold"), and practitioners volunteer scope conditions that papers
generalise away. All three are things this catalog wants and struggles to
source.

It is correspondingly weak as backing. A post can originate a claim; it
cannot strongly support one. Treat `own-observation` as its ceiling — it
is someone else's observation — and never `replicated`.

`archived_text` is **required** for `kind: post`, with `retrieved_at`.
Papers can be re-fetched years later; posts are edited and deleted. Without
the archive a citation quietly stops being checkable, which is worse than
not having made it — see the two fabricated paper titles this project has
already been handed.

### Source briefs
A paper Source can carry a `brief`: a 120-200 word digest in the house style
(`docs/prompts/paper-summary.md`), written from the abstract by
`scripts/summarize-sources.mjs` and shown above the fold on the source
page. Abstracts are written to be citable; briefs are written to be
skimmed, which is the whole reason they exist.

`summary` and `brief` are different objects and both stay. `summary` is a
hand-written factual gloss. `brief` is generated, and says so on the page.

Because the style runs on dense figures and an abstract often has none,
generation carries an anti-fabrication guard: the model must list the
figures it used copied verbatim, and every number in the output is then
checked against the abstract independently of what the model claimed.
Unmatched numbers land in `brief_unverified_figures` and render as a
warning rather than sitting there looking authoritative. The check is the
guard that matters, because it does not rely on the model having obeyed
the instruction.

### Contribution provenance (§8)
Every record still carries `submitted_by`, format `human:<handle>` or
`agent:<agent-name>@<owner-login>`. Kept even though I'm the only author
right now — cheap to keep, and it means the format doesn't have to be
retrofitted if this ever does get other contributors.

## 5. Kind, backing strength, and contested claims

**`kind`: mechanism vs. observation.** A mechanism claim explains *why* —
context poisoning, why self-consistency helps on some task shapes — and
tends to survive model generations. An observation claim describes how a
specific model or era performs, and is expected to rot as models change.
Keeping them structurally distinct (not just tag-filtered) matters so
perishable content doesn't quietly contaminate my sense of what I
actually, durably know.

**`backing_strength` categories**, roughly weakest to strongest as a
*kind* of support, not a numeric scale:
- `own-observation` — I noticed this; not yet checked against literature.
- `single-paper` — one paper reports it; not independently replicated.
- `replicated` — more than one independent source reports the same
  pattern.
- `mechanism-reasoning` — supported by an architectural or theoretical
  argument for *why* it should be true, not (only) an empirical count.

**Contested claims.** A bare `contested: true` gets ignored — it carries
no information about what to do with the disagreement. Instead:
- `sources` already carries `stance: supports | contests` per entry, so a
  contested claim simply has sources on both sides, each with a `note`
  explaining what that source actually shows.
- `disagreement_axis` records the *suspected* reason the sources disagree
  — model scale, task family, how the technique was operationalized, what
  counted as success — as free text, plus an explicit `is_guess: boolean`
  so a real explanation is never confused with a guess dressed up as one.

## 6. Ongoing re-evaluation (schema and views for v1; automation is later)

For v1: add the fields and site views this needs. The actual "scour the
internet daily" job is a later-phase engineering effort (real cost and
API decisions), same as the arXiv pipeline in the first draft was gated
on a key and a measured cost before scaling. What v1 does add:

- `last_checked_at` and `last_new_evidence_at` on every claim.
- A **recent activity** view: claims with new supporting or contesting
  evidence recently, most-recent first.
- A **sources** view, separate from claims — browse everything cited,
  independent of which claims reference it.
- A **stale** view: claims whose `last_checked_at` is 14+ days old,
  worth a manual re-check even absent an automated sweep — evidence from
  an earlier model generation often just becomes settled, considered
  wrong, or irrelevant, and a claim nobody's revisited in two weeks is a
  reasonable place to look first.

**Deferred, noted so it isn't lost:** `citations_total`/
`citations_recent_12mo` on Source (added 2026-09-03) will go stale the
same way claims do, and re-checking a claim should eventually mean
re-checking the citation data of the sources it cites too. `scripts/
fetch-citations.mjs` is run by hand today; refreshing it will need to run
as a slow, incremental background process — one source at a time with
real delay between requests, resumable, checking the oldest
`citations_checked_at` first — specifically to avoid re-triggering the
Semantic Scholar rate limiting this network hit hard doing the initial
fetch (multiple runs, several papers took 6-8 retries with minutes of
backoff each). Not building this now.

## 7. Taxonomy as a view

`catalog/taxonomy.yaml` holds ten groups (reasoning, knowledge, coding,
agentic, context, verification, behavior, security, evaluation,
perception; the first six from Russ's 2026-09-12 capability map) and a set
of contexts (coding-agent, math, chat-assistant, …). Each capability names
one group as its primary home, which is what the map on the home page
draws; tags remain a *soft*, freely re-assignable set, so a capability can
still be cross-listed and a claim can carry contexts. No claim must belong
to a group. Expect to re-carve this at least
twice as real content accumulates; because claims (and capabilities) are
the primary objects and tags are just labels on them, re-carving is a
re-tagging exercise, not a migration.

### Open questions (`/open-questions`)
A derived view, not stored state: techniques in the catalog that no claim
measures. It exists because the gap *is* content — a technique in wide use
with nothing behind it is the most actionable thing here — but it is only
useful if it distinguishes three states that look identical in a bare
count:

1. **Searched, still open.** `evidence_search` is present. Someone looked,
   found nothing that isolates the technique, and wrote down what they
   looked for and which near-miss paper failed to support it and why. This
   is the section that is genuinely about the literature.
2. **Not yet searched.** No claims, no search. Evidence about *this
   catalog* only. Advertising these as unstudied would be the same
   unfalsifiable move as the old `status: accepted` — an assertion nobody
   can check — just inverted.
3. **Argued, not measured.** Every efficacy claim rests on
   `mechanism-reasoning`: believed for a structural reason, never
   quantified. A weaker opening than silence, and the easiest to mistake
   for settled.

The ordering is deliberate and so is the labelling. Collapsing 1 and 2
into "no research exists" would manufacture research opportunities out of
gaps in my own reading, which is precisely the failure this project is
supposed to make visible.

The page also runs the question the other way. The three states above ask
whether a given *technique* works; a fourth section asks whether anything
does — capabilities carrying claims that establish a weakness, where no
technique addressing them has an efficacy claim anybody measured. The
helper is `unsolvedCapabilities()`. Two vocabulary rules hold here: these
are *weaknesses* looking for *techniques*, not problems looking for
mitigations. "Mitigation" imports risk-management framing the project
does not want — the work is finding what improves a capability, not
containing a hazard. And "weakness" is a position on a capability, never
an entity of its own; the axis stays neutral, which is the whole reason
Weakness was renamed to Capability in the first place (§4). Split
again by strength: `no-technique` (nothing is even proposed) versus
`none-measured` (something is written down, nobody checked it). The
second is a citation away from closing; the first would be new knowledge.

### List filters, and /open-questions as a lens rather than a place
The capability, claim and technique lists carry a segmented filter bar
(All first, then one button per cut, each showing its count). Rows are
server-rendered with `data-tags`, the bar flips `data-filter` on a
wrapper, and rules in `globals.css` hide what does not match — so the
lists stay fully static and no second copy of the data ships for the
filter to work over.

The cuts are deliberately the *same* cuts /open-questions shows, computed
by the same helpers (`capabilityTags`, `techniqueTags`, `claimTags`, all
resting on `openQuestions()` and `unsolvedCapabilities()`). A count on
a filter button and the count on the section of that name cannot drift,
because there is one predicate behind both. Capabilities filter to
contested / no-technique / none-measured; techniques to searched /
unsearched / argued; claims to contested / argued.

The active filter is mirrored into the query string, which is what makes
/open-questions a lens rather than a separate place: each section links
to the same set seen among its peers on the main tab. That matters for
judgment — "seven capabilities have no measured technique" reads very
differently next to the nine that do.

### Evidence activity on a claim
A claim's status row shows aggregate citation activity across the sources
it rests on, using the *liveliest* source rather than a total — summing
citation counts across papers would produce a figure nobody reported.
Sources whose citations have not been fetched are excluded and counted
separately, and a claim with no checked sources says "not checked yet"
rather than rendering blank, since a blank reads as "no activity".

## 8. Site (progressive disclosure)

- `/` — recent activity first (§6), then browse by capability.
- `/capabilities`, `/capabilities/[id]` — a capability page lists its
  claims (statement + kind + backing_strength badge), click through to a
  claim for full source detail.
- `/claims/[id]` — the claim's statement, its sources (supports/contests,
  with notes), `disagreement_axis` if contested, `last_checked_at`.
- `/sources`, `/sources/[id]` — browse everything cited, independent of
  claims; a source page lists which claims reference it.
- `/recent` — the recent-activity view from §6.
- `/stale` — the 14-day staleness view from §6.
- `/techniques`, `/techniques/[id]` — mostly unchanged from the first
  draft.

Rendered server-side from the catalog at build time, as before. No
database needed for reads.

## 9. Later phase: agent-facing API, accounts, admin (not v1)

Everything below was designed in the first draft and stays documented
because the design thinking is real, but none of it is v1 scope per §1.
Build it if and when the personal-study version is solid and actually
wants agent/contributor traffic.

- **Read API and MCP** (`/api/v1/*`, streamable HTTP MCP at `/api/mcp`):
  `list_capabilities`, `get_capability`, an `advise` call, etc. When this
  phase happens, agent-facing output should be framed as symptom →
  intervention — actions to take — never as a property of the model
  ("this model is bad at X"), since the latter reads to an agent as
  permission to give up rather than something to act on.
- **Accounts and tokens**: GitHub OAuth via Auth.js, `is_admin` boolean
  flag, tokens scoped `read`/`write` with `kind` (`human`/`agent`). No
  agent detection by heuristics — a token earns higher limits and
  attribution.
- **Bootstrap admin ("Captain of the Ship")**: `ADMIN_GITHUB_LOGINS` env
  var allowlist (starts with `Russ-Miller`), checked at login time, not
  tied to email — GitHub OAuth doesn't guarantee an email comes back.
- **Capability requests**: a lightweight record (label, rationale, links,
  status) separate from the git-backed catalog, so a casual suggestion
  doesn't need evidence up front; an admin turns an accepted one into a
  real Capability.
- **Admin CRUD**: direct create/edit/delete on capabilities, bypassing the
  `proposed` review state. Open technical question if this ever gets
  built: does an admin write commit to git (keeping git as the catalog's
  source of truth) or does the catalog move to a database at that point?
- **Importance claims**: `(capability, context)`-scoped, evidence-backed
  salience rating, considered as an alternative to raw up/down voting —
  see decision log, 2026-09-03.

Two longer-range goals sit beyond even this, recorded in
`docs/ambitions.md`: the system improving itself by querying its own
catalog for techniques with supported claims, and other AI systems
contributing findings so the knowledge is shared rather than re-derived.
Neither is scoped work. They are written down because they explain why
provenance fields, machine-readable content, and the backtest all earn
their place now, while only one person is using this.
- **Prediction-before-test** as an entry type: record an expectation
  before checking it, since memory quietly edits priors to match outcomes
  after the fact — also later phase, not because it's a bad idea, but
  because it's a refinement once there's already a body of claims to
  predict against.

## 10. Non-goals

Billing, organizations, private content, file hosting, raw up/down
voting, comment threads, detecting unidentified agents, any
roles/permissions system beyond a single `is_admin` flag if that phase
happens, and — for v1 specifically — the entire contributor-platform
surface in §9.

## Adages

An adage is a law or maxim from human systems filed so the catalog can test
whether it transfers to models. Fields: `statement`, `origin`, `transfer` (the
mechanism by which it should or should not apply), and `evidence` — claims in
this catalog with a verdict of `holds`, `breaks` or `narrows`. Standing is
computed from reviewed claims only. The catalog values breaks over holds: a
break is a finding about how models differ from people. See decisions.md,
2026-09-11.
