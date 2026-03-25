import { notFound } from "next/navigation";

import { AdminShell } from "@/components/AdminShell";
import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getDiscoverItemDetail } from "@/features/discover/use-case/get-discover-item-detail";
import { DiscoverDetailContent } from "@/features/discover/view/DiscoverDetailContent";

export default async function DiscoverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getDiscoverItemDetail(id);
  if (!item) notFound();

  return (
    <AdminShell title={item.title} subtitle="상세 보기">
      <AdminDetailLayout
        backHref="/admin/discover"
        backLabel="디스커버리 목록"
        breadcrumbs={[
          { label: "대시보드", href: "/admin" },
          { label: "디스커버리", href: "/admin/discover" },
          { label: item.title },
        ]}
        title={item.title}
        status={item.status}
        metadata={[
          { label: "카테고리", value: item.category },
          { label: "슬러그", value: item.slug },
          { label: "리뷰 상태", value: item.reviewStatus },
          { label: "발행일", value: item.publishedAt ?? "미발행" },
          { label: "하이라이트", value: item.highlighted ? "예" : "아니오" },
          { label: "태그", value: item.tags.join(", ") || "없음" },
        ]}
      >
        <DiscoverDetailContent item={item} />
      </AdminDetailLayout>
    </AdminShell>
  );
}
