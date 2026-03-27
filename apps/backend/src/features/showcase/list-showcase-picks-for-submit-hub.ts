import type { ShowcaseEntry } from "@vibehub/content-contracts";

import { isPublishedShowcaseEntry, listShowcaseEntries } from "./list-showcase-entries";

export async function listShowcasePicksForSubmitHub(): Promise<ShowcaseEntry[]> {
  const entries = await listShowcaseEntries();
  return entries.filter((entry) => entry.featuredSubmitHub && isPublishedShowcaseEntry(entry));
}
