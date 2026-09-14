// Gate for the working pages: anything right of Adages in the nav. Runs
// only on the matched paths; every other page stays a static file served
// with no code in front of it. Visitors without a valid session are sent
// to /login and brought back afterwards.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const session = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/open-questions/:path*", "/queue/:path*", "/drafts/:path*", "/how-this-works/:path*"],
};
