import type { Metadata } from "next";
import { Space_Grotesk, Noto_Sans_KR } from "next/font/google";

import { rootCssVariables } from "@vibehub/design-tokens";

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
  title: "VibeHub Media Hub",
  description: "AI brief publishing hub and admin operations cockpit."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <style>{rootCssVariables}</style>
        {children}
      </body>
    </html>
  );
}
