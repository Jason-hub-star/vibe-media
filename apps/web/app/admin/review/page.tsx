import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listReviewItems } from "@/features/review/use-case/list-review-items";
import { ReviewWorkbench } from "@/features/review/view/ReviewWorkbench";

export default async function AdminReviewPage() {
  const items = await listReviewItems();

  return (
    <AdminShell
      subtitle="Human review only appears on exceptions, so each candidate must show source, parsed context, and preview at once."
      title="Review"
    >
      {items.length === 0 ? (
        <EmptyState
          body="Only exception cases or high-impact drafts will open a review workspace here."
          title="No review items"
        />
      ) : (
        <div className="stack-tight">
          {items.map((item, index) => (
            <section className="stack-tight" key={item.id}>
              <div className="row-between">
                <div className="stack-tight">
                  <p className="eyebrow">{item.sourceLabel ?? `#${index + 1}`}</p>
                  <h2>{item.previewTitle}</h2>
                </div>
                <span className={`status status-${item.targetSurface}`}>{item.targetSurface}</span>
              </div>
              <ReviewWorkbench item={item} />
            </section>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
