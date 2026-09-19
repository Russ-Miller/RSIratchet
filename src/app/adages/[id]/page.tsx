import Link from "next/link";
import { RefTag } from "@/components/ref-tag";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { ADAGE_STANDING_LABEL, adageStanding, getAdage, getAdages, getCapability, getClaim, getSource, type AdageVerdict } from "@/lib/catalog";
import { ContestedBadge, ReviewBadge } from "@/components/badges";
import { AdageChallengeLink } from "@/components/challenge";

export function generateStaticParams() {
  return getAdages().map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: PageProps<"/adages/[id]">) {
  const { id } = await params;
  return { title: getAdage(id)?.label ?? "Adage" };
}

const VERDICT: Record<AdageVerdict, { heading: string; lede: string }> = {
  breaks: { heading: "Where it breaks", lede: "Claims showing the adage failing for models." },
  narrows: { heading: "Where it holds only under a condition", lede: "Claims that keep the adage but bound it." },
  holds: { heading: "Where it holds", lede: "Claims showing the adage applying to models." },
};

export default async function AdagePage({ params }: PageProps<"/adages/[id]">) {
  const { id } = await params;
  const a = getAdage(id);
  if (!a) notFound();
  const standing = adageStanding(a);
  const ev = a.evidence ?? [];
  // Breaks first: they carry the information.
  const order: AdageVerdict[] = ["breaks", "narrows", "holds"];

  return (
    <article className="space-y-6">
      <Breadcrumbs trail={[
        { href: "/", label: "Home" },
        { href: "/adages", label: "Adages" },
        { label: "This adage" },
      ]} />
      <header className="space-y-2">
        <div className="text-sm text-neutral-500"><code className="font-mono">{a.id}</code> <RefTag refId={a.ref} />{a.status === "retired" ? " · retired" : ""}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{a.label}</h1>
        <p className="text-lg text-neutral-700 dark:text-neutral-300">&ldquo;{a.statement}&rdquo;</p>
        {a.aliases?.length ? <p className="text-sm text-neutral-500">Also: {a.aliases.join(" · ")}</p> : null}
      </header>

      <section className="text-sm">
        <h2 className="mb-1 font-semibold">Origin</h2>
        <p className="text-neutral-700 dark:text-neutral-300">{a.origin}</p>
        {a.sources?.length ? (
          <p className="mt-1 text-xs text-neutral-500">
            Stated in: {a.sources.map((id, i) => (
              <span key={id}>{i > 0 && " · "}<Link href={`/sources/${id}`} className="hover:underline">{getSource(id)?.title ?? id}</Link></span>
            ))}
          </p>
        ) : null}
      </section>

      <section className="text-sm">
        <h2 className="mb-1 font-semibold">Why it should, or should not, apply to models</h2>
        <p className="text-neutral-700 dark:text-neutral-300">{a.transfer}</p>
      </section>

      <section className="text-sm">
        <h2 className="mb-1 font-semibold">Standing: {ADAGE_STANDING_LABEL[standing]}</h2>
        <p className="text-xs text-neutral-500">
          Standing counts claims a person has reviewed. Claims reviewed by AI alone are listed and marked, and do not move it.
        </p>
      </section>

      {ev.length === 0 && (
        <section className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">No evidence filed either way.</p>
          {a.evidence_search ? (
            <p className="mt-1">
              Searched {a.evidence_search.searched_on}: {a.evidence_search.note}
              {a.evidence_search.nearest_miss?.length ? <> Nearest misses: {a.evidence_search.nearest_miss.join("; ")}.</> : null}
            </p>
          ) : (
            <p className="mt-1">Nobody has looked yet. A measured case in either direction would be the first.</p>
          )}
        </section>
      )}

      {order.map((v) => {
        const items = ev.filter((e) => e.verdict === v);
        if (!items.length) return null;
        return (
          <section key={v}>
            <h2 className="font-semibold">{VERDICT[v].heading}</h2>
            <p className="mb-2 text-xs text-neutral-500">{VERDICT[v].lede}</p>
            <ul className="space-y-3 text-sm">
              {items.map((e) => {
                const c = getClaim(e.claim);
                if (!c) return null;
                const cap = getCapability(c.capability);
                return (
                  <li key={e.claim}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/claims/${c.id}`} className="hover:underline">{c.statement}</Link>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                      <span>{cap?.label ?? c.capability}</span>
                      {c.contested && <ContestedBadge />}
                      <ReviewBadge claim={c} />
                    </div>
                    <p className="mt-1 text-neutral-600 dark:text-neutral-400">{e.note}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <AdageChallengeLink adage={a} />
        <p className="mt-2 max-w-2xl text-xs text-neutral-500">
          A break is worth more than a hold. If you have seen this fail for a model, with the setup
          written down, that is the most useful thing you can add here.
        </p>
      </div>

      {a.notes && (
        <section className="text-sm">
          <h2 className="mb-1 font-semibold">Notes</h2>
          <p className="text-neutral-700 dark:text-neutral-300">{a.notes}</p>
        </section>
      )}
    </article>
  );
}
