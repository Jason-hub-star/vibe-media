export function EmptyState({
  title,
  body
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="state-box">
      <p className="state-icon" aria-hidden="true">📭</p>
      <h3 className="state-title">{title}</h3>
      <p className="muted">{body}</p>
    </div>
  );
}
