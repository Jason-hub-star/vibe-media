import type { BriefListItem } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentBriefCard(item: BriefListItem): AdminCardProps {
  return {
    id: item.slug,
    href: `/admin/briefs/${item.slug}`,
    title: item.title,
    subtitle:
      item.summary.length > 80
        ? item.summary.slice(0, 80) + "…"
        : item.summary,
    status: item.status,
    metadata: [
      { label: "Sources", value: `${item.sourceCount}개` },
      { label: "Published", value: item.publishedAt ?? "미발행" },
    ],
  };
}
