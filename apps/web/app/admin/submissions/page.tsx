import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listToolSubmissions } from "@/features/tool-submissions/use-case/list-tool-submissions";
import { ToolSubmissionCardGrid } from "@/features/tool-submissions/view/ToolSubmissionCardGrid";

export default async function AdminSubmissionsPage() {
  const items = await listToolSubmissions({ limit: 200 });

  return (
    <AdminShell
      title="툴 제출"
      subtitle="비로그인 제출 레인을 검토하고 쇼케이스로 승격합니다"
    >
      {items.length === 0 ? (
        <EmptyState
          title="No tool submissions"
          body="New tool submissions will appear here after the first public intake."
        />
      ) : (
        <ToolSubmissionCardGrid items={items} />
      )}
    </AdminShell>
  );
}
