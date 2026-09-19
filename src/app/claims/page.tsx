import Link from "next/link";
import { ListSearch } from "@/components/list-search";
import { ModelStrip } from "@/components/model-strip";
import { vecAttr } from "@/lib/embeddings";
import { claimTags, getCapability, getClaims, getSource, isPending, isQuietSource } from "@/lib/catalog";
import type { SourceLink } from "@/lib/catalog";
import { CitationSignal, ContestedBadge, KindBadge, ReviewBadge, StanceBadge, StrengthBadge } from "@/components/badges";
import { FilterBar } from "@/components/filter-bar";

export const metadata = { title: "Claims" };

function SourceRow({ link }: { link: SourceLink }) {
  const src = getSource(link.source);
  return (
    <li className="flex flex-wrap items-center gap-1.5">
      <StanceBadge stance={link.stance} />
      <Link href={`/sources/${link.source}`} className="hover:underline text-neutral-700 dark:text-neutral-300">{src?.title ?? link.source}</Link>
      {src && <CitationSignal source={src} />}
    </li>
  );
}

export default function ClaimsPage() {
  // Contested claims first -- disagreement is the most decision-relevant thing
  // on this page, and it is otherwise invisible in an alphabetical list.
  const claims = [...getClaims()].sort((a, b) =>
    Number(b.contested) - Number(a.contested) || a.statement.localeCompare(b.statement));
  const contestedCount = claims.filter((c) => c.contested).length;
  const options = [
    { value: "contested", label: "Contested", count: contestedCount },
    { value: "argued", label: "Argued, not measured", count: claims.filter((c) => c.backing_strength === "mechanism-reasoning").length },
    { value: "pending", label: "Reviewed by AI", count: claims.filter(isPending).length },
    { value: "human", label: "Reviewed by AI and a person", count: claims.filter((c) => !isPending(c)).length },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Claims</h1>
      <p className="text-sm text-neutral-500">
        Directional, scoped statements &mdash; the actual content. Each shows which capability it sits
        under and which sources support or contest it. Sources with no citations in the last 12 months
        and 2+ years old are tucked behind &ldquo;older sources&rdquo;.
      </p>
      <ModelStrip compact />
      <p className="text-sm text-neutral-500">
        {contestedCount} of {claims.length} are contested, sorted first &mdash;{" "}
        <Link href="/claims?filter=contested" className="hover:underline">see them with incoming challenges</Link>.
      </p>
      <ListSearch noun="claims" />
      <FilterBar options={options}>
      <ul className="space-y-4">
        {claims.map((c) => {
          const cap = getCapability(c.capability);
          const active = c.sources.filter((s) => { const src = getSource(s.source); return !src || !isQuietSource(src); });
          const quiet = c.sources.filter((s) => { const src = getSource(s.source); return src && isQuietSource(src); });
          return (
            <li key={c.id} data-tags={claimTags(c)}
              className="rounded border border-neutral-200 p-4 dark:border-neutral-800"
              data-vec={vecAttr("m", c.id)} data-search={`${c.id} ${c.statement} ${c.capability} ${c.technique ?? ""} ${c.backing_strength} ${c.kind}`.toLowerCase()}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <KindBadge kind={c.kind} />
                <StrengthBadge strength={c.backing_strength} />
                {c.contested && <ContestedBadge />}
                <ReviewBadge claim={c} />
                <span className="text-xs text-neutral-500">checked {c.last_checked_at}</span>
                {c.status !== "active" && <span className="text-xs text-neutral-500">&middot; {c.status}</span>}
              </div>
              <Link href={`/claims/${c.id}`} className="font-medium hover:underline">{c.statement}</Link>
              {c.contested && c.disagreement_axis && (
                <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="font-medium">Axis of disagreement</span>
                  {c.disagreement_axis.is_guess && (
                    <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">(a guess, not verified)</span>
                  )}
                  : {c.disagreement_axis.description}
                </p>
              )}
              <div className="mt-2 text-sm text-neutral-500">
                Capability: <Link href={`/capabilities/${c.capability}`} className="hover:underline">{cap?.label ?? c.capability}</Link>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {active.map((s) => <SourceRow key={s.source} link={s} />)}
              </ul>
              {quiet.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300">
                    +{quiet.length} older, quieter source{quiet.length > 1 ? "s" : ""}
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {quiet.map((s) => <SourceRow key={s.source} link={s} />)}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
      </FilterBar>
    </div>
  );
}
