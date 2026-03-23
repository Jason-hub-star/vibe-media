import { notFound } from "next/navigation";

import { AdminShell } from "@/components/AdminShell";
import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getPublishItemDetail } from "@/features/publish/use-case/get-publish-item-detail";
import { PublishDetailContent } from "@/features/publish/view/PublishDetailContent";

export default async function PublishDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getPublishItemDetail(id);
  if (!item) notFound();

  return (
    <AdminShell title={item.title} subtitle="상세 보기">
      <AdminDetailLayout
        backHref="/admin/publish"
        backLabel="발행 목록"
        breadcrumbs={[
          { label: "대시보드", href: "/admin" },
          { label: "발행", href: "/admin/publish" },
          { label: item.title },
        ]}
        title={item.title}
        status={item.queueStatus}
        metadata={[
          { label: "대상 유형", value: item.targetType },
          { label: "소스", value: item.sourceLabel },
          { label: "예약 일시", value: item.scheduledFor ?? "미정" },
          { label: "다음 액션", value: item.nextAction },
        ]}
      >
        <PublishDetailContent item={item} />
      </AdminDetailLayout>
    </AdminShell>
  );
}
