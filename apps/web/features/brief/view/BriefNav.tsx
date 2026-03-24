import Link from "next/link";

interface BriefNavProps {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

export function BriefNav({ prev, next }: BriefNavProps) {
  if (!prev && !next) return null;

  return (
    <nav className="brief-nav">
      {prev ? (
        <Link href={`/brief/${prev.slug}`}>← {prev.title}</Link>
      ) : (
        <span className="brief-nav-spacer" />
      )}
      {next ? (
        <Link href={`/brief/${next.slug}`}>{next.title} →</Link>
      ) : (
        <span className="brief-nav-spacer" />
      )}
    </nav>
  );
}
