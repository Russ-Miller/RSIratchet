"use client";

import { useState } from "react";

/**
 * The record's stable id with a one-click permalink. The slug in the URL can
 * change when a label is rewritten; this cannot, so it is what to cite.
 */
export function RefTag({ refId }: { refId: string }) {
  const [done, setDone] = useState(false);
  const href = `https://rsiratchet.com/id/${refId}`;
  return (
    <button
      type="button"
      title={`Stable id. Click to copy ${href}`}
      onClick={async () => {
        try { await navigator.clipboard.writeText(href); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard unavailable */ }
      }}
      className="inline-flex items-center gap-1 rounded border border-neutral-300 px-1.5 py-0.5 font-mono text-xs text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300"
    >
      {refId}<span aria-hidden className="text-neutral-400">{done ? "✓" : "⧉"}</span>
    </button>
  );
}
