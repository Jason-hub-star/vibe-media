import Image from "next/image";
import Link from "next/link";

import type { BriefListItem } from "@vibehub/content-contracts";

import { presentReadTime } from "@/features/shared/presenter/present-read-time";
import { presentRelativeDate } from "@/features/shared/presenter/present-relative-date";

interface LatestVideoBriefProps {
  brief: BriefListItem;
  locale: string;
}

function getVideoPreviewImage(brief: BriefListItem) {
  if (brief.coverImage) return brief.coverImage;
  if (brief.youtubeVideoId) {
    return `https://i.ytimg.com/vi/${brief.youtubeVideoId}/hqdefault.jpg`;
  }
  return null;
}

export function LatestVideoBrief({ brief, locale }: LatestVideoBriefProps) {
  const previewImage = getVideoPreviewImage(brief);
  const linkedLabel = brief.youtubeLinkedAt
    ? presentRelativeDate(brief.youtubeLinkedAt)
    : "Latest upload";

  return (
    <article className="panel latest-video-brief">
      <a
        className="latest-video-media-link"
        href={brief.youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Watch ${brief.title} on YouTube`}
      >
        <div className="latest-video-media">
          {previewImage ? (
            <Image
              src={previewImage}
              alt={`${brief.title} video preview`}
              fill
              sizes="(max-width: 900px) 100vw, 42vw"
              unoptimized
              className="latest-video-media-img"
            />
          ) : (
            <div className="latest-video-media-fallback" />
          )}
          <div className="latest-video-media-overlay" />
          <div className="latest-video-play-cta">
            <span className="latest-video-play-icon" aria-hidden="true" />
            <span>Watch on YouTube</span>
          </div>
          <div className="latest-video-caption stack-tight">
            <p className="eyebrow">Video preview</p>
            <p className="latest-video-caption-title">{brief.title}</p>
          </div>
        </div>
      </a>

      <div className="latest-video-copy stack-tight">
        <div className="row-between latest-video-meta-row">
          <p className="eyebrow">Connected brief</p>
          <span className="latest-video-badge">{linkedLabel}</span>
        </div>
        <h3>{brief.title}</h3>
        <p className="muted latest-video-summary">{brief.summary}</p>
        {brief.whyItMatters && (
          <p className="latest-video-insight">{brief.whyItMatters}</p>
        )}
        <div className="latest-video-stats">
          <span>{brief.sourceCount} sources</span>
          {brief.readTimeMinutes != null && (
            <span>{presentReadTime(brief.readTimeMinutes)}</span>
          )}
          <span>Video brief</span>
        </div>
        <div className="button-row">
          <a
            className="button-primary"
            href={brief.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch on YouTube
          </a>
          <Link
            className="button-secondary"
            href={`/${locale}/brief/${brief.slug}`}
          >
            Read the brief
          </Link>
        </div>
      </div>
    </article>
  );
}
