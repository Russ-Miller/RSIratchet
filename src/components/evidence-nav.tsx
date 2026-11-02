import Link from "next/link";

const sections = [
  ["/research", "Overview"], ["/claims", "Claims"],
  ["/techniques", "Techniques"], ["/capabilities", "Capabilities"],
  ["/sources", "Sources"], ["/ratchet", "Learning loops"],
];

export function EvidenceNav({ current }: { current: string }) {
  return <nav className="evidence-nav" aria-label="Research sections">
    {sections.map(([href, label]) => <Link key={href} href={href}
      aria-current={current === href ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
