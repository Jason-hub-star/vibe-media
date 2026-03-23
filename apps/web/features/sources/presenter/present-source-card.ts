import type { SourceEntry } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentSourceCard(source: SourceEntry): AdminCardProps {
  return {
    id: source.id,
    href: `/admin/sources/${source.id}`,
    title: source.label,
    status: source.freshness,
    statusLabel: source.freshness === "daily" ? "매일" : "매주",
    category: source.category,
  };
}
