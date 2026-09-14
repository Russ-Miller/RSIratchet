import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MARKER_COOKIE, SESSION_COOKIE, SESSION_DAYS, isAdminEmail, signSession, verifyPassword } from "@/lib/auth";

// Same response for a wrong email and a wrong password, and a small delay
// either way, so the form does not say which one was wrong.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");
  const ok = isAdminEmail(email) && verifyPassword(password, process.env.ADMIN_PASSWORD_HASH);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 400));
    const back = new URL("/login", request.url);
    back.searchParams.set("error", "1");
    if (next && next.startsWith("/")) back.searchParams.set("next", next);
    return NextResponse.redirect(back, 303);
  }
  const target = next.startsWith("/") ? next : "/";
  const res = NextResponse.redirect(new URL(target, request.url), 303);
  const secure = request.nextUrl.protocol === "https:";
  const maxAge = SESSION_DAYS * 86_400;
  res.cookies.set(SESSION_COOKIE, signSession(email.trim()), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge });
  res.cookies.set(MARKER_COOKIE, "1", { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge });
  return res;
}
