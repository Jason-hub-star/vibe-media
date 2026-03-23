import type { VideoJob } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentVideoJobCard(job: VideoJob): AdminCardProps {
  const metadata: AdminCardProps["metadata"] = [
    { label: "Kind", value: job.kind },
    { label: "Highlights", value: String(job.highlightCount) },
    { label: "Next", value: job.nextAction },
  ];

  if (job.riskySegmentCount > 0) {
    metadata.push({ label: "Risky", value: String(job.riskySegmentCount) });
  }

  return {
    id: job.id,
    href: `/admin/video-jobs/${job.id}`,
    title: job.title,
    subtitle: job.sourceSession,
    status: job.status,
    metadata,
  };
}
