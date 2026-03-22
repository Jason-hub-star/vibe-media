import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { AdminBriefTable } from "@/features/admin-briefs/view/AdminBriefTable";
import { listBriefs } from "@/features/admin-briefs/use-case/list-briefs";

export default async function AdminBriefsPage() {
  const briefs = await listBriefs();

  return (
    <AdminShell
      subtitle="Draft, review, schedule, and publish states stay visible for every brief."
      title="Brief Review"
    >
      {briefs.length === 0 ? (
        <EmptyState
          body="Once a draft enters the review queue, it will show up here with its next action."
          title="No briefs in review"
        />
      ) : (
        <AdminBriefTable briefs={briefs} />
      )}
    </AdminShell>
  );
}
