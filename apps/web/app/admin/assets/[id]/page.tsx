import { notFound } from "next/navigation";

import { AdminDetailLayout } from "@/components/AdminDetailLayout";
import { getAssetDetail } from "@/features/assets/use-case/get-asset-detail";
import { AssetDetailContent } from "@/features/assets/view/AssetDetailContent";

export default async function AdminAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const asset = await getAssetDetail(id);

  if (!asset) {
    notFound();
  }

  return (
    <AdminDetailLayout
      backHref="/admin/assets"
      backLabel="에셋 목록"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "에셋", href: "/admin/assets" },
        { label: asset.name },
      ]}
      title={asset.name}
      metadata={[
        { label: "ID", value: asset.id },
        { label: "타입", value: asset.type },
        { label: "포맷", value: asset.spec.format },
        { label: "비율", value: asset.spec.ratio },
      ]}
    >
      <AssetDetailContent asset={asset} />
    </AdminDetailLayout>
  );
}
