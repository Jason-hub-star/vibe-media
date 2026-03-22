import { listRuns as listRunsBackend } from "@vibehub/backend";

export async function listRuns() {
  return listRunsBackend();
}
