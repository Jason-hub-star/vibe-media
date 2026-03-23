import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";
import { DiscoverCardGrid } from "@/features/discover/view/DiscoverCardGrid";

export default async function AdminDiscoverPage() {
  const items = await listDiscoverItems();

  return (
    <AdminShell
      subtitle="오픈소스, 스킬, 플러그인, 이벤트, 공모전을 추적합니다"
      title="디스커버리 레지스트리"
    >
      {items.length === 0 ? (
        <EmptyState
          body="The registry will list curated items once the discovery pipeline is connected."
          title="No discovery items tracked"
        />
      ) : (
        <DiscoverCardGrid items={items} />
      )}
    </AdminShell>
  );
}
