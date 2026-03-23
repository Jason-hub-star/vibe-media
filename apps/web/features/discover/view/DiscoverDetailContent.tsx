import type { DiscoverItem } from "@vibehub/content-contracts";

export function DiscoverDetailContent({ item }: { item: DiscoverItem }) {
  return (
    <div className="stack">
      <section className="panel stack-tight">
        <h3>디스커버리 정보</h3>
        <dl className="admin-detail-meta">
          <div className="admin-detail-row">
            <dt className="admin-detail-label">카테고리</dt>
            <dd className="admin-detail-value">{item.category}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">슬러그</dt>
            <dd className="admin-detail-value">{item.slug}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">하이라이트</dt>
            <dd className="admin-detail-value">{item.highlighted ? "예" : "아니오"}</dd>
          </div>
          <div className="admin-detail-row">
            <dt className="admin-detail-label">태그</dt>
            <dd className="admin-detail-value">{item.tags.join(", ") || "없음"}</dd>
          </div>
        </dl>
      </section>

      <section className="panel stack-tight">
        <h3>요약</h3>
        <p>{item.summary}</p>
      </section>

      {item.actions.length > 0 && (
        <section className="panel stack-tight">
          <h3>액션</h3>
          <ul>
            {item.actions.map((action) => (
              <li key={action.href}>
                <a
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-link"
                >
                  {action.label}
                </a>{" "}
                <span className="muted">({action.kind})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
