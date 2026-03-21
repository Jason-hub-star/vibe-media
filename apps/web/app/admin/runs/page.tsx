import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listRuns } from "@/features/runs/use-case/list-runs";
import { RunTable } from "@/features/runs/view/RunTable";

export default function AdminRunsPage() {
  const runs = listRuns();

  return (
    <AdminShell
      subtitle="Collection, parsing, classification, and failure history stay visible here before retry policy is automated."
      title="Runs"
    >
      {runs.length === 0 ? (
        <EmptyState
          body="Once collection waves start running, each source execution will appear here with its current stage."
          title="No runs yet"
        />
      ) : (
        <RunTable runs={runs} />
      )}
    </AdminShell>
  );
}
