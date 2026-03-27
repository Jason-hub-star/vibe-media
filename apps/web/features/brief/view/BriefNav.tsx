import Link from "next/link";

interface BriefNavProps {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  locale?: string;
}

export function BriefNav({ prev, next, locale }: BriefNavProps) {
  if (!prev && !next) return null;
  const prefix = locale ? `/${locale}/brief` : "/brief";

  return (
    <nav className="brief-nav">
      {prev ? (
        <Link href={`${prefix}/${prev.slug}`}>← {prev.title}</Link>
      ) : (
        <span className="brief-nav-spacer" />
      )}
      {next ? (
        <Link href={`${prefix}/${next.slug}`}>{next.title} →</Link>
      ) : (
        <span className="brief-nav-spacer" />
      )}
    </nav>
  );
}
