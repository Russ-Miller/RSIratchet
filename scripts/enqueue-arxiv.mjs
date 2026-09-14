// Put hand-forwarded arXiv papers through the same pipeline as the nightly
// fetch: a source record now (from the abstract page, which answers when the
// export API does not), and a queue entry so the next run classifies,
// briefs and drafts them at batch rates.
//
//   node scripts/enqueue-arxiv.mjs 2310.03714 2507.19457 --note "from the DAIR harness collection"
//
// A paper with no capability match is queued anyway: the classifier skips
// it, but the proposal stage sees it, which is how a forwarded paper about
// something the map lacks gets a chance to say so.
import fs from "node:fs";
import YAML from "yaml";
import { matchCapabilities } from "./match-lib.mjs";

const args = process.argv.slice(2);
const noteIdx = args.indexOf("--note");
const note = noteIdx >= 0 ? args[noteIdx + 1] : undefined;
const ids = args.filter((a, i) => /^\d{4}\.\d{4,5}$/.test(a) && i !== noteIdx + 1);
if (!ids.length) { console.log("no arXiv ids given"); process.exit(1); }
const TODAY = new Date().toISOString().slice(0, 10);

async function meta(id) {
  const html = await (await fetch(`https://arxiv.org/abs/${id}`, { headers: { "User-Agent": "rsiratchet/0.1" } })).text();
  const m = (n) => [...html.matchAll(new RegExp(`<meta name="${n}" content="([^"]*)"`, "g"))].map((x) => x[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'"));
  const title = m("citation_title")[0];
  const authors = m("citation_author").map((a) => (a.includes(",") ? a.split(", ").reverse().join(" ") : a));
  const date = m("citation_date")[0]?.replace(/\//g, "-");
  const abstract = (html.match(/<blockquote class="abstract[^"]*">\s*<span[^>]*>Abstract:<\/span>\s*([\s\S]*?)<\/blockquote>/) || [])[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!title || !abstract) throw new Error(`abstract page for ${id} did not parse`);
  return { title, authors, date, abstract };
}

const queueFile = `pipeline/queue/forwarded_${TODAY}.yaml`;
const queue = fs.existsSync(queueFile) ? YAML.parse(fs.readFileSync(queueFile, "utf8")) : { window: { from: TODAY, to: TODAY }, generated_at: TODAY, forwarded: true, candidates: [] };
queue.candidates ??= [];
let sources = 0, queued = 0;
for (const id of ids) {
  const sid = `arxiv-${id.replace(".", "-")}`;
  const srcPath = `catalog/sources/${sid}.yaml`;
  let m;
  try { m = await meta(id); } catch (e) { console.log(`${id}: ${e.message}`); continue; }
  if (!fs.existsSync(srcPath)) {
    const rec = { id: sid, kind: "paper", title: m.title, authors: m.authors.slice(0, 8), year: Number(m.date.slice(0, 4)), date: m.date, arxiv_id: id, url: `https://arxiv.org/abs/${id}`, tags: ["forwarded"], summary: m.abstract.slice(0, 900) + (m.abstract.length > 900 ? "…" : ""), ...(note ? { notes: `Forwarded by Russ ${TODAY}: ${note}` } : {}), ingested_at: TODAY };
    fs.writeFileSync(srcPath, YAML.stringify(rec, { lineWidth: 78 }));
    sources++;
  }
  if (!queue.candidates.some((c) => c.arxiv_id === id)) {
    const cand = { openalex_id: `forwarded:${id}`, score: 0, signals: ["forwarded"], capabilities: [], title: m.title, date: m.date, arxiv_id: id, authors: m.authors.slice(0, 8), venue: "arXiv", abstract: m.abstract };
    cand.capabilities = matchCapabilities(cand);
    queue.candidates.push(cand);
    queued++;
    console.log(`${id}  ${m.title.slice(0, 60).padEnd(60)}  -> ${cand.capabilities.join(", ") || "(no capability match; proposal stage only)"}`);
  }
  await new Promise((r) => setTimeout(r, 1500));
}
fs.writeFileSync(queueFile, YAML.stringify(queue, { lineWidth: 100 }));
console.log(`\n${sources} source(s) created, ${queued} queued in ${queueFile}`);
