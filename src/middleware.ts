// Edge-safe middleware: redirects unauthenticated users on protected routes.
//
// We deliberately avoid importing Auth.js here — that would pull in Prisma,
// which doesn't run in the Edge runtime. Instead we just check whether a
// session cookie is present. The actual session is validated at the page
// level via `auth()` in each protected page (server component), which can
// run in the Node runtime and use Prisma.

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/submit", "/admin"];

// Auth.js v5 uses `authjs.session-token` (HTTPS secure variant prefixed).
// We also accept the legacy `next-auth.session-token` for older deployments.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (hasSession) return NextResponse.next();

  const url = new URL("/login", req.nextUrl);
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/submit/:path*", "/submit", "/admin/:path*", "/admin"],
};
