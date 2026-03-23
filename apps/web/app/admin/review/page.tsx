import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listReviewItems } from "@/features/review/use-case/list-review-items";
import { ReviewCardGrid } from "@/features/review/view/ReviewCardGrid";

export default async function AdminReviewPage() {
  const items = await listReviewItems();

  return (
    <AdminShell
      subtitle="예외 항목만 사람이 검수합니다 — 출처, 파싱 결과, 미리보기를 함께 봅니다"
      title="검수 워크벤치"
    >
      {items.length === 0 ? (
        <EmptyState
          body="Only exception cases or high-impact drafts will open a review workspace here."
          title="No review items"
        />
      ) : (
        <ReviewCardGrid items={items} />
      )}
    </AdminShell>
  );
}
