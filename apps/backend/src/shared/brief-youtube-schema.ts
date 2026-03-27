import { createSupabaseSql } from "./supabase-postgres";

let ensureBriefYouTubeLinkSchemaPromise: Promise<void> | null = null;

async function runEnsureBriefYouTubeLinkSchema() {
  const sql = createSupabaseSql();

  try {
    await sql`
      alter table public.brief_posts
        add column if not exists youtube_video_id text,
        add column if not exists youtube_url text,
        add column if not exists youtube_linked_at timestamptz
    `;

    await sql`
      create index if not exists idx_brief_posts_youtube_linked_at
        on public.brief_posts (youtube_linked_at desc nulls last)
    `;
  } finally {
    await sql.end();
  }
}

export async function ensureBriefYouTubeLinkSchema() {
  if (!ensureBriefYouTubeLinkSchemaPromise) {
    ensureBriefYouTubeLinkSchemaPromise = runEnsureBriefYouTubeLinkSchema().catch((error) => {
      ensureBriefYouTubeLinkSchemaPromise = null;
      throw error;
    });
  }

  return ensureBriefYouTubeLinkSchemaPromise;
}
