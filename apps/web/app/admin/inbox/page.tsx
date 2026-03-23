import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { InboxCardGrid } from "@/features/inbox/view/InboxCardGrid";
import { listInboxItems } from "@/features/inbox/use-case/list-inbox-items";

export default async function AdminInboxPage() {
  const items = await listInboxItems();

  return (
    <AdminShell
      subtitle="새로 수집된 항목이 검수·발행·디스커버리 큐로 이동하기 전 대기합니다"
      title="수신함"
    >
      {items.length === 0 ? (
        <EmptyState
          body="Collected items will appear here once parsing and first-pass classification complete."
          title="Inbox is empty"
        />
      ) : (
        <InboxCardGrid items={items} />
      )}
    </AdminShell>
  );
}
