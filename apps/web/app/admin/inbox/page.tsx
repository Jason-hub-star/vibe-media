import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { InboxTable } from "@/features/inbox/view/InboxTable";
import { listInboxItems } from "@/features/inbox/use-case/list-inbox-items";

export default function AdminInboxPage() {
  const items = listInboxItems();

  return (
    <AdminShell
      subtitle="Newly collected items land here before they move into review, discover, or publish queues."
      title="Inbox"
    >
      {items.length === 0 ? (
        <EmptyState
          body="Collected items will appear here once parsing and first-pass classification complete."
          title="Inbox is empty"
        />
      ) : (
        <InboxTable items={items} />
      )}
    </AdminShell>
  );
}
