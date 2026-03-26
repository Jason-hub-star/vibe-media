import Link from "next/link";

const productLinks = [
  { href: "/brief", label: "Brief" },
  { href: "/radar", label: "Radar" },
  { href: "/sources", label: "Sources" },
  { href: "/newsletter", label: "Newsletter" }
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" }
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-col">
          <p className="footer-heading">Product</p>
          <ul className="footer-links">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <p className="footer-heading">Legal</p>
          <ul className="footer-links">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <p className="footer-heading">Connect</p>
          <ul className="footer-links">
            <li>
              <a href="https://github.com/vibehub" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
            <li>
              <a href="/feed.xml" target="_blank" rel="noopener noreferrer">
                RSS Feed
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-col footer-brand">
          <p className="footer-logo">VibeHub</p>
          <p className="eyebrow">
            Daily AI news briefs, curated from global sources.
          </p>
        </div>
      </div>

      <div className="shell footer-bottom">
        <p className="muted">&copy; {new Date().getFullYear()} VibeHub. All rights reserved.</p>
      </div>
    </footer>
  );
}
