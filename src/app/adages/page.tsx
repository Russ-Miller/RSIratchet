import Link from "next/link";
import { ListSearch } from "@/components/list-search";
import { FilterBar } from "@/components/filter-bar";
import { vecAttr } from "@/lib/embeddings";
import { ADAGE_STANDING_LABEL, adageStanding, adageTags, getAdages } from "@/lib/catalog";

export const metadata = { title: "Adages" };

export default function AdagesPage() {
  const adages = getAdages();
  const count = (tag: string) => adages.filter((a) => adageTags(a).split(" ").includes(tag)).length;
  const options = [
    { value: "any-break", label: "Breaks somewhere", count: count("any-break"), hint: "At least one claim, reviewed or not, shows it failing for models" },
    { value: "mixed", label: "Mixed", count: count("mixed"), hint: "Reviewed claims both for and against" },
    { value: "narrowed", label: "Holds, narrowed", count: count("narrowed"), hint: "Holds only under a stated condition" },
    { value: "holds", label: "Holds", count: count("holds"), hint: "Reviewed claims show it applying" },
    { value: "untested", label: "Untested", count: count("untested"), hint: "No reviewed evidence either way — a research brief" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Adages</h1>
      <p className="max-w-3xl text-sm text-neutral-500">
        Laws and rules of thumb from human systems, filed to test whether they transfer to models.
        Each one states <em>why</em> it should or should not apply, and links the claims that show it
        holding or breaking. The breaks are the point: an adage that holds tells you what you
        already believed, and one that breaks tells you how models differ from people.
      </p>
      <ListSearch noun="adages" />
      <FilterBar options={options}>
      <ul className="space-y-3">
        {adages.map((a) => {
          const st = adageStanding(a);
          const n = a.evidence?.length ?? 0;
          return (
            <li key={a.id} data-tags={adageTags(a)}
              data-vec={vecAttr("a", a.id)}
              data-search={`${a.ref} ${a.label} ${a.statement} ${a.id} ${(a.aliases ?? []).join(" ")} ${a.origin}`.toLowerCase()}
              className="rounded border border-neutral-200 dark:border-neutral-800 p-3 text-sm">
              <Link href={`/adages/${a.id}`} className="font-medium hover:underline">{a.label}</Link>
              <span className="ml-2 text-xs text-neutral-500">
                {ADAGE_STANDING_LABEL[st]}
                {n ? <> &middot; {n} claim{n === 1 ? "" : "s"}</> : null}
              </span>
              <p className="text-neutral-700 dark:text-neutral-300">&ldquo;{a.statement}&rdquo;</p>
            </li>
          );
        })}
      </ul>
      </FilterBar>
    </div>
  );
}
