import { briefDetails } from "../../shared/mock-data";

export function getBriefDetail(slug: string) {
  return briefDetails.find((item) => item.slug === slug) ?? null;
}
