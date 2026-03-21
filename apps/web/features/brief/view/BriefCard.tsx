import Link from "next/link";

import type { BriefListItem } from "@vibehub/content-contracts";

import { briefStatusCopy } from "../presenter/present-brief-status";

export function BriefCard({ brief }: { brief: BriefListItem }) {
  return (
    <article className="panel stack-tight">
      <div className="row-between">
        <span className={`status status-${brief.status}`}>{briefStatusCopy[brief.status]}</span>
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
