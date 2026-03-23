import type { InboxItem } from "@vibehub/content-contracts";

export function InboxDetailContent({ item }: { item: InboxItem }) {
  return (
    <div className="stack">
      <section className="panel stack-tight">
        <h3>수집 정보</h3>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">소스</dt>
            <dd className="admin-detail-value">{item.sourceName}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">소스 티어</dt>
            <dd className="admin-detail-value">{item.sourceTier}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">콘텐츠 유형</dt>
            <dd className="admin-detail-value">{item.contentType}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">대상 서피스</dt>
            <dd className="admin-detail-value">{item.targetSurface}</dd>
          </div>
        </dl>
      </section>

      <section className="panel stack-tight">
        <h3>파싱 요약</h3>
        <p>{item.parsedSummary}</p>
      </section>
    </div>
  );
}
