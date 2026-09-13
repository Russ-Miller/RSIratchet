# RSI Ratchet: a catalog of what models cannot do yet, built to be proven wrong

*Russ Miller, September 2026. Draft.*

## The problem

Everyone building on language models carries a private list of what they are bad at. Arithmetic inside a chain of reasoning. Facts stated confidently that are not true. Losing the middle of a long input. Agreeing with whoever pushes back. Every week a paper adds to the list or takes something off it, and every week a technique is advocated that fixes one of these, usually without saying under what conditions, on which models, or at what cost.

None of this knowledge lives anywhere. It sits in papers nobody re-reads, in blog posts that go stale, in the heads of practitioners, and increasingly in the weights of the models themselves, which is the worst place for it, because a model asked what it is bad at will answer confidently and be out of date.

The people most in need of the list are not people. An agent that is trying to improve the system it runs in has a specific, answerable question at every failure: is this a known weakness, is there a known fix, and does the fix apply here? Today it has nowhere to look. It either has the answer in its weights, which is unreliable, or it is handed a guide file, which the evidence says does not raise task success and costs about twenty percent more inference.

This is a proposal, and a working prototype, for the missing thing: a catalog of model capabilities and weaknesses, the claims made about each, the evidence behind every claim, and the techniques that address them, with the conditions under which they do. It is at [rsiratchet.com](https://rsiratchet.com), the catalog is a folder of YAML files in a public repository, and any agent on a machine with the checkout can query it.

## What is in it

Four kinds of entry, and one more added recently.

A **capability** is a topic: "digit-level arithmetic", "stating false facts confidently", "fixing its own mistakes". It is not scored. It exists to hold claims.

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

The name is the ambition. A ratchet moves in one direction and does not slip back. The harness-engineering vocabulary that emerged this year, guides and sensors, trip wires and capability budgets, Hashimoto's rule that every failure becomes a permanent fix, describes what a ratchet for an agent system looks like: failures converted into structure, not re-applied as prompts.

The catalog is meant to be both the record of that ratchet and a part of its mechanism. An agent that fails should be able to classify the failure, look up whether it is a known weakness, find the techniques that address it, read the conditions and the counter-evidence, try one, measure, and file the result as a claim scoped to that model and that task. Over time the agent's own results should become more valuable than the literature that seeded them. Published research supplies the priors; the system learns operationally from its own failures.

Two of the catalog's own entries say where this goes wrong. The Self-Harness paper shows a fixed model raising its own pass rate by rewriting its scaffolding, with a regression gate keeping only edits that help; its promotion gate reads the held-out split, so the reported gain is not clean generalisation. Goodhart's law, filed with three supporting claims and no breaks, says what happens to any measure the loop optimises. So the discipline is: prediction before test, a held-out set the promotion decision never reads, and provenance on every result that enters the catalog. The ratchet can only move on evidence that would have counted before the result was known.

## How it is made

A nightly job fetches the week's papers that match a capability's terms, has a model classify each as improving, measuring, or off-topic for that capability, writes a digest of each survivor from its full text, and drafts a claim. The claim enters the catalog labelled "Reviewed by AI". The whole run costs a few dollars and is logged, stage by stage, in the repository.

A small open embedding model, run locally at build time, gives every entry a vector. That powers a search that ranks by meaning as well as by words, a "related claims" section on every claim, and the capability matching the pipeline uses. No API and no cost; the same model loads in the visitor's browser on first use.

The catalog is served to agents by a local MCP server with seven tools. The one that matters is `advise`: describe a situation, the failure you see and what your environment has, and it returns the techniques that address it, each with its standing, the conditions it needs, what it costs, when it fails, the counter-evidence, and the AI-reviewed evidence kept separate. Ranked categorically, usable first, then by state of evidence. Never scored.

A backtest checks the catalog against known reversals, findings that later work overturned. It currently catches two of four. The two it misses are the kind the pipeline is now built to catch, and the backtest exists to say whether that is true.

## Where it stands

| | |
|---|---|
| capabilities | 34 |
| claims | 167, of which 82 reviewed by AI only |
| sources | 155: 144 papers, 8 posts, 3 vendor documents |
| techniques | 27, of which 18 have nothing measured |
| adages | 25, of which 13 untested |
| contested claims | 5 |
| capabilities with no measured fix | 12 |

The numbers on the right are the point. Eighteen techniques with nothing measured is eighteen research briefs, each stating what evidence would settle it. Thirteen untested adages are thirteen more. The open-questions page exists to advertise them.

## What it cannot do

**One person's judgment.** Every human-reviewed entry was reviewed by the same person. Every contested claim had both sides assembled by him. The challenge button is the intended fix and has not yet been used by anyone else.

**Most of it is AI-reviewed.** Eighty-two of 167 claims have been read by a model and not by a person, and that is a normal permanent state, not a queue: there is more worth indexing than one person can read. The label is honest; the weight is withheld; but a reader should know which kind of entry they are looking at, and the site tells them.

**The pipeline makes errors of its own.** The summariser has produced figures that were not in the text it was given, because the text extractor drops appendices and the model filled the gap from memory. The sensor that catches this has had four false positives of its own. The fix for each is filed, which is the ratchet working, but a catalog that is partly machine-written inherits the machine's failure modes.

**Meaning search is only as good as a 23-megabyte model.** It maps plain descriptions of a failure to the right capability. It does not map idioms.

**Usefulness is unmeasured.** The catalog was built on the argument that a useful list is worth having before it is verified. Nobody has measured whether it is useful. The first outside reader who says what they looked for and whether they found it will be the first data point.

## What we are asking for

**Contest a claim.** Any claim, especially a contested one. The challenge button pre-fills the issue.

**Send papers and posts.** Anything that supports or, better, cuts against a filed claim. The intake is a link.

**Point an agent at it.** If you run agents that try to improve their own harness, the MCP server is a day's integration, and what your agent files back, scoped to its model and task, is the kind of evidence the literature does not have.

**Help build the job side.** Epoch's recent proposal for an O*NET of AI R&D is the task side of a join this catalog is the ability side of: which capabilities a task requires, and therefore what actually blocks automating it. Their ratings are subjective by their own account because that layer is missing. We would like to build it with them.

The sign on the wall in the repository reads: focus on the art of the possible; there is a way, unless there is not, in which case prove that rather than giving in. Every obstacle written down in the project's ambitions document carries an attack. The catalog is the place where the attacks get tested, and where the ones that fail get recorded so nobody has to run them twice.
