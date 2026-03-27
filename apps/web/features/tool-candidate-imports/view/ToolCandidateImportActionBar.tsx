"use client";

import { useState, useTransition } from "react";

import type { ToolCandidateImport } from "@vibehub/content-contracts";

import {
  hideToolCandidateImportAction,
  promoteToolCandidateImportAction,
  rejectToolCandidateImportAction,
} from "../action/apply-tool-candidate-import-action";

export function ToolCandidateImportActionBar({ item }: { item: ToolCandidateImport }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const canPromote = item.status === "approved_for_listing";
  const canHide =
    item.status === "approved_for_listing" || item.status === "imported";
  const canReject =
    item.status !== "rejected" &&
    item.status !== "spam_blocked" &&
    item.status !== "promoted_to_showcase";

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
                const result = await promoteToolCandidateImportAction(item.id);
                if ("error" in result) setError(result.error);
              });
            }}
            type="button"
          >
            {isPending ? "…" : "Promote to showcase"}
          </button>
        )}
        {canHide && (
          <button
            className="button-secondary"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await hideToolCandidateImportAction({
                  candidateId: item.id,
                  note: note.trim() || undefined,
                });
                if ("error" in result) setError(result.error);
              });
            }}
            type="button"
          >
            Hide from listing
          </button>
        )}
        {canReject && (
          <button
            className="button-danger"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await rejectToolCandidateImportAction({
                  candidateId: item.id,
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
