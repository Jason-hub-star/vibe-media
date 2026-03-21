import { listExceptionQueue as listExceptionQueueFromApi } from "../api/list-exception-queue";

export function listExceptionQueue() {
  return listExceptionQueueFromApi();
}
