import type { ReviewItemDetail } from "@vibehub/content-contracts";

import { BriefBodySections } from "@/features/brief/view/BriefBodySections";

function ModificationReason({ reasons }: { reasons: string[] }) {
  return (
    <section className="panel stack-tight">
      <h3>수정 사유</h3>
      <ul>
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}

export function ReviewDetailContent({ item }: { item: ReviewItemDetail }) {
  return (
    <div className="stack">
      <section className="panel stack-tight">
        <h3>검수 정보</h3>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">소스</dt>
            <dd className="admin-detail-value">
              <a href={item.sourceHref} target="_blank" rel="noopener noreferrer">
                {item.sourceLabel}
              </a>
            </dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">대상 서피스</dt>
            <dd className="admin-detail-value">{item.targetSurface}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">검수 사유</dt>
            <dd className="admin-detail-value">{item.reviewReason}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">신뢰도</dt>
            <dd className="admin-detail-value">{item.confidence}</dd>
          </div>
        </dl>
      </section>

      <section className="panel stack-tight">
        <h3>소스 발췌</h3>
        <p>{item.sourceExcerpt}</p>
      </section>

      <section className="panel stack-tight">
        <h3>파싱 요약</h3>
        <p>{item.parsedSummary}</p>
      </section>

      {item.keyPoints.length > 0 && (
        <section className="panel stack-tight">
          <h3>핵심 포인트</h3>
          <ul>
            {item.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel stack-tight">
        <h3>미리보기</h3>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">제목</dt>
            <dd className="admin-detail-value">{item.previewTitle}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">요약</dt>
            <dd className="admin-detail-value">{item.previewSummary}</dd>
          </div>
        </dl>
      </section>

      {item.previewBody && item.previewBody.length > 0 && (
        <section className="panel stack-tight">
          <h3>Brief 본문 미리보기</h3>
          <BriefBodySections body={item.previewBody} />
        </section>
      )}

      {item.reviewStatus === "changes_requested" && (
        <ModificationReason reasons={["변경 요청됨"]} />
      )}
    </div>
  );
}
