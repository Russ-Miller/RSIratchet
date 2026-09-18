import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { claimsFor, getCapabilities, getCapability, getSources, techniquesFor } from "@/lib/catalog";
import { candidateUrl, queueForCapability } from "@/lib/queue";
import { CapabilityChallengeLink } from "@/components/challenge";
import { ContestedBadge, KindBadge, StrengthBadge } from "@/components/badges";

export function generateStaticParams() {
  return getCapabilities().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/capabilities/[id]">) {
  const { id } = await params;
  return { title: getCapability(id)?.label ?? "Capability" };
}

export default async function CapabilityPage({ params }: PageProps<"/capabilities/[id]">) {
  const { id } = await params;
  const c = getCapability(id);
  if (!c) notFound();
  const claims = claimsFor(c.id);
  const techniques = techniquesFor(c.id);
  const inCatalog = new Set(getSources().map((s) => s.arxiv_id).filter((x): x is string => !!x));
  const waiting = queueForCapability(c.id, inCatalog);
  return (
    <article className="space-y-8">
      <Breadcrumbs trail={[
        { href: "/", label: "Home" },
        { href: "/capabilities", label: "Capabilities" },
        { label: "This capability" },
      ]} />
      <header className="space-y-2">
        <div className="text-sm text-neutral-500"><code className="font-mono">{c.id}</code> &middot; {c.status}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{c.label}</h1>
        {c.status === "proposed" && (
          <p className="rounded border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200">
            <strong className="font-medium">Proposed.</strong> Several papers in the review queue
            converged on this framing, so the pipeline added it. Nobody has decided it is the right
            way to carve up the subject &mdash; it may be two topics, or a duplicate of another, or
            not a topic at all. Claims fill in from those papers on the nightly run, marked as
            unreviewed like every other drafted claim. Saying so is useful, in either direction.
          </p>
        )}
        <p className="text-lg text-neutral-700 dark:text-neutral-300">{c.summary}</p>
        {c.aliases?.length ? <p className="text-sm text-neutral-500">Also called: {c.aliases.join(", ")}</p> : null}
        {c.tags?.length ? <p className="text-sm text-neutral-500">Tags: {c.tags.join(", ")}</p> : null}
      </header>
      <p className="text-sm text-neutral-700 dark:text-neutral-300 max-w-2xl">{c.description}</p>
      {c.discriminator && (
        <section className="max-w-2xl rounded border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/40">
          <h2 className="mb-1 font-semibold">What counts as this capability</h2>
          <p className="text-xs text-neutral-500 mb-1.5">
            Scope boundary used when deciding whether a paper is really about this capability,
            rather than merely mentioning it.
          </p>
          <p className="text-neutral-700 dark:text-neutral-300">{c.discriminator}</p>
        </section>
      )}
      <section>
        <h2 className="mb-2 font-semibold">Claims</h2>
        {claims.length === 0 ? <p className="text-sm text-neutral-500">No claims filed yet.</p> : (
          <ul className="space-y-3">
            {claims.map((claim) => (
              <li key={claim.id} className="rounded border border-neutral-200 dark:border-neutral-800 p-3">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <KindBadge kind={claim.kind} />
                  <StrengthBadge strength={claim.backing_strength} />
                  {claim.contested && <ContestedBadge />}
                </div>
                <Link href={`/claims/${claim.id}`} className="text-sm hover:underline">{claim.statement}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Techniques</h2>
        {techniques.length === 0 ? <p className="text-sm text-neutral-500">None yet.</p> : (
          <ul className="space-y-2">
            {techniques.map((t) => (
              <li key={t.id} className="text-sm">
                <Link href={`/techniques/${t.id}`} className="font-medium hover:underline">{t.label}</Link>
                <span className="ml-2 text-xs text-neutral-500">{t.kind}{t.status === "superseded" ? " · superseded" : ""}</span>
                <div className="text-neutral-600 dark:text-neutral-400">{t.summary}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {waiting.length > 0 && (
        <section>
          <h2 className="mb-1 font-semibold">In the review queue</h2>
          <p className="mb-2 text-xs text-neutral-500">
            Papers the pipeline matched to this capability that are not yet sources here. A verdict
            means the classifier judged the paper is about it and which way it points; no verdict
            means matched on vocabulary only. Both are what the next drafting pass works from.
          </p>
          <ul className="space-y-2 text-sm">
            {waiting.map(({ candidate: q, verdict: v }) => {
              const url = candidateUrl(q);
              return (
                <li key={q.arxiv_id ?? q.openalex_id}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">{q.title}</a>
                  ) : q.title}
                  <span className="ml-2 text-xs text-neutral-500">
                    {q.date ?? ""}
                    {v && <> &middot; {v.direction.replace("_", " ")}{v.confidence !== "high" ? ` (${v.confidence})` : ""}</>}
                  </span>
                  {v?.rationale && <p className="text-xs text-neutral-600 dark:text-neutral-400">{v.rationale}</p>}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-neutral-500">
            <Link href="/queue" className="hover:underline">Whole queue</Link>
          </p>
        </section>
      )}
      {c.related?.length ? (
        <section className="text-sm"><span className="font-semibold">Related: </span>
          {c.related.map((r, i) => <span key={r}>{i > 0 && ", "}<Link href={`/capabilities/${r}`} className="hover:underline">{getCapability(r)?.label ?? r}</Link></span>)}
        </section>
      ) : null}
      <section className="space-y-2 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <CapabilityChallengeLink capability={c} />
        <p className="text-xs text-neutral-500">
          Capabilities are a way of carving up the subject, and carvings are arguable. Say so if
          this one is wrong &mdash; especially a proposed one, which a pipeline added because
          several papers used the same framing, not because anyone decided it was right.
        </p>
      </section>
    </article>
  );
}
