import { notFound } from "next/navigation";

import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getToolCandidateImport } from "@/features/tool-candidate-imports/use-case/get-tool-candidate-import";
import { ToolCandidateImportActionBar } from "@/features/tool-candidate-imports/view/ToolCandidateImportActionBar";
import { ToolCandidateImportDetailContent } from "@/features/tool-candidate-imports/view/ToolCandidateImportDetailContent";

export default async function AdminImportedToolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getToolCandidateImport(id);

  if (!item) {
    notFound();
  }

  return (
    <AdminDetailLayout
      backHref="/admin/imported-tools"
      backLabel="가져온 툴 후보 목록"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "가져온 툴 후보", href: "/admin/imported-tools" },
        { label: item.title },
      ]}
      title={item.title}
      status={item.status}
      statusLabel={item.status}
      metadata={[
        { label: "ID", value: item.id },
        { label: "슬러그", value: item.slug },
        { label: "Source", value: item.sourceName },
        { label: "Imported", value: item.importedAt },
      ]}
      actionBar={<ToolCandidateImportActionBar item={item} />}
    >
      <ToolCandidateImportDetailContent item={item} />
    </AdminDetailLayout>
  );
}
