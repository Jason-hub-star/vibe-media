import { listPublishQueue as listPublishQueueBackend } from "@vibehub/backend";

export async function listPublishQueue() {
  return listPublishQueueBackend();
}
