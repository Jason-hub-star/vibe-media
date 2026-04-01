import { createSupabaseSql } from "./supabase-postgres";

export async function updateBriefCanonicalCopy(args: {
  briefId: string;
  title: string;
  summary: string;
  body: string[];
  note?: string | null;
}) {
  const sql = createSupabaseSql();

  try {
    await sql`
      update public.brief_posts
      set
        title = ${args.title},
        summary = ${args.summary},
        body = ${sql.json(args.body)},
        last_editor_note = ${args.note ?? null}
      where id = ${args.briefId}::uuid
    `;
  } finally {
    await sql.end();
  }
}
