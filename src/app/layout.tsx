import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { NavLinks, RepoLink, SessionLink } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://rsiratchet.com"),
  title: { default: "RSI Ratchet", template: "%s · RSI Ratchet" },
  description: "Where AI models fall short, the evidence, and reproducible ways to fix it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          {/* Wraps rather than overflowing: eight links did not fit a phone,
              and a nav that pushes the page sideways breaks every screen, not
              just its own. gap-x/gap-y differ so wrapped rows stay compact. */}
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold tracking-tight">RSI Ratchet</Link>
            <NavLinks />
            <RepoLink />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-8 flex-1">{children}</main>
        <footer className="border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 px-4 py-4">
            <span>Pre-alpha. Catalog content is reviewed by pull request.</span>
            <SessionLink />
          </div>
        </footer>
      </body>
    </html>
  );
}
