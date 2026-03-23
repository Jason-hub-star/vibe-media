import { notFound } from "next/navigation";

import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getSourceDetail } from "@/features/sources/use-case/get-source-detail";
import { SourceDetailContent } from "@/features/sources/view/SourceDetailContent";

export default async function AdminSourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await getSourceDetail(id);

  if (!source) {
    notFound();
  }

  return (
    <AdminDetailLayout
      backHref="/admin/sources"
      backLabel="소스 목록"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "소스", href: "/admin/sources" },
        { label: source.label },
      ]}
      title={source.label}
      metadata={[
        { label: "ID", value: source.id },
        { label: "카테고리", value: source.category },
        { label: "갱신 주기", value: source.freshness },
      ]}
    >
      <SourceDetailContent source={source} />
    </AdminDetailLayout>
  );
}
