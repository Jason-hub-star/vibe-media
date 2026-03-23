import type { IngestRun } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentRunCard(run: IngestRun): AdminCardProps {
  const metadata: AdminCardProps["metadata"] = [
    { label: "Items", value: String(run.itemCount) },
    { label: "Started", value: run.startedAt },
  ];

  if (run.errorMessage) {
    metadata.push({ label: "Error", value: run.errorMessage });
  }

  return {
    id: run.id,
    href: `/admin/runs/${run.id}`,
    title: run.sourceName,
    status: run.runStatus,
    metadata,
  };
}
