import Link from "next/link";
import { RefTag } from "@/components/ref-tag";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { EFFECT_LABEL, NEED_LABEL, adagesForClaim, cardsNamedIn, claimActivity, getCapability, getClaim, getClaims, getModel, getSource, getTagLabel, isPending, isQuietSource, displayName, reviewLabel, reviewers } from "@/lib/catalog";
import type { SourceLink } from "@/lib/catalog";
import { ContestedBadge, EvidenceSignal, KindBadge, ReviewBadge, StanceBadge, StrengthBadge } from "@/components/badges";
import { ChallengeLink } from "@/components/challenge";
import { relatedClaims } from "@/lib/embeddings";

function SourceItem({ link }: { link: SourceLink }) {
  const src = getSource(link.source);
  return (
    <li className="text-sm">
      <div className="flex flex-wrap items-center gap-2 mb-0.5">
        <StanceBadge stance={link.stance} />
        {src ? (
          <a href={src.url ?? `#${src.id}`} target="_blank" rel="noopener noreferrer"
            className="font-medium hover:underline">{src.title}</a>
        ) : link.source}
      </div>
      <div className="text-neutral-600 dark:text-neutral-400 ml-1">{link.note}</div>
    </li>
  );
}

export function generateStaticParams() {
  return getClaims().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/claims/[id]">) {
  const { id } = await params;
  const c = getClaim(id);
  return { title: c ? c.statement.slice(0, 60) : "Claim" };
}

export default async function ClaimPage({ params }: PageProps<"/claims/[id]">) {
  const { id } = await params;
  const c = getClaim(id);
  if (!c) notFound();
  const cap = getCapability(c.capability);
  const modelObj = c.observed_on?.model ? getModel(c.observed_on.model) : undefined;
  return (
    <article className="space-y-6 max-w-2xl">
      <Breadcrumbs trail={[
        { href: "/", label: "Home" },
        { href: "/claims", label: "Claims" },
        { href: `/capabilities/${c.capability}`, label: cap?.label ?? c.capability },
        { label: "This claim" },
      ]} />
      <header className="space-y-2">
        <div className="text-sm text-neutral-500"><code className="font-mono">{c.id}</code> <RefTag refId={c.ref} /></div>
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={c.kind} />
          <StrengthBadge strength={c.backing_strength} />
          {c.contested && <ContestedBadge />}
          <ReviewBadge claim={c} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{c.statement}</h1>
        {(() => {
          const ad = adagesForClaim(c.id);
          if (!ad.length) return null;
          return (
            <p className="text-sm text-neutral-500">
              Evidence for: {ad.map(({ adage, verdict }, i) => (
                <span key={adage.id}>{i > 0 && ", "}
                  <Link href={`/adages/${adage.id}`} className="text-neutral-700 hover:underline dark:text-neutral-300">{adage.label}</Link>
                  {" "}({verdict})
                </span>
              ))}
            </p>
          );
        })()}
        <p className="text-sm text-neutral-500">
          Capability: <Link href={`/capabilities/${c.capability}`} className="hover:underline">{cap?.label ?? c.capability}</Link>
          {c.tags?.length ? <> &middot; {c.tags.map(getTagLabel).join(", ")}</> : null}
        </p>
      </header>

      {c.observed_on && (c.observed_on.model || c.observed_on.era || c.observed_on.task_type) && (
        <section className="text-sm">
          <h2 className="font-semibold mb-1">Observed on</h2>
          <p className="text-neutral-700 dark:text-neutral-300">
            {modelObj && (modelObj.url
              ? <><a href={modelObj.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{modelObj.label}</a>. </>
              : <>{modelObj.label}. </>)}
            {c.observed_on.era && <>{c.observed_on.era}. </>}
            {c.observed_on.task_type && <>{getTagLabel(c.observed_on.task_type)}.</>}
          </p>
          {(() => {
            const cards = cardsNamedIn(c.observed_on.era);
            if (!cards.length) return null;
            return (
              <p className="mt-1 text-xs text-neutral-500">
                Model cards:{" "}
                {cards.map((v, i) => (
                  <span key={v.id}>{i > 0 && " · "}<a href={v.card} target="_blank" rel="noopener noreferrer" className="hover:underline">{v.label}</a></span>
                ))}
              </p>
            );
          })()}
        </section>
      )}

      {c.conditions && (
        <section className="text-sm">
          <h2 className="font-semibold mb-1">Applies when</h2>
          {/* The same scope the statement carries in prose, in fields an agent
              can filter on. Nothing here goes beyond what the claim says. */}
          <dl className="space-y-1 text-neutral-700 dark:text-neutral-300">
            <div><dt className="inline text-neutral-500">Effect on the capability: </dt><dd className="inline">{EFFECT_LABEL[c.conditions.effect]}</dd></div>
            {c.conditions.needs?.length ? <div><dt className="inline text-neutral-500">Needs: </dt><dd className="inline">{c.conditions.needs.map((n) => NEED_LABEL[n]).join("; ")}</dd></div> : null}
            {c.conditions.helps_most && <div><dt className="inline text-neutral-500">Helps most: </dt><dd className="inline">{c.conditions.helps_most.replace("-", " ")}</dd></div>}
            {c.conditions.cost && <div><dt className="inline text-neutral-500">Cost: </dt><dd className="inline">{c.conditions.cost}</dd></div>}
            <div><dt className="inline text-neutral-500">Fails when: </dt><dd className="inline">{c.conditions.fails_when}</dd></div>
          </dl>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Sources</h2>
        {(() => {
          const active = c.sources.filter((s) => { const src = getSource(s.source); return !src || !isQuietSource(src); });
          const quiet = c.sources.filter((s) => { const src = getSource(s.source); return src && isQuietSource(src); });
          return (
            <>
              <ul className="space-y-3">{active.map((s) => <SourceItem key={s.source} link={s} />)}</ul>
              {quiet.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300">
                    +{quiet.length} older, quieter source{quiet.length > 1 ? "s" : ""} (no citations in the last 12 months)
                  </summary>
                  <ul className="mt-3 space-y-3">{quiet.map((s) => <SourceItem key={s.source} link={s} />)}</ul>
                </details>
              )}
            </>
          );
        })()}
      </section>

      {c.contested && c.disagreement_axis && (
        <section className="rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
          <h2 className="font-semibold mb-1">Suspected axis of disagreement{c.disagreement_axis.is_guess && <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-400">(a guess, not verified)</span>}</h2>
          <p className="text-neutral-700 dark:text-neutral-300">{c.disagreement_axis.description}</p>
        </section>
      )}

      <section className="text-sm text-neutral-500 flex flex-wrap items-center gap-x-6 gap-y-1">
        <span>{reviewLabel(c)}{reviewers(c).agents.length ? ` (${reviewers(c).agents.map(displayName).join(", ")})` : ""}</span>
        {c.status !== "active" && c.status !== "pending-review" && <span>Status: {c.status}</span>}
        <span>Last checked: {c.last_checked_at}</span>
        {(() => {
          const a = claimActivity(c);
          // Say so rather than rendering nothing: a blank here would read as
          // "no activity" when it means "not looked up yet".
          return a ? <EvidenceSignal activity={a} /> : <span>Evidence activity: not checked yet</span>;
        })()}
        {c.last_new_evidence_at && <span>New evidence: {c.last_new_evidence_at}</span>}
        {c.superseded_by && <span>Superseded by <Link href={`/claims/${c.superseded_by}`} className="hover:underline">{c.superseded_by}</Link></span>}
      </section>

      {/* Refutation is the contribution this catalog most wants and least has:
          everyone publishes what worked. Making it one click is the cheapest
          thing that could change that. */}
      <section className="space-y-2 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <ChallengeLink claim={c} />
        <p className="text-xs text-neutral-500">
          Disagreeing is the most useful thing you can do here. Both sides of every contested
          claim in this catalog were assembled by the same person, which is its weakest point.
        </p>
      </section>

      {(() => {
        const rel = relatedClaims("m", c.id);
        if (!rel.length) return null;
        return (
          <section>
            <h2 className="font-semibold mb-2">Related claims</h2>
            {/* Nearest by meaning, computed at build time from the statement
                and notes. Similarity picks the order; it is not shown, because
                a number here would read as a verdict. */}
            <ul className="space-y-2 text-sm">
              {rel.map(({ claim: r }) => {
                const rc = getCapability(r.capability);
                return (
                  <li key={r.id}>
                    <Link href={`/claims/${r.id}`} className="hover:underline">{r.statement}</Link>
                    <span className="ml-2 text-xs text-neutral-500">
                      {rc?.label ?? r.capability}
                      {r.contested && <> &middot; contested</>}
                      {isPending(r) && <> &middot; reviewed by AI</>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })()}

      {c.notes && (
        <section className="text-sm">
          <h2 className="font-semibold mb-1">Notes</h2>
          <p className="text-neutral-700 dark:text-neutral-300">{c.notes}</p>
        </section>
      )}
    </article>
  );
}
