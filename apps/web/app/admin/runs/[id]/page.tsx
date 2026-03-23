import { notFound } from "next/navigation";

import { AdminShell } from "@/components/AdminShell";
import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getRunDetail } from "@/features/runs/use-case/get-run-detail";
import { RunDetailContent } from "@/features/runs/view/RunDetailContent";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getRunDetail(id);
  if (!item) notFound();

  return (
    <AdminShell title={item.sourceName} subtitle="상세 보기">
      <AdminDetailLayout
        backHref="/admin/runs"
        backLabel="실행 이력 목록"
        breadcrumbs={[
          { label: "대시보드", href: "/admin" },
          { label: "실행 이력", href: "/admin/runs" },
          { label: item.sourceName },
        ]}
        title={item.sourceName}
        status={item.runStatus}
        metadata={[
          { label: "소스", value: item.sourceName },
          { label: "시작 시각", value: item.startedAt },
          { label: "종료 시각", value: item.finishedAt ?? "진행 중" },
          { label: "처리 건수", value: String(item.itemCount) },
        ]}
      >
        <RunDetailContent item={item} />
      </AdminDetailLayout>
    </AdminShell>
  );
}
