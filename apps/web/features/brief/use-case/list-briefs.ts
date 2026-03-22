import { listBriefs as listBriefsApi } from "../api/list-briefs";

export async function listBriefs() {
  return listBriefsApi();
}
