import { briefDetails } from "../../shared/mock-data";

export function listBriefs() {
  return briefDetails.map(({ body, sourceLinks, ...item }) => item);
}
