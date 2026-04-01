import Link from "next/link";

import type { BriefListItem } from "@vibehub/content-contracts";

import { presentFreshness } from "@/features/shared/presenter/present-freshness";
import { presentRelativeDate } from "@/features/shared/presenter/present-relative-date";
import { presentReadTime } from "@/features/shared/presenter/present-read-time";

import { briefStatusPublicCopy } from "../presenter/present-brief-status";
import { BriefCardCover } from "./BriefCardCover";

interface BriefCardProps {
  brief: BriefListItem;
  isLead?: boolean;
  locale?: string;
}

export function BriefCard({ brief, isLead, locale }: BriefCardProps) {
  const briefPrefix = locale ? `/${locale}/brief` : "/brief";
  const isPublished = brief.status === "published" && brief.publishedAt;
  const freshness = isPublished ? presentFreshness(brief.publishedAt!) : null;
  const dateLabel = isPublished
    ? presentRelativeDate(brief.publishedAt!)
    : briefStatusPublicCopy[brief.status];

  const badgeClass = freshness
    ? `status freshness-${freshness}`
    : `status status-${brief.status}`;

  const panelClass = [
    "panel",
    "stack-tight",
    "brief-card",
    isLead && "brief-lead",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={panelClass}>
      <BriefCardCover
        coverImage={brief.coverImage}
        title={brief.title}
        topic={brief.topic}
        slug={brief.slug}
        isLead={isLead}
      />

      {/* Tier 1 — instant scan */}
      <div className="row-between">
        <span className={badgeClass}>{dateLabel}</span>
        <span className="eyebrow">
          {brief.sourceCount} sources
          {brief.readTimeMinutes != null && (
            <> · {presentReadTime(brief.readTimeMinutes)}</>
          )}
        </span>
      </div>
      <h3 className="brief-card-title">
        <Link
          className="brief-card-title-link"
          href={`${briefPrefix}/${brief.slug}`}
        >
          {brief.title}
        </Link>
      </h3>

      {/* Tier 2 — on interest */}
      <p className="brief-card-summary">{brief.summary}</p>
      {isLead && brief.whyItMatters && (
        <p className="brief-insight">{brief.whyItMatters}</p>
      )}

      {/* Tier 3 — meta (interactive, above overlay) */}
      {brief.sourceDomains && brief.sourceDomains.length > 0 && (
        <div className="tag-row">
          {brief.sourceDomains.map((domain) => (
            <span className="source-chip" key={domain}>{domain}</span>
          ))}
        </div>
      )}
    </article>
  );
}
