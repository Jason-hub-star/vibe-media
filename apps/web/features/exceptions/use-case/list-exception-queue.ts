import { listExceptionQueue as listExceptionQueueFromApi } from "../api/list-exception-queue";

export async function listExceptionQueue() {
  return listExceptionQueueFromApi();
}
