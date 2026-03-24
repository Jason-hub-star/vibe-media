import { notFound } from "next/navigation";

import { AdminShell } from "@/components/AdminShell";
import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getExceptionDetail } from "@/features/exceptions/use-case/get-exception-detail";
import { ExceptionDetailContent } from "@/features/exceptions/view/ExceptionDetailContent";

export default async function ExceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getExceptionDetail(id);
  if (!item) notFound();

  return (
    <AdminShell title={item.title} subtitle="상세 보기">
      <AdminDetailLayout
        backHref="/admin/pending?tab=exceptions"
        backLabel="검토 대기"
        breadcrumbs={[
          { label: "대시보드", href: "/admin" },
          { label: "검토 대기", href: "/admin/pending?tab=exceptions" },
          { label: item.title },
        ]}
        title={item.title}
        status={item.currentStage}
        metadata={[
          { label: "대상 유형", value: item.targetType },
          { label: "현재 단계", value: item.currentStage },
          { label: "소스", value: item.sourceLabel },
          { label: "신뢰도", value: String(item.confidence) },
          { label: "재시도 가능", value: item.retryable ? "예" : "아니오" },
        ]}
      >
        <ExceptionDetailContent item={item} />
      </AdminDetailLayout>
    </AdminShell>
  );
}
