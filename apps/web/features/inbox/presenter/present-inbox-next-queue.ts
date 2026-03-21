import type { InboxItem } from "@vibehub/content-contracts";

import { deriveInboxNextQueue } from "@/lib/pipeline-routing";

export function presentInboxNextQueue(item: InboxItem) {
  return deriveInboxNextQueue(item).replace("_", " ");
}
