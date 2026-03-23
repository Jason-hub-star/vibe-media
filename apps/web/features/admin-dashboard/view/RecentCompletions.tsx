import Link from "next/link";
import type { RecentCompletion } from "@vibehub/content-contracts";

const TYPE_LABELS: Record<RecentCompletion["type"], string> = {
  brief: "브리프",
  discover: "디스커버리",
  review: "검수",
  video: "비디오",
  run: "파이프라인 실행",
};

export function RecentCompletions({
  items,
}: {
  items: RecentCompletion[];
}) {
  if (items.length === 0) {
    return (
      <section className="admin-dashboard-section">
        <h2 className="section-heading">최근 완료 항목</h2>
        <p className="muted">아직 완료된 항목이 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="admin-dashboard-section">
      <h2 className="section-heading">최근 완료 항목</h2>
      <div className="admin-card-grid" style={{ "--card-cols": 4 } as React.CSSProperties}>
        {items.map((item) => (
          <article className="panel admin-completion-card" key={item.id}>
            <p className="eyebrow">{TYPE_LABELS[item.type]}</p>
            <p className="admin-card-title">{item.title}</p>
            <p className="admin-card-subtitle">
              {new Date(item.completedAt).toLocaleDateString("ko-KR")}
            </p>
            {item.publicUrl && (
              <Link className="admin-deployment-link" href={item.publicUrl}>
                발행 위치 &rarr;
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
