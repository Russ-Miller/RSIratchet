// Paper text and figure-grounding, shared by scripts/summarize-sources.mjs and
// scripts/draft-claims.mjs.
//
// Shared rather than copied for the reason recorded in docs/decisions.md: a
// second implementation of a rule answers a subtly different question than the
// first, and the difference shows up as a false finding rather than an error.
const MAX_FULLTEXT_CHARS = 60000;

/** Numbers a digest asserts, minus the ones that are safely rhetorical.
 *  The lookbehind matters: without it "GPT-3." yields the figure "3", which
 *  then fails the check and buries a real invention under false positives. */
export function figuresIn(text) {
  const nums = text.match(/(?<![A-Za-z-])\d[\d,]*(?:\.\d+)?\s*%?/g) ?? [];
  return [...new Set(nums.map((n) => n.trim()))]
    // "1 model", "2 ways" -- bare small integers are counting words in this
    // style, not claims about results, and checking them produces only noise.
    .filter((n) => !/^\d$/.test(n));
}

// The style demands numerals, so the model correctly renders a source's "six
// frameworks" as "6". Without this the check calls a grounded figure invented,
// and false positives are what make a checker useless.
const WORD_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000, million: 1000000, billion: 1000000000,
};

const norm = (s) => s.replace(/,/g, "").replace(/\s+/g, "");

/** The source text with spelled-out numbers also present as digits. */
function haystack(text) {
  const digits = text.replace(/\b([a-z]+)\b/gi, (m, w) => {
    const n = WORD_NUMBERS[w.toLowerCase()];
    return n === undefined ? m : `${m} ${n}`;
  });
  return norm(text) + "|" + norm(digits);
}

/** A figure counts as grounded if it appears in the abstract, ignoring commas
 *  and spacing. Deliberately loose: the goal is catching invention, not
 *  punishing formatting. */
export function unverified(brief, source) {
  const hay = haystack(source);
  // In a rendered table the unit often sits in the column header, so the body
  // holds "76.89" where the digest correctly writes "76.89%". Match on the
  // numeric core as well. This trades away catching a unit swap, which is far
  // rarer and milder than invention -- and a checker that cries wolf gets
  // ignored, which costs more than the case it would catch.
  const grounded = (f) => hay.includes(norm(f)) || hay.includes(norm(f.replace(/[%\s]/g, "")));
  return figuresIn(brief).filter((f) => !grounded(f));
}

/**
 * arXiv's LaTeXML HTML rendering, where it exists. Only papers from roughly
 * December 2023 onward have it, which is exactly the set the nightly pipeline
 * ingests -- so new work gets summarized from the paper and the back catalogue
 * falls back to its abstract. A brief records which it got in `brief_source`,
 * because the two are not equally trustworthy and the number check means much
 * more against full text.
 */
export async function fetchFullText(arxivId) {
  const res = await fetch(`https://arxiv.org/html/${arxivId}`, { redirect: "follow" });
  if (!res.ok) return null;
  const html = await res.text();
  // A paper without a rendering serves a short placeholder page rather than a 404.
  if (/No HTML for this paper|html is not available/i.test(html)) return null;
  const text = html
    .replace(/<(script|style|nav|footer)[\s\S]*?<\/\1>/gi, " ")
    // LaTeXML emits every formula twice: the rendered MathML and an
    // <annotation> holding the LaTeX source. Stripping tags without dropping
    // the annotation interleaves them, which corrupts numbers -- 19,000 came
    // out as "19true000" and "37" as "37 37". A corrupted figure then reads as
    // an invented one, which is the worst possible failure for the check.
    .replace(/<annotation[\s\S]*?<\/annotation>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u200b\u200c\u200d\u00ad]/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  // Everything after the bibliography is citations, which would flood the
  // figure check with numbers the paper never claimed.
  const cut = text.search(/\b(References|Bibliography)\b/);
  const body = (cut > 2000 ? text.slice(0, cut) : text).slice(0, MAX_FULLTEXT_CHARS);
  return body.length > 4000 ? body : null;
}

/**
 * Abstracts for many ids in one request. arXiv rate-limits per request, not per
 * id, so fetching 62 papers one at a time spends most of its life in backoff
 * while a handful of batched calls sail through. id_list takes a comma-separated
 * list; max_results has to be raised to match or it silently returns 10.
 */
/** arXiv's own title for each id. The check that would have caught a
 *  mis-attached id from OpenAlex before it was filed. */
export async function fetchTitles(ids, attempt = 0) {
  const url = `https://export.arxiv.org/api/query?id_list=${ids.join(",")}&max_results=${ids.length}`;
  const res = await fetch(url);
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 6) throw new Error(`arXiv ${res.status} after ${attempt} retries`);
    const wait = Math.min(300000, 15000 * 2 ** attempt);
    console.log(`  arXiv ${res.status}, retrying in ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
    return fetchTitles(ids, attempt + 1);
  }
  if (!res.ok) throw new Error(`arXiv ${res.status}`);
  const xml = await res.text();
  const out = new Map();
  for (const entry of xml.split("<entry>").slice(1)) {
    const id = entry.match(/<id>https?:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/)?.[1]?.replace(/v\d+$/, "");
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    if (id && title) out.set(id, title.replace(/\s+/g, " ").trim());
  }
  return out;
}

export const sameTitle = (a, b) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === b.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function fetchAbstracts(ids, attempt = 0) {
  const url = `https://export.arxiv.org/api/query?id_list=${ids.join(",")}&max_results=${ids.length}`;
  const res = await fetch(url);
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 6) throw new Error(`arXiv ${res.status} after ${attempt} retries`);
    const wait = Math.min(300000, 15000 * 2 ** attempt);
    console.log(`  arXiv ${res.status}, retrying in ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
    return fetchAbstracts(ids, attempt + 1);
  }
  if (!res.ok) throw new Error(`arXiv ${res.status}`);
  const xml = await res.text();
  const out = new Map();
  for (const entry of xml.split("<entry>").slice(1)) {
    const id = entry.match(/<id>https?:\/\/arxiv\.org\/abs\/([^<v]+)/)?.[1];
    const abs = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1];
    if (id && abs) out.set(id, abs.replace(/\s+/g, " ").trim());
  }
  return out;
}

// ---------------------------------------------------------------------------

