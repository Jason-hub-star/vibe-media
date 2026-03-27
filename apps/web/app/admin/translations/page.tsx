import { AdminShell } from "@/components/AdminShell";
import { getTranslationOverview } from "@/features/translation/use-case/get-translation-overview";
import { TranslationStatusTable } from "@/features/translation/view/TranslationStatusTable";

export default async function TranslationsPage() {
  const overview = await getTranslationOverview();

  return (
    <AdminShell title="번역 대시보드" subtitle="Translations">
      <div className="panel-grid" style={{ marginBottom: "2rem" }}>
        <article className="panel stack-tight">
          <p className="eyebrow">전체 Brief</p>
          <p className="admin-stat">{overview.totalBriefs}</p>
        </article>
        <article className="panel stack-tight">
          <p className="eyebrow">번역 완료 (ES)</p>
          <p className="admin-stat">{overview.translated}</p>
        </article>
        <article className="panel stack-tight">
          <p className="eyebrow">대기 중</p>
          <p className="admin-stat">{overview.pending}</p>
        </article>
        <article className="panel stack-tight">
          <p className="eyebrow">품질 실패</p>
          <p className="admin-stat">{overview.qualityFailed}</p>
        </article>
        <article className="panel stack-tight">
          <p className="eyebrow">발행 완료</p>
          <p className="admin-stat">{overview.published}</p>
        </article>
      </div>

      <TranslationStatusTable rows={overview.rows} />
    </AdminShell>
  );
}
