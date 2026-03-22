import { listShowcaseEntries as listShowcaseEntriesApi } from "../api/list-showcase-entries";

export async function listShowcaseEntries() {
  return listShowcaseEntriesApi();
}
