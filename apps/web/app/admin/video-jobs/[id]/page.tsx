import { notFound } from "next/navigation";

import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getVideoJobDetail } from "@/features/video-jobs/use-case/get-video-job-detail";
import { VideoJobDetailContent } from "@/features/video-jobs/view/VideoJobDetailContent";

export default async function AdminVideoJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getVideoJobDetail(id);

  if (!job) {
    notFound();
  }

  return (
    <AdminDetailLayout
      backHref="/admin/video-jobs"
      backLabel="비디오 작업 목록"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "비디오 작업", href: "/admin/video-jobs" },
        { label: job.title },
      ]}
      title={job.title}
      status={job.status}
      statusLabel={job.status}
      metadata={[
        { label: "ID", value: job.id },
        { label: "종류", value: job.kind },
        { label: "세션", value: job.sourceSession },
      ]}
    >
      <VideoJobDetailContent job={job} />
    </AdminDetailLayout>
  );
}
