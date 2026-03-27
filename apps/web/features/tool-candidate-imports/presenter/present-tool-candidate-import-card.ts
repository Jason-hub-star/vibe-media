import type { ToolCandidateImport } from "@vibehub/content-contracts";

import type { AdminCardProps } from "@/components/AdminCard";

export function presentToolCandidateImportCard(item: ToolCandidateImport): AdminCardProps {
  const subtitle =
    item.summary.length > 88 ? `${item.summary.slice(0, 88)}…` : item.summary;

  return {
    id: item.id,
    href: `/admin/imported-tools/${item.id}`,
    title: item.title,
    subtitle,
    status: item.status,
    category: item.screeningStatus,
    categoryLabel: item.screeningStatus,
    metadata: [
      { label: "Source", value: item.sourceName },
      { label: "Site", value: item.websiteUrl.replace(/^https?:\/\//, "") },
    ],
  };
}
