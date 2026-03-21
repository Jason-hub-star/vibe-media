import type { VideoJob } from "@vibehub/content-contracts";

export function presentVideoJobCopy(job: VideoJob) {
  return `${job.kind} · ${job.highlightCount} highlights · ${job.riskySegmentCount} risk flags · transcript ${job.transcriptState}`;
}
