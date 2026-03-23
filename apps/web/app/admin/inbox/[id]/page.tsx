import { notFound } from "next/navigation";

import { AdminShell } from "@/components/AdminShell";
import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getInboxItemDetail } from "@/features/inbox/use-case/get-inbox-item-detail";
import { InboxDetailContent } from "@/features/inbox/view/InboxDetailContent";

export default async function InboxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getInboxItemDetail(id);
  if (!item) notFound();

  return (
    <AdminShell title={item.title} subtitle="상세 보기">
      <AdminDetailLayout
        backHref="/admin/inbox"
        backLabel="수신함 목록"
        breadcrumbs={[
          { label: "대시보드", href: "/admin" },
          { label: "수신함", href: "/admin/inbox" },
          { label: item.title },
        ]}
        title={item.title}
        status={item.stage}
        metadata={[
          { label: "소스", value: item.sourceName },
          { label: "소스 티어", value: item.sourceTier },
          { label: "콘텐츠 유형", value: item.contentType },
          { label: "대상 서피스", value: item.targetSurface },
          { label: "신뢰도", value: String(item.confidence) },
        ]}
      >
        <InboxDetailContent item={item} />
      </AdminDetailLayout>
    </AdminShell>
  );
}
