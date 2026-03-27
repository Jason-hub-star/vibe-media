import type { ToolSubmission } from "@vibehub/content-contracts";

import type { AdminCardProps } from "@/components/AdminCard";

export function presentToolSubmissionCard(item: ToolSubmission): AdminCardProps {
  const subtitle =
    item.summary.length > 88 ? `${item.summary.slice(0, 88)}…` : item.summary;

  return {
    id: item.id,
    href: `/admin/submissions/${item.id}`,
    title: item.title,
    subtitle,
    status: item.status,
    category: item.screeningStatus,
    categoryLabel: item.screeningStatus,
    metadata: [
      { label: "Email", value: item.submitterEmail },
      { label: "Site", value: item.websiteUrl.replace(/^https?:\/\//, "") },
    ],
  };
}
