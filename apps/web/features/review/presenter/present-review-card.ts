import type { ReviewItem } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentReviewCard(item: ReviewItem): AdminCardProps {
  return {
    id: item.id,
    href: `/admin/review/${item.id}`,
    title: item.previewTitle,
    subtitle: item.sourceLabel,
    status: item.reviewStatus ?? "pending",
    metadata: [
      { label: "Surface", value: item.targetSurface },
      { label: "Confidence", value: `${Math.round(item.confidence * 100)}%` },
    ],
  };
}
