import { getAdjacentBriefs as getAdjacentBriefsBackend } from "@vibehub/backend";

export async function getAdjacentBriefs(slug: string) {
  return getAdjacentBriefsBackend(slug);
}
