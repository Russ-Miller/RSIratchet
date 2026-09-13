// Retroactive ingestion, one window at a time, walking backwards from where
// the nightly trailing window began toward an earliest date. State lives in
// pipeline/backfill.json on the pipeline-state branch, so each night's run
// picks up where the last left off and the whole back catalogue is covered
// once, with no window fetched twice.
//
//   node scripts/backfill.mjs                # one 7-day window, then stop
//   node scripts/backfill.mjs --weeks 3      # three windows tonight
//   node scripts/backfill.mjs --earliest 2022-11-30
//   node scripts/backfill.mjs --top 80           # keep more of each window
//
// Each historical week yields around 400 candidates, 120 of them matching a
// capability. Classifying all of them is about $1.65 a week and briefs and
// drafts roughly double that, so a window is pruned to its top-scored
// candidates before it is queued: --top 40 matched (about 45 classify items,
// $0.60) and --top-unmatched 30 for the proposal stage. With briefs and
// drafts that is about $2 a night; the score is the heuristic the fetch prints.
//
// Fetching is free (OpenAlex); the paid stages that follow are capped by
// their own --limit flags, and classify takes the freshest window first, so
// backfill never starves the nightly window of budget.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const STATE = "pipeline/backfill.json";
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const weeks = Number(arg("weeks") ?? 1);
const top = Number(arg("top") ?? 40);            // matched candidates kept per window
const topUnmatched = Number(arg("top-unmatched") ?? 30);
const iso = (d) => d.toISOString().slice(0, 10);
const minus = (s, days) => { const d = new Date(s); d.setUTCDate(d.getUTCDate() - days); return iso(d); };

// First run: start just before the earliest window the nightly job has
// already covered, so the two never overlap.
function initialNextTo() {
  const files = fs.existsSync("pipeline/queue") ? fs.readdirSync("pipeline/queue").filter((f) => /^\d{4}-\d{2}-\d{2}_/.test(f)) : [];
  const starts = files.map((f) => f.slice(0, 10)).sort();
  return starts[0] ?? minus(iso(new Date()), 7);
}

// Keep the best-scored candidates of a freshly fetched window, in two pools:
// those matching a capability (they go to the paid classifier) and those
// matching none (they feed the capability-proposal stage, which is how the
// open-ended map grows). Everything dropped stays in the seen-ledger, so it
// is a decision not to spend on it, not a loss.
function prune(file, keepMatched, keepUnmatched) {
  if (!fs.existsSync(file)) return;
  const YAML = require("yaml");
  const doc = YAML.parse(fs.readFileSync(file, "utf8"));
  const list = Array.isArray(doc) ? doc : doc.candidates;
  if (!Array.isArray(list)) return;
  const byScore = (a, b) => (b.score ?? 0) - (a.score ?? 0);
  const matched = list.filter((c) => (c.capabilities ?? []).length).sort(byScore);
  const unmatched = list.filter((c) => !(c.capabilities ?? []).length).sort(byScore);
  if (matched.length <= keepMatched && unmatched.length <= keepUnmatched) return;
  const kept = [...matched.slice(0, keepMatched), ...unmatched.slice(0, keepUnmatched)];
  const items = kept.reduce((n, c) => n + (c.capabilities ?? []).length, 0);
  if (Array.isArray(doc)) fs.writeFileSync(file, YAML.stringify(kept));
  else fs.writeFileSync(file, YAML.stringify({ ...doc, candidates: kept, pruned: { matched: keepMatched, unmatched: keepUnmatched } }));
  console.log(`  pruned ${file}: ${list.length} -> ${kept.length} (${Math.min(matched.length, keepMatched)} of ${matched.length} matched, ${items} classify items; ${Math.min(unmatched.length, keepUnmatched)} of ${unmatched.length} unmatched kept for proposals)`);
}

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : { next_to: initialNextTo(), earliest: "2026-01-01", done: [] };
if (arg("earliest")) state.earliest = arg("earliest");

for (let i = 0; i < weeks; i++) {
  if (state.next_to <= state.earliest) { console.log(`backfill complete: reached ${state.earliest}`); break; }
  const to = state.next_to;
  const from = minus(to, 7) < state.earliest ? state.earliest : minus(to, 7);
  console.log(`backfill window ${from} .. ${to}`);
  const r = spawnSync("node", ["scripts/fetch-openalex.mjs", "--from", from, "--to", to], { stdio: "inherit" });
  if (r.status !== 0) { console.log("fetch failed; cursor not advanced, will retry next run"); process.exit(0); }
  prune(`pipeline/queue/${from}_${to}.yaml`, top, topUnmatched);
  state.next_to = from;
  state.done.push({ from, to, at: iso(new Date()) });
}
fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");
console.log(`next backfill window ends ${state.next_to}; earliest ${state.earliest}; ${state.done.length} window(s) done`);
