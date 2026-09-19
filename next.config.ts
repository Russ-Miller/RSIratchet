import type { NextConfig } from "next";
import fs from "node:fs";
import YAML from "yaml";

// /id/<ref> -> the record's page. Refs are stable; slugs are not. The map is
// read from the allocation ledger at build time, so it needs no runtime.
const SECTION: Record<string, string> = { CAP: "capabilities", CLM: "claims", TEC: "techniques", SRC: "sources", ADG: "adages", MOD: "models" };
function refRedirects() {
  const ledger = YAML.parse(fs.readFileSync("catalog/ids.yaml", "utf8")) as { refs: Record<string, string> };
  return Object.entries(ledger.refs)
    .filter(([ref]) => SECTION[ref.slice(0, 3)] !== "models") // no model pages yet
    .map(([ref, slug]) => ({ source: `/id/${ref}`, destination: `/${SECTION[ref.slice(0, 3)]}/${slug}`, permanent: false }));
}

const nextConfig: NextConfig = {
  async redirects() { return refRedirects(); },
};

export default nextConfig;
