import type { IngestRun } from "@vibehub/content-contracts";

export function RunDetailContent({ item }: { item: IngestRun }) {
  return (
    <div className="stack">
      <section className="panel stack-tight">
        <h3>실행 정보</h3>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">소스</dt>
            <dd className="admin-detail-value">{item.sourceName}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">시작 시각</dt>
            <dd className="admin-detail-value">{item.startedAt}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">종료 시각</dt>
            <dd className="admin-detail-value">{item.finishedAt ?? "진행 중"}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">처리 건수</dt>
            <dd className="admin-detail-value">{item.itemCount}</dd>
          </div>
        </dl>
      </section>

      {item.errorMessage && (
        <section className="panel stack-tight">
          <h3>오류 메시지</h3>
          <p className="muted">{item.errorMessage}</p>
        </section>
      )}
    </div>
  );
}
