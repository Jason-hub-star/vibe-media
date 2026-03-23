import Link from "next/link";

import type { ShowcaseEntry } from "@vibehub/content-contracts";

export function ShowcaseDetailContent({ entry }: { entry: ShowcaseEntry }) {
  return (
    <>
      <div className="panel stack-tight">
        <p className="eyebrow">요약</p>
        <p>{entry.summary}</p>
      </div>

      <div className="panel stack-tight">
        <p className="eyebrow">본문</p>
        {entry.body.length === 0 && (
          <p className="muted">본문이 아직 없습니다.</p>
        )}
        {entry.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="panel stack-tight">
        <p className="eyebrow">메타 정보</p>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">출처</dt>
            <dd className="admin-detail-value">{entry.origin}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">태그</dt>
            <dd className="admin-detail-value">
              {entry.tags.length > 0 ? entry.tags.join(", ") : "-"}
            </dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">홈 피처</dt>
            <dd className="admin-detail-value">
              {entry.featuredHome ? "Y" : "N"}
            </dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">레이더 피처</dt>
            <dd className="admin-detail-value">
              {entry.featuredRadar ? "Y" : "N"}
            </dd>
          </div>
          {entry.publishedAt && (
            <div className="admin-detail-row">
              <dt className="admin-detail-label">발행일</dt>
              <dd className="admin-detail-value">
                {entry.publishedAt.slice(0, 10)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="panel stack-tight">
        <p className="eyebrow">링크</p>
        {entry.links.length === 0 && (
          <p className="muted">등록된 링크가 없습니다.</p>
        )}
        {entry.links.map((link) => (
          <Link
            className="inline-link"
            href={link.href}
            key={link.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            [{link.kind}] {link.label}
          </Link>
        ))}
      </div>
    </>
  );
}
