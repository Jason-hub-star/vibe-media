import type { SourceDetail } from "@vibehub/content-contracts";

export function SourceDetailContent({ source }: { source: SourceDetail }) {
  return (
    <>
      <div className="panel stack-tight">
        <p className="eyebrow">소스 정보</p>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">카테고리</dt>
            <dd className="admin-detail-value">{source.category}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">주기</dt>
            <dd className="admin-detail-value">{source.freshness}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">신뢰도</dt>
            <dd className="admin-detail-value">
              {source.reliability > 0
                ? `${(source.reliability * 100).toFixed(0)}%`
                : "측정 전"}
            </dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">URL</dt>
            <dd className="admin-detail-value">
              <a
                className="inline-link"
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {source.href}
              </a>
            </dd>
          </div>
        </dl>
      </div>

      <div className="panel stack-tight">
        <p className="eyebrow">실행 이력</p>
        {source.runHistory.length === 0 && (
          <p className="muted">아직 실행 이력이 없습니다.</p>
        )}
        {source.runHistory.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>상태</th>
                  <th>시간</th>
                </tr>
              </thead>
              <tbody>
                {source.runHistory.map((run) => (
                  <tr key={run.runId}>
                    <td>{run.runId}</td>
                    <td>
                      <span className={`status status-${run.status}`}>
                        {run.status}
                      </span>
                    </td>
                    <td>{run.timestamp.slice(0, 16).replace("T", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
