import Link from "next/link";
import { ListSearch } from "@/components/list-search";
import { vecAttr } from "@/lib/embeddings";
import { claimsCiting, getSources } from "@/lib/catalog";

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

      <ListSearch noun="sources" />

      <Section title="Papers" rows={papers} />
      <Section title="Practice and commentary" rows={rest} />
    </div>
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
