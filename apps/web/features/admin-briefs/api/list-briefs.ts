import { listAllBriefs as listAllBriefsBackend } from "@vibehub/backend";

export async function listBriefs() {
  return listAllBriefsBackend();
}
