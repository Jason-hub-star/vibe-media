import Link from "next/link";

import { isValidActionHref, type DiscoverItem } from "@vibehub/content-contracts";

import { presentDiscoverCategory } from "../presenter/present-discover-category";
import { presentDiscoverStatus, presentReviewStatus } from "../presenter/present-discover-status";
import { DiscoverCardCover } from "./DiscoverCardCover";

function isNew(publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  const diff = Date.now() - new Date(publishedAt).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

function getAccentBadge(params: {
  fresh: boolean;
  status: DiscoverItem["status"];
  statusLabel: string;
  statusStyle: string;
}) {
  if (params.fresh && params.status === "featured") {
    return { label: "New Pick", style: "new" };
  }

  if (params.fresh) {
    return { label: "New", style: "new" };
  }

  if (params.status === "featured" || params.status === "watching") {
    return { label: params.statusLabel, style: params.statusStyle };
  }

  return null;
}

interface DiscoverCardProps {
  item: DiscoverItem;
  showReviewStatus?: boolean;
  locale?: string;
}

function localizeInternalHref(href: string, locale?: string): string {
  if (!locale) return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (/^\/[a-z]{2}(\/|$)/.test(href)) return href;
  return `/${locale}${href}`;
}

export function DiscoverCard({ item, showReviewStatus, locale }: DiscoverCardProps) {
  const cat = presentDiscoverCategory(item.category);
  const { label: statusLabel, style: statusStyle } = presentDiscoverStatus(item.status);
  const review = showReviewStatus ? presentReviewStatus(item.reviewStatus) : null;
  const fresh = isNew(item.publishedAt);
  const accentBadge = getAccentBadge({
    fresh,
    status: item.status,
    statusLabel,
    statusStyle
  });
  const semanticTags = item.tags.filter((tag) => tag !== "Repo" && tag !== "Release");
  const visibleTags = semanticTags.slice(0, 2);
  const extraTagCount = Math.max(semanticTags.length - visibleTags.length, 0);
  const detailHref = locale ? `/${locale}/radar/${item.id}` : `/radar/${item.id}`;

  return (
    <article className="panel stack-tight discover-card">
      <DiscoverCardCover coverImage={item.coverImage} title={item.title} category={item.category} />
      <div className="row-between discover-card-header">
        <span className={`category-pill category-pill-${cat.color} discover-card-category`}>
          <span className="category-pill-icon">{cat.icon}</span>
          {cat.label}
        </span>
        {(accentBadge || review) && (
          <div className="status-group discover-card-status-group">
            {accentBadge && <span className={`status status-${accentBadge.style}`}>{accentBadge.label}</span>}
            {review && <span className={`status status-${review.style}`}>{review.label}</span>}
          </div>
        )}
      </div>
      <div className="stack-tight">
        <h3 className="discover-card-title">
          <Link
            href={detailHref}
            className="inline-link"
            data-ga-event="radar_item_open"
            data-ga-item-id={item.id}
            data-ga-locale={locale ?? "en"}
            data-ga-category={item.category}
          >
            {item.title}
          </Link>
        </h3>
        <p className="muted discover-card-summary">{item.summary}</p>
      </div>
      {visibleTags.length > 0 && (
        <div className="tag-row discover-card-tags">
          {visibleTags.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
            </span>
          ))}
          {extraTagCount > 0 && <span className="tag-chip discover-card-tag-overflow">+{extraTagCount}</span>}
        </div>
      )}
      <div className="button-row discover-card-actions">
        {item.actions.filter((action) => isValidActionHref(action.href)).map((action) => (
          <Link
            className="button-secondary discover-card-action"
            href={localizeInternalHref(action.href, locale)}
            key={`${item.id}-${action.kind}`}
            data-ga-event="radar_action_click"
            data-ga-action-kind={action.kind}
            data-ga-item-id={item.id}
            data-ga-locale={locale ?? "en"}
            data-ga-category={item.category}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}
