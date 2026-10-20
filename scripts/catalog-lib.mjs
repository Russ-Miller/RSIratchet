// Shared loader for catalog scripts. Plain ESM so scripts run with `node`.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
export const CATALOG = path.join(ROOT, "catalog");
export const KINDS = ["capabilities", "sources", "techniques", "models", "claims", "heuristics"];

export function readYamlDir(dir) {
  const full = path.join(CATALOG, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort()
    .map((f) => ({
      file: path.join(dir, f),
      stem: f.replace(/\.ya?ml$/, ""),
      data: YAML.parse(fs.readFileSync(path.join(full, f), "utf8")),
    }));
}

export function loadCatalog() {
  const out = { taxonomy: YAML.parse(fs.readFileSync(path.join(CATALOG, "taxonomy.yaml"), "utf8")) };
  for (const k of KINDS) out[k] = readYamlDir(k);
  return out;
}

export function loadSchema(name) {
  return JSON.parse(fs.readFileSync(path.join(CATALOG, "schema", `${name}.schema.json`), "utf8"));
}
