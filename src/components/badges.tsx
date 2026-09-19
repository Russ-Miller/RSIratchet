import type { BackingStrength, Claim, ClaimActivity, ClaimKind, Source, Stance } from "@/lib/catalog";
import { reviewLabel, reviewers } from "@/lib/catalog";

const base = "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium";

export function StanceBadge({ stance }: { stance: Stance }) {
  return stance === "supports" ? (
    <span className={`${base} bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200`}>
      <span aria-hidden>&uarr;</span> supports
    </span>
  ) : (
    <span className={`${base} bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200`}>
      <span aria-hidden>&darr;</span> contests
    </span>
  );
}

export function KindBadge({ kind }: { kind: ClaimKind }) {
  return kind === "mechanism" ? (
    <span className={`${base} bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200`}>mechanism</span>
  ) : (
    <span className={`${base} bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200`}>observation</span>
  );
}

const STRENGTH_LABEL: Record<BackingStrength, string> = {
  "single-paper": "single paper",
  replicated: "replicated",
  "mechanism-reasoning": "mechanism reasoning",
  "own-observation": "own observation",
};

export function StrengthBadge({ strength }: { strength: BackingStrength }) {
  return <span className={`${base} bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300`}>{STRENGTH_LABEL[strength]}</span>;
}

export function ReviewBadge({ claim }: { claim: Claim }) {
  const human = reviewers(claim).humans.length > 0;
  return (
    <span className={`${base} bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300`}
      title={human ? "Drafted or checked by a model and read by a person against its sources." : "Drafted by a model from the source. A person reading it adds it to technique standings and the backtest."}>
      {reviewLabel(claim)}
    </span>
  );
}

export function ProposedBadge() {
  return (
    <span className={`${base} bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200`} title="Mined from recurring framings in the literature; nobody has endorsed it as a topic worth tracking.">
      proposed
    </span>
  );
}

export function ContestedBadge() {
  return <span className={`${base} bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200`}>contested</span>;
}

/**
 * scripts/fetch-citations.mjs pages the citations endpoint with limit=1000, so
 * a *recent* count landing exactly on the cap is a floor, not an exact figure.
 * The total comes from Semantic Scholar's citationCount scalar and is exact.
 */
const CITATION_FETCH_CAP = 1000;

/** Recent-citation tiers, low to high. Index = number of filled bars. */
const ACTIVITY_TIERS = [
  { min: 0, label: "no citations in the last 12 months" },
  { min: 1, label: "lightly cited in the last 12 months" },
  { min: 10, label: "steadily cited in the last 12 months" },
  { min: 50, label: "heavily cited in the last 12 months" },
  { min: 200, label: "very heavily cited in the last 12 months" },
];

function activityLevel(recent: number): number {
  let level = 0;
  for (let i = 0; i < ACTIVITY_TIERS.length; i++) if (recent >= ACTIVITY_TIERS[i].min) level = i;
  return level;
}

const fmtRecent = (n: number) => (n >= CITATION_FETCH_CAP ? `${CITATION_FETCH_CAP}+` : `${n}`);

/**
 * Citation activity as a 4-bar signal glyph rather than raw numbers — the
 * list view only needs "is the field still citing this?" at a glance. The
 * exact counts live in a hover card. Renders nothing if we haven't checked.
 */
export function CitationSignal({ source }: { source: Source }) {
  if (!source.citations_checked_at) return null;
  const recent = source.citations_recent_12mo ?? 0;
  const total = source.citations_total ?? 0;
  const year = source.year ?? (source.date ? source.date.slice(0, 4) : undefined);
  const level = activityLevel(recent);
  const active = level > 0;
  const tone = active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-600";

  const glyph = (
    <svg viewBox="0 0 22 14" className={`h-3.5 w-[22px] ${tone}`} aria-hidden focusable="false">
      {[0, 1, 2, 3].map((i) => {
        const h = 4 + i * 3;
        return (
          <rect
            key={i}
            x={i * 5.5}
            y={14 - h}
            width="3.5"
            height={h}
            rx="1"
            fill="currentColor"
            opacity={i < level ? 1 : 0.22}
          />
        );
      })}
    </svg>
  );

  const label = `${fmtRecent(recent)} citations in the last 12 months, ${total} total`;

  const card = (
    <span
      role="tooltip"
      className="citation-card pointer-events-none absolute left-0 top-full z-20 mt-1 w-max max-w-xs rounded border border-neutral-200 bg-white p-2 text-xs font-normal leading-relaxed text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
    >
      {/* Name the paper. Beside a claim, a bare "heavily cited" reads as if it
          describes the claim, which it does not -- it is how much the field
          cites this one source. */}
      <span className="block font-medium text-neutral-900 dark:text-neutral-100">
        This source: {source.title.length > 70 ? `${source.title.slice(0, 70)}…` : source.title}
      </span>
      <span className="mt-1 block">How much the field cites it &mdash; {ACTIVITY_TIERS[level].label}</span>
      <span className="block">{fmtRecent(recent)} in the last 12 months &middot; {total} total</span>
      {year && <span className="block">published {year}</span>}
      <span className="block text-neutral-500">checked {source.citations_checked_at}</span>
      {recent >= CITATION_FETCH_CAP && <span className="block text-neutral-500">count capped at {CITATION_FETCH_CAP} by the fetch</span>}
      {source.semantic_scholar_id && <span className="block text-neutral-500">click for Semantic Scholar</span>}
    </span>
  );

  const wrapper = "citation-signal relative inline-flex items-center align-middle";
  return source.semantic_scholar_id ? (
    <a
      href={`https://www.semanticscholar.org/paper/${source.semantic_scholar_id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${wrapper} rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
      aria-label={`${label}. View on Semantic Scholar.`}
    >
      {glyph}
      {card}
    </a>
  ) : (
    <span className={wrapper} tabIndex={0} aria-label={label}>
      {glyph}
      {card}
    </span>
  );
}

/**
 * Citation activity for a whole claim, for the claim's metadata row. Shows the
 * liveliest source it rests on -- one paper the field is still citing means the
 * evidence base is live. Deliberately not a total: adding citation counts
 * across papers would produce a number no one reported.
 */
export function EvidenceSignal({ activity }: { activity: ClaimActivity }) {
  const level = activityLevel(activity.maxRecent);
  const tone = activity.allQuiet
    ? "text-amber-600 dark:text-amber-400"
    : level > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-neutral-400 dark:text-neutral-600";

  const headline = activity.allQuiet
    ? "every source under this claim has gone quiet"
    : ACTIVITY_TIERS[level].label;

  return (
    <span className="citation-signal relative inline-flex items-center gap-1.5 align-middle" tabIndex={0}
      aria-label={`Evidence activity: ${headline}`}>
      <svg viewBox="0 0 22 14" className={`h-3.5 w-[22px] ${tone}`} aria-hidden focusable="false">
        {[0, 1, 2, 3].map((i) => {
          const h = 4 + i * 3;
          return <rect key={i} x={i * 5.5} y={14 - h} width="3.5" height={h} rx="1" fill="currentColor" opacity={i < level ? 1 : 0.22} />;
        })}
      </svg>
      <span className="text-xs">Evidence activity</span>
      <span role="tooltip" className="citation-card pointer-events-none absolute left-0 top-full z-20 mt-1 w-max max-w-sm rounded border border-neutral-200 bg-white p-2 text-xs font-normal leading-relaxed text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
        <span className="block font-medium text-neutral-900 dark:text-neutral-100">
          How much the field cites the sources under this claim
        </span>
        <span className="mt-1 block">{headline}</span>
        {activity.checked.map((s) => (
          <span key={s.id} className="mt-1 block">
            {fmtRecent(s.citations_recent_12mo ?? 0)} in 12mo &middot; {s.citations_total ?? 0} total &mdash;{" "}
            <span className="text-neutral-500">{s.title}</span>
          </span>
        ))}
        {activity.unchecked > 0 && (
          <span className="mt-1 block text-neutral-500">
            {activity.unchecked} source{activity.unchecked > 1 ? "s" : ""} not yet checked, so not counted
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * How much is for and against a claim, as two small counts. This is the
 * whole review signal a reader gets at a glance: not "reviewed", but how many
 * sources say yes and how many say no. Both are links to add another.
 */
export function EvidenceCount({ claim }: { claim: Claim }) {
  const up = claim.sources.filter((s) => s.stance === "supports").length;
  const down = claim.sources.filter((s) => s.stance === "contests").length;
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs text-neutral-500" title={`${up} supporting, ${down} contesting`}>
      <span className={up ? "text-emerald-700 dark:text-emerald-400" : ""}>&uarr;{up}</span>
      <span className={down ? "text-red-700 dark:text-red-400" : ""}>&darr;{down}</span>
    </span>
  );
}
