import Link from "next/link";
import { EvidenceForm } from "@/components/evidence-form";
import { RefTag } from "@/components/ref-tag";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { EFFECT_LABEL, NEED_LABEL, RATCHET_ROLE_HINT, techniqueConditions, claimsAboutTechnique, getSource, getTagLabel, getTechnique, getTechniques, getCapability, techniqueStanding, STANDING_LABEL } from "@/lib/catalog";
import { ContestedBadge, KindBadge, StrengthBadge } from "@/components/badges";

export function generateStaticParams() {
  return getTechniques().map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/techniques/[id]">) {
  const { id } = await params;
  return { title: getTechnique(id)?.label ?? "Technique" };
}

export default async function TechniquePage({ params }: PageProps<"/techniques/[id]">) {
  const { id } = await params;
  const t = getTechnique(id);
  if (!t) notFound();
  return (
    <article className="space-y-6">
      <Breadcrumbs trail={[
        { href: "/", label: "Home" },
        { href: "/techniques", label: "Techniques" },
        { label: "This technique" },
      ]} />
      <header className="space-y-2">
        <div className="text-sm text-neutral-500">{t.kind} · <code className="font-mono">{t.id}</code> <RefTag refId={t.ref} title={t.label} />{t.status === "superseded" ? " · superseded" : t.status === "proposed" ? " · proposed" : ""}
          {t.ratchet_role && <> · <Link href="/ratchet" title={RATCHET_ROLE_HINT[t.ratchet_role]} className="underline decoration-dotted">ratchet: {t.ratchet_role}</Link></>}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{t.label}</h1>
        <p className="text-lg text-neutral-700 dark:text-neutral-300">{t.summary}</p>
        {t.status === "proposed" && (
          <p className="rounded border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200">
            <strong className="font-medium">Proposed.</strong> Filed by the drafting stage because a
            paper introduces or tests it. Nobody has vouched for it. The claim drafted from that paper
            is its first evidence, and what the paper used to validate it is in that claim&rsquo;s
            source note. Say whether it held up for you, below.
          </p>
        )}
      </header>
      <p className="text-sm text-neutral-700 dark:text-neutral-300">{t.description}</p>
      {t.requires && <p className="text-sm"><span className="font-semibold">Requires: </span>{t.requires}</p>}
      <section className="text-sm"><span className="font-semibold">Addresses: </span>
        {t.addresses.map((a, i) => <span key={a}>{i > 0 && ", "}<Link href={`/capabilities/${a}`} className="hover:underline">{getCapability(a)?.label ?? a}</Link></span>)}
      </section>
      {t.contexts?.length ? <p className="text-sm text-neutral-500">Contexts: {t.contexts.map(getTagLabel).join(", ")}</p> : null}
      <section>
        <h2 className="mb-1 font-semibold">Does it work?</h2>
        {(() => {
          const st = techniqueStanding(t.id);
          const tone: Record<string, string> = {
            unmeasured: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
            argued: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
            supported: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
            narrowed: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
            contested: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
          };
          return (
            <p className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${tone[st.standing]}`}>
                {STANDING_LABEL[st.standing]}
              </span>
              <span className="text-neutral-500">
                {st.supporting} supporting &middot; {st.contesting} contesting source
                {st.supporting + st.contesting === 1 ? "" : "s"}
                {st.lastMoved ? ` · last moved ${st.lastMoved}` : ""}
              </span>
            </p>
          );
        })()}
        <p className="mb-2 text-xs text-neutral-500">
          Efficacy claims &mdash; what this technique actually moves, under which conditions, and
          whether that has been contested.
        </p>
        {(() => {
          const k = techniqueConditions(t.id);
          if (!k.effects.length && !k.unreviewed.length) return null;
          return (
            <div className="mb-3 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
              {k.needs.length > 0 && <p><span className="text-neutral-500">Needs: </span>{k.needs.map((n) => NEED_LABEL[n]).join("; ")}</p>}
              {k.costs.length > 0 && <p><span className="text-neutral-500">Cost: </span>{k.costs.join(" to ")}</p>}
              {k.helps_most.length > 0 && <p><span className="text-neutral-500">Helps most: </span>{k.helps_most.map((h) => h.replace("-", " ")).join(", ")}</p>}
              {k.effects.length > 0 && (
                <div>
                  <p className="text-neutral-500">Fails when:</p>
                  <ul className="ml-4 list-disc space-y-0.5">
                    {k.effects.map((e) => <li key={e.claim.id}>{e.fails_when} <span className="text-xs text-neutral-500">({EFFECT_LABEL[e.effect]})</span></li>)}
                  </ul>
                </div>
              )}
              {k.unreviewed.length > 0 && (
                <p className="text-xs text-neutral-500">
                  {k.unreviewed.length} more condition{k.unreviewed.length === 1 ? "" : "s"} from claims reviewed by AI, listed with the claims below.
                </p>
              )}
            </div>
          );
        })()}

        {(() => {
          const efficacy = claimsAboutTechnique(t.id);
          return efficacy.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-500">
                No efficacy claim filed yet. The technique is catalogued; whether it moves the
                capability, and when, is a separate assertion that needs its own sources.
              </p>
              {t.evidence_search ? (
                <div className="space-y-2 border-l-2 border-neutral-300 pl-3 dark:border-neutral-700">
                  <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Searched, still open
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{t.evidence_search.note}</p>
                  {t.evidence_search.nearest_miss?.map((m, i) => {
                    const ms = m.source ? getSource(m.source) : undefined;
                    const title = ms?.title ?? m.title ?? m.source;
                    const href = ms ? `/sources/${ms.id}` : m.url;
                    return (
                      <div key={i} className="text-sm">
                        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Nearest miss</div>
                        {href ? <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="hover:underline">{title}</a> : <span>{title}</span>}
                        <p className="text-neutral-600 dark:text-neutral-400">{m.why_it_does_not_fit}</p>
                      </div>
                    );
                  })}
                  <p className="text-xs text-neutral-500">
                    searched {t.evidence_search.searched_on} &middot;{" "}
                    <Link href="/open-questions" className="hover:underline">see open questions</Link>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  No search recorded either, so this says nothing about the literature &mdash; only
                  that nobody has looked here yet.
                </p>
              )}
            </div>
          ) : (
            <ul className="space-y-4">
              {efficacy.map((claim) => (
                <li key={claim.id} className="text-sm">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <KindBadge kind={claim.kind} />
                    <StrengthBadge strength={claim.backing_strength} />
                    {claim.contested && <ContestedBadge />}
                  </div>
                  <Link href={`/claims/${claim.id}`} className="hover:underline">{claim.statement}</Link>
                  {/* The counts above are sources, so the sources have to be here:
                      a reader told "2 contesting" should see which two. */}
                  <ul className="mt-1 space-y-0.5 border-l-2 border-neutral-200 pl-3 text-xs dark:border-neutral-800">
                    {claim.sources.map((link) => {
                      const s = getSource(link.source);
                      return (
                        <li key={link.source} className="text-neutral-600 dark:text-neutral-400">
                          <span className={link.stance === "contests"
                            ? "font-medium text-amber-700 dark:text-amber-300"
                            : "font-medium text-emerald-700 dark:text-emerald-300"}>
                            {link.stance === "contests" ? "contests" : "supports"}
                          </span>{" "}
                          <Link href={`/sources/${link.source}`} className="hover:underline">{s?.title ?? link.source}</Link>
                          {s?.year ? <span className="text-neutral-500"> ({s.year})</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          );
        })()}
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Code</h2>
        {t.repos?.length ? (
          <ul className="space-y-1 text-sm">
            {t.repos.map((r) => (
              <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline">{r.url}</a>
                <span className="text-neutral-600 dark:text-neutral-400"> — {r.note}</span>
                {r.verified_on && <span className="ml-1 text-xs text-neutral-500">verified {r.verified_on}</span>}</li>
            ))}
          </ul>
        ) : <p className="text-sm text-neutral-500">No repository linked yet. Contribute one.</p>}
      </section>
      {t.sources?.length ? (
        <section>
          <h2 className="mb-2 font-semibold">Sources</h2>
          <ul className="space-y-1 text-sm">
            {t.sources.map((sid) => { const s = getSource(sid); return s ? <li key={sid}><Link href={`/sources/${sid}`} className="hover:underline">{s.title}</Link> {s.year && <span className="text-neutral-500">({s.year})</span>}</li> : null; })}
          </ul>
        </section>
      ) : null}
      <section className="space-y-2 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <EvidenceForm subject={{ kind: "technique", id: t.id, capability: t.addresses[0] }} refId={t.ref} statement={`${t.label}: ${t.summary}`} />
        <p className="text-xs text-neutral-500">
          Whether a technique works is a claim. What you file here becomes a claim about this
          technique under {t.addresses.length === 1 ? "the capability it addresses" : "the first capability it addresses"},
          with your evidence as its source, and moves the standing above the same way a paper would.
        </p>
      </section>
    </article>
  );
}
