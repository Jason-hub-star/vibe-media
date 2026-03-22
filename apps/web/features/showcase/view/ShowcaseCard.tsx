import Link from "next/link";

import type { ShowcaseEntry, ShowcaseLink } from "@vibehub/content-contracts";

function ActionLink({
  link,
  className
}: {
  link: ShowcaseLink;
  className: string;
}) {
  if (link.href.startsWith("/")) {
    return (
      <Link className={className} href={link.href}>
        {link.label}
      </Link>
    );
  }

  return (
    <a className={className} href={link.href} rel="noreferrer" target="_blank">
      {link.label}
    </a>
  );
}

export function ShowcaseCard({ entry }: { entry: ShowcaseEntry }) {
  const coverAsset = entry.coverAsset || "/placeholders/source-strip-placeholder.svg";
  const secondaryLinks = entry.links.slice(0, 2);

  return (
    <article className="panel showcase-card">
      <div
        aria-hidden="true"
        className="showcase-cover"
        style={{ backgroundImage: `url("${coverAsset}")` }}
      />
      <div className="stack-tight">
        <div className="row-between showcase-meta">
          <p className="eyebrow">Showcase</p>
          {entry.authorLabel ? <span className="showcase-author">{entry.authorLabel}</span> : null}
        </div>
        <div className="stack-tight">
          <h3>{entry.title}</h3>
          <p className="muted">{entry.summary}</p>
        </div>
        <div className="tag-row">
          {entry.tags.map((tag) => (
            <span className="tag-chip" key={`${entry.id}-${tag}`}>
              {tag}
            </span>
          ))}
        </div>
        <div className="button-row">
          <ActionLink className="button-primary" link={entry.primaryLink} />
          {secondaryLinks.map((link) => (
            <ActionLink className="button-secondary" key={`${entry.id}-${link.label}`} link={link} />
          ))}
        </div>
      </div>
    </article>
  );
}
