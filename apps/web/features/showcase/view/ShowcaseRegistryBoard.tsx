import type { DiscoverItem, ShowcaseEntry } from "@vibehub/content-contracts";

import { EmptyState } from "@/components/EmptyState";

import { ShowcaseEditorForm } from "./ShowcaseEditorForm";

export function ShowcaseRegistryBoard({
  discoverItems,
  entries
}: {
  discoverItems: DiscoverItem[];
  entries: ShowcaseEntry[];
}) {
  return (
    <div className="stack-tight">
      <ShowcaseEditorForm discoverItems={discoverItems} title="Create showcase entry" />
      {entries.length === 0 ? (
        <EmptyState
          body="Create the first showcase entry to start the sidecar editorial lane."
          title="No showcase entries yet"
        />
      ) : (
        <div className="stack-tight">
          {entries.map((entry) => (
            <ShowcaseEditorForm
              discoverItems={discoverItems}
              entry={entry}
              key={entry.id}
              title={entry.title}
            />
          ))}
        </div>
      )}
    </div>
  );
}
