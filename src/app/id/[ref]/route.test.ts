import fs from "node:fs";
import YAML from "yaml";
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("stable reference redirects", () => {
  it("preserves every non-model ledger destination and query string", async () => {
    const { refs } = YAML.parse(fs.readFileSync("catalog/ids.yaml", "utf8")) as { refs: Record<string, string> };
    const sections: Record<string, string> = { CAP: "capabilities", CLM: "claims", TEC: "techniques", SRC: "sources", ADG: "heuristics" };
    for (const [ref, slug] of Object.entries(refs)) {
      const section = sections[ref.slice(0, 3)];
      if (!section) continue;
      const response = await GET(new Request(`https://rsiratchet.com/id/${ref}?from=review`), { params: Promise.resolve({ ref }) });
      expect(response.status, ref).toBe(307);
      expect(response.headers.get("location"), ref).toBe(`https://rsiratchet.com/${section}/${slug}?from=review`);
    }
  });

  it.each(["CLM-999999", "MOD-0001", "unknown", "toString"])("returns 404 for %s", async (ref) => {
    const response = await GET(new Request(`https://rsiratchet.com/id/${ref}`), { params: Promise.resolve({ ref }) });
    expect(response.status).toBe(404);
    expect(response.headers.has("location")).toBe(false);
  });
});
