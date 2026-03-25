import Link from "next/link";

import type { DiscoverItem } from "@vibehub/content-contracts";

import { presentDiscoverCategory } from "../presenter/present-discover-category";
import { presentDiscoverStatus, presentReviewStatus } from "../presenter/present-discover-status";

export function DiscoverCard({ item, showReviewStatus }: { item: DiscoverItem; showReviewStatus?: boolean }) {
  const { label: statusLabel, style: statusStyle } = presentDiscoverStatus(item.status);
  const review = showReviewStatus ? presentReviewStatus(item.reviewStatus) : null;

  return (
    <article className="panel stack-tight">
      <div className="row-between">
        <p className="eyebrow">{presentDiscoverCategory(item.category)}</p>
        <div className="status-group">
          <span className={`status status-${statusStyle}`}>{statusLabel}</span>
          {review && <span className={`status status-${review.style}`}>{review.label}</span>}
        </div>
      </div>
      <div className="stack-tight">
        <h3>{item.title}</h3>
        <p className="muted">{item.summary}</p>
      </div>
      <div className="tag-row">
        {item.tags.map((tag) => (
          <span className="tag-chip" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="button-row">
        {item.actions.map((action) => (
          <Link className="button-secondary" href={action.href} key={`${item.id}-${action.kind}`}>
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}
