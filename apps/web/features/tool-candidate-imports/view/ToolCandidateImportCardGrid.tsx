import type { ToolCandidateImport } from "@vibehub/content-contracts";

import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";

import { presentToolCandidateImportCard } from "../presenter/present-tool-candidate-import-card";

export function ToolCandidateImportCardGrid({ items }: { items: ToolCandidateImport[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentToolCandidateImportCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
