"use client";

import { useState } from "react";

/**
 * The record's stable id, with an explicit Share control beside it. The slug
 * in the URL can change when a label is rewritten; the /id/<ref> link cannot,
 * so that is the link Share hands out. On devices with a share sheet it opens
 * that; elsewhere it copies to the clipboard and says so.
 */
export function RefTag({ refId, title }: { refId: string; title?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const href = `https://rsiratchet.com/id/${refId}`;
  const flash = (s: "copied" | "failed") => { setState(s); setTimeout(() => setState("idle"), 1800); };
  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: title ?? refId, url: href }); return; } catch { /* dismissed; fall through to copy */ }
    }
    try { await navigator.clipboard.writeText(href); flash("copied"); }
    catch { window.prompt("Copy this link", href); flash("failed"); }
  };
  return (
    <span className="inline-flex items-center gap-2">
      <code className="rounded border border-neutral-300 px-1.5 py-0.5 font-mono text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-300" title="Stable id; never changes or gets reused">{refId}</code>
      <button
        type="button"
        onClick={share}
        aria-live="polite"
        title={`Share a permanent link: ${href}`}
        className="inline-flex items-center gap-1 rounded border border-neutral-300 px-2 py-0.5 text-xs font-medium text-neutral-700 hover:border-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
      >
        <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>
        {state === "copied" ? "Link copied" : state === "failed" ? "Copy the link shown" : "Share link"}
      </button>
    </span>
  );
}
