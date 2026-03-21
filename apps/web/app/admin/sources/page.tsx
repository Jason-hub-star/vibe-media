import { AdminShell } from "@/components/AdminShell";
import { SourceRow } from "@/features/sources/view/SourceRow";
import { listSources } from "@/features/sources/use-case/list-sources";

export default function AdminSourcesPage() {
  return (
    <AdminShell
      subtitle="Manage tracked feeds and verify the trust boundary before drafting."
      title="Source Registry"
    >
      <ul className="panel stack-tight">
        {listSources().map((source) => (
          <SourceRow key={source.id} source={source} />
        ))}
      </ul>
    </AdminShell>
  );
}
