import { notFound } from "next/navigation";

import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getBriefDetail } from "@/features/admin-briefs/use-case/get-brief-detail";
import { BriefDetailContent } from "@/features/admin-briefs/view/BriefDetailContent";

export default async function AdminBriefDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brief = await getBriefDetail(slug);

  if (!brief) {
    notFound();
  }

  return (
    <AdminDetailLayout
      backHref="/admin/briefs"
      backLabel="브리프 목록"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "브리프", href: "/admin/briefs" },
        { label: brief.title },
      ]}
      title={brief.title}
      status={brief.status}
      statusLabel={brief.status}
      metadata={[
        { label: "슬러그", value: brief.slug },
        { label: "소스 수", value: String(brief.sourceCount) },
        {
          label: "발행일",
          value: brief.publishedAt
            ? brief.publishedAt.slice(0, 10)
            : "미발행",
        },
      ]}
    >
      <BriefDetailContent brief={brief} />
    </AdminDetailLayout>
  );
}
