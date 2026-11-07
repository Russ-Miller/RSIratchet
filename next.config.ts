import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { NextConfig } from "next";

// Merged records: the old slug redirects to the record it was folded into.
const merged = YAML.parse(fs.readFileSync(path.join(process.cwd(), "catalog", "redirects.yaml"), "utf8")) as Record<string, Record<string, string>>;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Adages renamed to Heuristics; old links keep working.
      { source: "/adages", destination: "/heuristics", permanent: true },
      { source: "/adages/:id", destination: "/heuristics/:id", permanent: true },
      ...Object.entries(merged).flatMap(([section, map]) =>
        Object.entries(map ?? {}).map(([from, to]) => ({ source: `/${section}/${from}`, destination: `/${section}/${to}`, permanent: true }))),
    ];
  },
};

export default nextConfig;
