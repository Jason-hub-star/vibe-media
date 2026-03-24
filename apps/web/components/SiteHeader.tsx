"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Hub" },
  { href: "/brief", label: "Brief" },
  { href: "/radar", label: "Radar" },
  { href: "/sources", label: "Sources" },
  { href: "/newsletter", label: "Newsletter" }
];

export function SiteHeader() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="shell row-between">
        <Link className="brand-lockup" href="/">
          <Image alt="VibeHub" height={48} src="/brand/logo-mark.svg" width={48} />
          <div>
            <strong>VibeHub</strong>
            <p className="eyebrow">media operations</p>
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
            <Link href={item.href} key={item.href} onClick={() => setNavOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
