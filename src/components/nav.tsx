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
  { href: "/capabilities", label: "Capabilities" },
  { href: "/claims", label: "Claims" },
  { href: "/techniques", label: "Techniques" },
  { href: "/adages", label: "Adages" },
  { href: "/ratchet", label: "The ratchet" },
  { href: "/about", label: "About" },
  // Everything from here on is gated by src/proxy.ts and hidden unless signed in.
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
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "font-medium text-neutral-900 underline decoration-2 underline-offset-8 dark:text-neutral-100"
                : "text-neutral-600 hover:text-neutral-900 hover:underline hover:underline-offset-8 dark:text-neutral-400 dark:hover:text-neutral-100"
            }
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
