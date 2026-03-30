/**
 * CLI: npm run publish:channels <brief-id> [--dry-run]
 * 채널 발행 디스패처 실행.
 *
 * brief-id는 slug 기준으로 Supabase에서 조회.
 * 환경변수:
 *   PUBLISH_CHANNELS — 활성화할 채널 (쉼표 구분, 기본: "threads,youtube")
 *   THREADS_USER_ID, THREADS_ACCESS_TOKEN — Threads API 인증
 */

import path from "path";
import { fileURLToPath } from "url";
import {
  dispatchPublish,
  registerPublisher,
  createThreadsPublisher,
  createGhostPublisher,
  createTistoryPublisher,
  createYouTubeLocalPublisher,
  createYouTubeApiPublisher,
  isYouTubeApiConfigured,
  generateYouTubeUploadGuide,
  SITE_URL,
} from "@vibehub/media-engine";

// 프로젝트 루트 기준 output/ 폴더 (apps/backend에서 실행해도 루트로 잡힘)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../../../");
import {
  DEFAULT_CANONICAL_LOCALE,
  normalizeLocaleCodes,
} from "@vibehub/content-contracts";
import type { BriefChannelMeta, BriefChannelVariantMeta, ChannelConfig, ChannelName, PublishPayload } from "@vibehub/media-engine";
import { getSupabaseBriefDetail } from "../shared/supabase-editorial-read";
import { reportChannelPublish } from "../shared/channel-publish-report";
import { createSupabaseSql } from "../shared/supabase-postgres";
import { updateBriefYouTubeLink, parseYouTubeInput, recordPublicYouTubePublishResult } from "../shared/youtube-linking";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const briefSlug = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!briefSlug) {
  console.error("usage: tsx src/workers/run-publish-channels.ts <brief-slug> [--dry-run]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Brief 조회 (Supabase)
// ---------------------------------------------------------------------------

const brief = await getSupabaseBriefDetail(briefSlug);
if (!brief) {
  console.error(`Brief not found: ${briefSlug}`);
  process.exit(1);
}

const canonicalLocale = brief.canonicalLocale ?? brief.locale ?? DEFAULT_CANONICAL_LOCALE;
const availableLocales = normalizeLocaleCodes(brief.availableLocales, canonicalLocale);
const targetLocales = normalizeLocaleCodes(brief.targetLocales, canonicalLocale);

const briefMeta: BriefChannelMeta = {
  briefId: brief.slug,
  slug: brief.slug,
  title: brief.title,
  markdownBody: Array.isArray(brief.body) ? brief.body.join("\n\n") : "",
  htmlBody: undefined,
  tags: brief.sourceLinks?.map((s: { label: string }) => s.label).slice(0, 5) ?? [],
  coverImageUrl: brief.coverImage,
  languages: availableLocales,
  canonicalLocale,
  defaultLocale: brief.locale ?? canonicalLocale,
  availableLocales,
  targetLocales,
  variants: {
    [canonicalLocale]: {
      locale: canonicalLocale,
      title: brief.title,
      markdownBody: Array.isArray(brief.body) ? brief.body.join("\n\n") : "",
      htmlBody: undefined,
      tags: brief.sourceLinks?.map((s: { label: string }) => s.label).slice(0, 5) ?? [],
      coverImageUrl: brief.coverImage,
      publishedAt: brief.publishedAt ?? undefined,
    },
  },
};

// ---------------------------------------------------------------------------
// Publisher 등록
// ---------------------------------------------------------------------------

const outputDir = path.join(PROJECT_ROOT, "output", brief.slug);

registerPublisher("threads", () => createThreadsPublisher());
registerPublisher("ghost", () => createGhostPublisher());
registerPublisher("tistory", () => createTistoryPublisher());

// YouTube: API 환경변수 있으면 자동 업로드, 없으면 로컬 메타 저장
const useYouTubeApi = isYouTubeApiConfigured();

// 영상 파일 자동 감지: shorts.mp4 → longform.mp4 → final.mp4 (레거시)
import { existsSync } from "fs";
const shortsPath = path.join(outputDir, "shorts.mp4");
const longformPath = path.join(outputDir, "longform.mp4");
const legacyPath = path.join(outputDir, "final.mp4");

const hasShorts = existsSync(shortsPath);
const hasLongform = existsSync(longformPath);
const hasLegacy = existsSync(legacyPath);

// 메인 YouTube publisher는 longform 또는 legacy를 업로드
const primaryVideoPath = hasLongform ? longformPath : hasLegacy ? legacyPath : shortsPath;

if (useYouTubeApi && (hasShorts || hasLongform || hasLegacy)) {
  console.log(`YouTube: API mode — shorts:${hasShorts} longform:${hasLongform} legacy:${hasLegacy}`);
  registerPublisher("youtube", () =>
    createYouTubeApiPublisher({
      videoFilePath: primaryVideoPath,
      thumbnailFilePath: path.join(outputDir, "thumbnail.png"),
      briefSlug: brief.slug,
      briefUrl: `${SITE_URL}/${canonicalLocale}/brief/${brief.slug}`,
      language: canonicalLocale,
    }, { privacyStatus: "unlisted" }),
  );
} else if (useYouTubeApi) {
  console.log("YouTube: API mode but no video file found — local metadata only");
  registerPublisher("youtube", () => createYouTubeLocalPublisher(outputDir));
} else {
  console.log("YouTube: local mode (metadata only)");
  registerPublisher("youtube", () => createYouTubeLocalPublisher(outputDir));
}

// ---------------------------------------------------------------------------
// 채널 설정 (환경변수 기반)
// ---------------------------------------------------------------------------

const VALID_CHANNELS: ChannelName[] = ["threads", "ghost", "tistory", "youtube", "spotify", "podcast-rss"];

const enabledChannels = (process.env.PUBLISH_CHANNELS ?? "threads,youtube")
  .split(",")
  .map((s) => s.trim())
  .filter((s): s is ChannelName => VALID_CHANNELS.includes(s as ChannelName));

const channels: ChannelConfig[] = VALID_CHANNELS.map((name) => ({
  name,
  enabled: enabledChannels.includes(name),
  dryRun,
}));

// ---------------------------------------------------------------------------
// 실행
// ---------------------------------------------------------------------------

console.log(`Publishing brief "${brief.title}" (${brief.slug}) to [${enabledChannels.join(", ")}]${dryRun ? " [DRY RUN]" : ""}`);

const result = await dispatchPublish({
  briefMeta,
  channels,
  dryRun,
  skipCrossPromo: true, // Threads 전파 지연 — 크로스프로모는 별도 실행
});

console.log(JSON.stringify(result, null, 2));

// ---------------------------------------------------------------------------
// YouTube 업로드 가이드 TXT 생성 (output/{slug}/ 폴더에 같이 저장)
// ---------------------------------------------------------------------------

const threadsResult = result.results.find((r) => r.channel === "threads" && r.success);
await generateYouTubeUploadGuide(
  {
    slug: brief.slug,
    title: brief.title,
    summary: brief.summary,
    markdownBody: briefMeta.markdownBody,
    tags: briefMeta.tags,
    category: undefined,
    language: briefMeta.defaultLocale ?? canonicalLocale,
    threadsUrl: threadsResult?.publishedUrl,
    briefUrl: `${SITE_URL}/${canonicalLocale}/brief/${brief.slug}`,
  },
  outputDir,
);
console.log(`YouTube upload guide saved to ${outputDir}/youtube-upload-guide.txt`);

// ---------------------------------------------------------------------------
// YouTube API 업로드 성공 시 → brief에 자동 링크 연결 (Pass 3 대체)
// ---------------------------------------------------------------------------

const youtubeResult = result.results.find((r) => r.channel === "youtube" && r.success);
if (useYouTubeApi && youtubeResult?.publishedUrl && !youtubeResult.publishedUrl.startsWith("file://")) {
  console.log(`\nYouTube API upload succeeded → auto-linking to brief...`);
  try {
    const parsed = parseYouTubeInput(youtubeResult.publishedUrl);
    await updateBriefYouTubeLink({
      briefSlug: brief.slug,
      youtubeVideoId: parsed.youtubeVideoId,
      youtubeUrl: parsed.youtubeUrl,
    });
    await recordPublicYouTubePublishResult({
      briefSlug: brief.slug,
      youtubeUrl: parsed.youtubeUrl,
      locale: canonicalLocale,
    });
    console.log(`  ✅ Brief linked (longform): ${parsed.youtubeUrl}`);
  } catch (err) {
    console.warn(`  ⚠️ Auto-link failed: ${err instanceof Error ? err.message : err}`);
    console.log(`  → 수동 연결: npm run publish:link-youtube -- ${brief.slug} ${youtubeResult.publishedUrl}`);
  }
}

// ---------------------------------------------------------------------------
// YouTube Shorts 별도 업로드 (shorts.mp4가 있고, 메인 업로드가 longform이었을 때)
// ---------------------------------------------------------------------------

let shortsYouTubeUrl: string | undefined;

if (useYouTubeApi && hasShorts && primaryVideoPath !== shortsPath) {
  console.log(`\nYouTube Shorts: uploading shorts.mp4 separately...`);
  const shortsPublisher = createYouTubeApiPublisher({
    videoFilePath: shortsPath,
    thumbnailFilePath: path.join(outputDir, "thumbnail.png"),
    briefSlug: brief.slug,
    briefUrl: `${SITE_URL}/${canonicalLocale}/brief/${brief.slug}`,
    language: canonicalLocale,
  }, { privacyStatus: "unlisted" });

  const shortsPayload: PublishPayload = {
    ...briefMeta,
    title: `${brief.title} #Shorts`,
    markdownBody: brief.summary ?? briefMeta.markdownBody,
    tags: [...(briefMeta.tags ?? []), "Shorts"],
  };

  const shortsResult = await shortsPublisher.publish(shortsPayload, { dryRun });
  if (shortsResult.success) {
    console.log(`  ✅ Shorts uploaded: ${shortsResult.publishedUrl}`);
    shortsYouTubeUrl = shortsResult.publishedUrl;

    // Shorts도 channel_publish_results에 기록
    try {
      const sql = createSupabaseSql();
      await sql`
        INSERT INTO public.channel_publish_results
          (brief_slug, channel_name, locale, success, published_url)
        VALUES
          (${brief.slug}, 'youtube-shorts', ${canonicalLocale}, true,
           ${shortsResult.publishedUrl ?? ''})
        ON CONFLICT DO NOTHING
      `;
      await sql.end();
    } catch (err) {
      console.warn(`  ⚠️ Shorts DB record failed: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.warn(`  ❌ Shorts upload failed: ${shortsResult.error}`);
  }
} else if (useYouTubeApi && hasShorts && primaryVideoPath === shortsPath) {
  // Shorts만 있는 경우 — 이미 메인 dispatch에서 업로드됨
  shortsYouTubeUrl = youtubeResult?.publishedUrl;
}

// DB 저장 + Telegram 보고 (canonical locale + Shorts 결과 포함)
const allResults = [...result.results];
if (shortsYouTubeUrl) {
  allResults.push({
    channel: "youtube" as ChannelName,
    success: true,
    publishedUrl: shortsYouTubeUrl,
    publishedAt: new Date().toISOString(),
    error: "[Shorts]",
  });
}

await reportChannelPublish({
  briefSlug: brief.slug,
  locale: canonicalLocale,
  results: allResults,
  crossPromoResults: result.crossPromoResults,
  allSuccess: result.allSuccess,
  durationMs: result.durationMs,
  dryRun,
});

// ---------------------------------------------------------------------------
// Locale variant 발행 (canonical 이외의 locale)
// ---------------------------------------------------------------------------

const localeArg = args.find((a) => a.startsWith("--locale="))?.split("=")[1];
const publishLocales = localeArg
  ? [localeArg]
  : targetLocales.filter((l) => l !== canonicalLocale);

let allLocalesSuccess = result.allSuccess;

for (const locale of publishLocales) {
  // variant 조회 — quality_failed는 의도적으로 발행 skip (영어만 발행됨)
  // 테이블 미존재(마이그레이션 미적용) 시에도 영어 발행은 정상 진행
  const sql = createSupabaseSql();
  let variant: { title: string; summary: string; body: string[] } | null = null;
  try {
    const rows = await sql<Array<{ title: string; summary: string; body: string[] }>>`
      select v.title, v.summary, v.body
      from public.brief_post_variants v
      join public.brief_posts bp on bp.id = v.canonical_id
      where bp.slug = ${brief.slug}
        and v.locale = ${locale}
        and v.translation_status in ('translated', 'published')
        and v.quality_status = 'passed'
      limit 1
    `;
    if (rows.length > 0) variant = rows[0];
  } catch (err) {
    // 테이블 미존재 등 DB 에러 → locale skip
    console.warn(`\nVariant query failed for ${locale}: ${err instanceof Error ? err.message : err}`);
  } finally {
    await sql.end();
  }

  if (!variant) {
    console.log(`\nSkipping locale ${locale} — no approved variant found.`);
    continue;
  }

  console.log(`\nPublishing locale variant: ${locale}`);

  const variantBody = Array.isArray(variant.body) ? variant.body.join("\n\n") : "";
  const localeMeta: BriefChannelMeta = {
    ...briefMeta,
    defaultLocale: locale,
    variants: {
      ...briefMeta.variants,
      [locale]: {
        locale,
        title: variant.title,
        markdownBody: variantBody,
        tags: briefMeta.tags,
        coverImageUrl: brief.coverImage,
      },
    },
  };

  const localeResult = await dispatchPublish({
    briefMeta: localeMeta,
    channels,
    dryRun,
    skipCrossPromo: true,
  });

  console.log(JSON.stringify(localeResult, null, 2));

  await reportChannelPublish({
    briefSlug: brief.slug,
    locale,
    results: localeResult.results,
    crossPromoResults: localeResult.crossPromoResults,
    allSuccess: localeResult.allSuccess,
    durationMs: localeResult.durationMs,
    dryRun,
  });

  if (!localeResult.allSuccess) allLocalesSuccess = false;
}

process.exit(allLocalesSuccess ? 0 : 1);
