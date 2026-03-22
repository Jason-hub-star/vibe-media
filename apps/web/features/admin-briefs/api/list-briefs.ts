import { listBriefs as listPublicBriefs } from "@/features/brief/api/list-briefs";

export async function listBriefs() {
  return listPublicBriefs();
}
