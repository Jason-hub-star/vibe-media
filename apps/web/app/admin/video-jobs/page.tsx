import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { VideoJobBoard } from "@/features/video-jobs/view/VideoJobBoard";
import { listVideoJobs } from "@/features/video-jobs/use-case/list-video-jobs";

export default function AdminVideoJobsPage() {
  const jobs = listVideoJobs();

  return (
    <AdminShell
      subtitle="Video is treated as an internal automation pipeline, with auto-analysis first, CapCut finishing second, and parent review as the last gate."
      title="Video Jobs"
    >
      <PlaceholderArt
        alt="Admin video banner placeholder"
        src="/placeholders/admin-video-banner-placeholder.svg"
      />
      {jobs.length === 0 ? (
        <EmptyState
          body="Gameplay and recap jobs will appear here after capture, auto analysis, CapCut finishing, and parent review prep."
          title="No video jobs"
        />
      ) : (
        <VideoJobBoard jobs={jobs} />
      )}
    </AdminShell>
  );
}
