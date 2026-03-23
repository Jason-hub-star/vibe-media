import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listRuns } from "@/features/runs/use-case/list-runs";
import { RunCardGrid } from "@/features/runs/view/RunCardGrid";

export default async function AdminRunsPage() {
  const runs = await listRuns();

  return (
    <AdminShell
      subtitle="수집, 파싱, 분류, 실패 이력을 추적합니다"
      title="실행 이력"
    >
      {runs.length === 0 ? (
        <EmptyState
          body="Once collection waves start running, each source execution will appear here with its current stage."
          title="No runs yet"
        />
      ) : (
        <RunCardGrid items={runs} />
      )}
    </AdminShell>
  );
}
