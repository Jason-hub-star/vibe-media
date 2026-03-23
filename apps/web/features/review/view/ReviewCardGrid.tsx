import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentReviewCard } from "../presenter/present-review-card";
import type { ReviewItem } from "@vibehub/content-contracts";

export function ReviewCardGrid({ items }: { items: ReviewItem[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentReviewCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
