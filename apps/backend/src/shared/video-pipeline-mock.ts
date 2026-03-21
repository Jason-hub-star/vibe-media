import type { ExceptionQueueItem, PublishQueueItem, VideoJob } from "@vibehub/content-contracts";

export const videoJobs: VideoJob[] = [
  {
    id: "video-job-1",
    title: "Minecraft survival session",
    kind: "gameplay",
    status: "blocked",
    assetLinkState: "partial",
    sourceSession: "minecraft-session-0319",
    transcriptState: "draft",
    highlightCount: 4,
    riskySegmentCount: 2,
    exceptionReason: "parent review flagged privacy-sensitive voice chat",
    nextAction: "Mute the flagged segment in CapCut before re-entering review."
  },
  {
    id: "video-job-2",
    title: "Roblox obstacle run recap",
    kind: "recap",
    status: "parent_review",
    assetLinkState: "complete",
    sourceSession: "roblox-session-0320",
    transcriptState: "approved",
    highlightCount: 3,
    riskySegmentCount: 1,
    exceptionReason: null,
    nextAction: "Run the parent checklist before moving into private upload."
  },
  {
    id: "video-job-3",
    title: "Mario Kart highlight clip",
    kind: "clip",
    status: "analysis_running",
    assetLinkState: "missing",
    sourceSession: "mariokart-session-0321",
    transcriptState: "missing",
    highlightCount: 0,
    riskySegmentCount: 0,
    exceptionReason: null,
    nextAction: "Generate subtitles and highlight candidates from the raw capture."
  },
  {
    id: "video-job-4",
    title: "Fortnite squad clip",
    kind: "clip",
    status: "upload_ready",
    assetLinkState: "complete",
    sourceSession: "fortnite-session-0321",
    transcriptState: "approved",
    highlightCount: 5,
    riskySegmentCount: 0,
    exceptionReason: null,
    nextAction: "Move the approved edit into private upload."
  },
  {
    id: "video-job-5",
    title: "Valorant recap",
    kind: "recap",
    status: "uploaded_private",
    assetLinkState: "complete",
    sourceSession: "valorant-session-0321",
    transcriptState: "approved",
    highlightCount: 4,
    riskySegmentCount: 0,
    exceptionReason: null,
    nextAction: "Private upload is ready. Parent can choose the final publish window."
  }
];

export function deriveVideoPublishQueueEntries(jobs: VideoJob[]): PublishQueueItem[] {
  return jobs
    .filter(
      (job): job is VideoJob & { status: "upload_ready" | "uploaded_private" } =>
        job.status === "upload_ready" || job.status === "uploaded_private"
    )
    .map((job) => ({
      id: `publish-${job.id}`,
      title: job.title,
      targetType: "video",
      queueStatus: job.status,
      sourceLabel: job.sourceSession,
      scheduledFor: null,
      nextAction: job.nextAction
    }));
}

export function deriveVideoExceptionQueueEntries(jobs: VideoJob[]): ExceptionQueueItem[] {
  return jobs
    .filter((job): job is VideoJob & { status: "blocked" } => job.status === "blocked")
    .map((job) => ({
      id: `exception-${job.id}`,
      title: job.title,
      targetType: "video",
      currentStage: job.status,
      reason: job.exceptionReason ?? "blocked video job",
      confidence: 1,
      sourceLabel: job.sourceSession,
      nextAction: job.nextAction
    }));
}
