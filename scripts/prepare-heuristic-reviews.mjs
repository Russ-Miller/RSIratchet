// Download research text for review inside a Codex session. No model SDK, API key, or inference calls.
import fs from "node:fs";
import path from "node:path";
import { loadCatalog, ROOT } from "./catalog-lib.mjs";
import { fetchPaperDocument } from "./paper-document-lib.mjs";
import { hash, sourceFingerprint } from "./heuristic-discovery-lib.mjs";
const args = process.argv.slice(2);
const at = args.indexOf("--ids");
if (at < 0 || !args[at + 1]) throw new Error("Pass --ids source-id,source-id (up to 10 papers per review batch)");
const ids = [...new Set(args[at + 1].split(","))];
if (ids.length > 10) throw new Error("Prepare at most 10 papers per session batch");
const sources = new Map(loadCatalog().sources.map((s) => [s.data.id, s.data]));
const root = path.join(ROOT, ".cache/heuristic-discovery");
fs.mkdirSync(root, { recursive: true });
let nextRequest = 0;
async function pace() { await new Promise((r) => setTimeout(r, Math.max(0, nextRequest - Date.now()))); nextRequest = Date.now() + 3500; }
const batch = { prepared_at: new Date().toISOString(), mode: "codex-session", external_inference_calls: 0, papers: [] };
for (const id of ids) {
  const s = sources.get(id);
  if (!s || s.kind !== "paper") throw new Error(`Unknown paper ${id}`);
  const file = path.join(root, `${id}.json`);
  try {
    let document = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
    if (document?.fingerprint !== sourceFingerprint(s) || typeof document?.text !== "string" || hash(document.text) !== document.text_sha256) {
      document = await fetchPaperDocument(s, pace);
      if (!document) { batch.papers.push({ source: id, status: "unavailable" }); continue; }
      fs.writeFileSync(file, JSON.stringify(document, null, 2) + "\n");
    }
    batch.papers.push({ source: id, status: "ready", chars: document.text.length, text_sha256: document.text_sha256, text_url: document.text_url });
    console.log(`${id}: ready (${document.text.length} characters; no inference call)`);
  } catch (e) { batch.papers.push({ source: id, status: "fetch-failed", error: e.cause?.code ?? e.name }); console.log(`${id}: fetch failed`); }
}
fs.writeFileSync(path.join(root, "session-batch.json"), JSON.stringify(batch, null, 2) + "\n");
