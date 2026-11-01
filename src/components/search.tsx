"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchRecord } from "@/lib/search-index";
import { cosine, embedQuery, matchCutoff, unpackAttr } from "@/lib/embed-client";

const KIND: Record<SearchRecord["k"], { label: string; plural: string; section: string; href: (id: string) => string }> = {
  c: { label: "capability", plural: "capabilities", section: "/capabilities", href: (id) => `/capabilities/${id}` },
  m: { label: "claim", plural: "claims", section: "/claims", href: (id) => `/claims/${id}` },
  t: { label: "technique", plural: "techniques", section: "/techniques", href: (id) => `/techniques/${id}` },
  s: { label: "source", plural: "sources", section: "/sources", href: (id) => `/sources/${id}` },
  a: { label: "heuristic", plural: "heuristics", section: "/heuristics", href: (id) => `/heuristics/${id}` },
};

const EXAMPLES = ["hallucination", "self-correction", "prompt injection", "long context", "agent harness", "sycophancy"];

/** Display order for the count line: matches the nav. */
const KIND_ORDER: SearchRecord["k"][] = ["c", "m", "s", "t", "a"];

/**
 * Scoring, deliberately simple. Every query term must appear somewhere, then
 * matches in the title outrank matches in the body and shorter titles outrank
 * longer ones. Fifty lines beats a search dependency for a few hundred records,
 * and being wrong here is cheap -- the reader can see every result.
 */
function score(rec: SearchRecord, terms: string[]): number {
  const title = rec.title.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (!rec.text.includes(t)) return 0;
    if (title.includes(t)) s += 10;
    if (title.startsWith(t)) s += 5;
    s += 1;
  }
  return s + Math.max(0, 40 - rec.title.length) / 40;
}

export function Search({ index }: { index: SearchRecord[] }) {
  const [q, setQ] = useState("");
  // The embedded query, and which text it was embedded from.
  const [qvec, setQvec] = useState<{ q: string; v: Float32Array } | null>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const terms = useMemo(() => q.toLowerCase().split(/\s+/).filter(Boolean), [q]);

  // While a query is active the results are the page: a flag on the root
  // element lets globals.css hide the browse sections below the search,
  // which on a phone would otherwise sit right under the results.
  useEffect(() => {
    const root = document.documentElement;
    if (q.trim()) root.setAttribute("data-searching", "1"); else root.removeAttribute("data-searching");
    return () => root.removeAttribute("data-searching");
  }, [q]);

  // Catalog vectors, decoded once. Cheap: a few hundred short arrays.
  const vectors = useMemo(() => index.map((r) => unpackAttr(r.v)), [index]);

  // Embed the query after a short pause in typing. The model loads on the
  // first call; status text goes straight to a span rather than state.
  // Keyword results never wait on this: they render immediately and the
  // meaning results append when the vector arrives.
  useEffect(() => {
    if (!q.trim()) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const v = await embedQuery(q.trim(), (m) => { if (statusRef.current) statusRef.current.textContent = m; });
        if (live) setQvec({ q, v });
      } catch {
        if (statusRef.current) statusRef.current.textContent = "showing keyword matches only (meaning model failed to load)";
      }
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  // Keyword matches first, because they are exact; then whatever the meaning
  // search adds that keyword missed, in similarity order and marked as such.
  // Unsliced, so the per-kind counts are true totals.
  const matches = useMemo(() => {
    if (!terms.length) return [];
    const kw = index
      .map((r) => ({ r, s: score(r, terms), via: "keyword" as const }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    if (!qvec || qvec.q !== q) return kw;
    const seen = new Set(kw.map((x) => `${x.r.k}:${x.r.id}`));
    const scored = index.map((r, i) => ({ r, s: vectors[i] ? cosine(qvec.v, vectors[i]!) : 0, via: "meaning" as const }));
    const cut = matchCutoff(scored.map((x) => x.s));
    const extra = scored.filter((x) => x.s >= cut && !seen.has(`${x.r.k}:${x.r.id}`)).sort((a, b) => b.s - a.s);
    return [...kw, ...extra];
  }, [index, vectors, terms, q, qvec]);
  const results = matches.slice(0, 40);
  const pendingEmbed = !!q.trim() && (!qvec || qvec.q !== q);

  // With no query the line shows catalog totals; with one, matches per kind.
  const counts = useMemo(() => {
    const pool = terms.length ? matches.map((x) => x.r) : index;
    const n: Record<SearchRecord["k"], number> = { c: 0, m: 0, t: 0, s: 0, a: 0 };
    for (const r of pool) n[r.k]++;
    return n;
  }, [index, matches, terms.length]);

  return (
    <div className="space-y-4">
      {/* text-base on small screens: iOS zooms the page on focus for anything
          under 16px. The native search-cancel glyph is hidden so there is one
          clear control, ours, with a finger-sized hit area. */}
      <div className="relative">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by words or meaning…"
          aria-label="Search the catalog"
          className="w-full rounded border border-neutral-300 bg-transparent py-2.5 pl-3 pr-11 text-base sm:py-2 sm:text-sm dark:border-neutral-700 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-lg leading-none text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            &times;
          </button>
        )}
      </div>
      <span ref={statusRef} aria-live="polite" className="block text-xs text-neutral-500 empty:hidden" />
      {/* Empty-state examples: each is a query that returns a useful mix of
          kinds, checked against the index. They vanish once there is a query. */}
      {!q && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-neutral-500">Try:</span>
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setQ(e)}
              className="rounded-full border border-neutral-300 px-2.5 py-1 text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* One compact line on every screen size: "34 capabilities · 167 claims …".
          Five stacked tiles took a third of a phone screen. */}
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-live="polite">
        {KIND_ORDER.map((k) => (
          <div key={k} className="flex items-baseline gap-1">
            <dd className="font-medium">
              <Link href={KIND[k].section} className="hover:underline">{counts[k]}</Link>
            </dd>
            <dt className="text-neutral-500">{KIND[k].plural}{terms.length ? " matched" : ""}</dt>
          </div>
        ))}
      </dl>

      {terms.length > 0 && !pendingEmbed && (
        <p className="text-xs text-neutral-500">
          {matches.length === 0
            ? "Nothing matched by words or by meaning. Try describing it differently."
            : matches.length > 40
              ? `Showing the top 40 of ${matches.length} matches.`
              : `${matches.length} match${matches.length === 1 ? "" : "es"}`}
        </p>
      )}

      <ul className="space-y-2">
        {results.map(({ r, via }) => (
          <li key={`${r.k}-${r.id}`} className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{KIND[r.k].label}</span>
              {r.pending && <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">reviewed by AI</span>}
              {via === "meaning" && <span className="rounded border border-neutral-300 px-1.5 py-0.5 dark:border-neutral-700" title="Did not contain your words; matched on meaning.">by meaning</span>}
              {r.sub && <span className="truncate">{r.sub}</span>}
            </div>
            <Link href={KIND[r.k].href(r.id)} className="text-sm hover:underline">{r.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
