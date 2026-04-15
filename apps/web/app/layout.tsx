import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Noto_Sans_KR } from "next/font/google";
import { headers } from "next/headers";

import { rootCssVariables } from "@vibehub/design-tokens";

import { Analytics } from "@/components/Analytics";
import { GaClickTracker } from "@/components/GaClickTracker";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/constants";
import { DEFAULT_LOCALE, isValidLocale } from "@/lib/i18n";

import "./globals.css";

const NAVER_SITE_VERIFICATION = process.env.NAVER_SITE_VERIFICATION;
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;
const LOCALE_HEADER = "x-vibehub-locale";
const ORGANIZATION_SAME_AS = [
  "https://github.com/vibehub",
  process.env.THREADS_PROFILE_URL,
  process.env.YOUTUBE_CHANNEL_URL
].filter((value): value is string => Boolean(value));

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display"
});

const body = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body"
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VibeHub — Daily AI Briefs",
    template: "%s | VibeHub"
  },
  description:
    "Curated AI news briefs from 30+ global sources, published daily.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg"
  },
  openGraph: {
    type: "website",
    siteName: "VibeHub",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image"
  },
  verification:
    GOOGLE_SITE_VERIFICATION || NAVER_SITE_VERIFICATION
      ? {
          ...(GOOGLE_SITE_VERIFICATION
            ? { google: GOOGLE_SITE_VERIFICATION }
            : {}),
          ...(NAVER_SITE_VERIFICATION
            ? {
                other: {
                  "naver-site-verification": NAVER_SITE_VERIFICATION
                }
              }
            : {})
        }
      : undefined,
  robots: { index: true, follow: true },
  alternates: {
    types: { "application/rss+xml": "/feed.xml" }
  }
};

function resolveHtmlLang(value: string | null): string {
  if (!value) return DEFAULT_LOCALE;
  const normalized = value.trim().toLowerCase();
  return isValidLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const htmlLang = resolveHtmlLang(requestHeaders.get(LOCALE_HEADER));

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
      </head>
      <body className={`${display.variable} ${body.variable}`}>
        <style>{rootCssVariables}</style>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "VibeHub",
            url: SITE_URL,
            logo: `${SITE_URL}/brand/logo-mark.svg`,
            ...(ORGANIZATION_SAME_AS.length > 0
              ? { sameAs: ORGANIZATION_SAME_AS }
              : {}),
            description:
              "Curated AI news briefs from 30+ global sources, published daily."
          }}
        />
        <GaClickTracker />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
