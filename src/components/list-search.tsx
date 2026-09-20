"use client";

import { useEffect, useRef, useState } from "react";
import { cosine, embedQuery, matchCutoff, unpackAttr } from "@/lib/embed-client";

/**
 * Type-to-filter for a server-rendered list. Rows carry a `data-search`
 * haystack; this marks non-matching ones `data-hit="0"` and a rule in
 * globals.css hides them. Clearing the box restores the full list.
 *
 * Filtering by hiding DOM the server already sent, for the same reason the
 * filter bar does: no second copy of the data ships and the page stays static.
 * The two compose without knowing about each other — a row hidden by either
 * rule stays hidden.
 *
 * Both searches run on every query. Keyword hits show at once, in their
 * original order. Rows also carry `data-vec`, a packed embedding: the query
 * is embedded in the browser, and rows keyword missed but meaning caught are
 * appended after the keyword hits in similarity order, marked `data-via`
 * so a rule in globals.css can show they matched on meaning. Rows are moved
 * physically because some lists are tables, where CSS `order` does nothing;
 * the original order is remembered and restored on clear.
 *
 * Only the query is React state. The match count and status are
 * written straight into spans, because they are derived from the DOM the
 * effect just touched, and routing them back through setState is the
 * cascading-render pattern React warns about.
 */
export function ListSearch({ noun = "rows", placeholder }: { noun?: string; placeholder?: string }) {
  const [q, setQ] = useState("");
  const countRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  // DOM order as the server sent it, captured once, so the meaning pass can undo its reordering.
  const originalRef = useRef<HTMLElement[] | null>(null);
  const originalNextRef = useRef<(Node | null)[]>([]);

  useEffect(() => {
    // Rows live outside this component, so reach for them from the document.
    const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-search]"));
    if (!originalRef.current) { originalRef.current = rows.slice(); originalNextRef.current = rows.map((r) => r.nextSibling); }
    const original = originalRef.current;
    const originalNext = originalNextRef.current;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const setStatus = (m: string) => { if (statusRef.current) statusRef.current.textContent = m; };

    // Restore each row to its original slot, so rows that are not part of
    // the search (group headers) keep their place too. Re-appending every
    // row would push them all below the last header.
    const restoreOrder = () => {
      const parent = original[0]?.parentElement;
      if (!parent) return;
      if (original.every((r, i) => r.nextSibling === originalNext[i])) return;
      for (let i = original.length - 1; i >= 0; i--) parent.insertBefore(original[i], originalNext[i]);
    };

    // The filter pills carry static totals. While a query is active, rewrite
    // each pill's number to how many rows of that cut match the query, so the
    // pills read as "what kinds of thing matched". Cleared query: totals back.
    const updatePills = () => {
      for (const pill of document.querySelectorAll<HTMLElement>("[data-count-for]")) {
        const tag = pill.dataset.countFor ?? "";
        if (!terms.length) { pill.textContent = pill.dataset.count ?? ""; continue; }
        let n = 0;
        for (const r of rows) {
          if (r.getAttribute("data-hit") !== "1") continue;
          if ((r.dataset.tags ?? "").split(/\s+/).includes(tag)) n++;
        }
        pill.textContent = String(n);
      }
    };

    const report = () => {
      updatePills();
      let shown = 0;
      for (const r of rows) if (getComputedStyle(r).display !== "none") shown++;
      if (!countRef.current) return;
      countRef.current.textContent = !terms.length ? ""
        : shown === 0 ? `no ${noun} match`
        : `${shown} of ${rows.length}`;
    };

    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    for (const r of rows) r.removeAttribute("data-via");
    // Group headers (rows without data-search) hide while a query is active,
    // since a filtered list no longer follows the grouping.
    const list = rows[0]?.closest<HTMLElement>("[data-list]");
    if (list) { if (terms.length) list.setAttribute("data-searching", "1"); else list.removeAttribute("data-searching"); }
    if (!terms.length) {
      for (const r of rows) r.removeAttribute("data-hit");
      restoreOrder();
      setStatus("");
      report();
    } else {
      restoreOrder();
      const kw = new Set<HTMLElement>();
      for (const r of rows) {
        const hay = r.dataset.search ?? "";
        const hit = terms.every((t) => hay.includes(t));
        r.setAttribute("data-hit", hit ? "1" : "0");
        if (hit) kw.add(r);
      }
      report();
      // Meaning pass, appended once the vector is ready. Keyword hits keep
      // their place; meaning-only hits go after them in similarity order.
      timer = setTimeout(async () => {
        try {
          const qv = await embedQuery(q.trim(), setStatus);
          if (!live) return;
          const scored = rows.map((r) => ({ r, s: (() => { const v = unpackAttr(r.dataset.vec); return v ? cosine(qv, v) : -1; })() }));
          const cut = matchCutoff(scored.map((x) => x.s));
          const extra = scored.filter((x) => x.s >= cut && !kw.has(x.r)).sort((a, b) => b.s - a.s);
          const parent = rows[0]?.parentElement;
          for (const x of extra) {
            x.r.setAttribute("data-hit", "1");
            x.r.setAttribute("data-via", "meaning");
            parent?.appendChild(x.r);
          }
          setStatus("");
          report();
        } catch {
          if (live) setStatus("keyword matches only (meaning model failed to load)");
        }
      }, 250);
    }

    // The filter bar hides rows independently, so the count goes stale when a
    // filter changes and the query does not. Watch the wrapper's attribute and
    // recount.
    const wrapper = document.querySelector("[data-filter]");
    const obs = wrapper ? new MutationObserver(report) : null;
    obs?.observe(wrapper!, { attributes: true, attributeFilter: ["data-filter"] });
    return () => { live = false; if (timer) clearTimeout(timer); obs?.disconnect(); };
  }, [q, noun]);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? `Filter ${noun} by words or meaning…`}
          aria-label={`Filter ${noun} on this page`}
          className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
        />
        <span ref={countRef} aria-live="polite" className="text-xs text-neutral-500" />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:border-neutral-500 dark:border-neutral-700"
          >
            Clear
          </button>
        )}
      </div>
      <span ref={statusRef} aria-live="polite" className="block text-xs text-neutral-500 empty:hidden" />
    </div>
  );
}
