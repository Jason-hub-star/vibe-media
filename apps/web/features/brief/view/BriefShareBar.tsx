import { SITE_URL } from "@/lib/constants";

interface Props {
  slug: string;
  title: string;
  locale?: string;
}

export function BriefShareBar({ slug, title, locale }: Props) {
  const briefPath = locale ? `/${locale}/brief/${slug}` : `/brief/${slug}`;
  const url = `${SITE_URL}${briefPath}`;
  const text = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="share-bar">
      <span className="share-label">Share</span>
      <a
        href={`https://x.com/intent/tweet?text=${text}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn"
        aria-label="Share on X"
        data-ga-event="brief_share_click"
        data-ga-platform="x"
        data-ga-slug={slug}
        data-ga-locale={locale ?? "en"}
      >
        𝕏
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn"
        aria-label="Share on LinkedIn"
        data-ga-event="brief_share_click"
        data-ga-platform="linkedin"
        data-ga-slug={slug}
        data-ga-locale={locale ?? "en"}
      >
        in
      </a>
      <a
        href={`https://www.threads.net/intent/post?text=${text}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn"
        aria-label="Share on Threads"
        data-ga-event="brief_share_click"
        data-ga-platform="threads"
        data-ga-slug={slug}
        data-ga-locale={locale ?? "en"}
      >
        @
      </a>
    </div>
  );
}
