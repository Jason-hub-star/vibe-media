import { getAdjacentBriefs as getAdjacentBriefsApi } from "../api/get-adjacent-briefs";

export async function getAdjacentBriefs(slug: string) {
  return getAdjacentBriefsApi(slug);
}
