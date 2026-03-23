import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { VideoJobCardGrid } from "@/features/video-jobs/view/VideoJobCardGrid";
import { listVideoJobs } from "@/features/video-jobs/use-case/list-video-jobs";

export default async function AdminVideoJobsPage() {
  const jobs = await listVideoJobs();

  return (
    <AdminShell
      subtitle="자동 분석 → CapCut → 보호자 검수 → 비공개 업로드 흐름을 관리합니다"
      title="비디오 작업"
    >
      <PlaceholderArt
        alt="Admin video banner placeholder"
        src="/placeholders/admin-video-banner-placeholder.svg"
      />
      {jobs.length === 0 ? (
        <EmptyState
          body="Video job rows will appear here after capture, auto analysis, CapCut finishing, and parent review prep."
          title="No video jobs"
        />
      ) : (
        <VideoJobCardGrid items={jobs} />
      )}
    </AdminShell>
  );
}
