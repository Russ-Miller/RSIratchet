import Link from "next/link";
import { ListSearch } from "@/components/list-search";
import { FilterBar } from "@/components/filter-bar";
import { vecAttr } from "@/lib/embeddings";
import { HEURISTIC_STANDING_LABEL, heuristicStanding, heuristicTags, getHeuristics } from "@/lib/catalog";

export const metadata = { title: "Heuristics" };

export default function HeuristicsPage() {
  const heuristics = getHeuristics();
  const count = (tag: string) => heuristics.filter((a) => heuristicTags(a).split(" ").includes(tag)).length;
  const options = [
    { value: "any-break", label: "Breaks somewhere", count: count("any-break"), hint: "At least one claim, reviewed or not, shows it failing for models" },
    { value: "mixed", label: "Mixed", count: count("mixed"), hint: "Reviewed claims both for and against" },
    { value: "narrowed", label: "Holds, narrowed", count: count("narrowed"), hint: "Holds only under a stated condition" },
    { value: "holds", label: "Holds", count: count("holds"), hint: "Reviewed claims show it applying" },
    { value: "untested", label: "Untested", count: count("untested"), hint: "No reviewed evidence either way — a research brief" },
    { value: "distilled", label: "Distilled here", count: count("distilled"), hint: "Synthesized bottom-up from this catalog's own claims, not borrowed from outside" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Heuristics</h1>
      <p className="max-w-3xl text-sm text-neutral-500">
        Decision rules filed with evidence for whether they hold. Most are <em>borrowed</em>: a law
        or rule of thumb from human systems, tested for whether it transfers to models. Some are
        <em> distilled</em>: synthesized bottom-up from this catalog&rsquo;s own claims, with no
        outside source. Each one states <em>why</em> it should or should not apply, and links the
        claims that show it holding or breaking. The breaks are the point: a heuristic that holds
        tells you what you already believed, and one that breaks tells you where models differ.
      </p>
      <ListSearch noun="heuristics" />
      <FilterBar options={options}>
      <ul className="space-y-3">
        {heuristics.map((a) => {
          const st = heuristicStanding(a);
          const n = a.evidence?.length ?? 0;
          return (
            <li key={a.id} data-tags={heuristicTags(a)}
              data-vec={vecAttr("a", a.id)}
              data-search={`${a.ref} ${a.label} ${a.statement} ${a.id} ${(a.aliases ?? []).join(" ")} ${a.origin}`.toLowerCase()}
              className="rounded border border-neutral-200 dark:border-neutral-800 p-3 text-sm">
              <Link href={`/heuristics/${a.id}`} className="font-medium hover:underline">{a.label}</Link>
              <span className="ml-2 text-xs text-neutral-500">
                {HEURISTIC_STANDING_LABEL[st]}
                {n ? <> &middot; {n} claim{n === 1 ? "" : "s"}</> : null}
                {a.provenance === "distilled" ? <> &middot; distilled</> : null}
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
