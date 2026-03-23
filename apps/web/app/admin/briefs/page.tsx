import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { BriefCardGrid } from "@/features/admin-briefs/view/BriefCardGrid";
import { listBriefs } from "@/features/admin-briefs/use-case/list-briefs";

export default async function AdminBriefsPage() {
  const briefs = await listBriefs();

  return (
    <AdminShell
      subtitle="초안, 검수, 예약, 발행 상태를 한눈에 확인합니다"
      title="브리프 검수"
    >
      {briefs.length === 0 ? (
        <EmptyState
          body="Once a draft enters the review queue, it will show up here with its next action."
          title="No briefs in review"
        />
      ) : (
        <BriefCardGrid items={briefs} />
      )}
    </AdminShell>
  );
}
