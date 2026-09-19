import Link from "next/link";
import { getDrafts } from "@/lib/drafts";
import { claimsFor, getCapability, getClaim, getTechnique } from "@/lib/catalog";
import { DraftVerdict, VerdictExport } from "@/components/draft-verdict";

export const metadata = { title: "Drafts" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-neutral-800 dark:text-neutral-200">{children}</div>
    </div>
  );
}

export default function DraftsPage() {
  const drafts = getDrafts();
  const flagged = drafts.filter((d) => d.problems?.length).length;

  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold">Drafts</h1>
        <p className="text-sm text-neutral-500">
          Proposed records written from papers in the queue. None of this is in the catalog. A
          draft becomes content only when it is filed by hand, and this page exists so that
          decision takes three clicks instead of an evening reading YAML.
        </p>
        <p className="text-sm text-neutral-500">
          For each one, three questions are enough: is it under the right capability, is the
          statement true and scoped, is the stance right. Everything else can be fixed after.
        </p>
        <p className="text-xs text-neutral-500">
          {drafts.length} draft{drafts.length === 1 ? "" : "s"}
          {flagged ? ` · ${flagged} flagged by an automatic check and sorted first` : ""}
        </p>
      </div>

      {drafts.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nothing waiting. Drafts appear here after <code className="font-mono text-xs">node scripts/draft-claims.mjs</code>.
        </p>
      ) : (
        <>
          <ul className="space-y-6">
            {drafts.map((d) => {
              const cap = getCapability(d.capability);
              const siblings = claimsFor(d.capability);
              const related = d.related_claim_id ? getClaim(d.related_claim_id) : undefined;
              const tech = d.technique ? getTechnique(d.technique) : undefined;
              return (
                <li key={d.arxiv_id ?? d.source_id} className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="mb-2 flex flex-wrap items-baseline gap-2 text-xs text-neutral-500">
                    <code className="font-mono">{d.arxiv_id ?? d.source_id}</code>
                    <a href={d.url ?? `https://arxiv.org/abs/${d.arxiv_id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      read the paper &rarr;
                    </a>
                    <span>from {d.drafted_from ?? "?"}</span>
                    {d.confidence && <span>confidence {d.confidence}</span>}
                  </div>
                  <div className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">{d.title}</div>

                  {d.problems?.length ? (
                    <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      Automatic check failed: {d.problems.join("; ")}. Read the paper before trusting this one.
                    </p>
                  ) : null}

                  <p className="mb-3 text-base leading-relaxed text-neutral-900 dark:text-neutral-100">{d.statement}</p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Capability">
                      <Link href={`/capabilities/${d.capability}`} className="hover:underline">{cap?.label ?? d.capability}</Link>
                    </Field>
                    <Field label="Kind / backing">{d.kind} &middot; {d.backing_strength}</Field>
                    {d.scope_condition ? <Field label="Scope">{d.scope_condition}</Field> : null}
                    <Field label="Technique">
                      {tech ? <Link href={`/techniques/${tech.id}`} className="hover:underline">{tech.label}</Link>
                        : d.proposed_technique ? <>proposed: {d.proposed_technique}</>
                          : <span className="text-neutral-500">none</span>}
                    </Field>
                    <Field label="Stance on what we hold">
                      {d.stance_on_existing}
                      {related ? <> &mdash; <Link href={`/claims/${related.id}`} className="hover:underline">{related.statement.slice(0, 80)}&hellip;</Link></> : null}
                      {d.stance_reason ? <div className="text-neutral-600 dark:text-neutral-400">{d.stance_reason}</div> : null}
                    </Field>
                    {d.falsifier ? <Field label="Falsifier">{d.falsifier}</Field> : null}
                  </div>

                  {d.evidence_note ? (
                    <div className="mt-3">
                      <Field label="How well evidenced">{d.evidence_note}</Field>
                    </div>
                  ) : null}

                  {/* The stance judgment is unanswerable without seeing what we already hold. */}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                      What this capability already holds ({siblings.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                      {siblings.length === 0 ? <li>Nothing yet.</li> : siblings.map((c) => (
                        <li key={c.id}>
                          <Link href={`/claims/${c.id}`} className="hover:underline">{c.statement}</Link>
                        </li>
                      ))}
                    </ul>
                  </details>

                  <DraftVerdict id={d.arxiv_id ?? d.source_id ?? ""} />
                </li>
              );
            })}
          </ul>

          <section className="space-y-2 border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">Send the verdicts back</h2>
            <p className="max-w-3xl text-sm text-neutral-500">
              This site is static and has nowhere to save a decision, so verdicts live in this
              browser only. Collect them and paste the result into the conversation; filing is
              still a deliberate act, which is the point.
            </p>
            <VerdictExport ids={drafts.map((d) => d.arxiv_id ?? d.source_id ?? "")} />
          </section>
        </>
      )}
    </div>
  );
}
