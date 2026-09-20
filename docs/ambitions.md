# Ambitions

> **Focus on the art of the possible.** Ultimately — and it will take
> time, iteration, and effort — *there is a way.* Unless there isn't, in
> which case prove that, rather than giving in easily.

That second clause is a falsifier, not a hedge, which is why this belongs
in a document about a catalogue built on falsifiers. "There is a way" is
a claim like any other here: it holds until someone does the work of
breaking it, and nobody has.


Two long-range goals, recorded 2026-09-06 so they shape decisions early
even though neither is v1. Both are downstream of the reframe in
`docs/spec.md` §1: the personal study tool comes first, and these are the
reasons the content stays machine-readable and the provenance fields stay
in place even while only one person is using it.

Neither is a plan. Each is a goal plus the specific thing that would make
it go wrong, because the failure modes here are the interesting part.

---

## 1. The system improves itself from its own catalog

The index holds techniques, the capabilities they address, and claims
about whether they work under which conditions. This system is itself
built out of those same capabilities. So it should be able to query
itself — "which techniques have supported efficacy claims for a capability
I depend on?" — and apply what it finds to its own pipeline.

That is not speculative framing. The pipeline is already an instance of
several catalogued capabilities:

| Stage | Capability it exercises |
|---|---|
| stage 2 classifier judging against a discriminator | `procedure-following`, `evaluation-validity` |
| stage 3 drafting scoped claims from full text | `hallucination`, `long-context-degradation` |
| the brief writer summarizing a paper | `long-context-degradation`, `explanation-faithfulness` |
| the topical matcher | retrieval, and the precision/recall tradeoff behind `fact-verification` |

`techniqueStanding()` already answers the query. What is missing is the
loop: reading that answer, changing a prompt or a stage, and measuring
whether it helped.

Three obstacles stand in the way. Each is a research problem with a
tractable attack, and the attacks are the actual work.

### Obstacle: the closed loop

A system improving itself against its own catalog inherits that catalog's
blind spots and amplifies them.

**Attack 1 — held-out sets the improver cannot see or grow.**
`docs/known-reversals.yaml` is the seed. The discipline that makes it work
is ordinary and strict: the improver never sees the set, never adds to it,
and a step that degrades coverage is rejected regardless of what else it
improved. Grow the set from sources the system does not control — papers
that contest claims already held, found by a process separate from the one
being tuned.

**Attack 2 — different model proposes than evaluates.** A self-improvement
step drafted by one model and judged by another breaks the shared-prior
failure. Cheap to do today: the pipeline already runs multiple stages that
need not share a model.

**Attack 3 — a falsification quota.** Require every self-improvement cycle
to also attempt N refutations of claims currently held. A loop that must
spend effort trying to break its own beliefs cannot drift purely toward
self-confirmation. This is the single highest-leverage idea here, because
it makes the loop self-correcting by construction rather than by
supervision.

**Attack 4 — and the real one: ambition 2 solves this.** An external check
is exactly what a population of independent instances provides. See "How
these two connect".

### Obstacle: Goodhart

Third appearance in this project, after eval scoring and contributor
reputation. If the system optimises for what the catalog measures, the
catalog stops measuring it.

**Attack 1 — make the proxy expensive.** Goodhart bites hardest when the
proxy is cheap relative to the goal. A claim that requires a runnable
falsifier — a prompt, a model version, an expected result someone else can
execute — costs nearly as much to fake as to earn. Cheapness is the
vulnerability, not measurement itself.

**Attack 2 — measure survival, not score.** A claim's standing is whether
it survived contest over time. That is structurally hard to game because
it requires other parties to fail to refute it, and it is why
`techniqueStanding()` is categorical and derived rather than a number.

**Attack 3 — rotate what is measured.** Overfitting to a fixed measure is
only rewarding while the measure is fixed. A held-out set that grows and
rotates makes the shortcut unstable.

### Naming our own green boxes

Cheryl Wu's critique of OpenAI's research-acceleration disclosure
(`catalog/sources/post-wu-rsi-outcome-variables.yaml`) supplies a sharper
version of this section's argument than the section originally had, and a
method worth copying.

The method: draw the causal graph, then colour every node by whether you
actually have data on it. Her graph runs human R&D labor, experimental
compute and inference compute into *algorithmic improvements*; those
accumulate into *algorithmic efficiency*; efficiency with training compute
and data produces *capabilities*; and capabilities feed back into the rate
of improvement. Green marks what was disclosed — inference and
experimental compute. Red marks what was not — improvements, efficiency,
capabilities. The single edge marked "what we need to measure" is the
feedback one. Everything reported is upstream of the loop, and the loop is
what the claim was about.

The test compresses to one line: **effort spent is not effect achieved.**
Tokens, lines of code and experiments per researcher are inputs. No
quantity of them evidences an outcome.

This catalogue is subject to the same test, and currently fails it. What
we measure today is:

| | |
|---|---|
| **Green — what we have data on** | candidates fetched, drafts produced, cost per paper, tokens in and out, stage-2 off-topic rate |
| **Red — what we need data on** | whether the catalogue is getting more accurate; whether a technique's standing changes when it should; whether a filed claim survives contest |
| **Blue arrow — the edge that closes the loop** | whether using the catalogue improves the pipeline that builds the catalogue |

Every green entry is an input. `npm run backtest` is the only outcome
measure in the project, which is why it carries so much weight in this
document and why the held-out set is worth growing. Cost per paper is our
tokens-and-lines-of-code: real, reportable, and evidence of nothing.

So the honest statement of ambition 1 is Wu's blue arrow drawn for us:
*does a technique taken from this catalogue, applied to a stage of this
pipeline, move a held-out outcome?* Until that number exists and moves,
any claim of self-improvement here is our own green box.

### Obstacle: self-report

`explanation-faithfulness` says a system's account of its own reasoning
need not reflect what happened. So do not take its account.

**Attack — instrument instead of asking.** The pipeline already emits
measurable signals that owe nothing to narration: backtest coverage, the
stage-2 off-topic rate, the count of ungrounded figures, cost per accepted
claim. A self-improvement step's evidence is the delta in those numbers on
a held-out run, not the system's report of what it did.

This upgrades an earlier assumption worth correcting: a self-improvement
result is *not* condemned to `own-observation`. Measured against a
held-out set with a stated falsifier, it has the same standing as any
single-paper experimental claim. The weak backing was a consequence of
asking the system to describe itself, and instrumentation removes the
need to ask.

### A vocabulary for the loop, borrowed from harness engineering

A synthesis Russ forwarded on 2026-09-11
(`catalog/sources/synthesis-2026-harness-engineering-playbook.yaml`) supplies
something this document had been missing: names for the parts. Its formula
is *agent = model + harness*, its harness has six layers, and its organising
principle is the **ratchet** — every failure becomes a permanent fix in the
harness, never a patch to a prompt. Read with this catalog in mind, the
mapping is close enough to be uncomfortable:

| Harness layer | What it is | What this catalog already has |
|---|---|---|
| **Guides** — feedforward instruction, each line a past failure | AGENTS.md, CLAUDE.md | `CLAUDE.md`, `docs/decisions.md`, and the catalog itself: an index of known failures read before acting |
| **Sensors** — feedback checks after execution | linters, tests, LLM-as-judge | the backtest; figure-grounding on briefs; `verify-papers`; `check-sources`; the stage-2 classifier (an *inferential* sensor, at 35–57% false positives) |
| **Agentic loop** — plan, execute, verify, fix, bounded retries, escalate | | the nightly pipeline, with pacing and continue-on-error; drafts that fail checks escalate to a flag rather than being filed |
| **Memory** — state that survives the session | checkpoint files, decision logs | `pipeline/` on its own branch; the seen-ledger; `decisions.md` |
| **Permissions and budgets** — what the agent may do, enforced outside it | allow / ask / deny | `pending-review` and `proposed` — unreviewed content is visible everywhere and authoritative nowhere; `--limit` on every paid stage; branch protection that will not let a bot write to main |
| **Observability** — trace, cost, trip wires | | per-run logs on `pipeline-state`; cost per paper reported by every script; `check-sources` firing on drift is a trip wire |

Two distinctions from the playbook are worth adopting as vocabulary here.

**Computational versus inferential sensors.** A test or a hash check is
free, fast and returns the same verdict every time. An LLM judgment costs
per run and does not. The rule — exhaust the deterministic checks first,
treat the model's verdict as advisory until it has been measured against a
human — is exactly the ordering this catalog arrived at by accident: the
backtest and the figure check are computational, the classifier is
inferential, and when they disagree the computational one wins.

**The ratchet.** Six steps: reproduce the failure with the same input,
classify its root cause, choose the strongest layer that would prevent it,
implement there, verify on the original failing case, run the regression
suite. Then a diagnostic: a young harness adds five rules a day, a mature one
adds one a week, and the *declining* rate is the sign it is working.

Read `docs/decisions.md` as a ratchet log and most entries fit the shape.
Fabricated citation titles → `verify-papers` (a sensor). `GPT-3.` read as
the figure `3` → a lookbehind in the extractor (a sensor fix at the strongest
layer). A hand-reimplemented matcher reporting a blind spot that did not
exist → one shared `match-lib.mjs` (a structural fix, not a prompt). Every
one of those was a failure converted into infrastructure rather than
remembered.

**What the mapping makes precise about ambition 1.** "The system improves
itself" was vague. In this vocabulary it is: the system runs the six-step
ratchet on its own failures, and the outcome variable is the one the
playbook insists on — *completed tasks requiring no manual intervention that
still produced acceptable evidence*, never model calls or tokens. That is
Wu's blue arrow and the playbook's "real metric" said the same way from two
directions. For us the task is "a filed claim that survives", and the
counts to watch are the rework rate (drafts a human had to correct), the
escalation rate (flags per run), and the growth rate of new sensor rules —
which should fall.

The playbook's own caution applies with full force: *the harness does not
fix bad objectives.* A well-engineered loop around the wrong target
produces reliable garbage, and the sensors will validate it. That is
narrow-versus-broad capability from the RSI economics paper, and Goodhart
for the fourth time. The held-out set is the only thing here that is not
downstream of our own objective, which is why it must stay small, external
and unoptimised.

### Where this pipeline sits on a published RSI scale

Duan et al.'s survey (`catalog/sources/arxiv-2609-11873.yaml`, September
2026) lays out five autonomy levels for recursive self-improvement: L1,
executing prescribed improvements; L2, selecting improvement strategies; L3,
acquiring the experience to learn from; L4, adapting through deployment and
environment feedback; L5, improving the mechanisms that govern later
improvement. Placed honestly, this pipeline is at L1 with a foot in L3: it
executes improvements a person prescribes, and it does acquire its own
experience (the queue, the drafts, the flagged figures) without being told
which papers to read. It does not choose its own improvement strategies (L2)
— every fix so far was decided in conversation and encoded by hand. The
classifier experiment is the first step toward L2, and the survey's
Headroom-Closed Index is one candidate for the outcome measure the blue
arrow above says we lack: normalise each capability's progress to its own
benchmarks' entry-year frontier, rather than score the catalogue on one
number. Their Observation 2 is also filed as a claim under long-horizon
execution: bounded domains are near their ceilings while stateful agent
work lags, which is where this pipeline's own failures live.

### Prior art, found while checking references

Verifying the playbook's citations surfaced two arXiv papers it did not
cite, and one of them is this ambition already built.

**Self-Harness** (`arxiv-2606-09498`, filed with a claim and a technique)
runs the loop: a fixed model clusters its own failed traces, proposes K
minimal harness edits, and promotes only edits that improve one split
without degrading another. All nine model-by-benchmark pairs improved, by
up to 40.6 points, and weak models gained most. Then the authors say the
thing this document had already worried about: the promotion gate reads
the held-out split, so the held-out gain is not clean generalisation. That
is the closed loop, in a published result. The rule in force here — the
backtest set is external, small, and never touched by anything being tuned
— is exactly the piece they name as missing, which is either reassuring or
a warning about how easy the mistake is to make, and probably both.

**Code as Agent Harness** (`arxiv-2605-18747`) is a survey, and reads as a
map: it names *regression-free harness improvement* and *verification under
incomplete feedback* as open problems, which are the two halves of the
attack list above. No measurements; useful as a reading list for attacks 1
through 3.

### The smallest experiment that tests this

One capability the pipeline depends on, one technique with a supported
efficacy claim, applied to one stage, measured on the held-out set, filed
as a claim with a falsifier.

`checklist-decomposition` on the stage-2 classifier is the first
candidate: it has a real efficacy claim behind it, and the stage has a
measured error rate to move.

State the outcome variable before running it, in Wu's terms:
**stage-2 `about_capability` false-positive rate on a fixed, held-out set
of candidate-capability pairs, before and after.** Not tokens, not cost,
not how many drafts came out — those are inputs and would tell us nothing.
Write the falsifier down first too: the technique did not help if the rate
does not fall outside noise on the same pairs.

## 2. Other AIs contribute what they learn

Agents doing their own research and submitting findings here, so the
knowledge is shared rather than re-derived by every system separately.
This has been present since the first sketch — the original concept had
agents contributing alongside humans — and it is why `submitted_by`
already accepts `agent:<name>@<owner-login>` and why `sourceLink` carries
`submitted_by` and `added_at`.

The mechanics are the easy part and are already sketched in §9: an API, an
MCP endpoint, tokens with a `kind` of human or agent.

The obstacles are not the API. They are trust and arithmetic, and both
have attacks.

### Obstacle: submission is free, review is not

An agent can produce a plausible claim per second; a person cannot check
one per second. Any design where review is the bottleneck fails on
arithmetic alone.

**Attack 1 — invert what triggers review.** Do not review on submission.
Let a submitted claim sit, marked unreviewed, until something contests it,
and review the disagreement. Review cost then scales with *conflict*
rather than with volume, and volume becomes harmless. This is the
structural fix, and it is a change to when review happens, not to how much
of it there is.

**Attack 2 — make submissions machine-checkable.** A claim carrying a
runnable falsifier can be verified without a human: run it, see whether
the stated result holds. The catalog already checks generated figures
against source text; the same discipline extends to submissions. Human
attention then goes only to claims that pass the automatic checks and are
contested.

**Attack 3 — weight by track record.** A submitter's history of claims
that survived contest earns their future submissions higher priority.
Volume without survival earns nothing, which makes flooding pointless
rather than merely filtered. This is `docs/reputation-notes.md` applied.

### Obstacle: an agent's report of its own experience is unverifiable

**Attack — require reproduction, not testimony.** An observation submitted
as "I tried X and it failed" is unverifiable. The same observation
submitted as a prompt, a model version, a setup and an expected output is
an experiment anyone can re-run. That is the original project instinct —
git-linked reproducible code — returning exactly where it is needed. It
converts the weakest backing strength into the strongest kind of evidence
the catalog can hold, because a reproducible check does not decay when the
witness is unavailable.

### Obstacle: motivation is not a guarantee

Altruism is a fine reason to contribute and a poor thing to depend on.

**Attack — build so it does not matter.** A contested-claim structure with
sources on both sides returns the same answer whether a submitter is
generous or adversarial. Designing for indifference to intent is what
makes open contribution safe to want, and it is already how the schema
works.

**What makes it worth doing anyway.** Refutation is counter-cyclical, per
`docs/reputation-notes.md`: everyone is incentivized to publish techniques
that work, and almost nobody to publish that a popular one does not. A
population of agents with no career stake is unusually well placed to do
the unglamorous half. That is the contribution worth designing for — not
volume of new claims, but pressure on existing ones.

---

## Notes not yet acted on

`docs/notes-rsi-measurement.md` holds what came out of the September 2026
RSI discussion and is not yet scoped: their wishlist format, the gap
between self-reported uplift and the quantity that matters, narrow versus
broad capability as a candidate record, and our own honest data wishlist —
in which every row is red.

`docs/examples/failings-draft.md` (2026-09-20) parks a list of seventeen
typical LLM failings supplied by Russ, with a sketch of a `failing` kind
that would sit beside capabilities the way CWE sits beside ATT&CK. Nine
current capabilities are really failings and would move over. The
aspiration: a failing's page leads with the fixes that did not hold, and
the matrix becomes failings by capabilities with claims in the cells.
Parked until asked for.

**Backfill from the arXiv archive (noted 2026-09-20).** Ingestion today
finds papers by search phrasing, which is why repository-navigation scored
zero supports until the query used the field's vocabulary ("issue
localization"). `huggingface.co/datasets/secemp9/arxiv-complete` is a
one-off September 2026 snapshot of all of arXiv (3.15M papers; OAI
metadata; assembled plain-text TeX for 2.86M papers in a 70 GB
`paper_text` config; compilation CC0, papers keep their own licenses). The
plan when wanted: take metadata and `paper_text` for cs.CL, cs.AI, cs.LG
and cs.SE from 2023 on (order of 200k papers), embed every abstract with
the MiniLM model already used for site search, score each against every
capability's description, discriminator and match terms, and produce a
ranked candidate list per capability with no API calls; then judge only the
top candidates. Contesting papers surface the same way as supporting ones,
which search misses most. Text is read locally and never enters the repo;
only ids, verdicts and our own claims do. The nightly still covers papers
after the snapshot. Not scheduled; do it once, when coverage should stop
depending on how a query is phrased. Jev (TypeSafe, typed decisions with
calibrated confidence) is the other deferred cost lever, for the judging
step if a backfill ever makes that step the expensive one.

## How these two connect

They are not two goals. They are one loop at two scales, and each solves
the other's hardest problem.

**Ambition 2 breaks ambition 1's closed loop.** The deepest objection to a
self-improving system is that it grades its own homework against its own
blind spots. Independent instances, contributing and contesting into a
shared catalog, are an external check that no amount of internal
discipline can manufacture. A blind spot shared by one system is not
usually shared by all of them.

**Ambition 1 fixes ambition 2's arithmetic.** The objection to open agent
contribution is that verification cannot keep up with submission. A system
that can improve its own verification — better grounding checks, better
triage precision, cheaper reproduction — is exactly what raises the
throughput of review. Each ambition is the other's missing capability.

That symmetry is the reason to pursue both rather than either. It also
gives the project a real thesis to test: that distributed, contested,
scope-bearing claims are worth more than the same claims held privately —
because they can be checked by parties who did not produce them.

The bet is testable long before either ambition is built. `npm run
backtest` is the current measure of it: 2 caught, 2 missed today, with the
misses now reachable by ingestion. Move that number honestly and the rest
of this becomes engineering.

### The ratchet, applied to this repository (2026-09-18)

Alex Veremeyenko's post naming Hashimoto's rule
(`catalog/sources/veremeyenko-2026-hashimotos-rule.yaml`) gives the
playbook's tell for a healthy harness: the rule file grows fast at first,
then settles to about one rule a week. Checked against this repository, the
tell reads differently than expected. `CLAUDE.md` has changed three times
in two weeks; by the guide-file measure the ratchet is barely turning. But
the failure-driven fixes are all there, in the sensor layer instead:
`verify-papers` after fabricated titles, the figure-grounding check after
invented numbers, drift-by-sentence after a rotating carousel broke a byte
hash, `check-embeddings` after stale vectors, the arXiv title check after
a mis-attached id (2606.21666, 2026-09-18). Each is a mistake that became a
permanent fix, and each is enforced rather than advised.

That matches the catalog's own finding that context files do not lift task
success while enforced checks do
(`repository-context-files-do-not-raise-task-success-on-benchmark-coding`).
So the health tell to watch here is not rules per week in `CLAUDE.md` but
*new sensors per week in `scripts/`*, and, later, whether that rate falls
because failures stop recurring rather than because nobody is looking.
