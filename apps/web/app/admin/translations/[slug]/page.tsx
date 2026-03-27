import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/AdminShell";
import { listTranslationStatus } from "@/features/translation/api/list-translation-status";

export default async function TranslationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const allRows = await listTranslationStatus();
  const rows = allRows.filter((r) => r.slug === slug);

  if (rows.length === 0) notFound();

  const canonical = rows[0];
  const esVariant = rows.find((r) => r.locale === "es" && r.translationStatus);

  return (
    <AdminShell title={canonical.title} subtitle="번역 상세">
      <div className="brief-reading-col stack-tight">
        <div className="panel stack-tight">
          <h3>영어 원문 (Canonical)</h3>
          <table className="admin-table">
            <tbody>
              <tr><td>Slug</td><td>{canonical.slug}</td></tr>
              <tr><td>상태</td><td>{canonical.status}</td></tr>
              <tr><td>발행일</td><td>{canonical.publishedAt ?? "—"}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="panel stack-tight">
          <h3>스페인어 번역 (ES)</h3>
          {esVariant ? (
            <table className="admin-table">
              <tbody>
                <tr><td>번역 제목</td><td>{esVariant.variantTitle ?? "—"}</td></tr>
                <tr><td>번역 상태</td><td>{esVariant.translationStatus ?? "—"}</td></tr>
                <tr><td>품질 상태</td><td>{esVariant.qualityStatus ?? "—"}</td></tr>
                <tr><td>발행 상태</td><td>{esVariant.publishStatus ?? "—"}</td></tr>
                <tr><td>번역일</td><td>{esVariant.translatedAt ?? "—"}</td></tr>
              </tbody>
            </table>
          ) : (
            <p className="muted">아직 스페인어 번역이 없습니다.</p>
          )}
        </div>

        <div className="button-row">
          <Link href="/admin/translations" className="button-secondary">
            목록으로
          </Link>
          <Link href={`/en/brief/${slug}`} className="button-secondary" target="_blank">
            영어 보기
          </Link>
          <Link href={`/es/brief/${slug}`} className="button-secondary" target="_blank">
            스페인어 보기
          </Link>
        </div>

        <div className="panel stack-tight" style={{ marginTop: "1rem" }}>
          <h3>액션</h3>
          <p className="muted">
            재시도/강제 승인은 CLI에서 실행: <code>npm run translate:variant {slug} --locale=es</code>
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
