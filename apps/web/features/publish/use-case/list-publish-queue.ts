import { listPublishQueue as listPublishQueueFromApi } from "../api/list-publish-queue";

export function listPublishQueue() {
  return listPublishQueueFromApi();
}
