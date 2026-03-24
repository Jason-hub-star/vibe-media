import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { ReviewCardGrid } from "@/features/review/view/ReviewCardGrid";
import { ExceptionCardGrid } from "@/features/exceptions/view/ExceptionCardGrid";
import { PendingTabs } from "@/features/pending/view/PendingTabs";
import { listReviewItems } from "@/features/review/use-case/list-review-items";
import { listExceptionQueue } from "@/features/exceptions/use-case/list-exception-queue";

export default async function AdminPendingPage() {
  const [reviewItems, exceptions] = await Promise.all([
    listReviewItems(),
    listExceptionQueue(),
  ]);

  const reviewSlot =
    reviewItems.length === 0 ? (
      <EmptyState
        body="Only exception cases or high-impact drafts will open a review workspace here."
        title="No review items"
      />
    ) : (
      <ReviewCardGrid items={reviewItems} />
    );

  const exceptionsSlot =
    exceptions.length === 0 ? (
      <EmptyState
        body="Low-confidence, blocked, or policy-sensitive items will appear here for operator follow-up."
        title="No exceptions"
      />
    ) : (
      <ExceptionCardGrid items={exceptions} />
    );

  return (
    <AdminShell
      subtitle="검수 대기 항목과 예외 처리를 한곳에서 확인합니다"
      title="검토 대기"
    >
      <PendingTabs reviewSlot={reviewSlot} exceptionsSlot={exceptionsSlot} />
    </AdminShell>
  );
}
