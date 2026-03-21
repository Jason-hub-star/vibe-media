import Link from "next/link";
import Image from "next/image";

const navItems = [
  { href: "/", label: "Hub" },
  { href: "/brief", label: "Brief" },
  { href: "/radar", label: "Radar" },
  { href: "/sources", label: "Sources" },
  { href: "/newsletter", label: "Newsletter" },
  { href: "/admin", label: "Admin" }
];

export function SiteHeader() {
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
        <nav className="nav-links" aria-label="Primary">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
