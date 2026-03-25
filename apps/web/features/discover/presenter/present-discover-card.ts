import type { DiscoverItem } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentDiscoverCard(item: DiscoverItem): AdminCardProps {
  return {
    id: item.id,
    href: `/admin/discover/${item.id}`,
    title: item.title,
    subtitle:
      item.summary.length > 80
        ? item.summary.slice(0, 80) + "…"
        : item.summary,
    status: item.status,
    category: item.category,
    metadata: [
      {
        label: "Review",
        value: item.reviewStatus,
      },
      {
        label: "Tags",
        value: item.tags.slice(0, 3).join(", ") || "없음",
      },
    ],
  };
}
