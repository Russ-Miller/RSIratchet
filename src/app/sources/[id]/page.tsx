import Link from "next/link";
import { RefTag } from "@/components/ref-tag";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { claimsCiting, getSource, getSources } from "@/lib/catalog";
import { CitationSignal, StanceBadge } from "@/components/badges";

export function generateStaticParams() {
  return getSources().map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/sources/[id]">) {
  const { id } = await params;
  return { title: getSource(id)?.title ?? "Source" };
}

export default async function SourcePage({ params }: PageProps<"/sources/[id]">) {
  const { id } = await params;
  const s = getSource(id);
  if (!s) notFound();
  const citing = claimsCiting(s.id);
  return (
    <article className="space-y-6 max-w-2xl">
      <Breadcrumbs trail={[
        { href: "/", label: "Home" },
        { href: "/sources", label: "Sources" },
        { label: "This source" },
      ]} />
      <header className="space-y-2">
        <div className="text-sm text-neutral-500"><code className="font-mono">{s.id}</code> <RefTag refId={s.ref} title={s.title} /> &middot; {s.kind}</div>
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        {s.authors?.length ? <p className="text-sm text-neutral-600 dark:text-neutral-400">{s.authors.join(", ")}{s.venue ? ` — ${s.venue}` : ""}</p> : null}
        <p className="text-sm text-neutral-500">
          Created: {s.date ?? s.year ?? "unknown"} &middot; Ingested: {s.ingested_at}
        </p>
        {s.citations_checked_at && (
          <p className="flex items-center gap-2 text-sm text-neutral-500">
            <CitationSignal source={s} />
            <span>
              {(s.citations_recent_12mo ?? 0) >= 1000 ? "1000+" : (s.citations_recent_12mo ?? 0)} citations in the last 12 months
              {" · "}
              {s.citations_total ?? 0} total
              {" · checked "}{s.citations_checked_at}
            </span>
          </p>
        )}
        {/* Leaving the site, so a new tab: the reader is mid-way through a
            source page and losing it to a PDF is a poor trade. */}
        {s.url && (
          <a href={s.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-baseline gap-1 text-sm hover:underline">
            {s.url}<span aria-hidden className="text-xs text-neutral-500">&#8599;</span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </header>
      {/* The hand-written gloss reads as the lede: one or two sentences saying
          what the paper is for. It sat below the generated brief, unlabelled,
          which made it look like an afterthought rather than the summary it is. */}
      {s.summary && (
        <p className="text-base leading-relaxed text-neutral-800 dark:text-neutral-200">{s.summary}</p>
      )}
      {s.brief && (
        <section className="space-y-3">
          <h2 className="font-semibold">In brief</h2>
          {s.brief_unverified_figures?.length ? (
            <p className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Unverified figures: {s.brief_unverified_figures.join(", ")}. These do not appear in the
              abstract this was written from, so read the paper before quoting them.
            </p>
          ) : null}
          <div className="space-y-3 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
            {s.brief.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <p className="text-xs text-neutral-500">
            Written from the abstract by {s.brief_model ?? "a model"}
            {s.brief_generated_at ? ` on ${s.brief_generated_at}` : ""}, with every figure checked
            against it. Not a substitute for the paper.
          </p>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-1">Referenced by</h2>
        <p className="mb-2 text-xs text-neutral-500">Claims in this catalog that draw on this source, and whether as support or counterpoint.</p>
        {citing.length === 0 ? <p className="text-sm text-neutral-500">No claims cite this yet.</p> : (
          <ul className="space-y-2">
            {citing.map(({ claim, stance }) => (
              <li key={claim.id} className="text-sm flex items-start gap-2">
                <StanceBadge stance={stance} />
                <Link href={`/claims/${claim.id}`} className="hover:underline">{claim.statement}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
