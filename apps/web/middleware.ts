/**
 * Next.js Middleware — locale 감지 + 리다이렉트.
 * admin/, api/, _next/, 정적 파일은 제외.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Static for Edge runtime performance. Must match content-contracts locales.ts.
const SUPPORTED_LOCALES = ["en", "es"];
const DEFAULT_LOCALE = "en";
const LOCALE_HEADER = "x-vibehub-locale";

function withLocaleHeader(request: NextRequest, locale: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/** locale prefix 없이 접근한 public 경로를 /en/... 으로 리다이렉트 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // admin Basic Auth gate
  if (pathname.startsWith("/admin")) {
    const expected = process.env.ADMIN_BASIC_AUTH;
    if (expected) {
      const authHeader = request.headers.get("authorization") ?? "";
      const match = authHeader.match(/^Basic\s+(.+)$/i);
      const decoded = match ? atob(match[1]) : "";
      if (decoded !== expected) {
        return new NextResponse("Unauthorized", {
          status: 401,
          headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
        });
      }
    }
    const acceptLang = request.headers.get("accept-language") ?? "";
    return withLocaleHeader(request, detectLocale(acceptLang));
  }

  // api, _next, 정적 파일은 제외
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/placeholders") ||
    pathname.startsWith("/sprites") ||
    pathname === "/favicon.svg" ||
    pathname === "/favicon.ico" ||
    pathname === "/ads.txt" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/feed.xml"
  ) {
    return NextResponse.next();
  }

  // 이미 locale prefix가 있으면 통과
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0])) {
    return withLocaleHeader(request, segments[0]);
  }

  // locale 감지: Accept-Language 헤더 기반
  const acceptLang = request.headers.get("accept-language") ?? "";
  const detected = detectLocale(acceptLang);

  // 리다이렉트: /brief/slug → /en/brief/slug (301)
  const url = request.nextUrl.clone();
  url.pathname = `/${detected}${pathname}`;
  return NextResponse.redirect(url, 301);
}

function detectLocale(acceptLanguage: string): string {
  // 간단한 파싱: "es-MX,es;q=0.9,en;q=0.8" → "es"
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, qStr] = lang.trim().split(";q=");
      return { code: code.split("-")[0].toLowerCase(), q: qStr ? parseFloat(qStr) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { code } of languages) {
    if (SUPPORTED_LOCALES.includes(code)) return code;
  }

  return DEFAULT_LOCALE;
}

export const config = {
  matcher: [
    // 모든 경로 매칭 (정적 파일 제외는 middleware 내부에서 처리)
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
