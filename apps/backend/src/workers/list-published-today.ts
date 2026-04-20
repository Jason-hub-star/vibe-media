import { createSupabaseSql } from "../shared/supabase-postgres.js";

const sql = createSupabaseSql();

const today = new Date();
const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split("T")[0];

const rows = await sql<{ slug: string; title: string; published_at: string }[]>`
  SELECT slug, title, published_at
  FROM brief_posts
  WHERE status = 'published'
    AND published_at >= ${todayStr}::date
    AND published_at < ${tomorrowStr}::date
  ORDER BY published_at DESC
  LIMIT 5
`;

if (rows.length === 0) {
  console.log("NO_BRIEFS_TODAY");
} else {
  console.log("PUBLISHED_TODAY:");
  rows.forEach(row => {
    console.log(`slug: ${row.slug} | published_at: ${row.published_at} | title: ${row.title}`);
  });
}

await sql.end();
