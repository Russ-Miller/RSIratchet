"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

// The marker cookie is set alongside the session on sign-in and cleared on
// sign-out. It only decides what the nav shows; the proxy decides what the
// server serves. Read through useSyncExternalStore so the server snapshot
// (signed out) matches the static HTML and hydration agrees.
const MARKER = "rsi_admin_ui=1";
const noop = () => () => {};
const readMarker = () => document.cookie.split(";").some((c) => c.trim() === MARKER);
export function useIsAdmin(): boolean {
  return useSyncExternalStore(noop, readMarker, () => false);
}

const SECTIONS = [
  { href: "/heuristics", label: "Heuristics" },
  { href: "/research", label: "Research" },
  { href: "/about", label: "How it works" },
  { href: "/open-questions", label: "Open questions", admin: true },
  { href: "/queue", label: "Queue", admin: true },
  { href: "/drafts", label: "Drafts", admin: true },
];

export function NavLinks() {
  const pathname = usePathname() ?? "/";
  const admin = useIsAdmin();
  return (
    <>
      {SECTIONS.filter((s) => !s.admin || admin).map(({ href, label }) => {
        // Detail routes (/claims/some-id) keep their section marked active.
        const active = pathname === href || pathname.startsWith(`${href}/`) ||
          (href === "/research" && ["/ratchet", "/claims", "/techniques", "/capabilities", "/sources"].some((section) => pathname === section || pathname.startsWith(`${section}/`)));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="nav-link"
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

/** Footer: "Sign in" for visitors, "Sign out" for the admin. Deliberately quiet. */
export function SessionLink() {
  const admin = useIsAdmin();
  if (!admin) return <Link href="/login" className="hover:underline">Sign in</Link>;
  return (
    <form method="post" action="/api/logout" className="inline">
      <button type="submit" className="hover:underline">Sign out</button>
    </form>
  );
}

/** Right end of the nav: the repository for the admin, the MCP section for everyone else. */
export function RepoLink() {
  const admin = useIsAdmin();
  if (admin) {
    return <a href="https://github.com/Russ-Miller/RSIratchet" target="_blank" rel="noopener noreferrer" className="hover:underline sm:ml-auto">GitHub</a>;
  }
  return <Link href="/about#mcp" className="hover:underline sm:ml-auto">MCP</Link>;
}
