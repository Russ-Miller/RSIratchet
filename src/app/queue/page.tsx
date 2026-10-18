import Link from "next/link";
import { getCapability, getClaim, getSources } from "@/lib/catalog";
import { candidateUrl, challengers, groupByCapability, loadQueue, verdictFor, type Direction, type QueueCandidate } from "@/lib/queue";

export const metadata = { title: "Review queue" };

const UNMATCHED_SHOWN = 150;

function ScorePill({ score }: { score: number }) {
  const tone = score >= 15
    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
    : score >= 8
      ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
  return <span className={`inline-flex min-w-8 justify-center rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${tone}`}>{score}</span>;
}

const DIRECTION_TONE: Record<Direction, string> = {
  improves: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  degrades: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  measures: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  not_applicable: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
};

function Candidate({ c, capabilityId }: { c: QueueCandidate; capabilityId?: string }) {
  const url = candidateUrl(c);
  const v = capabilityId ? verdictFor(c, capabilityId) : undefined;
  return (
    <li className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-start gap-3">
        <ScorePill score={c.score ?? 0} />
        <div className="min-w-0 flex-1">
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{c.title}</a>
          ) : (
            <span className="font-medium">{c.title}</span>
          )}
          <div className="mt-0.5 text-xs text-neutral-500">
            {c.date}
            {c.authors?.length ? ` · ${c.authors[0]}${c.authors.length > 1 ? " et al." : ""}` : ""}
            {c.arxiv_id ? ` · arXiv:${c.arxiv_id}` : ""}
          </div>
          {v && (
            <div className="mt-1.5 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${DIRECTION_TONE[v.direction]}`}>
                  {v.about_capability ? v.direction : "off-topic"}
                </span>
                {v.contradicts_claim_id && (
                  <Link href={`/claims/${v.contradicts_claim_id}`}
                    className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 hover:underline dark:bg-amber-900/40 dark:text-amber-200">
                    contradicts an existing claim
                  </Link>
                )}
                {v.supports_claim_id && (
                  <Link href={`/claims/${v.supports_claim_id}`}
                    className="inline-flex items-center rounded px-1.5 py-0.5 text-xs text-neutral-600 hover:underline dark:text-neutral-400">
                    supports an existing claim
                  </Link>
                )}
                <span className="text-xs text-neutral-500">{v.confidence} confidence</span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{v.rationale}</p>
              {v.scope_condition && (
                <p className="text-xs text-neutral-500">Scope: {v.scope_condition}</p>
              )}
            </div>
          )}
          {c.capabilities && c.capabilities.length > 1 ? (
            <div className="mt-1 text-xs text-neutral-500">
              also: {c.capabilities.map((id) => getCapability(id)?.label ?? id).join(", ")}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function QueuePage() {
  // The page shows what still needs a decision. A candidate already filed as
  // a catalog source has had one; abstracts live on arXiv one click away.
  // Both cuts matter: this page is prerendered, and at 25 MB it exceeded
  // Vercel's 20 MB page limit and failed every nightly deploy for 18 days.
  const all = loadQueue();
  const filed = new Set(getSources().map((s) => s.arxiv_id).filter(Boolean));
  const candidates = all.candidates.filter((c) => !c.arxiv_id || !filed.has(c.arxiv_id));
  const { windows, generatedAt } = all;
  const { groups, unmatched } = groupByCapability(candidates);
  const matchedCount = candidates.length - unmatched.length;
  // Had its own page until /contested was folded into the claims list. This is
  // queue content -- unreviewed papers a machine thinks cut against something
  // filed -- so it belongs beside the rest of the queue.
  const incoming = challengers(candidates);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <p className="max-w-3xl text-sm text-neutral-500">
          Stage-1 ingestion candidates from OpenAlex, filtered to arXiv and grouped by the capability
          they concern. <strong className="font-medium text-neutral-600 dark:text-neutral-400">Nothing
          here is in the catalog</strong> &mdash; these are unreviewed papers awaiting triage.
        </p>
        <p className="max-w-3xl text-sm text-neutral-500">
          Grouping is <em>topical only</em>: it says what a paper is about, not whether it improves a
          capability, degrades it, or merely measures it. Reading that direction out of an abstract
          is the judgment stage 2 exists to make, and it is what turns a candidate into a claim.
        </p>
        <p className="text-xs text-neutral-500">
          {candidates.length} candidates · {matchedCount} matched to a capability · {unmatched.length} unmatched
          {" · window"}{windows.length > 1 ? "s" : ""} {windows.join(", ")}
          {generatedAt ? ` · generated ${generatedAt}` : ""}
        </p>
      </div>

      {incoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-baseline gap-2 border-b border-neutral-200 pb-1 text-lg font-semibold dark:border-neutral-800">
            Incoming challenges <span className="text-sm font-normal text-neutral-500">{incoming.length}</span>
          </h2>
          <p className="max-w-3xl text-sm text-neutral-500">
            Papers here whose findings appear to cut against a claim already filed. A machine
            judgment, unreviewed &mdash; the point is to notice them, not to believe them.
          </p>
          <ul className="space-y-2">
            {incoming.map(({ candidate, verdict }) => {
              const target = verdict.contradicts_claim_id ? getClaim(verdict.contradicts_claim_id) : undefined;
              return (
                <li key={candidate.arxiv_id ?? candidate.title}
                  className="rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/20">
                  <a href={candidateUrl(candidate)} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{candidate.title}</a>
                  {target && (
                    <div className="mt-1 text-neutral-700 dark:text-neutral-300">
                      cuts against <Link href={`/claims/${target.id}`} className="underline">{target.statement}</Link>
                    </div>
                  )}
                  {verdict.rationale && <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{verdict.rationale}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {candidates.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Queue is empty. Run <code className="font-mono">node scripts/fetch-openalex.mjs</code> to populate it.
        </p>
      ) : (
        <>
          {groups.map(({ id, items }) => {
            const cap = getCapability(id);
            return (
              <section key={id} className="space-y-2">
                <h2 className="flex items-baseline gap-2 border-b border-neutral-200 pb-1 text-lg font-semibold dark:border-neutral-800">
                  <Link href={`/capabilities/${id}`} className="hover:underline">{cap?.label ?? id}</Link>
                  <span className="text-sm font-normal text-neutral-500">{items.length}</span>
                </h2>
                <ul className="space-y-2">
                  {items.map((c) => <Candidate key={`${id}-${c.openalex_id}`} c={c} capabilityId={id} />)}
                </ul>
              </section>
            );
          })}

          <section className="space-y-2">
            <h2 className="border-b border-neutral-200 pb-1 text-lg font-semibold dark:border-neutral-800">
              Unmatched <span className="text-sm font-normal text-neutral-500">{unmatched.length}</span>
            </h2>
            <p className="max-w-3xl text-sm text-neutral-500">
              Nothing in these matched a capability the catalog tracks. Mostly noise, but this is
              also where a capability worth adding would first show up.
            </p>
            <ul className="space-y-2">
              {[...unmatched].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))).slice(0, UNMATCHED_SHOWN).map((c) => <Candidate key={c.openalex_id} c={c} />)}
            </ul>
            {unmatched.length > UNMATCHED_SHOWN && (
              <p className="text-xs text-neutral-500">
                Showing the newest {UNMATCHED_SHOWN} of {unmatched.length}. The rest feed the
                capability-proposal stage, which is where they do their work.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
