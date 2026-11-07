import { Breadcrumbs } from "@/components/breadcrumbs";
import Link from "next/link";
import editorial from "../../../../docs/examples/heuristic-mining/candidates.json";
import { getClaim, getHeuristic, getSource, isPending } from "@/lib/catalog";
import { getDiscovery } from "@/lib/heuristic-discovery";
import { FilterBar } from "@/components/filter-bar";
import { ListSearch } from "@/components/list-search";
import { TestTheFit } from "@/components/test-the-fit";
import { CandidateBrowser } from "@/components/candidate-browser";

export const metadata = {
  title: "Candidate heuristics",
  description: "Research discovery workbench: proposed rules, source passages, model and workload scope, and paper-by-paper coverage.",
};
const STATE_LABEL = {
  pending: "Not yet reviewed for heuristics", stale: "Needs another pass", invalid: "Invalid result · needs retry",
  failed: "Attempt failed", unavailable: "Full text unavailable", candidates: "Candidates proposed", none: "No actionable heuristic found",
};

export default function CandidatesPage() {
  const { counts, groups, papers, lastRun } = getDiscovery();
  const complete = counts.completed + counts.partial;
  return <div className="discovery-page">
    <Breadcrumbs trail={[{ href: "/", label: "Home" }, { href: "/heuristics", label: "Heuristics" }, { label: "Candidates" }]} />
    <header className="library-heading">
      <p className="eyebrow">Research workbench · candidate curation</p>
      <h1>Find the lessons.<br />Keep the conditions.</h1>
      <p>Finding actionable rules in the ingested research. “Candidate” means a rule is under consideration for the bank; it does not mean the underlying research is untested.</p>
    </header>
    <div className="discovery-stats" aria-label="Discovery coverage">
      <div><strong>{counts.total}</strong><span>ingested papers</span></div>
      <div><strong>{counts.completed}</strong><span>full-text mining reviews</span></div>
      <div><strong>{counts.partial}</strong><span>selected-section mining reviews</span></div>
      <div><strong>{counts.candidates}</strong><span>paper-derived candidates</span></div>
      <div><strong>{editorial.length}</strong><span>initial editorial proposals</span></div>
    </div>
    <div className="discovery-progress">
      <label htmlFor="discovery-coverage">Heuristic-mining coverage: {complete} of {counts.total} papers reviewed in full or in selected sections</label>
      <progress id="discovery-coverage" max={Math.max(counts.total, 1)} value={complete} />
      <p>{counts.pending} not yet reviewed for heuristics · {counts.failed} unsuccessful mining attempts · {counts.unavailable} full texts unavailable · {counts.stale} needing another review. {counts.noCandidate} full-text mining reviews found no actionable rule.</p>
      {lastRun?.stopped_reason && <p>Last run: {lastRun.stopped_reason} No outcome is inferred for unread papers.</p>}
    </div>
    <TestTheFit />
    <section className="mt-10" aria-labelledby="paper-candidates">
      <div className="section-heading"><div><p className="eyebrow">From the paper text</p><h2 id="paper-candidates">{groups.length} candidate rules</h2></div></div>
      <p className="mb-6 text-sm text-neutral-500">Paper evidence: “Author-tested” means the authors evaluated the intervention in their stated setup; “Inferred” means we derived the recommendation from findings. Independent replication is assessed separately and has not yet been checked for these candidates. Applicability lists the models, workloads, conditions, and exceptions. Exact repeated rules share an entry; similar rules still require review.</p>
      {!groups.length && <div className="application-note"><h3 className="text-base font-semibold">The paper-text pass has no accepted results yet.</h3><p className="text-sm">{complete ? "Completed passes have not produced accepted proposals." : "No paper-text extractions have completed yet."} The {editorial.length} earlier proposals below come from extracted catalog claims, not fresh paper reads.</p></div>}
      {groups.length > 0 && <CandidateBrowser items={groups.map((g) => ({
        id: g.id,
        search: `${g.title} ${g.rule} ${g.evidence.map((e) => `${getSource(e.source)?.title ?? e.source} ${e.models.join(" ")} ${e.workloads.join(" ")} ${e.conditions}`).join(" ")}`.toLowerCase(),
        basis: [...new Set(g.evidence.map((e) => e.basis))].join(" "),
        refinement: g.evidence.some((e) => e.overlaps_heuristics.length > 0),
      }))}>
        {groups.map((group) => <article key={group.id} id={`candidate-${group.id}`} className="guidance-card">
          <div className="card-top"><span className="eyebrow">Research candidate</span><CandidateStatus basis={[...new Set(group.evidence.map((e) => e.basis))].map((basis) => basis === "author-tested" ? "Author-tested" : "Inferred").join(" + ")} /></div>
          <h3 className="mt-4 text-xl font-medium">{group.title}</h3><p className="mt-3">{group.rule}</p>
          <details className="candidate-details"><summary>Inspect evidence and applicability</summary>
          {group.evidence.map((e) => <section key={`${e.source}-${e.title}`} className="candidate-evidence">
            <p className="eyebrow">{e.review_method === "codex-session" ? "Codex session review · " : ""}{e.basis === "author-tested" ? "Author-tested intervention" : "Inferred recommendation"}{e.truncated ? " · partial text" : ""}</p>
            <h4 className="mt-2 font-medium"><Link href={`/sources/${e.source}`}>{getSource(e.source)?.title ?? e.source}</Link></h4>
            <blockquote><p>“{e.passage}”</p><cite><a href={e.text_url}>{e.location} · original paper</a></cite></blockquote>
            <p><strong>Finding: </strong>{e.finding}</p>
            <h5 className="mt-4 font-medium">Applicability</h5>
            <dl><div><dt>Tested / discussed models</dt><dd>{e.models.join(", ")}</dd></div><div><dt>Workloads</dt><dd>{e.workloads.join(", ")}</dd></div><div><dt>Conditions</dt><dd>{e.conditions}</dd></div><div><dt>Limits and exceptions</dt><dd>{e.limitations}</dd></div><div><dt>Suggested replication or transfer test</dt><dd>{e.validation_test}</dd></div></dl>
            {e.overlaps_heuristics.length > 0 && <p>Possible refinements: {e.overlaps_heuristics.map((id, i) => <span key={id}>{i ? ", " : ""}<Link href={`/heuristics/${id}`}>{getHeuristic(id)?.label ?? id}</Link></span>)}.</p>}
            {e.review_scope && <p className="text-xs text-neutral-500"><strong>Review scope: </strong>{e.review_scope}</p>}
            <p className="text-xs text-neutral-500">Extracted {e.extracted_at.slice(0, 10)} · source text SHA-256 <code className="break-all">{e.text_sha256}</code>. Passage checked against supplied text; interpretation not independently verified.</p>
          </section>)}
          </details>
        </article>)}
      </CandidateBrowser>}
    </section>

    <section className="mt-12" aria-labelledby="editorial-candidates">
      <div className="section-heading"><div><p className="eyebrow">Initial pass over existing claims</p><h2 id="editorial-candidates">{editorial.length} editorial proposals</h2></div></div>
      <p className="mb-6 text-sm text-neutral-500">These were drafted from claims already in the catalog. No paper passages were checked in that pass. Some overlap existing heuristics and may become refinements rather than new entries.</p>
      <div className="space-y-6">
        {editorial.map((c, i) => <article key={c.id} id={c.id} className="guidance-card">
          <div className="card-top"><span className="eyebrow">Editorial {String(i + 1).padStart(2, "0")}</span><CandidateStatus basis="Inferred from catalog claims" /></div>
          <h3 className="mt-4 text-xl font-medium tracking-tight">{c.title}</h3><p className="mt-3">{c.rule}</p>
          <details className="candidate-details"><summary>Inspect claims and applicability</summary>
          <p className="mt-4 text-sm"><strong>Applicability boundary to test: </strong>{c.boundary}</p>
          <details><summary className="text-sm font-medium">Inspect the underlying claims</summary><ul className="mt-4 space-y-3 text-sm">
            {[...c.supports.map((id) => ({ id, relation: "Basis" })), ...c.qualifies.map((id) => ({ id, relation: "Qualification" }))].map(({ id, relation }) => {
              const claim = getClaim(id);
              if (!claim) return null;
              return <li key={`${relation}-${id}`}><span className="eyebrow">{relation} · {isPending(claim) ? "AI review only" : "AI and human review"}</span><p><Link className="underline underline-offset-4" href={`/claims/${id}`}>{claim.statement}</Link></p><p className="mt-1 text-xs text-neutral-500">{claim.sources.map((s) => getSource(s.source)?.title ?? s.source).join(" · ")}</p></li>;
            })}
          </ul></details>
          {c.overlaps_heuristic && <p className="mt-4 text-xs text-neutral-500">May refine: <Link className="underline" href={`/heuristics/${c.overlaps_heuristic}`}>{getHeuristic(c.overlaps_heuristic)?.label}</Link>.</p>}
          </details>
        </article>)}
      </div>
    </section>

    <section className="mt-12" aria-labelledby="coverage-heading">
      <div className="section-heading"><div><p className="eyebrow">Heuristic-mining progress</p><h2 id="coverage-heading">Which papers have we reviewed for heuristics?</h2></div></div>
      <p className="mb-4 text-sm text-neutral-500">Ingestion adds a paper to the catalog; mining reviews it for useful rules. “Not yet reviewed” means mining has not started, not that the authors did no testing. Full-text and selected-section reviews describe how much text we examined, not the strength of the paper’s experiments. Unavailable text or an unsuccessful attempt is not evidence that no useful rule exists.</p>
      <ListSearch noun="papers" placeholder="Find a paper by title or author…" />
      <FilterBar param="coverage" options={[
        { value: "complete", label: "Full-text reviews", count: counts.completed },
        { value: "partial", label: "Selected-section reviews", count: counts.partial },
        { value: "no-candidate", label: "No actionable rule", count: counts.noCandidate },
        { value: "unattempted", label: "Not yet reviewed", count: counts.pending },
        { value: "needs-attention", label: "Needs attention", count: counts.failed + counts.unavailable + counts.stale },
      ]}>
        <ul className="discovery-inventory" data-list>
          {papers.map(({ source, state, result }) => {
            const done = state === "candidates" || state === "none";
            const tags = [done ? result?.truncated ? "partial" : "complete" : state === "pending" ? "unattempted" : "needs-attention", state === "none" && !result?.truncated ? "no-candidate" : ""].join(" ");
            return <li key={source.id} data-tags={tags} data-search={`${source.title} ${source.id} ${source.authors?.join(" ") ?? ""} ${STATE_LABEL[state]}`.toLowerCase()}>
              <div><Link href={`/sources/${source.id}`}>{source.title}</Link><span className="text-xs text-neutral-500">{source.date ?? source.year}</span></div>
              <p><span className="status-chip">{STATE_LABEL[state]}{done && result?.truncated ? " · partial text only" : ""}</span>{result && <span className="ml-3 text-xs text-neutral-500">{result.attempted_at.slice(0, 10)}</span>}</p>
              {result && <p className="text-xs text-neutral-500">{state === "stale" ? "Source metadata changed; old proposals are excluded until another pass." : result.reason}</p>}
            </li>;
          })}
        </ul>
      </FilterBar>
    </section>
    <section className="mt-12 application-note"><h2 className="text-xl font-medium">Before a candidate joins the bank</h2><p>Review the source and interpretation, check for counterevidence and independent replications, and preserve the tested conditions. Evaluate transfer when the intended model or workload differs. Curation status is separate from the authors’ experimental evidence. Candidates remain outside default search, MCP recommendations, and heuristic standing.</p><Link href="/heuristics" className="text-link">Back to the heuristic collection →</Link></section>
  </div>;
}

function CandidateStatus({ basis }: { basis: string }) {
  return <dl className="candidate-status">
    <div><dt>Paper evidence</dt><dd>{basis}</dd></div>
    <div><dt>Independent replication</dt><dd>Not yet assessed</dd></div>
  </dl>;
}
