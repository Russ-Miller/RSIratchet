// Full-text adapters for discovery; never substitute abstracts for missing paper text.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { extractPaperText, hash, normalize, sourceFingerprint } from "./heuristic-discovery-lib.mjs";

const exec = promisify(execFile);
const titleKey = (s) => normalize(s).replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\[[^\]]+\]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const matchesTitle = (a, b) => !!titleKey(b) && titleKey(a).includes(titleKey(b));

export async function pdfText(bytes) {
  if (bytes.length > 40 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("Invalid or oversized PDF");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ratchet-paper-"));
  try {
    const input = path.join(dir, "paper.pdf"), output = path.join(dir, "paper.txt");
    fs.writeFileSync(input, bytes);
    await exec("pdftotext", ["-layout", input, output], { timeout: 30000, maxBuffer: 1024 * 1024 });
    const text = normalize(fs.readFileSync(output, "utf8"));
    return text.length >= 2000 ? text : null;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/** waitTurn is a shared request pacer, so concurrent model calls cannot accelerate arXiv requests. */
export async function fetchPaperDocument(source, waitTurn = async () => {}) {
  const get = async (url) => {
    await waitTurn();
    const response = await fetch(url, { signal: AbortSignal.timeout(45000), redirect: "follow" });
    if (response.status === 429 || response.status >= 500) throw new Error(`Paper host HTTP ${response.status}`);
    return response;
  };
  const base = { fingerprint: sourceFingerprint(source), retrieved_at: new Date().toISOString() };
  if (source.arxiv_id && /^\d{4}\.\d{4,5}(v\d+)?$/.test(source.arxiv_id)) {
    const stem = source.arxiv_id.replace(/v\d+$/, "");
    const htmlResponse = await get(`https://arxiv.org/html/${source.arxiv_id}`);
    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      const text = extractPaperText(html);
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
      if (text && matchesTitle(title, source.title)) {
        const versioned = html.match(new RegExp(stem.replace(".", "\\.") + "v\\d+"))?.[0];
        return { ...base, text, text_url: versioned ? `https://arxiv.org/html/${versioned}` : htmlResponse.url, text_sha256: hash(text), text_format: "html" };
      }
    }
    // Older papers often have no HTML. Verify title and version on the abstract page, then read the PDF.
    const absResponse = await get(`https://arxiv.org/abs/${source.arxiv_id}`);
    if (!absResponse.ok) return null;
    const abs = await absResponse.text();
    const title = abs.match(/<meta\s+name="citation_title"\s+content="([^"]+)"/i)?.[1] ?? "";
    if (!matchesTitle(title, source.title)) return null;
    const versioned = abs.match(new RegExp(stem.replace(".", "\\.") + "v\\d+"))?.[0] ?? source.arxiv_id;
    const pdfResponse = await get(`https://arxiv.org/pdf/${versioned}`);
    if (!pdfResponse.ok) return null;
    const text = await pdfText(Buffer.from(await pdfResponse.arrayBuffer()));
    return text ? { ...base, text, text_url: `https://arxiv.org/pdf/${versioned}`, text_sha256: hash(text), text_format: "pdf" } : null;
  }
  if (source.url && /^https:\/\//.test(source.url)) {
    const landing = await get(source.content_url ?? source.url);
    if (!landing.ok) return null;
    let pdfResponse = landing;
    if (!(landing.headers.get("content-type") ?? "").includes("pdf") && !/\.pdf(?:$|\?)/i.test(landing.url)) {
      const html = await landing.text();
      const pdf = html.match(/<meta\s+name="citation_pdf_url"\s+content="([^"]+)"/i)?.[1]
        ?? html.match(/href="([^"]+\.pdf(?:\?[^"]*)?)"/i)?.[1];
      if (!pdf) return null;
      pdfResponse = await get(new URL(pdf.replace(/&amp;/g, "&"), landing.url).href);
      if (!pdfResponse.ok) return null;
    }
    const text = await pdfText(Buffer.from(await pdfResponse.arrayBuffer()));
    if (!text || !matchesTitle(text.slice(0, 5000), source.title)) return null;
    return { ...base, text, text_url: pdfResponse.url, text_sha256: hash(text), text_format: "pdf" };
  }
  return null;
}
