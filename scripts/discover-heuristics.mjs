// Resumable full-paper discovery. Paper text stays in ignored .cache; only short grounded passages publish.
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { loadCatalog, ROOT } from "./catalog-lib.mjs";
import { DISCOVERY_VERSION, DiscoveryResponse, SYSTEM, hash, sourceFingerprint, validateDiscovery } from "./heuristic-discovery-lib.mjs";

import { fetchPaperDocument } from "./paper-document-lib.mjs";

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const flag = (name) => args.includes(`--${name}`);
const positive = (name, fallback) => {
  const v = Number(arg(name, fallback));
  if (!Number.isFinite(v) || v <= 0) throw new Error(`--${name} must be positive`);
  return v;
};
if (!flag("paid-api") && !flag("inventory-only") && !flag("dry-run")) {
  throw new Error("Paid API extraction is disabled by default. Use prepare-heuristic-reviews.mjs for session review; --paid-api explicitly opts into separately billed provider calls.");
}
const output = path.resolve(ROOT, arg("output", "discovery/heuristics"));
const cache = path.join(ROOT, ".cache/heuristic-discovery");
const model = arg("model", process.env.HEURISTIC_MODEL || "claude-opus-5");
const maxCost = positive("max-cost-usd", 5);
const inputRate = positive("input-usd-per-million", 5), outputRate = positive("output-usd-per-million", 25);
const limit = flag("all") ? Infinity : positive("limit", 10);
const maxChars = positive("max-chars", 120000);
const maxTokens = 3600;
const MAX_FETCH_ERRORS = 3;

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + ".tmp", JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(file + ".tmp", file);
}
function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}
const cat = loadCatalog();
const papers = cat.sources.map((s) => s.data).filter((s) => s.kind === "paper").sort((a, b) => a.id.localeCompare(b.id));
const heuristics = cat.heuristics.map((h) => ({ id: h.data.id, statement: h.data.statement }));
const today = new Date().toISOString();
const inventory = { version: DISCOVERY_VERSION, sources: papers.map((s) => ({ source: s.id, fingerprint: sourceFingerprint(s) })) };
writeJson(path.join(output, "inventory.json"), inventory);
const work = papers.map((s) => {
  const old = readJson(path.join(output, "papers", `${s.id}.json`));
  const fresh = !old || old.fingerprint !== sourceFingerprint(s);
  const eligible = flag("force") || fresh || old.status === "failed" ||
    (old.status === "unavailable" && flag("retry-unavailable")) ||
    (old.truncated && old.supplied_chars < maxChars);
  return { source: s, eligible, priority: fresh ? 0 : old?.status === "failed" ? 1 : 2 };
}).filter((w) => w.eligible && (!arg("id") || w.source.id === arg("id")))
  .sort((a, b) => a.priority - b.priority || a.source.id.localeCompare(b.source.id))
  .slice(0, limit).map((w) => w.source);
console.log(`${papers.length} paper records inventoried; ${work.length} selected; ${flag("inventory-only") ? "inventory only" : flag("dry-run") ? "dry run" : `model ${model}, estimated spend ceiling $${maxCost}`}`);
if (flag("inventory-only") || flag("dry-run")) process.exit(0);
if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is missing; inventory saved, no papers marked reviewed");
// Prevent two local invocations from spending against the same review queue.
fs.mkdirSync(cache, { recursive: true });
const lock = path.join(cache, `run-${hash(output).slice(0, 12)}.lock`);
try { fs.writeFileSync(lock, String(process.pid), { flag: "wx" }); }
catch { throw new Error(`Another run may be active. Inspect ${lock} before removing a stale lock.`); }
process.once("exit", () => { fs.rmSync(lock, { force: true }); });
process.once("SIGINT", () => process.exit(130));
process.once("SIGTERM", () => process.exit(143));
const client = new Anthropic({ maxRetries: 0, timeout: 90000 });
let spent = 0, reserved = 0, processed = 0, errors = 0, unavailable = 0, fetchErrors = 0;
let inputTokens = 0, outputTokens = 0, stop = false, cursor = 0;
const concurrency = Math.min(8, Math.floor(positive("concurrency", 1)));
const run = { started_at: today, model, requested: work.length, estimated_spend_usd: 0, input_usd_per_million: inputRate, output_usd_per_million: outputRate, outcomes: {}, stopped_reason: null };
const runFile = path.join(output, "last-run.json");
function saveRun() {
  writeJson(runFile, { ...run, updated_at: new Date().toISOString(), estimated_spend_usd: Number(spent.toFixed(6)), input_tokens: inputTokens, output_tokens: outputTokens, outcomes: { processed, errors, unavailable } });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fetchQueue = Promise.resolve(), nextFetch = 0;
function waitTurn() {
  const turn = fetchQueue.then(async () => {
    await sleep(Math.max(0, nextFetch - Date.now()));
    nextFetch = Date.now() + Number(arg("delay-ms", 3500));
  });
  fetchQueue = turn.catch(() => {});
  return turn;
}
async function processPaper(source) {
  const file = path.join(output, "papers", `${source.id}.json`);
  const base = { version: DISCOVERY_VERSION, source: source.id, fingerprint: sourceFingerprint(source), attempted_at: new Date().toISOString(), candidates: [] };
  let document;
  try {
    const cached = readJson(path.join(cache, `${source.id}.json`));
    if (cached?.fingerprint === base.fingerprint && typeof cached.text === "string" && hash(cached.text) === cached.text_sha256) document = cached;
    else {
      document = await fetchPaperDocument(source, waitTurn);
      if (!document) {
        unavailable++;
        writeJson(file, { ...base, status: "unavailable", reason: "No usable full text with verified source identity; paper not reviewed." });
        console.log(`${source.id}: full text unavailable`); saveRun(); return;
      }
      writeJson(path.join(cache, `${source.id}.json`), document);
    }
  } catch (e) {
    errors++; fetchErrors++;
    const reason = `Paper fetch failed (${e.cause?.code ?? e.name}); paper not reviewed.`;
    writeJson(file, { ...base, status: "failed", reason });
    console.log(`${source.id}: ${reason}`);
    if (fetchErrors >= MAX_FETCH_ERRORS) { run.stopped_reason = "Repeated paper fetch errors; remaining papers left unattempted."; stop = true; }
    saveRun(); return;
  }
  fetchErrors = 0;
  if (stop) return;
  const text = document.text.slice(0, maxChars);
  const prompt = JSON.stringify({ title: source.title, existing_heuristics: heuristics, TEXT: text });
  const reservation = ((Buffer.byteLength(prompt + SYSTEM) + 1024) * inputRate + maxTokens * outputRate) / 1e6;
  if (spent + reserved + reservation > maxCost) { run.stopped_reason = "Estimated spend ceiling reached; remaining papers left unattempted."; stop = true; saveRun(); return; }
  reserved += reservation;
  let usageRecorded = false, raw = null;
  try {
    const message = await client.messages.create({
      model, max_tokens: maxTokens,
      output_config: { effort: "low", format: zodOutputFormat(DiscoveryResponse) },
      system: SYSTEM, messages: [{ role: "user", content: prompt }],
    });
    const usage = message.usage ?? {};
    inputTokens += usage.input_tokens ?? 0; outputTokens += usage.output_tokens ?? 0;
    spent += ((usage.input_tokens ?? 0) * inputRate + (usage.output_tokens ?? 0) * outputRate) / 1e6;
    usageRecorded = true;
    if (message.stop_reason !== "end_turn") throw new Error(`Incomplete model response (${message.stop_reason})`);
    raw = JSON.parse(message.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
    let result = DiscoveryResponse.parse(raw);
    if (result.outcome === "candidates" && result.candidates.length) {
      const admitted = [], rejected = [];
      for (const c of result.candidates) {
        try { validateDiscovery({ ...result, candidates: [c] }, text, heuristics.map((h) => h.id)); admitted.push(c); }
        catch (e) { rejected.push({ candidate: c, reason: String(e.message).slice(0, 500) }); }
      }
      if (rejected.length) writeJson(path.join(cache, `rejected-${source.id}.json`), { response: raw, rejected, at: new Date().toISOString() });
      if (!admitted.length) throw new Error("All proposed candidates failed evidence admission");
      result = { ...result, candidates: admitted };
    }
    result = validateDiscovery(result, text, heuristics.map((h) => h.id));
    writeJson(file, { ...base, status: result.outcome === "none" ? "none" : "candidates", reason: result.reason, candidates: result.candidates,
      model, text_url: document.text_url, text_sha256: document.text_sha256, retrieved_at: document.retrieved_at,
      supplied_chars: text.length, total_chars: document.text.length, truncated: text.length < document.text.length,
      input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    processed++;
    console.log(`${source.id}: ${result.candidates.length ? `${result.candidates.length} candidates` : "no actionable heuristic"}${text.length < document.text.length ? " (partial text)" : ""}`);
  } catch (e) {
    if (raw) writeJson(path.join(cache, `rejected-${source.id}.json`), { response: raw, error: String(e.message).slice(0, 500), at: new Date().toISOString() });
    if (!usageRecorded) spent += reservation;
    errors++;
    writeJson(file, { ...base, status: "failed", reason: `Extraction failed (${e.status ? `HTTP ${e.status}` : e.name}); no result accepted.`, model });
    console.log(`${source.id}: extraction failed: ${usageRecorded ? String(e.message).slice(0, 180) : `provider HTTP ${e.status ?? "error"}`}`);
    // Reject bad evidence, continue with other papers. Provider failures stop new paid calls.
    if (!usageRecorded) { run.stopped_reason = "Provider error; remaining papers left unattempted."; stop = true; }
  } finally { reserved -= reservation; saveRun(); }
}
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (!stop && cursor < work.length) { const source = work[cursor++]; await processPaper(source); }
}));
run.finished_at = new Date().toISOString(); saveRun();
console.log(JSON.stringify(readJson(runFile), null, 2));
if (errors) process.exitCode = 1;
