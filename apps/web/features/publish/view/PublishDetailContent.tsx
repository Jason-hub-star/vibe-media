import type { PublishQueueItem } from "@vibehub/content-contracts";

export function PublishDetailContent({ item }: { item: PublishQueueItem }) {
  return (
    <div className="stack">
      <section className="panel stack-tight">
        <h3>발행 정보</h3>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">대상 유형</dt>
            <dd className="admin-detail-value">{item.targetType}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">소스</dt>
            <dd className="admin-detail-value">{item.sourceLabel}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">예약 일시</dt>
            <dd className="admin-detail-value">{item.scheduledFor ?? "미정"}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">다음 액션</dt>
            <dd className="admin-detail-value">{item.nextAction}</dd>
          </div>
        </dl>
      </section>

      {item.queueStatus === "published" && (
        <section className="panel stack-tight">
          <h3>공개 페이지</h3>
          <p>
            <a
              href={`/${item.targetType}/${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-link"
            >
              공개 페이지 보기
            </a>
          </p>
        </section>
      )}
    </div>
  );
}
