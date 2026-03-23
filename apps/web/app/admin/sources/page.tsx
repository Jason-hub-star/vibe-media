import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listSources } from "@/features/sources/use-case/list-sources";
import { SourceCardGrid } from "@/features/sources/view/SourceCardGrid";

export default async function AdminSourcesPage() {
  const sources = await listSources();

  return (
    <AdminShell
      subtitle="등록된 피드를 관리하고 신뢰 경계를 확인합니다"
      title="소스 관리"
    >
      {sources.length === 0 ? (
        <EmptyState
          body="Registered feeds and their trust boundaries will appear here."
          title="No sources"
        />
      ) : (
        <SourceCardGrid items={sources} />
      )}
    </AdminShell>
  );
}
