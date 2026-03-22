import { listPublishQueue as listPublishQueueFromApi } from "../api/list-publish-queue";

export async function listPublishQueue() {
  return listPublishQueueFromApi();
}
