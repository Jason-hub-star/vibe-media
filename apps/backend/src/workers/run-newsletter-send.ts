/**
 * Newsletter send worker.
 * Fetches today's published briefs and sends EN + ES broadcasts via Resend.
 *
 * Usage:
 *   npm run newsletter:send          # live send
 *   npm run newsletter:send-dry      # dry-run (no Resend calls)
 */
import "../shared/load-env.js";

import { createSupabaseSql } from "../shared/supabase-postgres.js";
import { listSupabaseBriefs } from "../shared/supabase-editorial-read.js";
import { sendDailyNewsletter } from "../shared/newsletter-sender.js";
import { sendNewsletterReport } from "../shared/telegram-report.js";

const dryRun = process.argv.includes("--dry-run");

interface VariantRow {
  canonical_id: string;
  locale: string;
  title: string;
  summary: string;
}

async function fetchEsVariants(canonicalIds: string[]): Promise<Map<string, { title: string; summary: string }>> {
  const map = new Map<string, { title: string; summary: string }>();
  if (canonicalIds.length === 0) return map;

  const sql = createSupabaseSql();
  try {
    const rows = await sql<VariantRow[]>`
      select canonical_id, locale, title, summary
      from public.brief_post_variants
      where locale = 'es'
        and translation_status in ('translated', 'published')
        and canonical_id = any(${canonicalIds}::uuid[])
    `;
    for (const row of rows) {
      map.set(row.canonical_id, { title: row.title, summary: row.summary });
    }
  } finally {
    await sql.end();
  }
  return map;
}

function todayDateString(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function main() {
  console.log(`[newsletter-send] Starting${dryRun ? " (DRY RUN)" : ""}...`);

  const allBriefs = await listSupabaseBriefs();
  if (!allBriefs) {
    console.error("[newsletter-send] Failed to fetch briefs from Supabase");
    await sendNewsletterReport({ enCount: 0, esCount: 0, briefCount: 0, error: "Supabase fetch failed" });
    process.exit(1);
  }

  const today = todayDateString();
  const todayBriefs = allBriefs.filter(
    (b) => b.publishedAt && b.publishedAt.slice(0, 10) === today,
  );

  if (todayBriefs.length === 0) {
    console.log("[newsletter-send] No briefs published today, skipping.");
    await sendNewsletterReport({ enCount: 0, esCount: 0, briefCount: 0 });
    console.log("newsletters sent: 0");
    process.exit(0);
  }

  console.log(`[newsletter-send] ${todayBriefs.length} briefs published today`);

  // Prepare EN briefs
  const enBriefs = todayBriefs.map((b) => ({
    title: b.title,
    summary: b.summary,
    slug: b.slug,
  }));

  // Fetch ES variants
  const briefIds = todayBriefs.map((b) => b.slug); // slug is used as canonical_id reference
  // We need actual IDs — check if brief has an id field. brief_post_variants uses canonical_id (uuid).
  // Since listSupabaseBriefs returns slug-based data, we query variants by matching slug→title
  // Actually, let's query variants by slug if available, or use a join approach.
  // The save-variant uses canonicalId (uuid from brief_posts.id). Let's get those IDs.

  const sql = createSupabaseSql();
  let briefUuids: string[] = [];
  try {
    const rows = await sql<Array<{ id: string }>>`
      select id::text from public.brief_posts
      where slug = any(${todayBriefs.map((b) => b.slug)})
    `;
    briefUuids = rows.map((r) => r.id);
  } finally {
    await sql.end();
  }

  const esVariants = await fetchEsVariants(briefUuids);

  // Build ES briefs: use translated version if available, otherwise fallback to EN
  const esBriefs = todayBriefs.map((b, i) => {
    const variant = briefUuids[i] ? esVariants.get(briefUuids[i]) : undefined;
    return {
      title: variant?.title ?? b.title,
      summary: variant?.summary ?? b.summary,
      slug: b.slug,
    };
  });

  let sentCount = 0;
  let enCount = 0;
  let esCount = 0;
  const errors: string[] = [];

  // Get audience sizes for reporting
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && !dryRun) {
    try {
      const enAudienceId = process.env.RESEND_AUDIENCE_EN;
      const esAudienceId = process.env.RESEND_AUDIENCE_ES;
      if (enAudienceId) {
        const res = await fetch(`https://api.resend.com/audiences/${enAudienceId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json() as Record<string, unknown>;
          // Resend doesn't expose count directly in audience GET; we'll report what we can
          enCount = (data as { contacts_count?: number }).contacts_count ?? 0;
        }
      }
      if (esAudienceId) {
        const res = await fetch(`https://api.resend.com/audiences/${esAudienceId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json() as Record<string, unknown>;
          esCount = (data as { contacts_count?: number }).contacts_count ?? 0;
        }
      }
    } catch {
      // Non-critical, continue
    }
  }

  // Send EN
  try {
    const enResult = await sendDailyNewsletter({ briefs: enBriefs, locale: "en", dryRun });
    if (enResult.sent) sentCount++;
    if (enResult.reason && enResult.reason !== "dry-run") errors.push(`EN: ${enResult.reason}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    errors.push(`EN: ${msg}`);
    console.error("[newsletter-send] EN send failed:", msg);
  }

  // Send ES
  try {
    const esResult = await sendDailyNewsletter({ briefs: esBriefs, locale: "es", dryRun });
    if (esResult.sent) sentCount++;
    if (esResult.reason && esResult.reason !== "dry-run") errors.push(`ES: ${esResult.reason}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    errors.push(`ES: ${msg}`);
    console.error("[newsletter-send] ES send failed:", msg);
  }

  // Telegram report
  await sendNewsletterReport({
    enCount,
    esCount,
    briefCount: todayBriefs.length,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  });

  console.log(`newsletters sent: ${sentCount}`);
  console.log(`[newsletter-send] Done. ${sentCount} broadcasts sent, ${todayBriefs.length} briefs.`);
}

main().catch((err) => {
  console.error("[newsletter-send] Fatal:", err);
  sendNewsletterReport({ enCount: 0, esCount: 0, briefCount: 0, error: err instanceof Error ? err.message : "Fatal error" })
    .catch(() => {})
    .finally(() => process.exit(1));
});
