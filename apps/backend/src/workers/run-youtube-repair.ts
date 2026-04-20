/**
 * YouTube Repair Worker
 *
 * 목적:
 * 1) published brief 중 YouTube 업로드 누락 건 백필 (publish:channels 호출)
 * 2) 업로드된 YouTube 영상의 unlisted/private 상태를 public으로 전환
 *
 * Usage:
 *   npm run youtube:repair -w @vibehub/backend -- [--days=30] [--limit=10] [--dry-run] [--skip-backfill] [--skip-public]
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { parseYouTubeInput } from "../shared/youtube-linking";
import { createSupabaseSql } from "../shared/supabase-postgres";

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const days = Math.max(1, Number(args.find((arg) => arg.startsWith("--days="))?.split("=")[1] ?? "30"));
const limit = Math.max(1, Number(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? "10"));
const dryRun = args.includes("--dry-run");
const skipBackfill = args.includes("--skip-backfill");
const skipPublic = args.includes("--skip-public");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../../../");

interface MissingUploadRow {
  slug: string;
  published_at: string;
}

interface ShortsUrlRow {
  brief_slug: string;
  published_url: string;
}

interface LongformCandidate {
  slug: string;
  videoId: string;
  youtubeUrl: string;
}

interface ShortsCandidate {
  slug: string;
  videoId: string;
  youtubeUrl: string;
}

interface YouTubeVideoStatus {
  id: string;
  privacyStatus: "public" | "unlisted" | "private";
  uploadStatus?: string;
  title?: string;
}

function isYouTubeApiConfigured() {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID &&
      process.env.YOUTUBE_CLIENT_SECRET &&
      process.env.YOUTUBE_REFRESH_TOKEN,
  );
}

async function listMissingUploads(windowDays: number, maxRows: number): Promise<MissingUploadRow[]> {
  const sql = createSupabaseSql();
  try {
    return await sql<MissingUploadRow[]>`
      SELECT bp.slug, bp.published_at
      FROM public.brief_posts bp
      WHERE bp.status = 'published'
        AND bp.published_at >= NOW() - (${windowDays}::text || ' days')::interval
        AND NOT EXISTS (
          SELECT 1
          FROM public.channel_publish_results c
          WHERE c.brief_slug = bp.slug
            AND c.channel_name = 'youtube'
            AND c.success = true
            AND c.dry_run = false
            AND c.published_url LIKE 'https://%'
        )
      ORDER BY bp.published_at DESC NULLS LAST
      LIMIT ${maxRows}
    `;
  } finally {
    await sql.end();
  }
}

function hasYoutubeRenderableVideo(slug: string) {
  const outputDir = path.join(PROJECT_ROOT, "output", slug);
  return existsSync(path.join(outputDir, "longform.mp4")) || existsSync(path.join(outputDir, "shorts.mp4"));
}

async function runPublishChannels(slug: string): Promise<void> {
  const commandArgs = ["run", "publish:channels", "-w", "@vibehub/backend", "--", slug];
  const { stdout, stderr } = await execFileAsync("npm", commandArgs, {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      // backfill은 YouTube 누락 복구 목적만 수행 (Threads 재발행 방지)
      PUBLISH_CHANNELS: "youtube",
    },
    maxBuffer: 8 * 1024 * 1024,
  });
  const merged = [stdout, stderr].filter(Boolean).join("\n").trim();
  if (merged) {
    const lines = merged.split("\n");
    console.log(lines.slice(-8).join("\n"));
  }
}

async function getYouTubeAccessToken(): Promise<string> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET/YOUTUBE_REFRESH_TOKEN is required");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`token refresh failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("token refresh failed: access_token missing");
  }
  return payload.access_token;
}

async function fetchVideoStatus(accessToken: string, videoId: string): Promise<YouTubeVideoStatus | null> {
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("part", "status,snippet");
  endpoint.searchParams.set("id", videoId);

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`videos.list failed (${videoId}): ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    items?: Array<{
      id: string;
      status?: { privacyStatus?: "public" | "unlisted" | "private"; uploadStatus?: string };
      snippet?: { title?: string };
    }>;
  };

  const item = payload.items?.[0];
  if (!item?.id || !item.status?.privacyStatus) return null;

  return {
    id: item.id,
    privacyStatus: item.status.privacyStatus,
    uploadStatus: item.status.uploadStatus,
    title: item.snippet?.title,
  };
}

async function setVideoPublic(accessToken: string, videoId: string): Promise<void> {
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("part", "status");

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      id: videoId,
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`videos.update failed (${videoId}): ${response.status} ${await response.text()}`);
  }
}

async function listLongformPublicCandidates(windowDays: number, maxRows: number): Promise<LongformCandidate[]> {
  const sql = createSupabaseSql();
  try {
    const rows = await sql<Array<{ slug: string; youtube_video_id: string; youtube_url: string | null }>>`
      SELECT slug, youtube_video_id, youtube_url
      FROM public.brief_posts
      WHERE status = 'published'
        AND published_at >= NOW() - (${windowDays}::text || ' days')::interval
        AND youtube_video_id IS NOT NULL
      ORDER BY published_at DESC NULLS LAST
      LIMIT ${maxRows}
    `;

    return rows.map((row) => ({
      slug: row.slug,
      videoId: row.youtube_video_id,
      youtubeUrl: row.youtube_url ?? `https://www.youtube.com/watch?v=${row.youtube_video_id}`,
    }));
  } finally {
    await sql.end();
  }
}

async function listShortsPublicCandidates(windowDays: number, maxRows: number): Promise<ShortsCandidate[]> {
  const sql = createSupabaseSql();
  try {
    const rows = await sql<ShortsUrlRow[]>`
      SELECT DISTINCT ON (c.brief_slug)
        c.brief_slug,
        c.published_url
      FROM public.channel_publish_results c
      JOIN public.brief_posts bp ON bp.slug = c.brief_slug
      WHERE c.channel_name = 'youtube-shorts'
        AND c.success = true
        AND c.dry_run = false
        AND c.published_url LIKE 'https://%'
        AND bp.status = 'published'
        AND bp.published_at >= NOW() - (${windowDays}::text || ' days')::interval
      ORDER BY c.brief_slug ASC, c.created_at DESC
      LIMIT ${maxRows}
    `;

    const candidates: ShortsCandidate[] = [];
    for (const row of rows) {
      try {
        const parsed = parseYouTubeInput(row.published_url);
        candidates.push({
          slug: row.brief_slug,
          videoId: parsed.youtubeVideoId,
          youtubeUrl: parsed.youtubeUrl,
        });
      } catch {
        // skip malformed row
      }
    }
    return candidates;
  } finally {
    await sql.end();
  }
}

async function main() {
  console.log("YouTube Repair Worker");
  console.log(`  window: ${days} days`);
  console.log(`  limit: ${limit}`);
  console.log(`  dry-run: ${dryRun ? "yes" : "no"}`);
  console.log(`  backfill: ${skipBackfill ? "skip" : "run"}`);
  console.log(`  public transition: ${skipPublic ? "skip" : "run"}`);

  let backfillChecked = 0;
  let backfillTriggered = 0;
  let backfillFailed = 0;

  if (!skipBackfill) {
    const missing = await listMissingUploads(days, limit);
    backfillChecked = missing.length;
    console.log(`\n[Backfill] missing youtube uploads: ${missing.length}`);

    for (const row of missing) {
      const cmd = `npm run publish:channels -w @vibehub/backend -- ${row.slug}`;
      if (!hasYoutubeRenderableVideo(row.slug)) {
        console.log(`  skip backfill (no video file): ${row.slug}`);
        continue;
      }
      if (dryRun) {
        console.log(`  DRY-RUN backfill: ${cmd}`);
        continue;
      }

      try {
        console.log(`  backfill: ${row.slug}`);
        await runPublishChannels(row.slug);
        backfillTriggered += 1;
      } catch (err) {
        backfillFailed += 1;
        console.warn(`  backfill failed (${row.slug}): ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  let publicChecked = 0;
  let publicPromoted = 0;
  let publicAlready = 0;
  let publicFailed = 0;

  if (!skipPublic) {
    if (!isYouTubeApiConfigured()) {
      console.warn("\n[Public] YouTube credentials missing — skipping public transition");
    } else {
      const [longforms, shorts] = await Promise.all([
        listLongformPublicCandidates(days, limit),
        listShortsPublicCandidates(days, limit),
      ]);

      const candidates = new Map<string, { slug: string; kind: "longform" | "shorts"; url: string }>();
      for (const row of longforms) {
        candidates.set(row.videoId, { slug: row.slug, kind: "longform", url: row.youtubeUrl });
      }
      for (const row of shorts) {
        candidates.set(row.videoId, { slug: row.slug, kind: "shorts", url: row.youtubeUrl });
      }

      const accessToken = await getYouTubeAccessToken();
      const list = [...candidates.entries()];
      publicChecked = list.length;
      console.log(`\n[Public] youtube candidates: ${list.length}`);

      for (const [videoId, meta] of list) {
        try {
          const status = await fetchVideoStatus(accessToken, videoId);
          if (!status) continue;

          if (status.privacyStatus === "public") {
            publicAlready += 1;
            console.log(`  already public: ${videoId} (${meta.kind}, ${meta.slug})`);
            continue;
          }

          if (dryRun) {
            console.log(`  DRY-RUN promote: ${videoId} ${status.privacyStatus} -> public (${meta.kind}, ${meta.slug})`);
            continue;
          }

          await setVideoPublic(accessToken, videoId);
          publicPromoted += 1;
          console.log(`  promoted: ${videoId} -> public (${meta.kind}, ${meta.slug})`);
        } catch (err) {
          publicFailed += 1;
          console.warn(`  promote failed (${videoId}): ${err instanceof Error ? err.message : err}`);
        }
      }
    }
  }

  console.log("\nSummary");
  console.log(`  backfill checked: ${backfillChecked}`);
  console.log(`  backfill triggered: ${backfillTriggered}`);
  console.log(`  backfill failed: ${backfillFailed}`);
  console.log(`  public checked: ${publicChecked}`);
  console.log(`  public promoted: ${publicPromoted}`);
  console.log(`  public already: ${publicAlready}`);
  console.log(`  public failed: ${publicFailed}`);

  if (backfillFailed > 0 || publicFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
