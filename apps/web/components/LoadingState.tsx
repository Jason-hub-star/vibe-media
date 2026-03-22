export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="state-box">
      <p className="state-icon" aria-hidden="true">⏳</p>
      <p className="eyebrow state-pulse">{message}</p>
    </div>
  );
}
