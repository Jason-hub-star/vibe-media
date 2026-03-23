import type { InboxItem } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentInboxCard(item: InboxItem): AdminCardProps {
  const metadata: AdminCardProps["metadata"] = [
    { label: "Surface", value: item.targetSurface },
    { label: "Confidence", value: `${Math.round(item.confidence * 100)}%` },
  ];

  return {
    id: item.id,
    href: `/admin/inbox/${item.id}`,
    title: item.title,
    subtitle: item.sourceName,
    status: item.stage,
    ...(item.contentType ? { category: item.contentType } : {}),
    metadata,
  };
}
