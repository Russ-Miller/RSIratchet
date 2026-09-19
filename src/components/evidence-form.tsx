"use client";

import { useRef, useState } from "react";

const REPO = "https://github.com/Russ-Miller/RSIratchet";

/**
 * "Add support" / "Contest" on a claim. Opens an inline form: a link, or a
 * few sentences in a small rich-text box (bold, italic, links), or both. Posts
 * to /api/evidence, which files a GitHub issue the nightly run ingests into a
 * source on the claim. If the API is not configured, falls back to opening
 * the same content as a prefilled GitHub issue.
 *
 * Nothing here waits on a reviewer. The point of the form is that anyone can
 * push evidence either way, and the counts on the claim move when it lands.
 */
export function EvidenceForm({ claimId, refId, statement }: { claimId: string; refId?: string; statement: string }) {
  const [stance, setStance] = useState<"supports" | "contests" | null>(null);
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "busy" | "done" | "error"; msg?: string; url?: string }>({ kind: "idle" });
  const editor = useRef<HTMLDivElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  // Editor HTML -> plain Markdown-ish text. Enough for bold, italic, links and paragraphs.
  const editorText = () => {
    const root = editor.current;
    if (!root) return "";
    const walk = (n: Node): string => {
      if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? "";
      if (n.nodeType !== Node.ELEMENT_NODE) return "";
      const el = n as HTMLElement;
      const inner = Array.from(el.childNodes).map(walk).join("");
      switch (el.tagName) {
        case "B": case "STRONG": return `**${inner}**`;
        case "I": case "EM": return `*${inner}*`;
        case "A": return `[${inner}](${el.getAttribute("href") ?? ""})`;
        case "BR": return "\n";
        case "DIV": case "P": return `${inner}\n`;
        case "LI": return `- ${inner}\n`;
        default: return inner;
      }
    };
    return walk(root).replace(/\n{3,}/g, "\n\n").trim();
  };

  const exec = (cmd: string, arg?: string) => { document.execCommand(cmd, false, arg); editor.current?.focus(); };
  const addLink = () => { const u = window.prompt("Link URL"); if (u) exec("createLink", u); };

  const fallbackUrl = (text: string) => {
    const verb = stance === "supports" ? "Support" : "Contest";
    const body = `claim: ${claimId}\n${refId ? `ref: ${refId}\n` : ""}stance: ${stance}\n${link ? `link: ${link}\n` : ""}${name ? `submitted_by: ${name}\n` : ""}\n## Evidence\n\n${text || "(link only)"}\n`;
    return `${REPO}/issues/new?title=${encodeURIComponent(`${verb}: ${claimId}`)}&body=${encodeURIComponent(body)}&labels=evidence`;
  };

  const submit = async () => {
    const text = editorText();
    if (!link && text.length < 20) { setState({ kind: "error", msg: "Give a link, or at least a sentence of evidence." }); return; }
    setState({ kind: "busy" });
    try {
      const res = await fetch("/api/evidence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: claimId, ref: refId, stance, link, text, name, website: honeypot.current?.value ?? "" }),
      });
      if (res.status === 503) { window.open(fallbackUrl(text), "_blank", "noopener"); setState({ kind: "done", msg: "Opened as a GitHub issue for you to submit." }); return; }
      const data = await res.json();
      if (!res.ok) { setState({ kind: "error", msg: data.error ?? "Could not file it." }); return; }
      setState({ kind: "done", msg: "Filed. It joins this claim on the next nightly run.", url: data.url });
    } catch {
      setState({ kind: "error", msg: "Network error. Try again, or use the GitHub link below." });
    }
  };

  const btn = "rounded border px-3 py-1.5 text-xs transition-colors";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setStance("supports"); setState({ kind: "idle" }); }} aria-pressed={stance === "supports"}
          className={`${btn} ${stance === "supports" ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 text-neutral-700 hover:border-emerald-600 dark:border-neutral-700 dark:text-neutral-300"}`}>
          &uarr; Add support
        </button>
        <button type="button" onClick={() => { setStance("contests"); setState({ kind: "idle" }); }} aria-pressed={stance === "contests"}
          className={`${btn} ${stance === "contests" ? "border-red-600 bg-red-600 text-white" : "border-neutral-300 text-neutral-700 hover:border-red-600 dark:border-neutral-700 dark:text-neutral-300"}`}>
          &darr; Contest this claim
        </button>
        <span className="text-xs text-neutral-500">Either way, bring evidence: a link, or what you saw.</span>
      </div>

      {stance && state.kind !== "done" && (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3 rounded border border-neutral-200 p-3 dark:border-neutral-800">
          <p className="text-sm">
            <span className="font-medium">{stance === "supports" ? "Supporting" : "Contesting"}:</span>{" "}
            <span className="text-neutral-600 dark:text-neutral-400">{statement}</span>
          </p>
          <label className="block text-xs">
            <span className="text-neutral-500">Link to a paper, post or page (it gets ingested as a source)</span>
            <input id={`ev-link-${claimId}`} type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://arxiv.org/abs/… or any page"
              className="mt-1 w-full rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" />
          </label>
          <div className="text-xs">
            <span className="text-neutral-500">Or say what you saw. Setup and result, so someone else could check it.</span>
            <div className="mt-1 flex gap-1">
              <button type="button" onClick={() => exec("bold")} className="rounded border border-neutral-300 px-2 py-0.5 font-bold dark:border-neutral-700" title="Bold">B</button>
              <button type="button" onClick={() => exec("italic")} className="rounded border border-neutral-300 px-2 py-0.5 italic dark:border-neutral-700" title="Italic">I</button>
              <button type="button" onClick={addLink} className="rounded border border-neutral-300 px-2 py-0.5 underline dark:border-neutral-700" title="Link">link</button>
              <button type="button" onClick={() => exec("insertUnorderedList")} className="rounded border border-neutral-300 px-2 py-0.5 dark:border-neutral-700" title="List">&bull; list</button>
            </div>
            <div ref={editor} id={`ev-text-${claimId}`} contentEditable role="textbox" aria-multiline="true" aria-label="Evidence"
              className="mt-1 min-h-24 w-full rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none focus:border-neutral-500 dark:border-neutral-700" />
          </div>
          <label className="block text-xs">
            <span className="text-neutral-500">Your name or handle (optional, for attribution)</span>
            <input id={`ev-name-${claimId}`} type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full max-w-xs rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" />
          </label>
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={state.kind === "busy"}
              className="rounded bg-neutral-900 px-3 py-1.5 text-xs text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900">
              {state.kind === "busy" ? "Filing…" : stance === "supports" ? "File support" : "File contest"}
            </button>
            {state.kind === "error" && <span className="text-xs text-red-700 dark:text-red-400">{state.msg}</span>}
            <a href={fallbackUrl("")} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:underline">or file on GitHub</a>
          </div>
          <p className="text-xs text-neutral-500">
            What you file is public and goes into the catalog under your name or as anonymous. Text becomes an observation source; a link becomes a paper or post source.
          </p>
        </form>
      )}

      {state.kind === "done" && (
        <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {state.msg}{state.url && <> <a href={state.url} target="_blank" rel="noopener noreferrer" className="underline">Track it</a>.</>}
        </p>
      )}
    </div>
  );
}
