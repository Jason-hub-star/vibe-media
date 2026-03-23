import type { VideoJobDetail } from "@vibehub/content-contracts";

import { listVideoJobs } from "./list-video-jobs";

export async function getVideoJobDetail(id: string): Promise<VideoJobDetail | null> {
  const items = await listVideoJobs();
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  return {
    ...item,
    processingLog: [],
  };
}
