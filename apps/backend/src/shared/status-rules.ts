import type { BriefStatus, VideoJobStatus } from "@vibehub/content-contracts";

const briefTransitions: Record<BriefStatus, BriefStatus[]> = {
  draft: ["review"],
  review: ["scheduled", "draft"],
  scheduled: ["published", "review"],
  published: []
};

const videoJobTransitions: Record<VideoJobStatus, VideoJobStatus[]> = {
  collected: ["drafted"],
  drafted: ["asset_pending", "review"],
  asset_pending: ["review"],
  review: ["ready", "asset_pending"],
  ready: []
};

export function canMoveBriefStatus(from: BriefStatus, to: BriefStatus) {
  return briefTransitions[from].includes(to);
}

export function canMoveVideoJobStatus(from: VideoJobStatus, to: VideoJobStatus) {
  return videoJobTransitions[from].includes(to);
}
