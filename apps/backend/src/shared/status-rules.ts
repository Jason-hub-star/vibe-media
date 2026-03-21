import type { BriefStatus, VideoJobStatus } from "@vibehub/content-contracts";

const briefTransitions: Record<BriefStatus, BriefStatus[]> = {
  draft: ["review"],
  review: ["scheduled", "draft"],
  scheduled: ["published", "review"],
  published: []
};

const videoJobTransitions: Record<VideoJobStatus, VideoJobStatus[]> = {
  raw_received: ["analysis_running", "blocked"],
  analysis_running: ["auto_cut_done", "highlight_candidates_ready", "blocked"],
  auto_cut_done: ["highlight_candidates_ready", "capcut_pending", "blocked"],
  highlight_candidates_ready: ["capcut_pending", "blocked"],
  capcut_pending: ["capcut_in_progress", "blocked"],
  capcut_in_progress: ["capcut_done", "blocked"],
  capcut_done: ["parent_review", "blocked"],
  parent_review: ["upload_ready", "capcut_pending", "blocked"],
  upload_ready: ["uploaded_private", "blocked"],
  uploaded_private: ["published", "blocked"],
  published: [],
  blocked: []
};

export function canMoveBriefStatus(from: BriefStatus, to: BriefStatus) {
  return briefTransitions[from].includes(to);
}

export function canMoveVideoJobStatus(from: VideoJobStatus, to: VideoJobStatus) {
  return videoJobTransitions[from].includes(to);
}
