import { createSupabaseSql } from "../shared/supabase-postgres.js";

const sql = createSupabaseSql();

const rows = await sql<{ slug: string; title: string; published_at: string; youtube_video_id: string | null; status: string }[]>`
  SELECT slug, title, published_at, youtube_video_id, status
  FROM brief_posts
  WHERE slug = '30-years-ago-robots-learned-to-walk-without-falling-live-38d'
  LIMIT 1
`;

if (rows.length === 0) {
  console.log("Brief not found");
} else {
  const row = rows[0];
  console.log(`slug: ${row.slug}`);
  console.log(`title: ${row.title}`);
  console.log(`status: ${row.status}`);
  console.log(`published_at: ${row.published_at}`);
  console.log(`youtube_video_id: ${row.youtube_video_id ?? "(none)"}`);
}

await sql.end();
