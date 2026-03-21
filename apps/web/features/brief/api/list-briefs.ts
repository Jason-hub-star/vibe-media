import { briefDetails } from "@/lib/mock-data";

export function listBriefs() {
  return briefDetails.map(({ body, sourceLinks, ...item }) => item);
}
