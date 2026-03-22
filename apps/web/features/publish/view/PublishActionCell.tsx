"use client";

import { useState, useTransition } from "react";

import type { PublishQueueStatus, PublishTargetType } from "@vibehub/content-contracts";

import { applyPublishActionAction } from "../action/apply-publish-action";

function parsePublishId(compositeId: string): {
  targetType: "brief" | "discover";
  targetId: string;
} | null {
  const match = compositeId.match(/^publish-(brief|discover)-(.+)$/);
  if (!match) return null;
  return { targetType: match[1] as "brief" | "discover", targetId: match[2] };
}

export function PublishActionCell({
  itemId,
  targetType,
  queueStatus,
}: {
  itemId: string;
  targetType: PublishTargetType;
  queueStatus: PublishQueueStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (targetType === "video") return null;
  if (queueStatus === "published") {
    return <span className="status status-published">published</span>;
  }

  const parsed = parsePublishId(itemId);
  if (!parsed) return <span className="muted">—</span>;

  const actionLabel =
    queueStatus === "approved" ? "Schedule" : queueStatus === "scheduled" ? "Publish" : null;
  const actionValue =
    queueStatus === "approved" ? "schedule" : queueStatus === "scheduled" ? "publish" : null;

  if (!actionLabel || !actionValue) return null;

  function handleAction() {
    if (!parsed || !actionValue) return;
    setError(null);
    startTransition(async () => {
      const result = await applyPublishActionAction({
        targetType: parsed.targetType,
        targetId: parsed.targetId,
        action: actionValue as "schedule" | "publish",
      });
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="stack-tight">
      <button
        type="button"
        className="button-primary"
        style={{ fontSize: "var(--type-small)", padding: "0.4rem 0.8rem" }}
        disabled={isPending}
        onClick={handleAction}
      >
        {isPending ? "…" : actionLabel}
      </button>
      {error && <p className="action-error">{error}</p>}
    </div>
  );
}
