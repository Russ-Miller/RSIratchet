import { EvidenceNav } from "@/components/evidence-nav";
import Link from "next/link";
import { ListSearch } from "@/components/list-search";
import { ModelStrip } from "@/components/model-strip";
import { vecAttr } from "@/lib/embeddings";
import { getTechniques, getCapability, openQuestions, techniqueTags } from "@/lib/catalog";
import { FilterBar } from "@/components/filter-bar";

export const metadata = { title: "Techniques" };

export default function TechniquesPage() {
  const open = openQuestions();
  const count = (k: string) => open.filter((q) => q.kind === k).length;
  const options = [
    { value: "searched", label: "Searched, still open", count: count("searched") },
    { value: "unsearched", label: "Not yet searched", count: count("unsearched") },
    { value: "argued", label: "Argued, not measured", count: count("asserted-not-measured") },
  ];
  return (
    <div className="space-y-4">
      <header className="library-heading">
        <p className="eyebrow">Evidence library</p>
        <h1>Techniques</h1>
      <p className="max-w-3xl text-sm text-neutral-500">Ways to put the guidance into practice: prompting, retrieval, tools, training, and harness design. Open a technique to see what it needs, the evidence for it, and when it fails.</p>
      </header>
      <EvidenceNav current="/techniques" />
      <ModelStrip compact />
      <ListSearch noun="techniques" />
      <FilterBar options={options}>
      <ul className="space-y-3">
        {getTechniques().map((t) => (
          <li key={t.id} data-tags={techniqueTags(t)}
            data-vec={vecAttr("t", t.id)} data-search={`${t.ref} ${t.label} ${t.summary} ${t.id} ${t.kind} ${t.ratchet_role ?? ""} ${t.addresses.join(" ")}`.toLowerCase()} className="rounded border border-neutral-200 dark:border-neutral-800 p-3 text-sm">
            <Link href={`/techniques/${t.id}`} className="font-medium hover:underline">{t.label}</Link>
            <span className="ml-2 text-xs text-neutral-500">{t.kind}{t.ratchet_role ? ` · ratchet: ${t.ratchet_role}` : ""}{t.repos?.length ? " · has code" : ""}{t.status === "superseded" ? " · superseded" : t.status === "proposed" ? " · proposed" : ""}</span>
            <p className="text-neutral-600 dark:text-neutral-400">{t.summary}</p>
            <p className="text-xs text-neutral-500">Addresses: {t.addresses.map((a) => getCapability(a)?.label ?? a).join(", ")}</p>
          </li>
        ))}
      </ul>
      </FilterBar>
    </div>
  );
}
