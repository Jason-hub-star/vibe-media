import Link from "next/link";

import type { TranslationStatusRow } from "../api/list-translation-status";

interface TranslationStatusTableProps {
  rows: TranslationStatusRow[];
}

function statusEmoji(status: string | null): string {
  switch (status) {
    case "translated": return "✅";
    case "published": return "🚀";
    case "quality_failed": return "❌";
    case "pending": return "⏳";
    default: return "—";
  }
}

function qualityEmoji(status: string | null): string {
  switch (status) {
    case "passed": return "✅";
    case "failed": return "❌";
    case "pending": return "⏳";
    default: return "—";
  }
}

export function TranslationStatusTable({ rows }: TranslationStatusTableProps) {
  // brief별로 그룹화 (en canonical + es variant)
  const bySlug = new Map<string, { canonical: TranslationStatusRow; variants: TranslationStatusRow[] }>();
  for (const row of rows) {
    if (!bySlug.has(row.slug)) {
      bySlug.set(row.slug, { canonical: row, variants: [] });
    }
    if (row.translationStatus) {
      bySlug.get(row.slug)!.variants.push(row);
    }
  }

  const entries = [...bySlug.values()];

  return (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Brief</th>
            <th>상태</th>
            <th>ES 번역</th>
            <th>ES 품질</th>
            <th>번역일</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ canonical, variants }) => {
            const esVariant = variants.find((v) => v.locale === "es");
            return (
              <tr key={canonical.slug}>
                <td>
                  <Link href={`/admin/translations/${canonical.slug}`} className="inline-link">
                    {canonical.title.length > 50
                      ? `${canonical.title.slice(0, 47)}...`
                      : canonical.title}
                  </Link>
                </td>
                <td>
                  <span className={`status status-${canonical.status}`}>
                    {canonical.status}
                  </span>
                </td>
                <td>{statusEmoji(esVariant?.translationStatus ?? null)}</td>
                <td>{qualityEmoji(esVariant?.qualityStatus ?? null)}</td>
                <td className="muted">
                  {esVariant?.translatedAt
                    ? new Date(esVariant.translatedAt).toLocaleDateString()
                    : "—"}
                </td>
                <td>
                  <Link
                    href={`/admin/translations/${canonical.slug}`}
                    className="button-secondary"
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                  >
                    상세
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
