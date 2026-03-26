import type { Metadata } from "next";
import { Space_Grotesk, Noto_Sans_KR } from "next/font/google";

import { rootCssVariables } from "@vibehub/design-tokens";

import { Analytics } from "@/components/Analytics";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/constants";

import "./globals.css";

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
  robots: { index: true, follow: true },
  alternates: {
    types: { "application/rss+xml": "/feed.xml" }
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <style>{rootCssVariables}</style>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "VibeHub",
            url: SITE_URL,
            logo: `${SITE_URL}/brand/logo-mark.svg`,
            description:
              "Curated AI news briefs from 30+ global sources, published daily."
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
