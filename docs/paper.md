# RSI Ratchet: a catalog of what models cannot do yet, built to be proven wrong

*Russ Miller, September 2026. Draft.*

## The problem

Everyone building on language models carries a private list of what they are bad at. Arithmetic inside a chain of reasoning. Facts stated confidently that are not true. Losing the middle of a long input. Agreeing with whoever pushes back. Every week a paper adds to the list or takes something off it, and every week a technique is advocated that fixes one of these, usually without saying under what conditions, on which models, or at what cost.

None of this knowledge lives anywhere. It sits in papers nobody re-reads, in blog posts that go stale, in the heads of practitioners, and increasingly in the weights of the models themselves, which is the worst place for it, because a model asked what it is bad at will answer confidently and be out of date.

The people most in need of the list are not people. An agent that is trying to improve the system it runs in has a specific, answerable question at every failure: is this a known weakness, is there a known fix, and does the fix apply here? Today it has nowhere to look. It either has the answer in its weights, which is unreliable, or it is handed a guide file, which the evidence says does not raise task success and costs about twenty percent more inference.

This is a proposal, and a working prototype, for the missing thing: a catalog of model capabilities and weaknesses, the claims made about each, the evidence behind every claim, and the techniques that address them, with the conditions under which they do. It is at [rsiratchet.com](https://rsiratchet.com) for people, and for agents it is an MCP server with a handful of tools, the most useful of which takes a description of a situation and returns the techniques that fit it, with their evidence and their failure conditions. The catalog itself is a folder of YAML files in a public repository, which is what makes every entry citable, diffable and contestable.

## What is in it

Four kinds of entry, and one more added recently.

A **capability** is a topic: "digit-level arithmetic", "stating false facts confidently", "fixing its own mistakes". It is not scored. It exists to hold claims. The list of capabilities is open-ended by design: the goal is to curate what is, in the limit, an unbounded list of things a model has to be able to do, arranged on a map of ten groups (reasoning, knowledge, coding, agentic, context, verification, behavior, security, evaluation, perception). A capability with no claims yet is filed anyway and marked proposed, because the pipeline can only match papers to capabilities that exist, and because an empty entry advertises the gap.

A **claim** is the unit of content: a directional, scoped statement, never a number. "Writing out reasoning steps improves how a problem is decomposed but does not fix the arithmetic inside a step." Every claim links to its **sources**, each with a stance, supporting or contesting, and a note saying what the source actually showed. A claim is marked as a durable mechanism or a perishable observation tied to a model and an era, because the two must not contaminate each other. Its backing is a category, not a score: a single paper, replicated, argued from mechanism, or the maintainer's own observation.

A claim can be **contested**. That is not a flag; it is a structure. A contested claim carries sources on both sides and a stated disagreement axis, the suspected reason the sources disagree, marked as a guess when it is one. The rule for filing is: file the incumbent first, then contest it. The catalog holds positions its maintainer does not endorse, on purpose.

A **technique** is what a fix *is*: retrieval, a checklist, an independent verifier, a gate on irreversible actions. Whether it works is never stated on the technique. It lives in claims that name the technique, and from those claims, from the human-reviewed ones only, the site derives a **standing**: nothing measured, argued but not measured, supported so far, narrowed, or contested. There is no effectiveness rating, because whether a technique helps is a function of the task, the model and the environment, not a property of the technique. Since this week, each efficacy claim also carries structured **conditions**: what the technique needs (an external signal, an executable environment, access to train the weights), which models it helps most, what it costs, and the stated condition under which it fails.

The recent addition is **adages**: laws and maxims from human systems, filed to test whether they transfer to models. Goodhart's law. Hashimoto's ratchet. "Two heads are better than one." Each has an origin, a stated mechanism for why it should or should not transfer, and verdicts against catalog claims: holds, breaks, or narrows. The interesting column is *breaks*. When "two heads are better than one" fails for models, and the evidence says it does when the heads share a context, you learn something specific about how models differ from people that no essay applying the proverb would tell you.

## The rules that make it a catalog rather than a blog

**Scope lives in the statement.** A claim without its conditions gets misapplied later, so the conditions are written into the sentence, and now also into fields an agent can filter on.

**Visible everywhere, authoritative nowhere.** Most of the catalog was drafted by a model from papers and has been read by a model, not by a person. Those entries are labelled "Reviewed by AI" and shown in every list, count and search, because an index is useful as soon as it exists and hiding half of it would be a lie by omission. What a person's review adds is weight: only human-reviewed claims decide a technique's standing, an adage's verdict, or the internal scorecard. Every entry says who has read it.

**No scores.** Nothing in the catalog is a number that summarises quality. Standings are categorical states of evidence. Counts are counts.

**Nothing invented.** Every paper source is checked against arXiv by title. Every post or vendor document is archived verbatim with a retrieval date, and re-fetched to detect drift. Every figure in a generated summary is checked against the source text, and figures that fail the check are listed on the entry rather than silently kept.

**Disagreement is the most useful contribution.** Every claim has a button that opens a pre-filled challenge: the finding does not hold, the scope is wrong, the sources do not say this. Both sides of every contested claim were assembled by one person, which is the catalog's weakest point, and the button exists to fix that.

## The ratchet

The name is the ambition, and the vocabulary is borrowed on purpose. Harness engineering, as it settled this year in Fowler and Böckeler's guides-and-sensors taxonomy, OpenAI's account of running Codex, and the six-layer playbook that synthesised them, describes an agent as a model plus a harness: the guides it reads before acting, the sensors that check its output after, the loop that plans, executes, verifies and fixes with bounded retries, the memory that survives the session, the permissions and budgets that bound it, and the observability that lets a person see why it did what it did. Hashimoto's rule sits on top: every failure becomes a permanent fix, encoded at the strongest layer that will hold it, never re-applied as a prompt.

That is a ratchet. It moves in one direction and does not slip back. The catalog is meant to be both the record of that ratchet and a part of its mechanism.

## How it works

The playbook's formula is *agent = model + harness*. This catalog adds a term: *improvement = failure + ratchet + evidence*. The failure is the input, the ratchet is the loop that turns it into structure, and the evidence is what tells the loop which structure, under which conditions. Here is what the catalog is, in the harness's own layers.

| Harness layer | What it is | What RSI Ratchet is at that layer |
|---|---|---|
| **Guides** (feedforward) | instructions read before acting, each line a past failure | the catalog itself: an index of known weaknesses and the conditions under which known fixes hold, read at the point of need rather than pasted into every context |
| **Sensors** (feedback) | checks after execution; computational ones are free and deterministic, inferential ones cost tokens and vary | the backtest against known reversals; figure grounding on every brief; title verification against arXiv; drift detection on archived posts; the paper classifier, an inferential sensor whose error rate is recorded |
| **Agentic loop** | plan, execute, verify, fix, bounded retries, escalate | the nightly pipeline, paced and resumable, whose drafts that fail a sensor escalate to a flag rather than being filed |
| **Memory** | state that survives the session | the catalog in git; the review queue and seen-ledger on their own branch; the decision log |
| **Permissions and budgets** | what the agent may do, enforced outside it | "reviewed by AI" is visible everywhere and authoritative nowhere; a spend cap on every paid stage; a branch rule that will not let a bot write to main |
| **Observability** | traces, cost, trip wires | a per-run log for every night; cost per paper on every script; a source whose archived text drifts is a trip wire |

The playbook's six-step loop is: the agent makes a mistake; identify the failure class, not the symptom; determine the strongest fix layer; encode the fix; verify it prevents recurrence; monitor for regression. The catalog enters at steps two and three, and the loop runs twice, once for each kind of user.

*Figure: two ratchet loops through one catalog (`docs/figures/ratchet-loops.svg.html`). A person and an agent both turn a failure into a classified gap, take techniques with their conditions out, and file the outcome back. The blue edge, from the catalog to the pipeline that builds it, is the one that would show self-improvement, and it is the edge not yet measured.*

**A person driving the ratchet.** A maintainer of an agent system sees a failure and asks the catalog what it is. Search by meaning finds the capability; the capability page lists what is known, what is contested, and which techniques address it with their standing and conditions. The person picks a fix, encodes it in their harness at the strongest layer that holds it, and runs their own sensors. What the catalog gets back is the outcome: a claim that the technique held or broke under those conditions, filed as an observation with the setup written down, or a challenge to a claim that turned out wrong. The person's review is also what gives weight: only claims a human has read decide a technique's standing.

**An agent driving the ratchet.** An agent's sensor fires. The agent classifies the failure and calls `advise` with the situation and what its environment has. Back come the techniques that address it, ranked categorically, each with the conditions it needs, what it costs, when it fails, and the counter-evidence. The agent encodes the fix, verifies it against a held-out set the promotion decision never reads, and files the result as a claim scoped to its model and task, reviewed by AI, where a person can promote it. The catalog's own pipeline is the first such agent: the nightly job is a harness around a model, and the open experiment is whether a technique taken from the catalog, applied to a stage of that pipeline, moves a held-out outcome.

Two disciplines keep the loop honest, and both are filed in the catalog as claims. The Self-Harness paper's loop reads its held-out split when deciding what to keep, so its reported gains are not clean; ours may not. Goodhart's law, with three supporting claims and no breaks, says any measure the loop optimises stops measuring; so the outcome is a held-out backtest, the prediction is written before the test, and every result that enters the catalog carries provenance. The ratchet can only move on evidence that would have counted before the result was known.

## How it is made

A nightly job fetches the week's papers that match a capability's terms, has a model classify each as improving, measuring, or off-topic for that capability, writes a digest of each survivor from its full text, and drafts a claim. The claim enters the catalog labelled "Reviewed by AI". The whole run costs a few dollars and is logged, stage by stage, in the repository.

A small open embedding model, run locally at build time, gives every entry a vector. That powers a search that ranks by meaning as well as by words, a "related claims" section on every claim, and the capability matching the pipeline uses. No API and no cost; the same model loads in the visitor's browser on first use.

The catalog is served to agents by a local MCP server with seven tools. The one that matters is `advise`: describe a situation, the failure you see and what your environment has, and it returns the techniques that address it, each with its standing, the conditions it needs, what it costs, when it fails, the counter-evidence, and the AI-reviewed evidence kept separate. Ranked categorically, usable first, then by state of evidence. Never scored.

A backtest checks the catalog against known reversals, findings that later work overturned. It currently catches two of four. The two it misses are the kind the pipeline is now built to catch, and the backtest exists to say whether that is true.

## Where it stands

| | |
|---|---|
| capabilities | 47, of which 22 proposed |
| claims | 168, of which 83 reviewed by AI only |
| sources | 156: 145 papers, 8 posts, 3 vendor documents |
| techniques | 27, of which 18 have nothing measured |
| adages | 25, of which 13 untested |
| contested claims | 5 |
| capabilities with no measured fix | 12 |

The numbers on the right are the point. Eighteen techniques with nothing measured is eighteen research briefs, each stating what evidence would settle it. Thirteen untested adages are thirteen more. The open-questions page exists to advertise them.

## What it cannot do

**One person's judgment.** Every human-reviewed entry was reviewed by the same person. Every contested claim had both sides assembled by him. The challenge button is the intended fix and has not yet been used by anyone else.

**Most of it is AI-reviewed.** Eighty-three of 168 claims have been read by a model and not by a person, and that is a normal permanent state, not a queue: there is more worth indexing than one person can read. The label is honest; the weight is withheld; but a reader should know which kind of entry they are looking at, and the site tells them.

**The pipeline makes errors of its own.** The summariser has produced figures that were not in the text it was given, because the text extractor drops appendices and the model filled the gap from memory. The sensor that catches this has had four false positives of its own. The fix for each is filed, which is the ratchet working, but a catalog that is partly machine-written inherits the machine's failure modes.

**Meaning search is only as good as a 23-megabyte model.** It maps plain descriptions of a failure to the right capability. It does not map idioms.

**Usefulness is unmeasured.** The catalog was built on the argument that a useful list is worth having before it is verified. Nobody has measured whether it is useful. The first outside reader who says what they looked for and whether they found it will be the first data point.

## What we are asking for

**Contest a claim.** Any claim, especially a contested one. The challenge button pre-fills the issue.

**Send papers and posts.** Anything that supports or, better, cuts against a filed claim. The intake is a link.

**Point an agent at it.** If you run agents that try to improve their own harness, the MCP server is a day's integration, and what your agent files back, scoped to its model and task, is the kind of evidence the literature does not have.

**Help build the job side.** Epoch's recent proposal for an O*NET of AI R&D is the task side of a join this catalog is the ability side of: which capabilities a task requires, and therefore what actually blocks automating it. Their ratings are subjective by their own account because that layer is missing. We would like to build it with them.

The sign on the wall in the repository reads: focus on the art of the possible; there is a way, unless there is not, in which case prove that rather than giving in. Every obstacle written down in the project's ambitions document carries an attack. The catalog is the place where the attacks get tested, and where the ones that fail get recorded so nobody has to run them twice.
