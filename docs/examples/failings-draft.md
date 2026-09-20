# Failings: a parked list and a design sketch (2026-09-20)

Status: parked. Not in the catalog, no schema. Russ supplied the list below
and asked that it be kept with a note on how it would fit, for later.

## Why a separate kind

The catalog is organized by capability, but the thing papers are titled
after and readers search for is the failing: hallucination, sycophancy,
lost in the middle. A failing is not one capability's negative; sycophancy
cuts across critique, abstention, persuasion and multi-model coordination.
It is the CWE beside ATT&CK: the tactic is what a system is trying to do,
the weakness is the recurring way it gives way.

Nine current "capabilities" are failings filed under the only heading we
had: hallucination, sycophancy, reversal-curse, judge-position-bias,
long-context-degradation, prompt-injection, strategic-deception,
multilingual-disparity, goal-conflict-safety. When the kind exists they
move over (redirects, refs kept) and keep their claims.

## Sketch of the kind

`catalog/failings/<id>.yaml`: id, ref (FLG-nnnn), label, aliases the
literature uses, statement (the failing in one sentence, scope written
in), `location: model | training | input | deployment`, `cuts_across:
[capability ids]`, `evidence: [{claim, verdict: exhibits | absent |
mitigated}]`, sources. Techniques may `address` a failing as well as a
capability. A failing's page leads with the breaks: claims where a
supposed fix did not remove it. Claims and capabilities get a
`failure_modes` tag as the join, so existing claims attach without
rewriting. The matrix mockup becomes failings x capabilities, cells are
claims, empty cells are gaps.

## The list (as supplied, with annotations)

Location tags and notes are mine; wording of each entry is Russ's.

### In the model
- **Hallucination**: fluent but unsupported content, "mathematically
  driven by lossy compression and the need to guess on unseen data".
  Note: this is the Kalai et al. 2025 framing; file as a mechanism claim
  with its own contest, since it predicts irreducibility only under
  specific evaluation incentives. Existing capability `hallucination`.
- **Overconfidence**: certainty on wrong answers, "heavily worsened by
  human-feedback alignment". Note: Tian et al. 2023 (filed) found this for
  raw log-probs; verbalized confidence recovers much of it. Soften.
- **Chain-of-thought unfaithfulness**: post-hoc rationalization rather
  than the computation used. Existing capability `explanation-faithfulness`.
- **Tokenization artifacts**: arithmetic and reasoning failures from
  subword splits and invisible characters. New.
- **Reversal curse**: trained on "A is B", cannot deduce "B is A". Note:
  "fundamental inability" is stronger than the evidence; robust for direct
  recall, partly mitigated by augmentation and in-context reasoning.
  Existing capability `reversal-curse`.
- **Knowledge-editing ripple effects**: single edits corrupt or fail to
  reach related facts. Two claims filed 2026-09-19 under knowledge-updating.

### In training
- **Sycophancy**: abandoning accuracy to agree with the user. Existing
  capability `sycophancy`.
- **Reward hacking and alignment faking**: exploiting the objective,
  including complying only while monitored. Existing `strategic-deception`.
- **Benchmark contamination**: test data in the training corpus. Note: a
  measurement failure, belongs beside `evaluation-validity`; the
  memorization-in-program-repair claim (2604.21579) is an instance.
- **Model collapse**: recursive training on synthetic output degrades
  diversity. Note: an ecosystem failing; related to fine-tuning-retention's
  absorbed output-diversity facet.

### In the input
- **Lost in the middle**: accuracy drops when the relevant span is mid-prompt.
  Existing `long-context-degradation`.
- **Context poisoning**: hidden commands injected into a shared context via
  tools or apps. Existing `prompt-injection`; also `context-hygiene`.
- **Attention hijacking**: adversarial suffixes that pull attention off
  guardrails. Mechanism-level; would attach to `jailbreak-robustness`.

### In deployment
- **Floating-point non-determinism**: identical prompts differ at zero
  temperature. Note: real, but the cause is batch-size-dependent kernel
  selection more than rounding, and batch-invariant kernels fix it
  (published 2025). State it that way.
- **Quantization-conditioned backdoors**: behaviour that activates only
  after the user quantizes an open model. New.
- **Cross-modal hallucination**: non-existent objects, or one modality
  overriding contradicting evidence in another. Attaches to
  `visual-grounding`, `audio-understanding`.
- **Visual confused-deputy attacks**: manipulated pixels make an agent take
  a harmful action it reads as benign. Attaches to `tool-use`,
  `prompt-injection`.

## When to act

When the user asks for failings, the matrix, or "where does sycophancy
show up", or when a third reader-submitted contest lands on a claim whose
real subject is a failing rather than a capability.
