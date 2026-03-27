/**
 * YouTube Local — mp4 + metadata.json 로컬 저장 (완전 구현).
 * 업로드는 YouTube Studio에서 운영자 수동.
 */

import fs from "fs/promises";
import path from "path";
import type { PublishPayload } from "../types";
import { BRAND_NAME, SITE_URL, THREADS_HANDLE } from "../brand";
import type {
  ChannelPublisher,
  ChannelPublishResult,
} from "./channel-types";

export interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
  /** 카테고리 ID (22 = People & Blogs) */
  categoryId: string;
  /** 기본 언어 */
  defaultLanguage: string;
  /** 공개 상태 ("public" | "unlisted" | "private") */
  privacyStatus: string;
  /** 비디오 파일 경로 */
  videoFilePaths: Record<string, string>;
  /** 썸네일 파일 경로 */
  thumbnailFilePaths: Record<string, string>;
  /** 발행 예정일 */
  publishAt?: string;
}

export interface YouTubeLocalOptions {
  /** 출력 디렉토리 */
  outputDir: string;
  /** 언어별 비디오 파일 경로 */
  videoFiles: Record<string, string>;
  /** 언어별 썸네일 파일 경로 */
  thumbnailFiles?: Record<string, string>;
  /** 카테고리 ID (기본: "22") */
  categoryId?: string;
  /** 기본 언어 (기본: "en") */
  defaultLanguage?: string;
}

/**
 * YouTube 메타데이터 JSON 생성 + 로컬 저장.
 */
export async function prepareYouTubeUpload(
  payload: PublishPayload,
  options: YouTubeLocalOptions,
): Promise<string> {
  const meta: YouTubeMetadata = {
    title: payload.title,
    description: buildYouTubeDescription(payload),
    tags: payload.tags ?? [],
    categoryId: options.categoryId ?? "22",
    defaultLanguage: options.defaultLanguage ?? "en",
    privacyStatus: "unlisted",
    videoFilePaths: options.videoFiles,
    thumbnailFilePaths: options.thumbnailFiles ?? {},
    publishAt: payload.scheduledAt?.toISOString(),
  };

  const metadataPath = path.join(options.outputDir, "youtube-metadata.json");
  await fs.writeFile(metadataPath, JSON.stringify(meta, null, 2), "utf-8");
  return metadataPath;
}

function buildYouTubeDescription(payload: PublishPayload): string {
  const body = payload.markdownBody ?? payload.htmlBody ?? "";
  const tags =
    payload.tags && payload.tags.length > 0
      ? "\n\n" + payload.tags.map((t) => `#${t}`).join(" ")
      : "";
  return `${body}${tags}\n\n---\nPowered by ${BRAND_NAME}`;
}

// ---------------------------------------------------------------------------
// YouTube Upload Guide TXT — 사람이 읽고 복붙하기 편한 형식
// ---------------------------------------------------------------------------

export interface YouTubeUploadGuideOptions {
  slug: string;
  title: string;
  summary?: string;
  markdownBody?: string;
  tags?: string[];
  category?: string;
  language?: string;
  threadsUrl?: string;
  briefUrl?: string;
  coverImagePath?: string;
  videoFilePath?: string;
  srtFilePath?: string;
}

/**
 * YouTube Studio에서 복붙할 수 있는 업로드 가이드 TXT 생성.
 */
export async function generateYouTubeUploadGuide(
  options: YouTubeUploadGuideOptions,
  outputDir: string,
): Promise<string> {
  const {
    slug,
    title,
    summary,
    markdownBody,
    tags = [],
    category,
    language = "en",
    threadsUrl,
    briefUrl,
  } = options;
  const normalizedLanguage = language.trim() || "en";
  const localizedHomeUrl = `${SITE_URL}/${normalizedLanguage}`;
  const localizedBriefUrl =
    briefUrl ?? `${localizedHomeUrl}/brief/${slug}`;

  // 본문에서 첫 3문장 추출 (요약이 없을 때)
  const desc = summary ?? extractFirstSentences(markdownBody ?? "", 3);

  // 해시태그
  const hashtags = tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  const brandTags = `#${BRAND_NAME} #AI #Tech`;

  // 크로스프로모 링크
  const links: string[] = [];
  links.push(`📄 Full Brief: ${localizedBriefUrl}`);
  if (threadsUrl) links.push(`🧵 Threads: ${threadsUrl}`);
  else links.push(`🧵 Threads: https://threads.net/@${THREADS_HANDLE}`);
  links.push(`🌐 Website: ${localizedHomeUrl}`);

  const description = `${desc}

${links.join("\n")}

${hashtags} ${brandTags}

---
Powered by ${BRAND_NAME} | AI-curated tech insights`;

  const pinnedComment = [
    `Read the full brief: ${localizedBriefUrl}`,
    `Browse more daily briefs: ${localizedHomeUrl}`,
    threadsUrl ? `Join the Threads follow-up: ${threadsUrl}` : `Threads: https://threads.net/@${THREADS_HANDLE}`,
  ].join("\n");

  // 파일 체크리스트
  const files: string[] = [];
  if (options.videoFilePath) files.push(`  ✅ Video: ${options.videoFilePath}`);
  else files.push("  ⬜ Video: (NotebookLM 웹에서 다운로드 → 이 폴더에 저장)");
  if (options.coverImagePath) files.push(`  ✅ Thumbnail: ${options.coverImagePath}`);
  else files.push("  ⬜ Thumbnail: (AI Studio에서 생성 → 이 폴더에 저장)");
  if (options.srtFilePath) files.push(`  ✅ Subtitles: ${options.srtFilePath}`);
  else files.push("  ⬜ Subtitles: (Whisper STT 생성 예정)");

  const guide = `═══════════════════════════════════════════════════
  ${BRAND_NAME} — YouTube Upload Guide
  ${new Date().toISOString().split("T")[0]}
═══════════════════════════════════════════════════

📋 TITLE (복사해서 붙여넣기)
───────────────────────────────────────────────────
${title}

📝 DESCRIPTION (복사해서 붙여넣기)
───────────────────────────────────────────────────
${description}

💬 PINNED COMMENT (고정 댓글용)
───────────────────────────────────────────────────
${pinnedComment}

🏷️ TAGS (쉼표 구분, YouTube Studio에 붙여넣기)
───────────────────────────────────────────────────
${[...tags, BRAND_NAME, "AI", "Tech News", category].filter(Boolean).join(", ")}

⚙️ SETTINGS
───────────────────────────────────────────────────
  Category: Science & Technology (ID: 28)
  Language: ${language}
  Visibility: Unlisted → 확인 후 Public 전환
  Comments: On
  Age restriction: No

📁 FILES CHECKLIST
───────────────────────────────────────────────────
${files.join("\n")}

🚀 UPLOAD STEPS
───────────────────────────────────────────────────
  1. YouTube Studio → 만들기 → 동영상 업로드
  2. 위 TITLE 복사 → 제목에 붙여넣기
  3. 위 DESCRIPTION 복사 → 설명에 붙여넣기
  4. 위 TAGS 복사 → 태그에 붙여넣기
  5. 썸네일 업로드
  6. 자막 파일(.srt) 업로드 (있으면)
  7. Visibility: Unlisted로 먼저 업로드
  8. 미리보기 확인 후 Public 전환

✅ AFTER UPLOAD (연결 완료)
───────────────────────────────────────────────────
  1. 공개 YouTube URL 복사
  2. Telegram: <youtube-url> 만 전송
  3. 자동 매칭 실패 시: /vh-youtube ${slug} <youtube-url>
  4. CLI fallback: npm run publish:link-youtube -- <video-id-or-url>
  5. 명시 연결 CLI: npm run publish:link-youtube -- ${slug} <video-id-or-url>
  6. 브리프 상세/홈/Threads 크로스프로모가 반영됐는지 확인
═══════════════════════════════════════════════════
`;

  const guidePath = path.join(outputDir, "youtube-upload-guide.txt");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(guidePath, guide, "utf-8");
  return guidePath;
}

function extractFirstSentences(text: string, count: number): string {
  const sentences = text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 10);
  return sentences.slice(0, count).join(" ");
}


/**
 * YouTube Local Publisher — 로컬 메타데이터 생성용.
 * 실제 업로드는 하지 않고 metadata.json만 생성.
 */
export function createYouTubeLocalPublisher(
  outputDir: string,
): ChannelPublisher {
  async function publish(
    payload: PublishPayload,
    opts?: { dryRun?: boolean },
  ): Promise<ChannelPublishResult> {
    if (opts?.dryRun) {
      return {
        channel: "youtube",
        success: true,
        publishedUrl: `file://${outputDir}/youtube-metadata.json`,
        publishedAt: new Date().toISOString(),
        error: "[DRY RUN] Would generate YouTube metadata",
      };
    }

    try {
      await fs.mkdir(outputDir, { recursive: true });
      const metadataPath = await prepareYouTubeUpload(payload, {
        outputDir,
        videoFiles: {},
      });

      return {
        channel: "youtube",
        success: true,
        publishedUrl: `file://${metadataPath}`,
        publishedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        channel: "youtube",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    name: "youtube",
    channel: "youtube",
    publish,
  };
}
