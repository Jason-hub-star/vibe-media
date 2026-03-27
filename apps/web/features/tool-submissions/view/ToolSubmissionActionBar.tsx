"use client";

import { useState, useTransition } from "react";

import type { ToolSubmission } from "@vibehub/content-contracts";

import {
  promoteToolSubmissionAction,
  rejectToolSubmissionAction,
} from "../action/apply-tool-submission-action";

export function ToolSubmissionActionBar({ item }: { item: ToolSubmission }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const canPromote =
    item.status === "approved_for_listing" || item.status === "screened";
  const canReject =
    item.status !== "rejected" && item.status !== "spam_blocked" && item.status !== "promoted_to_showcase";

  return (
    <div className="stack-tight">
      <div className="action-bar">
        {canPromote && (
          <button
            className="button-primary"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await promoteToolSubmissionAction(item.id);
                if ("error" in result) setError(result.error);
              });
            }}
            type="button"
          >
            {isPending ? "…" : "Promote to showcase"}
          </button>
        )}
        {canReject && (
          <button
            className="button-danger"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await rejectToolSubmissionAction({
                  submissionId: item.id,
                  note: note.trim() || undefined,
                });
                if ("error" in result) setError(result.error);
              });
            }}
            type="button"
          >
            Reject
          </button>
        )}
      </div>
      <textarea
        className="note-input"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional operator note…"
        value={note}
      />
      {error && <p className="action-error">{error}</p>}
    </div>
  );
}
