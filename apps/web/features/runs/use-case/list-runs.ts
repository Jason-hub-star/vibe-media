import { listRuns as listRunsFromApi } from "../api/list-runs";

export function listRuns() {
  return listRunsFromApi();
}
