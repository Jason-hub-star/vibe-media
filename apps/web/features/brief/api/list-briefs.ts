import { listBriefs as listBriefsBackend } from "@vibehub/backend";

export async function listBriefs() {
  return listBriefsBackend();
}
