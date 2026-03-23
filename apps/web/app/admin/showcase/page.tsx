import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listShowcaseEntries } from "@/features/showcase/use-case/list-showcase-entries";
import { ShowcaseCardGrid } from "@/features/showcase/view/ShowcaseCardGrid";

export default async function AdminShowcasePage() {
  const showcaseEntries = await listShowcaseEntries();

  return (
    <AdminShell
      subtitle="수동 큐레이션 사이드카 레인을 운영합니다"
      title="쇼케이스"
    >
      {showcaseEntries.length === 0 ? (
        <EmptyState
          body="Curated showcase entries will appear here once they are registered."
          title="No showcase entries"
        />
      ) : (
        <ShowcaseCardGrid items={showcaseEntries} />
      )}
    </AdminShell>
  );
}
