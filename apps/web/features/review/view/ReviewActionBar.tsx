"use client";

import { useState, useTransition } from "react";

import type { ReviewStatus } from "@vibehub/content-contracts";

import { applyReviewDecisionAction } from "../action/apply-review-decision";

type Decision = "approve" | "changes_requested" | "reject";

export function ReviewActionBar({
  reviewId,
  currentStatus,
}: {
  reviewId: string;
  currentStatus?: ReviewStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  const isTerminal =
    currentStatus === "approved" || currentStatus === "rejected";

  if (isTerminal) {
    return (
      <span className={`status status-${currentStatus}`}>{currentStatus}</span>
    );
  }

  function handleDecision(decision: Decision) {
    if (
      decision === "reject" &&
      !window.confirm("Reject this item? This cannot be undone easily.")
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await applyReviewDecisionAction({
        reviewId,
        decision,
        note: note.trim() || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="stack-tight">
      <div className="action-bar">
        <button
          type="button"
          className="button-primary"
          disabled={isPending}
          onClick={() => handleDecision("approve")}
        >
          {isPending ? "…" : "Approve"}
        </button>
        <button
          type="button"
          className="button-ghost"
          disabled={isPending}
          onClick={() => handleDecision("changes_requested")}
        >
          Changes requested
        </button>
        <button
          type="button"
          className="button-danger"
          disabled={isPending}
          onClick={() => handleDecision("reject")}
        >
          Reject
        </button>
        <button
          type="button"
          className="note-toggle"
          onClick={() => setShowNote(!showNote)}
        >
          {showNote ? "Hide note" : "+ Note"}
        </button>
      </div>
      {showNote && (
        <textarea
          className="note-input"
          placeholder="Optional review note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
      {error && <p className="action-error">{error}</p>}
    </div>
  );
}
