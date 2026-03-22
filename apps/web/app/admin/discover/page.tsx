import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";
import { DiscoverRegistryTable } from "@/features/discover/view/DiscoverRegistryTable";

export default async function AdminDiscoverPage() {
  const items = await listDiscoverItems();

  return (
    <AdminShell
      subtitle="Track open source, skills, plugins, websites, events, and contests before they enter briefs."
      title="Discovery Registry"
    >
      {items.length === 0 ? (
        <EmptyState
          body="The registry will list curated items once the discovery pipeline is connected."
          title="No discovery items tracked"
        />
      ) : (
        <DiscoverRegistryTable items={items} />
      )}
    </AdminShell>
  );
}
