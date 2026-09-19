// Turn reader-filed evidence (GitHub issues labelled `evidence`, created by
// /api/evidence or by hand from the same template) into sources on claims.
//
// For each open issue: parse claim, stance, optional link, text. A link
// becomes a source via add-link (paper, post or vendor-doc, archived). Text
// without a link becomes an observation source under the submitter's name.
// The source is appended to the claim with the stance; a contest marks the
// claim contested with a disagreement axis taken from the text, flagged as a
// guess. The issue gets a comment naming the source and is closed.
//
// Needs `gh` authenticated (GH_TOKEN in CI). Idempotent: an issue already
// commented by this script is skipped.
//
//   node scripts/ingest-evidence.mjs [--dry-run] [--limit N]
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const limit = Number(args[args.indexOf("--limit") + 1]) || 20;
const REPO = "Russ-Miller/RSIratchet";
const TODAY = new Date().toISOString().slice(0, 10);
const MARK = "<!-- ingested-by-rsi -->";

const gh = (...a) => execFileSync("gh", a, { encoding: "utf8" });
const issues = JSON.parse(gh("issue", "list", "-R", REPO, "--label", "evidence", "--state", "open", "--limit", String(limit), "--json", "number,title,body,author,comments,url"));
console.log(`${issues.length} open evidence issue(s)`);

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const wrap = (t, ind = "  ") => {
  const words = String(t).replace(/\s+/g, " ").trim().split(" ");
  const out = []; let line = ind;
  for (const w of words) { if (line.length + w.length + 1 > 76) { out.push(line); line = ind; } line += (line === ind ? "" : " ") + w; }
  if (line.trim()) out.push(line);
  return out.join("\n");
};

let done = 0, skipped = 0;
for (const it of issues) {
  if ((it.comments ?? []).some((c) => (c.body ?? "").includes(MARK))) { skipped++; continue; }
  const body = it.body ?? "";
  const field = (k) => body.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1]?.trim();
  const who = (() => { const b = body.match(/^submitted_by:\s*(.+)$/m)?.[1]?.trim(); return b ? `human:${b.replace(/[^A-Za-z0-9._@-]/g, "-").slice(0, 40)}` : `human:${it.author?.login ?? "anonymous"}`; })();
  let claimId = field("claim"); const techniqueId = field("technique"); const capField = field("capability");
  const stance = field("stance"); const link = field("link");
  const text = (body.split(/^## Evidence\s*$/m)[1] ?? "").split(/^---$/m)[0].trim().replace(/^\(link only\)$/m, "").trim();
  const fail = (why) => { console.log(`#${it.number}: ${why}`); skipped++; };

  // Technique evidence: whether a technique works is a claim, so file one
  // under the capability the technique addresses, then attach the source to
  // it exactly as for claim evidence.
  let newClaimFile = null;
  if (techniqueId) {
    const tpath = path.join("catalog/techniques", `${techniqueId}.yaml`);
    if (!fs.existsSync(tpath)) { fail(`unknown technique "${techniqueId}"`); continue; }
    const tech = YAML.parse(fs.readFileSync(tpath, "utf8"));
    const capId = capField && tech.addresses.includes(capField) ? capField : tech.addresses[0];
    const cpath = path.join("catalog/capabilities", `${capId}.yaml`);
    const capLabel = fs.existsSync(cpath) ? YAML.parse(fs.readFileSync(cpath, "utf8")).label : capId;
    const gist = text.split(/(?<=[.!?])\s/)[0]?.replace(/\s+/g, " ").slice(0, 200) || (link ? "see the linked source" : "");
    const statement = `${tech.label} ${stance === "supports" ? "helped" : "did not help"} with ${capLabel.toLowerCase()} in a reader-reported case: ${gist}`;
    claimId = `${slug(tech.label).split("-").slice(0, 5).join("-")}-${stance === "supports" ? "held" : "failed"}-reader-${it.number}`;
    newClaimFile = path.join("catalog/claims", `${claimId}.yaml`);
    if (!dry) fs.writeFileSync(newClaimFile, [
      `id: ${claimId}`, `capability: ${capId}`, `technique: ${techniqueId}`,
      "statement: >-", wrap(statement),
      "kind: observation", "backing_strength: own-observation",
      "sources: []", "contested: false", "status: pending-review", `last_checked_at: ${TODAY}`,
      "notes: >-", wrap(`Filed from a reader's report on the technique page (issue #${it.number}). One case, as reported; the source below holds the details. Not read against the technique's other evidence by anyone yet.`),
      `submitted_by: ${who}`, "",
    ].join("\n"));
  }
  const claimFile = path.join("catalog/claims", `${claimId}.yaml`);
  if (!claimId || (!newClaimFile && !fs.existsSync(claimFile))) { fail(`unknown claim "${claimId}"`); continue; }
  if (!["supports", "contests"].includes(stance)) { fail(`bad stance "${stance}"`); continue; }
  if (!link && text.length < 20) { fail("no link and no text"); continue; }

  let sourceId;
  if (dry) { console.log(`#${it.number}: would add ${stance} to ${claimId} from ${link ? link : "text"} (${who})`); done++; continue; }

  if (link) {
    // add-link writes the source file and prints "source-id: …". Non-arXiv
    // links are archived verbatim, which is what makes them citable later.
    let out;
    try { out = execFileSync(process.execPath, ["scripts/add-link.mjs", link, "--no-feature", ...(text ? ["--note", text.slice(0, 200)] : [])], { encoding: "utf8" }); }
    catch (e) { fail(`add-link failed: ${String(e.stdout || e.message).trim().split("\n").pop()}`); continue; }
    sourceId = out.match(/^source-id:\s*(\S+)$/m)?.[1];
    if (!sourceId) { fail("add-link gave no source id"); continue; }
  } else {
    // Text only: an observation, under the submitter's name, archived as given.
    sourceId = `obs-${TODAY.replace(/-/g, "")}-${slug(claimId).split("-").slice(0, 4).join("-")}-${it.number}`;
    const file = path.join("catalog/sources", `${sourceId}.yaml`);
    fs.writeFileSync(file, [
      `id: ${sourceId}`, "kind: observation",
      `title: ${JSON.stringify(`Reader observation on ${claimId} (issue #${it.number})`)}`,
      `date: ${TODAY}`, `ingested_at: ${TODAY}`, `url: ${it.url}`, "tags: [reader-filed]",
      `authors: [${JSON.stringify(who.replace(/^human:/, ""))}]`, `author_handle: ${JSON.stringify(who.replace(/^human:/, ""))}`,
      "summary: >-", wrap(text.slice(0, 600)),
      "notes: >-", wrap(`Filed by a reader through the site's evidence form as ${stance === "supports" ? "support for" : "a contest of"} ${claimId}. Recorded as given; not checked by anyone yet. The full text is below.`),
      "archived_text: |", text.split("\n").map((l) => `  ${l}`).join("\n"), "",
    ].join("\n"));
  }

  // Append to the claim. Textual edit of the sources list so the file keeps
  // its formatting; then flip contested if needed.
  let y = fs.readFileSync(claimFile, "utf8");
  const note = (text || (link ? `Reader-filed link, ${stance}. Not yet read against the claim.` : "")).replace(/\s+/g, " ").slice(0, 590);
  const entry = [
    `  - source: ${sourceId}`, `    stance: ${stance}`, "    note: >-", wrap(note, "      "), `    submitted_by: ${who}`, `    added_at: ${TODAY}`,
  ].join("\n") + "\n";
  if (/^sources:\s*\[\]\s*$/m.test(y)) y = y.replace(/^sources:\s*\[\]\s*$/m, `sources:\n${entry.trimEnd()}`);
  else {
    const m = y.match(/^sources:\s*\n((?:  - [\s\S]*?)(?=^\S))/m);
    if (!m) { fail("could not find sources list in claim"); continue; }
    y = y.replace(m[0], m[0] + entry);
  }
  if (stance === "contests" && !/^contested:\s*true/m.test(y)) {
    y = y.replace(/^contested:\s*false\s*$/m, `contested: true\ndisagreement_axis:\n  description: >-\n${wrap(`Reader-filed contest (issue #${it.number}): ${note.slice(0, 300)}`, "    ")}\n  is_guess: true`);
  }
  fs.writeFileSync(claimFile, y);

  gh("issue", "comment", String(it.number), "-R", REPO, "--body", `${MARK}\nFiled as source \`${sourceId}\` on https://rsiratchet.com/claims/${claimId} (${stance})${techniqueId ? `, a new claim about https://rsiratchet.com/techniques/${techniqueId}` : ""}. It goes live with the next catalog merge. Thank you.`);
  gh("issue", "close", String(it.number), "-R", REPO);
  console.log(`#${it.number}: ${stance} -> ${claimId} via ${sourceId}`);
  done++;
}
console.log(`ingested ${done}, skipped ${skipped}${dry ? " (dry run)" : ""}`);
