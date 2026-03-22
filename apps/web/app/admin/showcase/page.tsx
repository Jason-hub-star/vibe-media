import { AdminShell } from "@/components/AdminShell";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";
import { listShowcaseEntries } from "@/features/showcase/use-case/list-showcase-entries";
import { ShowcaseRegistryBoard } from "@/features/showcase/view/ShowcaseRegistryBoard";

export default async function AdminShowcasePage() {
  const [showcaseEntries, discoverItems] = await Promise.all([listShowcaseEntries(), listDiscoverItems()]);

  return (
    <AdminShell
      subtitle="Operate the manual showcase sidecar lane without changing the brief/discover automation spine."
      title="Showcase Lane"
    >
      <ShowcaseRegistryBoard discoverItems={discoverItems} entries={showcaseEntries} />
    </AdminShell>
  );
}
