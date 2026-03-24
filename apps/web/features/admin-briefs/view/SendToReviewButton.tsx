"use client";

import { useState, useTransition } from "react";

import { sendToReviewAction } from "../action/send-to-review-action";

export function SendToReviewButton({ briefSlug }: { briefSlug: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await sendToReviewAction({ briefSlug });
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="action-bar">
      <button
        type="button"
        className="button-primary"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? "..." : "검수 요청"}
      </button>
      {error && <p className="action-error">{error}</p>}
    </div>
  );
}
