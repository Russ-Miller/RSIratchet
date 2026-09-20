import Link from "next/link";
import { ListSearch } from "@/components/list-search";
import { ModelStrip } from "@/components/model-strip";
import { vecAttr } from "@/lib/embeddings";
import { capabilitiesByGroup, capabilityTags, getCapabilities, claimsFor, isProposed, sourcesFor, techniquesFor, unsolvedCapabilities } from "@/lib/catalog";
import { FilterBar } from "@/components/filter-bar";

export const metadata = { title: "Capabilities" };

/** A count as a pill: a single digit is a poor click target, and padding is what makes it hittable. */
function Count({ n, href, label, tone }: { n: number; href: string; label: string; tone?: "amber" }) {
  if (!n) return <span className="text-neutral-400">&mdash;</span>;
  const cls = tone === "amber"
    ? "border-amber-300 bg-amber-100 text-amber-900 hover:border-amber-500 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
    : "border-neutral-300 text-neutral-700 hover:border-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:bg-neutral-800";
  return <Link href={href} aria-label={`${n} ${label}`} className={`inline-flex min-w-8 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{n}</Link>;
}

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
      <div className="overflow-x-auto" data-list>
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500">
          <tr>
            <th className="py-1 pr-6">Capability</th>
            <th className="py-1 pr-4 whitespace-nowrap text-right">Claims</th>
            <th className="py-1 pr-4 whitespace-nowrap text-right">Contested</th>
            <th className="py-1 pr-4 whitespace-nowrap text-right">Techniques</th>
            <th className="py-1 whitespace-nowrap text-right">Sources</th>
          </tr>
        </thead>
        <tbody>
          {capabilitiesByGroup().map(({ group, capabilities }) => [
            <tr key={`g-${group.id}`} data-group-header className="border-t-2 border-neutral-300 dark:border-neutral-700">
              <td colSpan={5} className="pt-5 pb-1">
                <span className="font-semibold">{group.label}</span>
                <span className="ml-2 text-xs text-neutral-500">{capabilities.length}</span>
                <div className="text-xs text-neutral-500">{group.description}</div>
              </td>
            </tr>,
            ...capabilities.map((c) => {
              const claims = claimsFor(c.id);
              const contested = claims.filter((x) => x.contested).length;
              const techniques = techniquesFor(c.id).length;
              const sources = sourcesFor(c.id).length;
              const aliases = (c.aliases ?? []).filter((a) => a.toLowerCase() !== c.label.toLowerCase());
              return (
                <tr key={c.id} data-tags={capabilityTags(c)}
                  data-vec={vecAttr("c", c.id)} data-search={`${c.ref} ${c.label} ${c.summary} ${c.id} ${group.id} ${(c.tags ?? []).join(" ")} ${(c.aliases ?? []).join(" ")} ${(c.match_terms ?? []).join(" ")}`.toLowerCase()} className="border-t border-neutral-200 dark:border-neutral-800 align-top">
                  <td className="py-2 pr-6">
                    <Link href={`/capabilities/${c.id}`} className="font-medium hover:underline">{c.label}</Link>
                    {isProposed(c) && <span className="ml-2 text-xs text-neutral-500">proposed</span>}
                    <div className="text-neutral-600 dark:text-neutral-400">{c.summary}</div>
                    {aliases.length > 0 && <div className="text-xs text-neutral-500">also: {aliases.join(", ")}</div>}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums"><Count n={claims.length} href={`/capabilities/${c.id}`} label={`claims under ${c.label}`} /></td>
                  <td className="py-2 pr-4 text-right tabular-nums"><Count n={contested} href="/claims?filter=contested" label={`contested claims under ${c.label}`} tone="amber" /></td>
                  <td className="py-2 pr-4 text-right tabular-nums"><Count n={techniques} href={`/capabilities/${c.id}#techniques`} label={`techniques addressing ${c.label}`} /></td>
                  <td className="py-2 text-right tabular-nums"><Count n={sources} href={`/capabilities/${c.id}#sources`} label={`sources under ${c.label}`} /></td>
                </tr>
              );
            }),
          ])}
        </tbody>
      </table>
      </div>
      </FilterBar>

    </div>
  );
}
