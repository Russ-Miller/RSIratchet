import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MARKER_COOKIE, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(MARKER_COOKIE, "", { httpOnly: false, path: "/", maxAge: 0 });
  return res;
}
