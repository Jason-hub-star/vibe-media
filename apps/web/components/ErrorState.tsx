"use client";

export function ErrorState({
  message = "Something went wrong.",
  onRetry
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-box">
      <p className="state-icon" aria-hidden="true">⚠️</p>
      <p className="state-message state-error">{message}</p>
      {onRetry && (
        <button className="button-secondary" onClick={onRetry} type="button">
          Retry
        </button>
      )}
    </div>
  );
}
