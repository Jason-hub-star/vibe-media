import type { ExceptionQueueItem } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentExceptionCard(
  item: ExceptionQueueItem,
): AdminCardProps {
  return {
    id: item.id,
    href: `/admin/exceptions/${item.id}`,
    title: item.title,
    status: item.currentStage,
    category: item.targetType,
    metadata: [
      {
        label: "Reason",
        value:
          item.reason.length > 60
            ? item.reason.slice(0, 60) + "…"
            : item.reason,
      },
      { label: "Confidence", value: `${Math.round(item.confidence * 100)}%` },
    ],
  };
}
