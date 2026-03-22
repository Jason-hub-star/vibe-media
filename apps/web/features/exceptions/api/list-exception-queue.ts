import { listExceptionQueue as listExceptionQueueBackend } from "@vibehub/backend";

export async function listExceptionQueue() {
  return listExceptionQueueBackend();
}
