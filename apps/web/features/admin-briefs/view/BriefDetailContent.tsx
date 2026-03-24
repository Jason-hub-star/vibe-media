import Link from "next/link";

import type { BriefDetail } from "@vibehub/content-contracts";

import { BriefBodySections } from "@/features/brief/view/BriefBodySections";

import { BriefQualityChecklist } from "./BriefQualityChecklist";
import { SendToReviewButton } from "./SendToReviewButton";

export function BriefDetailContent({ brief }: { brief: BriefDetail }) {
  return (
    <>
      {brief.status === "draft" && (
        <div className="panel stack-tight">
          <SendToReviewButton briefSlug={brief.slug} />
        </div>
      )}

      <div className="panel stack-tight">
        <p className="eyebrow">본문</p>
        <BriefBodySections body={brief.body} />
      </div>

      <BriefQualityChecklist brief={brief} />

      <div className="panel stack-tight">
        <p className="eyebrow">소스 링크</p>
        {brief.sourceLinks.length === 0 && (
          <p className="muted">등록된 소스 링크가 없습니다.</p>
        )}
        {brief.sourceLinks.map((link) => (
          <Link
            className="inline-link"
            href={link.href}
            key={link.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {brief.status === "published" && brief.publishedAt && (
        <div className="panel stack-tight">
          <p className="eyebrow">배포</p>
          <p>
            발행일: {brief.publishedAt.slice(0, 10)}
          </p>
          <Link className="inline-link" href={`/brief/${brief.slug}`}>
            공개 페이지 보기 &rarr;
          </Link>
        </div>
      )}
    </>
  );
}
