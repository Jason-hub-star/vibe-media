import type { ToolSubmission } from "@vibehub/content-contracts";

import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";

import { presentToolSubmissionCard } from "../presenter/present-tool-submission-card";

export function ToolSubmissionCardGrid({ items }: { items: ToolSubmission[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentToolSubmissionCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
