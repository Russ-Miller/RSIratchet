import Link from "next/link";
import { TestTheFit } from "@/components/test-the-fit";
import { HEURISTIC_APPLICATIONS } from "@/lib/heuristic-editorial";
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
    { value: "prescriptive", label: "Says what to do", count: count("prescriptive"), hint: "Prescriptive: the statement is advice, so the evidence tests whether following it pays" },
    { value: "descriptive", label: "Says how things behave", count: count("descriptive"), hint: "Descriptive: the statement is an observation; the advice is what follows from it for models" },
    { value: "distilled", label: "Distilled here", count: count("distilled"), hint: "Synthesized bottom-up from this catalog's own claims, not borrowed from outside" },
  ];
  return (
    <div className="space-y-4">
      <header className="library-heading">
        <p className="eyebrow">The reasoning bank</p>
        <h1>Guidance worth testing.</h1>
        <p>Practical principles for agents and their harnesses. Follow each one to the evidence, the exceptions, and the conditions that change the advice.</p>
      </header>
      <p className="text-sm text-neutral-500">The current collection tests borrowed principles against AI research. New rules distilled from the bank will be marked separately. Status reflects evidence reviewed by a person.</p>
      <p className="text-sm"><Link href="/heuristics/candidates" className="text-link">Candidate workbench: proposals and paper coverage →</Link></p>
      <TestTheFit />
      <ListSearch noun="heuristics" />
      <FilterBar options={options}>
      <ul className="heuristic-list">
        {heuristics.map((a) => {
          const st = heuristicStanding(a);
          const n = a.evidence?.length ?? 0;
          const application = HEURISTIC_APPLICATIONS[a.id];
          return (
            <li key={a.id} data-tags={heuristicTags(a)}
              data-vec={vecAttr("a", a.id)}
              data-search={`${a.ref} ${a.label} ${a.adage ?? ""} ${a.statement} ${a.id} ${(a.aliases ?? []).join(" ")} ${a.origin} ${application?.title ?? ""} ${application?.guidance ?? ""}`.toLowerCase()}
              className="guidance-card">
              <div className="card-top"><span className="eyebrow">{a.provenance === "distilled" ? "Distilled here" : "Borrowed"} · {a.form === "prescriptive" ? "says what to do" : "says how things behave"}</span><span className="status-chip">{HEURISTIC_STANDING_LABEL[st]}</span></div>
              <Link href={`/heuristics/${a.id}`}><h2>{a.label}</h2></Link>
              <p>{application?.guidance ?? a.statement}</p>
              {a.adage && <p className="mt-2 text-xs text-neutral-500">Adage: {a.adage}</p>}
              <div className="card-bottom"><span>{n} linked claim{n === 1 ? "" : "s"}</span><Link aria-label={`Read evidence for ${a.label}`} href={`/heuristics/${a.id}`}>↗</Link></div>
            </li>
          );
        })}
      </ul>
      </FilterBar>
    </div>
  );
}
