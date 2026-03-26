import Link from "next/link";

import type { DiscoverItem } from "@vibehub/content-contracts";

import { presentDiscoverCategory } from "../presenter/present-discover-category";
import { presentDiscoverStatus, presentReviewStatus } from "../presenter/present-discover-status";

function isNew(publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  const diff = Date.now() - new Date(publishedAt).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

export function DiscoverCard({ item, showReviewStatus }: { item: DiscoverItem; showReviewStatus?: boolean }) {
  const cat = presentDiscoverCategory(item.category);
  const { label: statusLabel, style: statusStyle } = presentDiscoverStatus(item.status);
  const review = showReviewStatus ? presentReviewStatus(item.reviewStatus) : null;
  const fresh = isNew(item.publishedAt);

  return (
    <article className="panel stack-tight">
      <div className="row-between">
        <span className={`category-pill category-pill-${cat.color}`}>
          <span className="category-pill-icon">{cat.icon}</span>
          {cat.label}
        </span>
        <div className="status-group">
          {fresh && <span className="status status-new">New</span>}
          <span className={`status status-${statusStyle}`}>{statusLabel}</span>
          {review && <span className={`status status-${review.style}`}>{review.label}</span>}
        </div>
      </div>
      <div className="stack-tight">
        <h3>
          <Link href={`/radar/${item.id}`} className="inline-link">
            {item.title}
          </Link>
        </h3>
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
