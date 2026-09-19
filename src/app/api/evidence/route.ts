import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Files a reader's evidence for or against a claim as a GitHub issue labelled
// `evidence`. The nightly ingester turns it into a source on the claim. No
// account needed: the token is the site's, held server-side. If the token is
// not configured the client falls back to a prefilled GitHub issue link.
const REPO = "Russ-Miller/RSIratchet";
const MAX_TEXT = 6000;

// Cheap abuse limit: per-instance, per-IP, sliding minute. Not a defence
// against a determined attacker; enough to stop a stuck form.
const recent = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now); recent.set(ip, arr);
  return arr.length > 5;
}

export async function POST(request: NextRequest) {
  const token = process.env.EVIDENCE_GITHUB_TOKEN;
  if (!token) return NextResponse.json({ error: "not configured" }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const claim = String(body.claim ?? "").trim();
  const technique = String(body.technique ?? "").trim();
  const capability = String(body.capability ?? "").trim();
  const ref = String(body.ref ?? "").trim();
  const stance = body.stance === "contests" ? "contests" : body.stance === "supports" ? "supports" : null;
  const link = String(body.link ?? "").trim();
  const text = String(body.text ?? "").trim().slice(0, MAX_TEXT);
  const name = String(body.name ?? "").trim().slice(0, 80);
  if (String(body.website ?? "")) return NextResponse.json({ ok: true }); // honeypot filled: pretend
  const subject = technique || claim;
  if (!/^[a-z0-9-]+$/.test(subject) || !stance) return NextResponse.json({ error: "claim or technique, and stance, required" }, { status: 400 });
  if (technique && capability && !/^[a-z0-9-]+$/.test(capability)) return NextResponse.json({ error: "bad capability" }, { status: 400 });
  if (!link && text.length < 20) return NextResponse.json({ error: "give a link or at least a sentence of evidence" }, { status: 400 });
  if (link && !/^https?:\/\/\S+$/.test(link)) return NextResponse.json({ error: "link must be a URL" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return NextResponse.json({ error: "too many submissions, try again in a minute" }, { status: 429 });

  const verb = stance === "supports" ? "Support" : "Contest";
  const issue = {
    title: `${verb}: ${subject}`,
    labels: ["evidence"],
    body: [
      `<!-- evidence v1 -->`,
      technique ? `technique: ${technique}` : `claim: ${claim}`,
      technique && capability ? `capability: ${capability}` : "",
      ref ? `ref: ${ref}` : "",
      `stance: ${stance}`,
      link ? `link: ${link}` : "",
      name ? `submitted_by: ${name}` : "",
      ``,
      `## Evidence`,
      ``,
      text || "(link only)",
      ``,
      `---`,
      technique
        ? `Filed from https://rsiratchet.com/techniques/${technique}. The nightly run turns this into a claim about the technique with this as its source; if it does not, a person will.`
        : `Filed from https://rsiratchet.com/claims/${claim}. The nightly run turns this into a source on the claim; if it does not, a person will.`,
    ].filter((l) => l !== "").join("\n"),
  };
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "rsiratchet-evidence" },
    body: JSON.stringify(issue),
  });
  if (!res.ok) return NextResponse.json({ error: `github ${res.status}` }, { status: 502 });
  const data = (await res.json()) as { html_url: string; number: number };
  return NextResponse.json({ ok: true, url: data.html_url, number: data.number });
}
