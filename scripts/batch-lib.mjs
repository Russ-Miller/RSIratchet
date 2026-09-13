// The Message Batches API for the nightly pipeline: same requests, half the
// price, results in minutes to an hour instead of now. Nothing here is
// latency-sensitive, so this is the cheapest lever there is.
//
// Shape: a stage builds its requests as [{ key, params }], where `key` is a
// small JSON object that lets the stage find the thing the result belongs to
// (a queue file and candidate id, a source id). runBatch submits them, waits
// up to a deadline, and hands back [{ key, message }] for what finished. If
// the batch outlives the deadline, its id and keys are written to
// pipeline/batches.json and the next run's collectPending picks the results
// up first. So a slow batch costs a night's latency, never a lost request.
//
// Structured outputs work in batches (output_config.format), but the parse()
// helper does not, so parseStructured() does the JSON + schema step.
import fs from "node:fs";

const STATE = "pipeline/batches.json";
export const BATCH_DISCOUNT = 0.5;

const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : { pending: [] });
const writeState = (s) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + "\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Keys of requests already in flight for a stage, so a run does not resubmit them. */
export function pendingKeys(stage) {
  return readState().pending.filter((b) => b.stage === stage).flatMap((b) => Object.values(b.keys));
}

async function drain(client, record) {
  const results = [];
  const usage = { input: 0, output: 0, cacheRead: 0, errored: 0, expired: 0 };
  for await (const r of await client.messages.batches.results(record.id)) {
    const key = record.keys[r.custom_id];
    if (r.result.type === "succeeded") {
      const u = r.result.message.usage ?? {};
      usage.input += u.input_tokens ?? 0; usage.output += u.output_tokens ?? 0; usage.cacheRead += u.cache_read_input_tokens ?? 0;
      results.push({ key, message: r.result.message });
    } else if (r.result.type === "errored") {
      usage.errored++;
      console.log(`  batch item ${r.custom_id} errored: ${r.result.error?.type ?? "unknown"}`);
    } else {
      usage.expired++;
    }
  }
  return { results, usage };
}

/**
 * Submit one batch for a stage and wait for it, up to deadlineMs. Returns
 * { results, usage, pendingId }: pendingId is set when the deadline passed
 * and the batch was left in flight for the next run.
 */
export async function runBatch(client, stage, items, { deadlineMs = 25 * 60_000, pollMs = 30_000 } = {}) {
  if (!items.length) return { results: [], usage: { input: 0, output: 0, cacheRead: 0, errored: 0, expired: 0 } };
  const keys = {};
  const requests = items.map((it, i) => { const id = `${stage}-${i}`; keys[id] = it.key; return { custom_id: id, params: it.params }; });
  const created = await client.messages.batches.create({ requests });
  const record = { id: created.id, stage, submitted_at: new Date().toISOString(), keys };
  const state = readState(); state.pending.push(record); writeState(state);
  console.log(`  batch ${created.id}: ${items.length} request(s) submitted (${stage})`);

  const start = Date.now();
  let batch = created;
  while (batch.processing_status !== "ended") {
    if (Date.now() - start > deadlineMs) {
      console.log(`  batch ${created.id} still ${batch.processing_status} after ${Math.round(deadlineMs / 60_000)} min; results will be collected next run`);
      return { results: [], usage: { input: 0, output: 0, cacheRead: 0, errored: 0, expired: 0 }, pendingId: created.id };
    }
    await sleep(pollMs);
    batch = await client.messages.batches.retrieve(created.id);
  }
  const { results, usage } = await drain(client, record);
  const s = readState(); s.pending = s.pending.filter((b) => b.id !== created.id); writeState(s);
  console.log(`  batch ${created.id} ended in ${Math.round((Date.now() - start) / 1000)}s: ${results.length} ok, ${usage.errored} errored, ${usage.expired} expired`);
  return { results, usage };
}

/** Results of earlier batches for this stage that have since ended. Leaves unfinished ones pending. */
export async function collectPending(client, stage) {
  const state = readState();
  const mine = state.pending.filter((b) => b.stage === stage);
  const out = { results: [], usage: { input: 0, output: 0, cacheRead: 0, errored: 0, expired: 0 } };
  for (const record of mine) {
    let batch;
    try { batch = await client.messages.batches.retrieve(record.id); }
    catch (e) { console.log(`  pending batch ${record.id}: ${e?.message ?? e}; dropping`); state.pending = state.pending.filter((b) => b.id !== record.id); continue; }
    if (batch.processing_status !== "ended") { console.log(`  pending batch ${record.id} still ${batch.processing_status}`); continue; }
    const { results, usage } = await drain(client, record);
    out.results.push(...results);
    for (const k of Object.keys(usage)) out.usage[k] += usage[k];
    state.pending = state.pending.filter((b) => b.id !== record.id);
    console.log(`  collected batch ${record.id} from ${record.submitted_at.slice(0, 10)}: ${results.length} result(s)`);
  }
  writeState(state);
  return out;
}

/** JSON text of a structured-output message, validated against a zod schema. Null when it does not parse. */
export function parseStructured(message, schema) {
  const text = (message.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  try { return schema.parse(JSON.parse(text)); } catch { return null; }
}

export const batchCost = (usage, priceIn, priceOut) => BATCH_DISCOUNT * ((usage.input / 1e6) * priceIn + (usage.output / 1e6) * priceOut);
