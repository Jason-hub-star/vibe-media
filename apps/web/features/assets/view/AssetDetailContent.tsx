import type { AssetSlotDetail } from "@vibehub/content-contracts";

export function AssetDetailContent({ asset }: { asset: AssetSlotDetail }) {
  return (
    <>
      <div className="panel stack-tight">
        <p className="eyebrow">슬롯 정보</p>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">타입</dt>
            <dd className="admin-detail-value">{asset.type}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">경로</dt>
            <dd className="admin-detail-value">
              <code>{asset.path}</code>
            </dd>
          </div>
        </dl>
      </div>

      <div className="panel stack-tight">
        <p className="eyebrow">교체 스펙</p>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">비율</dt>
            <dd className="admin-detail-value">{asset.spec.ratio}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">최소 크기</dt>
            <dd className="admin-detail-value">{asset.spec.minSize}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">포맷</dt>
            <dd className="admin-detail-value">{asset.spec.format}</dd>
          </div>
        </dl>
      </div>

      <div className="panel stack-tight">
        <p className="eyebrow">사용처</p>
        {asset.usages.length === 0 && (
          <p className="muted">아직 사용처가 등록되지 않았습니다.</p>
        )}
        {asset.usages.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Component</th>
              </tr>
            </thead>
            <tbody>
              {asset.usages.map((usage) => (
                <tr key={`${usage.route}-${usage.component}`}>
                  <td>{usage.route}</td>
                  <td>{usage.component}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
