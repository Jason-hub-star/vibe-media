import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listReviewItems } from "@/features/review/use-case/list-review-items";
import { ReviewWorkbench } from "@/features/review/view/ReviewWorkbench";

export default function AdminReviewPage() {
  const items = listReviewItems();
  const current = items[0];

  return (
    <AdminShell
      subtitle="Human review only appears on exceptions, so each candidate must show source, parsed context, and preview at once."
      title="Review"
    >
      {!current ? (
        <EmptyState
          body="Only exception cases or high-impact drafts will open a review workspace here."
          title="No review items"
        />
      ) : (
        <ReviewWorkbench item={current} />
      )}
    </AdminShell>
  );
}
