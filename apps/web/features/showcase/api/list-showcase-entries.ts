import { listShowcaseEntries as listShowcaseEntriesBackend } from "@vibehub/backend";

export async function listShowcaseEntries() {
  return listShowcaseEntriesBackend();
}
