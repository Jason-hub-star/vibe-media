import type { PublishQueueItem } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentPublishCard(item: PublishQueueItem): AdminCardProps {
  return {
    id: item.id,
    href: `/admin/publish/${item.id}`,
    title: item.title,
    subtitle: item.sourceLabel,
    status: item.queueStatus,
    category: item.targetType,
    metadata: [
      { label: "Scheduled", value: item.scheduledFor ?? "미정" },
      { label: "Action", value: item.nextAction },
    ],
  };
}
