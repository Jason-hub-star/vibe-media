import type { VideoJobDetail } from "@vibehub/content-contracts";

export function VideoJobDetailContent({ job }: { job: VideoJobDetail }) {
  return (
    <>
      <div className="panel stack-tight">
        <p className="eyebrow">작업 정보</p>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">종류</dt>
            <dd className="admin-detail-value">{job.kind}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">세션</dt>
            <dd className="admin-detail-value">{job.sourceSession}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">에셋 연결</dt>
            <dd className="admin-detail-value">
              <span className={`status status-${job.assetLinkState}`}>
                {job.assetLinkState}
              </span>
            </dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">자막 상태</dt>
            <dd className="admin-detail-value">
              <span className={`status status-${job.transcriptState}`}>
                {job.transcriptState}
              </span>
            </dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">하이라이트</dt>
            <dd className="admin-detail-value">{job.highlightCount}개</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">위험 구간</dt>
            <dd className="admin-detail-value">{job.riskySegmentCount}개</dd>
          </div>
        </dl>
      </div>

      <div className="panel stack-tight">
        <p className="eyebrow">다음 액션</p>
        <p>{job.nextAction}</p>
      </div>

      {job.exceptionReason && (
        <div className="panel stack-tight">
          <p className="eyebrow">예외 사유</p>
          <p>{job.exceptionReason}</p>
        </div>
      )}

      <div className="panel stack-tight">
        <p className="eyebrow">처리 로그</p>
        {job.processingLog.length === 0 && (
          <p className="muted">아직 처리 로그가 없습니다.</p>
        )}
        {job.processingLog.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>단계</th>
                  <th>상태</th>
                  <th>시간</th>
                </tr>
              </thead>
              <tbody>
                {job.processingLog.map((entry) => (
                  <tr key={`${entry.step}-${entry.timestamp}`}>
                    <td>{entry.step}</td>
                    <td>
                      <span className={`status status-${entry.status}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td>{entry.timestamp.slice(0, 16).replace("T", " ")}</td>
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
