import { NextResponse, type NextRequest } from "next/server";

const V2_ORIGIN = "https://v2.legalintakeflow.com";

/** Hosts that should permanently redirect to the V2 app (path + query preserved). */
const REDIRECT_HOSTS = new Set([
  "legalintakeflow.com",
  "www.legalintakeflow.com",
]);

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase();

  // Path-preserving redirect: legalintakeflow.com/foo?x=1 → v2.legalintakeflow.com/foo?x=1
  // Works even when Vercel domain UI redirects are unavailable.
  if (REDIRECT_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = "v2.legalintakeflow.com";
    url.port = "";
    // 308 preserves method; permanent for SEO/bookmarks
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/admin") || pathname.startsWith("/partner")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
