import Link from "next/link";
import type { DeploymentReadiness as DeploymentReadinessType } from "@vibehub/content-contracts";

export function DeploymentReadiness({
  data,
}: {
  data: DeploymentReadinessType;
}) {
  const total = data.ready.length + data.needsReview.length + data.blocking.length;

  return (
    <section className="admin-dashboard-section">
      <h2 className="section-heading">배포 준비 현황</h2>
      {total === 0 ? (
        <p className="muted">대기 중인 배포 항목이 없습니다.</p>
      ) : (
        <div className="admin-readiness-grid">
          <div className="panel admin-readiness-column admin-readiness-ready">
            <p className="eyebrow">준비 완료 ({data.ready.length})</p>
            {data.ready.map((item, i) => (
              <div className="admin-readiness-item" key={i}>
                <span className="status status-published">{item.type}</span>
                <span>{item.title}</span>
                {item.publicUrl && (
                  <Link className="admin-deployment-link" href={item.publicUrl}>
                    보기 &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="panel admin-readiness-column admin-readiness-review">
            <p className="eyebrow">검수 필요 ({data.needsReview.length})</p>
            {data.needsReview.map((item, i) => (
              <div className="admin-readiness-item" key={i}>
                <span className="status status-review">{item.type}</span>
                <span>{item.title}</span>
                {item.reason && (
                  <span className="admin-readiness-reason">{item.reason}</span>
                )}
              </div>
            ))}
          </div>

          <div className="panel admin-readiness-column admin-readiness-blocking">
            <p className="eyebrow">차단됨 ({data.blocking.length})</p>
            {data.blocking.map((item, i) => (
              <div className="admin-readiness-item" key={i}>
                <span className="status status-failed">{item.type}</span>
                <span>{item.title}</span>
                {item.reason && (
                  <span className="admin-readiness-reason">{item.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
