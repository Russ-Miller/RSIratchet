import Link from "next/link";
import { TestTheFit } from "@/components/test-the-fit";
import { getHeuristics, heuristicStanding, HEURISTIC_STANDING_LABEL, getClaims, getCapabilities } from "@/lib/catalog";
import { HEURISTIC_APPLICATIONS } from "@/lib/heuristic-editorial";
import { buildSearchIndex } from "@/lib/search-index";
import { Search } from "@/components/search";

export default function Home() {
  const heuristics = getHeuristics();
  const featured = ["hashimotos-rule", "no-one-should-judge-their-own-cause", "practice-makes-perfect"]
    .map((id) => heuristics.find((h) => h.id === id)).filter((h) => h !== undefined);
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Research → experience → better guidance</p>
          <h1>A shared reasoning<br className="hidden sm:block" /> bank for agents.</h1>
          <p className="hero-lede">Learn what to try.<br />Understand when it fails.</p>
          <p className="hero-description">Heuristics for agents and the harnesses around them, grounded in research and open to challenge from real use.</p>
          <div className="action-row">
            <Link className="button-primary" href="/heuristics">Explore the heuristics <span aria-hidden="true">↗</span></Link>
            <Link className="text-link" href="/about#mcp">Use it with your agent <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <aside className="hero-note" aria-label="The learning loop">
          <span className="note-index">THE LEARNING LOOP / 01</span>
          <h2>Make the next attempt<br />better informed.</h2>
          <ol className="loop-list">
            <li><span>01</span><div><strong>Find a lesson</strong><p>Research and experience suggest what might help.</p></div></li>
            <li><span>02</span><div><strong>Test its limits</strong><p>Keep the setup, the result, and what went wrong.</p></div></li>
            <li><span>03</span><div><strong>Share what holds up</strong><p>Refine the guidance for the next agent.</p></div></li>
          </ol>
          <p className="note-foot">Research-backed catalog today.<br />Shared agent validation is the next step.</p>
        </aside>
      </section>

      <section className="home-search" aria-label="Search the reasoning bank">
        <label className="eyebrow" htmlFor="bank-search">Find guidance for the work in front of you</label>
        <Search index={buildSearchIndex()} />
      </section>

      <section data-browse className="home-section">
        <div className="section-heading"><div><p className="eyebrow">Start with a useful principle</p><h2>Lessons to build on.</h2></div><Link className="text-link" href="/heuristics">All {heuristics.length} heuristics <span aria-hidden="true">→</span></Link></div>
        <div className="heuristic-grid">
          {featured.map((h, i) => {
            const copy = HEURISTIC_APPLICATIONS[h.id];
            return <Link key={h.id} href={`/heuristics/${h.id}`} className="guidance-card">
              <div className="card-top"><span className="card-number">0{i + 1}</span><span className="status-chip">{HEURISTIC_STANDING_LABEL[heuristicStanding(h)]}</span></div>
              <h3>{copy.title}</h3><p>{copy.guidance}</p>
              <div className="card-bottom"><span>{h.evidence?.length ?? 0} linked claims · borrowed principle</span><span aria-hidden="true">↗</span></div>
            </Link>;
          })}
        </div>
        <TestTheFit />
        <p className="mt-5"><Link className="text-link" href="/heuristics/candidates">Candidate workbench: proposals and paper coverage →</Link></p>
        <p className="section-caption">Practical readings of existing heuristics. Open one for its origin, evidence, and exceptions. Status reflects claims reviewed by a person.</p>
      </section>

      <section data-browse className="failure-section">
        <div><p className="eyebrow">Learn from the unsuccessful attempts, too</p><h2>What didn’t work<br />belongs in the bank.</h2></div>
        <div className="failure-copy"><p>Published research gives us findings worth testing. Real use can reveal the missing conditions: a different model, a messier task, a fix that does not travel.</p><p>We want connected agents to return those results, including failures. With the setup and evidence attached, an unsuccessful attempt can help narrow a research claim and improve the next heuristic.</p><Link href="/about#contribute" className="text-link">How results become evidence <span aria-hidden="true">→</span></Link></div>
      </section>

      <section data-browse className="home-section evidence-section">
        <div className="section-heading"><div><p className="eyebrow">Follow the evidence</p><h2>Useful at a glance.<br />Inspectable in depth.</h2></div><p className="section-aside">Each heuristic connects to a deeper record. You can follow the reasoning, inspect the sources, and challenge the conclusion.</p></div>
        <div className="evidence-links">
          <Link href="/claims"><span className="eyebrow">01 / Findings</span><h3>Claims <span aria-hidden="true">↗</span></h3><p>What was found, under which conditions, with evidence for and against.</p><span className="evidence-count">{getClaims().length} claims</span></Link>
          <Link href="/techniques"><span className="eyebrow">02 / Application</span><h3>Techniques <span aria-hidden="true">↗</span></h3><p>The methods and implementation details behind the guidance.</p></Link>
          <Link href="/capabilities"><span className="eyebrow">03 / Context</span><h3>Capabilities <span aria-hidden="true">↗</span></h3><p>The abilities and recurring limitations the research addresses.</p><span className="evidence-count">{getCapabilities().length} capability topics</span></Link>
        </div>
        <p className="mt-6"><Link className="text-link" href="/research">Browse all research and sources →</Link></p>
      </section>
      <section data-browse className="agent-banner"><div><p className="eyebrow">Bring the evidence into your workflow</p><h2>A reference your agent can query.</h2><p>Search heuristics and inspect evidence through the local MCP server. Hosted connections and automated result submission are still ahead.</p></div><Link href="/about#mcp" className="button-primary">Connect through MCP <span aria-hidden="true">→</span></Link></section>
    </div>
  );
}
