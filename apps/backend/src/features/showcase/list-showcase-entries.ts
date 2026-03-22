import type { ShowcaseEntry } from "@vibehub/content-contracts";

import { showcaseEntries as mockShowcaseEntries } from "../../shared/mock-data";
import { listSupabaseShowcaseEntries } from "../../shared/supabase-showcase-read";
import { saveSupabaseShowcaseEntry, type SaveShowcaseEntryInput } from "../../shared/supabase-showcase-actions";

function sortShowcaseEntries(entries: ShowcaseEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }

    if (left.publishedAt && right.publishedAt) {
      return right.publishedAt.localeCompare(left.publishedAt);
    }

    if (left.publishedAt) return -1;
    if (right.publishedAt) return 1;
    return left.title.localeCompare(right.title);
  });
}

export function isPublishedShowcaseEntry(entry: ShowcaseEntry) {
  return entry.reviewStatus === "approved" && Boolean(entry.publishedAt);
}

export async function listShowcaseEntries(): Promise<ShowcaseEntry[]> {
  const entries = (await listSupabaseShowcaseEntries()) ?? mockShowcaseEntries;
  return sortShowcaseEntries(entries);
}

export function saveShowcaseEntry(args: SaveShowcaseEntryInput) {
  return saveSupabaseShowcaseEntry(args);
}
