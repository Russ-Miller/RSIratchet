import Link from "next/link";
import { ListSearch } from "@/components/list-search";
import { vecAttr } from "@/lib/embeddings";
import { RATCHET_ROLE_HINT, claimsCiting, getSources, ratchetTechniques } from "@/lib/catalog";

export const metadata = {
  title: "The ratchet",
  description: "Sources on systems that improve their own scaffolding, and what held.",
};

// Named after the site: a ratchet is a fix that cannot slip back. These are the
// sources about systems that try to build one — a loop that reads its own
// failures and changes the harness it runs inside. Membership is the `ratchet`
// tag on a source, so adding a paper to this page is a catalog edit, not a code
// change.
export default function RatchetPage() {
  const sources = getSources()
    .filter((s) => (s.tags ?? []).includes("ratchet"))
    .map((s) => ({ s, claims: claimsCiting(s.id) }))
    .sort((a, b) => (b.s.date ?? "").localeCompare(a.s.date ?? "") || a.s.title.localeCompare(b.s.title));
  const papers = sources.filter(({ s }) => s.kind === "paper");
  const rest = sources.filter(({ s }) => s.kind !== "paper");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">The ratchet</h1>
        <p className="max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
          The site is named for a claim: a fix placed in structure applies on every later run, while a
          fix given in conversation dies with the session. These are the sources about systems that try
          to build that ratchet — a loop that reads its own failures and rewrites the harness it runs
          inside — together with the claims drawn from each. It is the catalog looking at its own
          subject: a system like this could read these claims, apply them, and file what broke.
        </p>
        <p className="max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
          Four tests separate a ratchet from a fitted harness, and they are what to read each paper
          against: freeze the harness before evaluation; forbid the improver from editing its own tests
          or notes; require that failed paths stay observable; promote only changes that survive a new
          session or a disjoint task set. The recurring finding across these sources is that the
          acceptance gate, not the improvement engine, is what makes a loop ratchet rather than drift.
        </p>
      </div>

      <WhyFailures />
      <Techniques />

      <ListSearch noun="sources" />

      <Section title="Papers" rows={papers} />
      <Section title="Practice and commentary" rows={rest} />
    </div>
  );
}

// Techniques flagged for the role they play in a loop. Everything unflagged is
// object-level: it improves the work rather than the loop that improves the work.
function Techniques() {
  const roles = (["gate", "loop", "persistence"] as const).map((role) => ({
    role, items: ratchetTechniques().filter((t) => t.ratchet_role === role).sort((a, b) => a.label.localeCompare(b.label)),
  })).filter((r) => r.items.length);
  if (!roles.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Techniques that serve the loop</h2>
      <p className="max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
        Of {ratchetTechniques().length} flagged techniques, these are grouped by the job they do for a
        loop. The rest of the catalog is object-level: it improves the work, not the loop that improves
        the work. A fix at the object level pays once; a better gate reduces error that would otherwise
        accumulate over every later round, which is why the gate keeps coming out load-bearing above.
      </p>
      {roles.map(({ role, items }) => (
        <div key={role} className="space-y-1">
          <h3 className="text-sm font-semibold capitalize">{role} <span className="font-normal text-neutral-500">{items.length}</span></h3>
          <p className="max-w-3xl text-xs text-neutral-500">{RATCHET_ROLE_HINT[role]}</p>
          <ul className="flex flex-wrap gap-2 pt-1">
            {items.map((t) => (
              <li key={t.id}>
                <Link href={`/techniques/${t.id}`} title={t.summary}
                  className="inline-block rounded border border-neutral-300 px-2 py-1 text-xs hover:border-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:bg-neutral-800">
                  {t.label}{t.status === "proposed" ? " ·" : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Section({ title, rows }: { title: string; rows: { s: ReturnType<typeof getSources>[number]; claims: ReturnType<typeof claimsCiting> }[] }) {
  if (!rows.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title} <span className="text-sm font-normal text-neutral-500">{rows.length}</span></h2>
      <ul className="space-y-3">
        {rows.map(({ s, claims }) => (
          <li key={s.id} data-vec={vecAttr("s", s.id)}
            data-search={`${s.ref} ${s.title} ${(s.authors ?? []).join(" ")} ${s.kind} ${s.arxiv_id ?? ""} ${s.year ?? ""} ${claims.map((c) => c.claim.statement).join(" ")}`.toLowerCase()}
            className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <Link href={`/sources/${s.id}`} className="font-medium hover:underline">{s.title}</Link>
              <span className="text-xs text-neutral-500">{s.date ?? s.year} · {s.kind}</span>
            </div>
            {claims.length === 0 ? (
              <p className="mt-1 text-sm text-neutral-500">No claim drawn from it yet.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {claims.map(({ claim, stance }) => (
                  <li key={claim.id} className="text-sm text-neutral-600 dark:text-neutral-400">
                    <Link href={`/claims/${claim.id}`} className="hover:underline">{claim.statement}</Link>
                    {stance === "contests" && <span className="ml-1 text-xs text-amber-700 dark:text-amber-300">(contests)</span>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// The case for the site's failure-first design, from claims filed in the
// catalog rather than asserted here. Every figure links to the claim that
// carries it, and each claim to the paper it came from.
function WhyFailures() {
  const link = "underline decoration-neutral-400 underline-offset-2 hover:decoration-neutral-700 dark:hover:decoration-neutral-300";
  return (
    <section className="max-w-3xl space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Why it files what failed</h2>
      <p>
        The published record is tilted toward what worked. In psychology, 96% of standard papers
        reported a positive first result against 44% of Registered Reports, which journals accept
        before the results are known; across all disciplines the share of papers reporting support
        for their hypothesis rose from 70% in 1990 to 86% by 2007 (
        <Link href="/claims/the-published-literature-overreports-positive-results" className={link}>the claim and its two sources</Link>).
        Machine learning has its own version: beating a benchmark is the publishable result, so
        methods that did not work go unreported and the same dead ends get paid for again (
        <Link href="/claims/machine-learning-research-leaves-negative-results-unpublished" className={link}>Karl et al., 2024</Link>
        ). In their words, registering what does not work is no less important than registering
        what works.
      </p>
      <p>
        Language models make this costlier. They are trained on the tilted record, so a model asked
        what works is a reader of a biased sample, and models are now asked exactly that (
        <Link href="/claims/language-models-inherit-the-positive-bias-of-the-literature" className={link}>Lee, 2026</Link>
        ). An agent trying to improve itself needs the boundary conditions most: when a technique
        stops helping, and what the evidence against it says.
      </p>
      <p>
        So the catalog is built around the missing half. Every efficacy claim states the condition
        under which it fails; a claim with evidence on both sides is filed as contested, not
        averaged; adages are tested for where they break; and a technique with nothing measured is
        listed as a research brief, not omitted. The catalog is honest about its own limit: its
        sources are mostly published papers, so it inherits the same tilt. The counterweights are
        failures filed from use — a person&rsquo;s own observations, and later, failures reported
        back by agents.
      </p>
      <p className="text-neutral-500">
        What exists today is the bank: the shared record of what works, what breaks, and under
        which conditions. The ratchet is the loop that would read it when something fails and file
        back what it learns. That loop is the open experiment, and the sources below are about
        systems that try to build one.
      </p>
    </section>
  );
}
