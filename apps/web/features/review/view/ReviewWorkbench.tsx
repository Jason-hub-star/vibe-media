import Link from "next/link";

import type { ReviewItem } from "@vibehub/content-contracts";

import { presentReviewConfidence } from "../presenter/present-review-confidence";

export function ReviewWorkbench({ item }: { item: ReviewItem }) {
  return (
    <div className="review-grid">
      <article className="panel stack-tight">
        <p className="eyebrow">Source</p>
        <h3>{item.sourceLabel}</h3>
        <p className="muted">{item.sourceExcerpt}</p>
        <Link className="inline-link" href={item.sourceHref}>
          Open source
        </Link>
      </article>

      <article className="panel stack-tight">
        <p className="eyebrow">Parsed</p>
        <p>{item.parsedSummary}</p>
        <ul>
          {item.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </article>

      <article className="panel stack-tight">
        <div className="row-between">
          <p className="eyebrow">Preview</p>
          <span className="muted">{presentReviewConfidence(item.confidence)}</span>
        </div>
        <h3>{item.previewTitle}</h3>
        <p className="muted">{item.previewSummary}</p>
        <span className={`status status-${item.targetSurface}`}>{item.targetSurface}</span>
      </article>
    </div>
  );
}
