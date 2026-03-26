import { SITE_URL } from "@/lib/constants";

interface Props {
  slug: string;
  title: string;
}

export function BriefShareBar({ slug, title }: Props) {
  const url = `${SITE_URL}/brief/${slug}`;
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
      >
        𝕏
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn"
        aria-label="Share on LinkedIn"
      >
        in
      </a>
      <a
        href={`https://www.threads.net/intent/post?text=${text}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn"
        aria-label="Share on Threads"
      >
        @
      </a>
    </div>
  );
}
