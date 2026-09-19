import Link from "next/link";
import { ListSearch } from "@/components/list-search";
import { vecAttr } from "@/lib/embeddings";
import { claimsCiting, isQuietSource, sourcesByRecency } from "@/lib/catalog";
import { CitationSignal, StanceBadge } from "@/components/badges";

export const metadata = { title: "Sources" };

export default function SourcesPage() {
  const sources = sourcesByRecency();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sources</h1>
      <p className="text-sm text-neutral-500">
        Papers and my own observations, same schema either way. Sorted by when each was ingested into
        the catalog, most recent first. <strong className="font-medium text-neutral-600 dark:text-neutral-400">Activity</strong> is
        how much the wider field has cited the source in the last 12 months &mdash; hover for exact
        counts; a paper can stay well-cited overall while recent activity has moved past it.{" "}
        <strong className="font-medium text-neutral-600 dark:text-neutral-400">Referenced by</strong> is
        the other direction: which claims <em>in this catalog</em> draw on the source, and whether
        they lean on it as support or as a counterpoint.
      </p>
      <ListSearch noun="sources" />
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500">
          <tr>
            <th className="py-1 pr-4">Source</th>
            <th className="py-1 pr-4 whitespace-nowrap">Created</th>
            <th className="py-1 pr-4 whitespace-nowrap">Ingested</th>
            <th className="py-1 pr-4 whitespace-nowrap">Activity</th>
            <th className="py-1">Referenced by</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => {
            const citing = claimsCiting(s.id);
            const quiet = isQuietSource(s);
            return (
              <tr key={s.id}
                data-vec={vecAttr("s", s.id)} data-search={`${s.ref} ${s.title} ${(s.authors ?? []).join(" ")} ${s.kind} ${s.arxiv_id ?? ""} ${s.year ?? ""} ${(s.tags ?? []).join(" ")}`.toLowerCase()} className={`border-t border-neutral-200 dark:border-neutral-800 align-top ${quiet ? "opacity-60" : ""}`}>
                <td className="py-2 pr-4">
                  <Link href={`/sources/${s.id}`} className="font-medium hover:underline">{s.title}</Link>
                  <div className="text-xs text-neutral-500">{s.kind}{s.authors?.length ? ` · ${s.authors[0]}${s.authors.length > 1 ? " et al." : ""}` : ""}</div>
                </td>
                <td className="py-2 pr-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">{s.date ?? s.year ?? "—"}</td>
                <td className="py-2 pr-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">{s.ingested_at}</td>
                <td className="py-2 pr-4"><CitationSignal source={s} /></td>
                <td className="py-2">
                  {citing.length === 0 ? <span className="text-neutral-400">no claims yet</span> : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {citing.map(({ claim, stance }) => (
                        <Link key={claim.id} href={`/claims/${claim.id}`} title={claim.statement}>
                          <StanceBadge stance={stance} />
                        </Link>
                      ))}
                      <span className="text-xs text-neutral-500 whitespace-nowrap">
                        {citing.length} claim{citing.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
