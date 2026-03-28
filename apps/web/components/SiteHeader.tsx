"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Hub" },
  { href: "/brief", label: "Brief" },
  { href: "/radar", label: "Radar" },
  { href: "/sources", label: "Submit Tool" },
  { href: "/newsletter", label: "Newsletter" }
];

function extractLocale(pathname: string): string {
  const seg = pathname.split("/")[1];
  return seg && /^[a-z]{2}$/.test(seg) ? seg : "en";
}

export function SiteHeader() {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const locale = extractLocale(pathname);

  return (
    <header className="site-header">
      <div className="shell row-between">
        <Link className="brand-lockup" href={`/${locale}`}>
          <Image alt="VibeHub" height={48} src="/brand/logo-mark.svg" width={48} />
          <div>
            <strong>VibeHub</strong>
            <p className="eyebrow">Daily AI Briefs</p>
          </div>
        </Link>
        <button
          aria-label="Toggle navigation"
          className="nav-toggle"
          onClick={() => setNavOpen((v) => !v)}
          type="button"
        >
          {navOpen ? "✕" : "☰"}
        </button>
        <nav className={`nav-links${navOpen ? " nav-open" : ""}`} aria-label="Primary">
          {navItems.map((item) => (
            <Link
              href={item.href === "/" ? `/${locale}` : `/${locale}${item.href}`}
              key={item.href}
              onClick={() => setNavOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
