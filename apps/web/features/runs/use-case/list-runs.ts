import { listRuns as listRunsFromApi } from "../api/list-runs";

export async function listRuns() {
  return listRunsFromApi();
}
