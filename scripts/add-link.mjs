// Take a URL Russ forwarded and turn it into a source record.
//
//   node scripts/add-link.mjs https://arxiv.org/abs/2609.01234
//   node scripts/add-link.mjs https://x.com/someone/status/123  --note "why this matters"
//   node scripts/add-link.mjs https://someco.com/blog/post --kind vendor-doc
//   node scripts/add-link.mjs --til <existing-source-id>      # just feature it
//
// Hand-forwarded links are the best selection signal available. Measured: even
// SWE-bench and Lost in the Middle drew single-digit points on Hacker News, so
// automated buzz cannot pick a paper of the day for this corpus. A person who
// reads X can.
//
// Creates the source only. Drafting a claim from it stays a separate step, so
// that nothing is asserted as a side effect of saving a link.
import fs from "node:fs";
import crypto from "node:crypto";
import YAML from "yaml";

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const url = args.find((a) => a.startsWith("http"));
const tilOnly = arg("til");
const note = arg("note");
const noFeature = args.includes("--no-feature"); // evidence ingestion adds sources without putting them on the front page
const TODAY = new Date().toISOString().slice(0, 10);

function featureIt(sourceId, why) {
  const existing = fs.existsSync("pipeline/til.yaml") ? YAML.parse(fs.readFileSync("pipeline/til.yaml", "utf8")) : {};
  fs.writeFileSync("pipeline/til.yaml", YAML.stringify({
    ...existing, source: sourceId, why: why ?? "forwarded by hand as worth a look",
    forwarded: true, picked_at: TODAY,
    note: "Picked as something worth a look, not as something judged correct. Nothing here is vouched for by being featured.",
  }, { lineWidth: 78 }));
  console.log(`featured ${sourceId} on the front page`);
}

if (tilOnly) { featureIt(tilOnly, note); process.exit(0); }
if (!url) { console.error("Give a URL, or --til <source-id>."); process.exit(1); }

const wrap = (t, ind = "  ") => {
  const words = String(t).replace(/\s+/g, " ").trim().split(" ");
  const out = []; let line = ind;
  for (const w of words) { if (line.length + w.length + 1 > 76) { out.push(line); line = ind; } line += (line === ind ? "" : " ") + w; }
  if (line.trim()) out.push(line);
  return out.join("\n");
};

const arxiv = url.match(/arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5})/)?.[1];
let id, body;

if (arxiv) {
  const res = await fetch(`https://export.arxiv.org/api/query?id_list=${arxiv}`);
  const xml = await res.text();
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) { console.error(`arXiv returned nothing for ${arxiv} (it rate-limits; try again shortly).`); process.exit(1); }
  const g = (tag) => entry.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.replace(/\s+/g, " ").trim();
  const authors = [...entry.matchAll(/<name>(.*?)<\/name>/g)].map((m) => m[1]);
  const date = g("published")?.slice(0, 10);
  id = `arxiv-${arxiv.replace(".", "-")}`;
  body = [
    `id: ${id}`, "kind: paper", `title: ${JSON.stringify(g("title"))}`,
    "authors:", ...authors.slice(0, 8).map((a) => `  - ${JSON.stringify(a)}`),
    `year: ${date?.slice(0, 4)}`, `date: ${date}`, `arxiv_id: "${arxiv}"`,
    `url: https://arxiv.org/abs/${arxiv}`, "tags: [forwarded]",
    "summary: >-", wrap(g("summary")?.slice(0, 700) ?? ""),
    ...(note ? ["notes: >-", wrap(note)] : []),
    `ingested_at: ${TODAY}`, "",
  ].join("\n");
} else {
  // Anything else is archived, because posts and vendor pages are edited and
  // deleted. An unarchived citation quietly stops being checkable.
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "modelselfhelp/0.1" } });
  if (!res.ok) { console.error(`fetch failed: HTTP ${res.status}`); process.exit(1); }
  const html = await res.text();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? url;
  const text = html
    .replace(/<(script|style|nav|footer|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l.length > 40);
  const host = new URL(url).hostname.replace(/^www\./, "");
  const kind = arg("kind") ?? (/(x|twitter)\.com|reddit\.com/.test(host) ? "post" : "vendor-doc");
  id = arg("id") ?? `${host.split(".")[0]}-${TODAY.slice(0, 4)}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").split("-").filter(Boolean).slice(0, 5).join("-")}`;
  body = [
    `id: ${id}`, `kind: ${kind}`, `title: ${JSON.stringify(title.slice(0, 160))}`,
    `year: ${TODAY.slice(0, 4)}`, `url: ${url}`, `content_url: ${url}`,
    `retrieved_at: ${TODAY}`, `content_checked_at: ${TODAY}`,
    `content_sha256: ${crypto.createHash("sha256").update(html).digest("hex")}`,
    "tags: [forwarded]", "summary: >-", wrap(text.slice(0, 3).join(" ").slice(0, 500)),
    ...(note ? ["notes: >-", wrap(note)] : []),
    "archived_text: |", ...text.map((l) => "  " + l),
    `ingested_at: ${TODAY}`, "",
  ].join("\n");
}

const file = `catalog/sources/${id}.yaml`;
if (fs.existsSync(file)) { console.log(`${id} already exists${noFeature ? "" : "; featuring it instead"}.`); console.log(`source-id: ${id}`); if (!noFeature) featureIt(id, note); process.exit(0); }
fs.writeFileSync(file, body);
console.log(`wrote ${file}`);
console.log(`source-id: ${id}`);
if (!noFeature) featureIt(id, note);
console.log(`\nNext: npm run validate, then draft a claim from it.`);
