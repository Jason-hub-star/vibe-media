import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listPublishQueue } from "@/features/publish/use-case/list-publish-queue";
import { PublishCardGrid } from "@/features/publish/view/PublishCardGrid";

export default async function AdminPublishPage() {
  const items = await listPublishQueue();

  return (
    <AdminShell
      subtitle="브리프, 디스커버리, 비디오가 하나의 발행 큐에서 만납니다"
      title="발행 대기열"
    >
      {items.length === 0 ? (
        <EmptyState
          body="Approved briefs, curated discover items, and private uploads will appear here before release."
          title="Publish queue is empty"
        />
      ) : (
        <PublishCardGrid items={items} />
      )}
    </AdminShell>
  );
}
