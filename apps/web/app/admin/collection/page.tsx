import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { InboxCardGrid } from "@/features/inbox/view/InboxCardGrid";
import { RunCardGrid } from "@/features/runs/view/RunCardGrid";
import { CollectionTabs } from "@/features/collection/view/CollectionTabs";
import { listInboxItems } from "@/features/inbox/use-case/list-inbox-items";
import { listRuns } from "@/features/runs/use-case/list-runs";

export default async function AdminCollectionPage() {
  const [inboxItems, runs] = await Promise.all([
    listInboxItems(),
    listRuns(),
  ]);

  const inboxSlot =
    inboxItems.length === 0 ? (
      <EmptyState
        body="Collected items will appear here once parsing and first-pass classification complete."
        title="Inbox is empty"
      />
    ) : (
      <InboxCardGrid items={inboxItems} />
    );

  const runsSlot =
    runs.length === 0 ? (
      <EmptyState
        body="Once collection waves start running, each source execution will appear here with its current stage."
        title="No runs yet"
      />
    ) : (
      <RunCardGrid items={runs} />
    );

  return (
    <AdminShell
      subtitle="수신함과 실행 이력을 한곳에서 확인합니다"
      title="수집 현황"
    >
      <CollectionTabs inboxSlot={inboxSlot} runsSlot={runsSlot} />
    </AdminShell>
  );
}
