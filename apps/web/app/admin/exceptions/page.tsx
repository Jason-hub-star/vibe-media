import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listExceptionQueue } from "@/features/exceptions/use-case/list-exception-queue";
import { ExceptionCardGrid } from "@/features/exceptions/view/ExceptionCardGrid";

export default async function AdminExceptionsPage() {
  const items = await listExceptionQueue();

  return (
    <AdminShell
      subtitle="신뢰도, 정책, 렌더링, 개인정보 검사를 통과하지 못한 항목입니다"
      title="예외 처리"
    >
      {items.length === 0 ? (
        <EmptyState
          body="Low-confidence, blocked, or policy-sensitive items will appear here for operator follow-up."
          title="No exceptions"
        />
      ) : (
        <ExceptionCardGrid items={items} />
      )}
    </AdminShell>
  );
}
