import Link from "next/link";
import { ListSearch } from "@/components/list-search";
import { ModelStrip } from "@/components/model-strip";
import { vecAttr } from "@/lib/embeddings";
import { capabilityTags, getCapabilities, claimsFor, isProposed, unsolvedCapabilities } from "@/lib/catalog";
import { FilterBar } from "@/components/filter-bar";
import { ProposedBadge } from "@/components/badges";

export const metadata = { title: "Capabilities" };

export default function CapabilitiesPage() {
  const unfixed = unsolvedCapabilities();
  // Counts come from the same helpers the /open-questions sections use, so a
  // filter here and the section of the same name can never disagree.
  const options = [
    { value: "contested", hint: "Holds a claim where the evidence disagrees", label: "Contested", count: getCapabilities().filter((c) => claimsFor(c.id).some((x) => x.contested)).length },
    { value: "no-technique", hint: "No technique here addresses this capability", label: "No technique", count: unfixed.filter((u) => u.kind === "no-technique").length },
    { value: "none-measured", hint: "Has techniques, but nothing measures whether they work", label: "Untested techniques", count: unfixed.filter((u) => u.kind === "none-measured").length },
    { value: "proposed", hint: "Added by the pipeline; nobody has endorsed it as a topic", label: "Proposed", count: getCapabilities().filter(isProposed).length },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Capabilities</h1>
      <p className="max-w-3xl text-sm text-neutral-500">
        A capability is a topic: one thing a model has to be able to do, such as arithmetic,
        following a procedure, or fixing its own mistakes. It is a heading, not a finding, and it
        carries no score. What is known about it lives in the claims filed under it, each with its
        sources; the techniques listed on it are fixes that address it, and whether a fix works is
        itself a claim. A capability with no claims yet is a gap to fill, not an error. Some are
        marked proposed: added from the map or by the ingestion pipeline without anyone deciding
        it belongs. Those are here to be argued with.
      </p>
      <ModelStrip compact />
      <ListSearch noun="capabilities" />
      <FilterBar options={options}>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500">
          <tr>
            <th className="py-1 pr-6">Capability</th>
            <th className="py-1 pr-6">Group</th>
            <th className="py-1 pr-6 whitespace-nowrap">Claims</th>
            <th className="py-1 pr-6 whitespace-nowrap">Contested</th>
            <th className="py-1 whitespace-nowrap">Status</th>
          </tr>
        </thead>
        <tbody>
          {getCapabilities().map((c) => (
            <tr key={c.id} data-tags={capabilityTags(c)}
              data-vec={vecAttr("c", c.id)} data-search={`${c.label} ${c.summary} ${c.id} ${(c.tags ?? []).join(" ")} ${(c.aliases ?? []).join(" ")}`.toLowerCase()} className="border-t border-neutral-200 dark:border-neutral-800 align-top">
              <td className="py-2 pr-6"><Link href={`/capabilities/${c.id}`} className="font-medium hover:underline">{c.label}</Link>
                <div className="text-neutral-600 dark:text-neutral-400">{c.summary}</div></td>
              <td className="py-2 pr-6">{c.group ?? ""}<div className="text-xs text-neutral-500">{(c.tags ?? []).filter((t) => t !== c.group).join(", ")}</div></td>
              <td className="py-2 pr-6">
                {(() => {
                  const n = claimsFor(c.id).length;
                  return n ? (
                    // A pill, not bare text: a single digit is a poor click
                    // target, and padding is what makes it hittable.
                    <Link href={`/capabilities/${c.id}`} aria-label={`${n} claim${n === 1 ? "" : "s"} under ${c.label}`}
                      className="inline-flex min-w-8 items-center justify-center rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:bg-neutral-800">
                      {n}
                    </Link>
                  ) : <span className="text-neutral-400">&mdash;</span>;
                })()}
              </td>
              <td className="py-2 pr-6">
                {(() => {
                  const n = claimsFor(c.id).filter((x) => x.contested).length;
                  return n ? (
                    <Link href="/claims?filter=contested" aria-label={`${n} contested claim${n === 1 ? "" : "s"} under ${c.label}`}
                      className="inline-flex min-w-8 items-center justify-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 hover:border-amber-500 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{n}</Link>
                  ) : <span className="text-neutral-400">—</span>;
                })()}
              </td>
              <td className="py-2 whitespace-nowrap">{isProposed(c) ? <ProposedBadge /> : c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </FilterBar>

    </div>
  );
}
