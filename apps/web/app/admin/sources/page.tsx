import { AdminShell } from "@/components/AdminShell";
import { SourceRow } from "@/features/sources/view/SourceRow";
import { listSources } from "@/features/sources/use-case/list-sources";

export default async function AdminSourcesPage() {
  const sources = await listSources();

  return (
    <AdminShell
      subtitle="Manage tracked feeds and verify the trust boundary before drafting."
      title="Source Registry"
    >
      <ul className="panel stack-tight">
        {sources.map((source) => (
          <SourceRow key={source.id} source={source} />
        ))}
      </ul>
    </AdminShell>
  );
}
