import { createSupabaseSql } from "../../shared/supabase-postgres";

type ExceptionKind = "run" | "video";

function parseExceptionId(exceptionId: string): { kind: ExceptionKind; rawId: string } {
  if (exceptionId.startsWith("exception-run-")) {
    return { kind: "run", rawId: exceptionId.slice("exception-run-".length) };
  }
  if (exceptionId.startsWith("exception-video-")) {
    return { kind: "video", rawId: exceptionId.slice("exception-video-".length) };
  }
  throw new Error(`Unknown exception ID format: ${exceptionId}`);
}

export async function retryException({ exceptionId }: { exceptionId: string }) {
  const { kind, rawId } = parseExceptionId(exceptionId);
  const sql = createSupabaseSql();

  try {
    if (kind === "run") {
      const result = await sql`
        update public.ingest_run_attempts
        set status = 'pending', retryable = false
        where id = ${rawId}::uuid
          and status in ('failed', 'error')
        returning id
      `;
      if (!result.length) {
        throw new Error(`Run attempt ${rawId} not found or not in retryable state`);
      }
    } else {
      const result = await sql`
        update public.video_jobs
        set status = 'capcut_pending', blocked_reason = null
        where id = ${rawId}::uuid
          and status = 'blocked'
        returning id
      `;
      if (!result.length) {
        throw new Error(`Video job ${rawId} not found or not in blocked state`);
      }
    }

    return { exceptionId, kind, rawId };
  } finally {
    await sql.end();
  }
}
