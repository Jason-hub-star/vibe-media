import type { ExceptionQueueItem } from "@vibehub/content-contracts";

import { RetryExceptionButton } from "./RetryExceptionButton";

function ModificationReason({ reason }: { reason: string }) {
  return (
    <section className="panel stack-tight">
      <h3>수정 사유</h3>
      <p>{reason}</p>
    </section>
  );
}

export function ExceptionDetailContent({ item }: { item: ExceptionQueueItem }) {
  return (
    <div className="stack">
      <section className="panel stack-tight">
        <h3>예외 정보</h3>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">대상 유형</dt>
            <dd className="admin-detail-value">{item.targetType}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">현재 단계</dt>
            <dd className="admin-detail-value">{item.currentStage}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">소스</dt>
            <dd className="admin-detail-value">{item.sourceLabel}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">신뢰도</dt>
            <dd className="admin-detail-value">{item.confidence}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">다음 액션</dt>
            <dd className="admin-detail-value">{item.nextAction}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">재시도 가능</dt>
            <dd className="admin-detail-value">{item.retryable ? "예" : "아니오"}</dd>
          </div>
        </dl>
      </section>

      <ModificationReason reason={item.reason} />

      {item.retryable && (
        <section className="panel stack-tight">
          <RetryExceptionButton exceptionId={item.id} />
        </section>
      )}
    </div>
  );
}
