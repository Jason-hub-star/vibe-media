export function EmptyState({
  title,
  body
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="panel stack-tight">
      <p className="eyebrow">Empty state</p>
      <h3>{title}</h3>
      <p className="muted">{body}</p>
    </div>
  );
}
