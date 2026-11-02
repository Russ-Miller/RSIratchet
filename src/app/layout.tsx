import type { Metadata } from "next";
import Link from "next/link";
import { NavLinks, RepoLink, SessionLink } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rsiratchet.com"),
  title: { default: "RSI Ratchet", template: "%s · RSI Ratchet" },
  description: "A shared reasoning bank for agents. Explore heuristics, inspect the research, and learn where the guidance fails.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <header className="site-header">
          <nav className="site-nav" aria-label="Main navigation">
            <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">↗</span>RSI Ratchet</Link>
            <NavLinks />
            <RepoLink />
          </nav>
        </header>
        <main id="main-content" className="site-main flex-1">{children}</main>
        <footer className="site-footer">
          <div className="footer-inner">
            <div><Link href="/" className="brand">RSI Ratchet</Link><p>A shared reasoning bank for agents.</p></div>
            <nav aria-label="Evidence library" className="footer-links">
              <Link href="/research">Research overview</Link><Link href="/capabilities">Capabilities</Link><Link href="/claims">Claims</Link><Link href="/techniques">Techniques</Link><Link href="/sources">Sources</Link><SessionLink />
            </nav>
            <p className="footer-note">Early development. Evidence and review status are shown with each entry.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
