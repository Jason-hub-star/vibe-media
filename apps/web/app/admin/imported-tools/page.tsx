import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listImportedToolCandidates } from "@/features/tool-candidate-imports/use-case/list-imported-tool-candidates";
import { ToolCandidateImportCardGrid } from "@/features/tool-candidate-imports/view/ToolCandidateImportCardGrid";

export default async function AdminImportedToolsPage() {
  const items = await listImportedToolCandidates();

  return (
    <AdminShell
      title="가져온 툴 후보"
      subtitle="외부 소스에서 수집한 후보를 검토하고 쇼케이스로 승격합니다"
    >
      {items.length === 0 ? (
        <EmptyState
          title="No imported candidates"
          body="Imported candidates will appear here after the first sidecar fetch and screening pass."
        />
      ) : (
        <ToolCandidateImportCardGrid items={items} />
      )}
    </AdminShell>
  );
}
