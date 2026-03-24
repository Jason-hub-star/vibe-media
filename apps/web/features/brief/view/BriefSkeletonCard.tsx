export function BriefSkeletonCard() {
  return (
    <article className="panel stack-tight" aria-hidden="true">
      <div className="row-between">
        <span className="skeleton-line" style={{ width: "5rem" }} />
        <span className="skeleton-line" style={{ width: "4rem" }} />
      </div>
      <div className="skeleton-block" style={{ width: "80%" }} />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </article>
  );
}
