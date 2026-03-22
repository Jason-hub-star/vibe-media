import Link from "next/link";

import type { BriefListItem } from "@vibehub/content-contracts";

import { briefStatusPublicCopy } from "../presenter/present-brief-status";

export function BriefCard({ brief }: { brief: BriefListItem }) {
  const label =
    brief.status === "published" && brief.publishedAt
      ? brief.publishedAt.slice(0, 10)
      : briefStatusPublicCopy[brief.status];

  return (
    <article className="panel stack-tight">
      <div className="row-between">
        <span className={`status status-${brief.status}`}>{label}</span>
        <span className="eyebrow">{brief.sourceCount} sources</span>
      </div>
      <h3>{brief.title}</h3>
      <p className="muted">{brief.summary}</p>
      <Link className="inline-link" href={`/brief/${brief.slug}`}>
        Read brief
      </Link>
    </article>
  );
}
