import Link from "next/link";
import { EvidenceNav } from "@/components/evidence-nav";
import { getClaims, getTechniques, getCapabilities, getSources } from "@/lib/catalog";

export const metadata = { title: "Research", description: "Inspect the findings, methods, and sources behind the reasoning bank." };

export default function ResearchPage() {
  const collections = [
    { href: "/claims", title: "Claims", count: getClaims().length, description: "Start with a finding. Check its scope, supporting evidence, and what challenges it." },
    { href: "/techniques", title: "Techniques", count: getTechniques().length, description: "Inspect a method: what it needs, how to apply it, and when it fails." },
    { href: "/capabilities", title: "Capabilities", count: getCapabilities().length, description: "Explore an ability or recurring limitation, with the findings and methods that address it." },
    { href: "/sources", title: "Sources", count: getSources().length, description: "Go back to the papers and recorded observations behind a claim." },
  ];
  return <div className="space-y-6">
    <header className="library-heading"><p className="eyebrow">Research</p><h1>Follow the evidence.</h1><p>Useful guidance starts with a specific finding. Inspect what was tested, where it worked, and which conditions limit the lesson.</p></header>
    <EvidenceNav current="/research" />
    <div className="research-grid">{collections.map((item, i) => <Link key={item.href} href={item.href} className="guidance-card">
      <div className="card-top"><span className="eyebrow">0{i + 1} / Evidence library</span><span className="status-chip">{item.count} records</span></div>
      <h2>{item.title} <span aria-hidden="true">↗</span></h2><p>{item.description}</p>
    </Link>)}</div>
    <section className="application-note"><p className="eyebrow">A focused collection</p><h2>How agents keep learning.</h2><p>Research on retaining lessons, improving harnesses, and checking whether gains survive new tasks.</p><Link className="text-link" href="/ratchet">Explore learning loops →</Link></section>
    <section className="research-next"><div><p className="eyebrow">From findings to guidance</p><h2>A claim is a starting point.</h2><p>A finding in one setup does not establish a reusable rule. Candidate heuristics keep their source evidence and limitations visible while they await curation and transfer checks.</p></div><div className="research-actions"><Link className="text-link" href="/heuristics/candidates">Inspect candidate heuristics →</Link><Link className="text-link" href="/heuristics">Explore the heuristic collection →</Link></div></section>
  </div>;
}
