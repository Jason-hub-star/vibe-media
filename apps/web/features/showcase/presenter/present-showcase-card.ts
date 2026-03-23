import type { ShowcaseEntry } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentShowcaseCard(entry: ShowcaseEntry): AdminCardProps {
  const subtitle =
    entry.summary.length > 80
      ? entry.summary.slice(0, 80) + "\u2026"
      : entry.summary;

  const metadata: AdminCardProps["metadata"] = [
    { label: "Origin", value: entry.origin },
    { label: "Tags", value: entry.tags.join(", ") || "\u2014" },
  ];

  if (entry.publishedAt) {
    metadata.push({ label: "Published", value: entry.publishedAt });
  }

  return {
    id: entry.id,
    href: `/admin/showcase/${entry.id}`,
    title: entry.title,
    subtitle,
    status: entry.reviewStatus,
    metadata,
  };
}
