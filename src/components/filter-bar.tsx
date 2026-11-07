"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface FilterOption { value: string; label: string; count: number; hint?: string }

/**
 * Segmented filter over a server-rendered list. The list stays fully static:
 * rows carry `data-tags`, this sets `data-filter` on a wrapper, and rules in
 * globals.css hide the rows that do not match. Nothing here knows what a row
 * is, and no copy of the data is shipped for the filter to work over.
 *
 * The query string is the single source of truth rather than a mirror of
 * component state. That makes a filtered view linkable -- which is what lets
 * /open-questions point at the same cut of the data inside the Capabilities
 * and Techniques tabs -- and it makes the browser's back button work. It also
 * avoids reading window during render: useSyncExternalStore's server snapshot
 * is "all", matching what the static HTML was built with, so hydration agrees.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

/** replaceState does not fire popstate, so our own writes have to say so. */
function setParam(param: string, value: string) {
  const url = new URL(window.location.href);
  if (value === "all") url.searchParams.delete(param);
  else url.searchParams.set(param, value);
  window.history.replaceState(null, "", url);
  for (const l of listeners) l();
}

export function FilterBar({
  options,
  param = "filter",
  children,
}: {
  options: FilterOption[];
  param?: string;
  children: React.ReactNode;
}) {
  const read = useCallback(
    () => new URLSearchParams(window.location.search).get(param) ?? "all",
    [param],
  );
  const fromUrl = useSyncExternalStore(subscribe, read, () => "all");
  // A stale or hand-edited link naming an empty cut falls back to All rather
  // than rendering a list with everything hidden.
  const active = options.some((o) => o.value === fromUrl && o.count > 0) ? fromUrl : "all";

  const all: FilterOption[] = [{ value: "all", label: "All", count: 0, hint: "Everything" }, ...options];

  return (
    <>
      <div className="filter-controls flex flex-wrap items-center gap-1" role="group" aria-label="Filter list">
        {all.map((o) => {
          const isActive = o.value === active;
          const empty = o.value !== "all" && o.count === 0;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setParam(param, o.value)}
              disabled={empty}
              title={o.hint}
              aria-label={o.hint ? `${o.label} — ${o.hint}` : undefined}
              aria-pressed={isActive}
              className={[
                "rounded-full border px-3 py-1 text-xs transition-colors",
                isActive
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : empty
                    ? "cursor-not-allowed border-neutral-200 text-neutral-400 dark:border-neutral-800 dark:text-neutral-600"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500",
              ].join(" ")}
            >
              {o.label}
              {o.value !== "all" && (
                // data-count-for lets the list search overwrite the number
                // with how many of this cut match the current query, and
                // restore it from data-count when the query clears.
                <span data-count-for={o.value} data-count={o.count} className={isActive ? "ml-1.5 opacity-70" : "ml-1.5 text-neutral-500"}>{o.count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div data-filter={active}>{children}</div>
    </>
  );
}
