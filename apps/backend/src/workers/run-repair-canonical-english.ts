import {
  briefContainsHangulContent,
  canTranslateBriefToEnglish,
  normalizeBriefToEnglish,
} from "../shared/brief-language";
import { createSupabaseSql } from "../shared/supabase-postgres";
import { updateBriefCanonicalCopy } from "../shared/supabase-brief-copy";

interface RepairRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  published_at: string | null;
}

const args = process.argv.slice(2);
const slugArg = args.find((arg) => arg.startsWith("--slug="))?.slice("--slug=".length) ?? null;
const dryRun = args.includes("--dry-run");
const includeUnpublished = args.includes("--include-unpublished");

if (!canTranslateBriefToEnglish()) {
  console.error("GEMINI_API_KEY is required to repair canonical English copy.");
  process.exit(1);
}

const sql = createSupabaseSql();

try {
  const rows = await sql<RepairRow[]>`
    select id, slug, title, summary, body, published_at
    from public.brief_posts
    where (${slugArg}::text is null or slug = ${slugArg})
      and (${includeUnpublished}::boolean = true or published_at is not null)
    order by published_at desc nulls last, slug asc
  `;

  const candidates = rows.filter((row) =>
    briefContainsHangulContent({
      title: row.title,
      summary: row.summary,
      body: Array.isArray(row.body) ? row.body : [],
    }),
  );

  console.log(`Found ${candidates.length} canonical brief(s) that need English repair${dryRun ? " [DRY RUN]" : ""}.`);

  for (const row of candidates) {
    const normalized = await normalizeBriefToEnglish({
      title: row.title,
      summary: row.summary,
      body: Array.isArray(row.body) ? row.body : [],
    });

    console.log(`- ${row.slug}`);
    console.log(`  title: ${normalized.title}`);

    if (!dryRun) {
      await updateBriefCanonicalCopy({
        briefId: row.id,
        title: normalized.title,
        summary: normalized.summary,
        body: normalized.body,
        note: "canonical English copy repaired",
      });
    }
  }
} finally {
  await sql.end();
}
