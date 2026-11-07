import { notFound } from "next/navigation";
import { DraftsPage } from "@/components/drafts-page";
import { DRAFTS_PER_PAGE, getDrafts } from "@/lib/drafts";

export const metadata = { title: "Drafts" };
export const dynamicParams = false;

export function generateStaticParams() {
  const count = Math.ceil(getDrafts().length / DRAFTS_PER_PAGE);
  return Array.from({ length: Math.max(0, count - 1) }, (_, i) => ({ page: String(i + 2) }));
}

export default async function Page({ params }: PageProps<"/drafts/page/[page]">) {
  const { page } = await params;
  const number = Number(page);
  if (!Number.isSafeInteger(number) || number < 2 || String(number) !== page
    || number > Math.ceil(getDrafts().length / DRAFTS_PER_PAGE)) notFound();
  return <DraftsPage page={number} />;
}
