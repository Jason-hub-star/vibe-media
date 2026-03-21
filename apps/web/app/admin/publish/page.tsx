import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listPublishQueue } from "@/features/publish/use-case/list-publish-queue";
import { PublishQueueTable } from "@/features/publish/view/PublishQueueTable";

export default function AdminPublishPage() {
  const items = listPublishQueue();

  return (
    <AdminShell
      subtitle="Scheduled briefs, discovery items, and private video uploads meet in one publish queue before release."
      title="Publish Queue"
    >
      {items.length === 0 ? (
        <EmptyState
          body="Approved briefs, curated discover items, and private uploads will appear here before release."
          title="Publish queue is empty"
        />
      ) : (
        <PublishQueueTable items={items} />
      )}
    </AdminShell>
  );
}
