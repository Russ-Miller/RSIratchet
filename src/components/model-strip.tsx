import Link from "next/link";

/**
 * The whole data model in one line, shown wherever a reader might arrive
 * without it. "Claim" reads as "assertion" to most people; this says what a
 * claim here actually carries.
 */
export function ModelStrip({ compact = false }: { compact?: boolean }) {
  const parts: [string, string, string][] = [
    ["/capabilities", "Capabilities", "are the topics."],
    ["/claims", "Claims", "are the findings: one scoped statement, with the sources that support or contest it."],
    ["/techniques", "Techniques", "are the fixes; whether a fix works is itself a claim."],
    ["/sources", "Sources", "are the evidence."],
    ["/adages", "Adages", "are borrowed rules, tested the same way."],
  ];
  return (
    <p className={`max-w-3xl rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300 ${compact ? "text-xs" : ""}`}>
      {parts.map(([href, name, rest], i) => (
        <span key={href}>{i > 0 && " "}<Link href={href} className="font-semibold hover:underline">{name}</Link> {rest}</span>
      ))}
    </p>
  );
}
