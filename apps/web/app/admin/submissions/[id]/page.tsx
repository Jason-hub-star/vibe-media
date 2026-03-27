import { notFound } from "next/navigation";

import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getToolSubmission } from "@/features/tool-submissions/use-case/get-tool-submission";
import { ToolSubmissionActionBar } from "@/features/tool-submissions/view/ToolSubmissionActionBar";
import { ToolSubmissionDetailContent } from "@/features/tool-submissions/view/ToolSubmissionDetailContent";

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getToolSubmission(id);

  if (!item) {
    notFound();
  }

  return (
    <AdminDetailLayout
      backHref="/admin/submissions"
      backLabel="툴 제출 목록"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "툴 제출", href: "/admin/submissions" },
        { label: item.title },
      ]}
      title={item.title}
      status={item.status}
      statusLabel={item.status}
      metadata={[
        { label: "ID", value: item.id },
        { label: "슬러그", value: item.slug },
        { label: "이메일", value: item.submitterEmail },
        { label: "소스 locale", value: item.sourceLocale },
      ]}
      actionBar={<ToolSubmissionActionBar item={item} />}
    >
      <ToolSubmissionDetailContent item={item} />
    </AdminDetailLayout>
  );
}
