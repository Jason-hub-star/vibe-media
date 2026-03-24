import Link from "next/link";

import type { BriefListItem } from "@vibehub/content-contracts";

import { presentFreshness } from "@/features/shared/presenter/present-freshness";
import { presentRelativeDate } from "@/features/shared/presenter/present-relative-date";
import { presentReadTime } from "@/features/shared/presenter/present-read-time";

import { briefStatusPublicCopy } from "../presenter/present-brief-status";

interface BriefCardProps {
  brief: BriefListItem;
  isLead?: boolean;
}

export function BriefCard({ brief, isLead }: BriefCardProps) {
  const isPublished = brief.status === "published" && brief.publishedAt;
  const freshness = isPublished ? presentFreshness(brief.publishedAt!) : null;
  const dateLabel = isPublished
    ? presentRelativeDate(brief.publishedAt!)
    : briefStatusPublicCopy[brief.status];

  const badgeClass = freshness
    ? `status freshness-${freshness}`
    : `status status-${brief.status}`;

  const panelClass = ["panel", "stack-tight", isLead && "brief-lead"]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={panelClass}>
      <div className="row-between">
        <span className={badgeClass}>{dateLabel}</span>
        <span className="eyebrow">
          {brief.sourceCount} sources
          {brief.readTimeMinutes != null && (
            <> · {presentReadTime(brief.readTimeMinutes)}</>
          )}
        </span>
      </div>
      <h3>{brief.title}</h3>
      <p className="muted">{brief.summary}</p>
      {brief.whyItMatters && (
        <p className="brief-insight">{brief.whyItMatters}</p>
      )}
      {brief.bodyPreview && (
        <div className="brief-preview">{brief.bodyPreview}</div>
      )}
      {brief.sourceDomains && brief.sourceDomains.length > 0 && (
        <div className="tag-row">
          {brief.sourceDomains.map((domain) => (
            <span className="source-chip" key={domain}>{domain}</span>
          ))}
        </div>
      )}
      <Link className="inline-link" href={`/brief/${brief.slug}`}>
        Read brief
      </Link>
    </article>
  );
}
