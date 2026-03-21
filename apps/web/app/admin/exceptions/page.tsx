import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listExceptionQueue } from "@/features/exceptions/use-case/list-exception-queue";
import { ExceptionQueueTable } from "@/features/exceptions/view/ExceptionQueueTable";

export default function AdminExceptionsPage() {
  const items = listExceptionQueue();

  return (
    <AdminShell
      subtitle="Only the cases that fail confidence, policy, render, or privacy checks should land here."
      title="Exceptions"
    >
      {items.length === 0 ? (
        <EmptyState
          body="Low-confidence, blocked, or policy-sensitive items will appear here for operator follow-up."
          title="No exceptions"
        />
      ) : (
        <ExceptionQueueTable items={items} />
      )}
    </AdminShell>
  );
}
