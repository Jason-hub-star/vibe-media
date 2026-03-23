import { notFound } from "next/navigation";

import { AdminShell } from "@/components/AdminShell";
import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getReviewItemDetail } from "@/features/review/use-case/get-review-item-detail";
import { ReviewDetailContent } from "@/features/review/view/ReviewDetailContent";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getReviewItemDetail(id);
  if (!item) notFound();

  return (
    <AdminShell title={item.previewTitle} subtitle="상세 보기">
      <AdminDetailLayout
        backHref="/admin/review"
        backLabel="검수 목록"
        breadcrumbs={[
          { label: "대시보드", href: "/admin" },
          { label: "검수", href: "/admin/review" },
          { label: item.previewTitle },
        ]}
        title={item.previewTitle}
        status={item.reviewStatus}
        metadata={[
          { label: "소스", value: item.sourceLabel },
          { label: "대상 서피스", value: item.targetSurface },
          { label: "검수 사유", value: item.reviewReason },
          { label: "신뢰도", value: String(item.confidence) },
        ]}
      >
        <ReviewDetailContent item={item} />
      </AdminDetailLayout>
    </AdminShell>
  );
}
