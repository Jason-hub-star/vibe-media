import { notFound } from "next/navigation";

import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getShowcaseDetail } from "@/features/showcase/use-case/get-showcase-detail";
import { ShowcaseDetailContent } from "@/features/showcase/view/ShowcaseDetailContent";

export default async function AdminShowcaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getShowcaseDetail(id);

  if (!entry) {
    notFound();
  }

  return (
    <AdminDetailLayout
      backHref="/admin/showcase"
      backLabel="쇼케이스 목록"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "쇼케이스", href: "/admin/showcase" },
        { label: entry.title },
      ]}
      title={entry.title}
      status={entry.reviewStatus}
      statusLabel={entry.reviewStatus}
      metadata={[
        { label: "ID", value: entry.id },
        { label: "슬러그", value: entry.slug },
        { label: "출처", value: entry.origin },
        {
          label: "발행일",
          value: entry.publishedAt
            ? entry.publishedAt.slice(0, 10)
            : "미발행",
        },
      ]}
    >
      <ShowcaseDetailContent entry={entry} />
    </AdminDetailLayout>
  );
}
