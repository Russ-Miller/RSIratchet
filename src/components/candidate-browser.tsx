"use client";

import { Children, useMemo, useState, type ReactNode } from "react";

export interface CandidateIndexItem { id: string; search: string; basis: string; refinement: boolean }
const PAGE_SIZE = 24;

/** Server-rendered evidence cards, with a small client-side index for review. */
export function CandidateBrowser({ items, children }: { items: CandidateIndexItem[]; children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [basis, setBasis] = useState("all");
  const [refinements, setRefinements] = useState(false);
  const [page, setPage] = useState(0);
  const cards = Children.toArray(children);
  const matches = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items.map((item, index) => ({ ...item, index })).filter((item) =>
      terms.every((term) => item.search.includes(term)) &&
      (basis === "all" || item.basis.split(" ").includes(basis)) && (!refinements || item.refinement));
  }, [items, query, basis, refinements]);
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = matches.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  return <div>
    <div className="candidate-controls">
      <label><span className="text-sm">Find a rule, model, or workload</span><input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Search candidate guidance…" /></label>
      <label><span className="text-sm">Paper evidence</span><select value={basis} onChange={(e) => { setBasis(e.target.value); setPage(0); }}><option value="all">All proposals</option><option value="author-tested">Author-tested interventions</option><option value="inferred">Inferred recommendations</option></select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={refinements} onChange={(e) => { setRefinements(e.target.checked); setPage(0); }} />Possible refinements of existing heuristics</label>
    </div>
    <p className="mb-5 text-sm text-neutral-500" aria-live="polite">{matches.length} matching candidate{matches.length === 1 ? "" : "s"}{matches.length ? ` · showing ${current * PAGE_SIZE + 1}–${current * PAGE_SIZE + shown.length}` : ""}</p>
    <div className="discovery-proposals space-y-6">{shown.map((item) => <div key={item.id}>{cards[item.index]}</div>)}</div>
    {pages > 1 && <nav aria-label="Candidate pages" className="candidate-pagination"><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>← Previous</button><span>Page {current + 1} of {pages}</span><button type="button" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Next →</button></nav>}
  </div>;
}
