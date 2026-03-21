import type { Metadata } from "next";
import localFont from "next/font/local";

import { rootCssVariables } from "@vibehub/design-tokens";

import "./globals.css";

const display = localFont({
  src: "../public/fonts/press-start-2p/PressStart2P.woff2",
  variable: "--font-display"
});

const body = localFont({
  src: "../public/fonts/DungGeunMo/DungGeunMo.woff2",
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "VibeHub Media Hub",
  description: "AI brief publishing hub and admin operations cockpit."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${display.variable} ${body.variable}`}>
        <style>{rootCssVariables}</style>
        {children}
      </body>
    </html>
  );
}
