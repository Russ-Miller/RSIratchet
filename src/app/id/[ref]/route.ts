import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

// Keep the allocation ledger's destinations without one platform route per ref.
// Deleted records retain their entries, just as they did in next.config.ts.
const ledger = YAML.parse(fs.readFileSync(path.join(process.cwd(), "catalog", "ids.yaml"), "utf8")) as { refs: Record<string, string> };
const sections: Record<string, string> = {
  CAP: "capabilities", CLM: "claims", TEC: "techniques", SRC: "sources", ADG: "heuristics",
};

export async function GET(request: Request, { params }: RouteContext<"/id/[ref]">) {
  const { ref } = await params;
  const section = sections[ref.slice(0, 3)];
  const slug = ledger.refs[ref];
  if (!section || !slug) return new Response("Unknown reference", { status: 404 });
  const destination = new URL(request.url);
  destination.pathname = `/${section}/${slug}`;
  return Response.redirect(destination, 307);
}
