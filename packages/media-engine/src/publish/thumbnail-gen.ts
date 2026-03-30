/**
 * 썸네일 생성 — Gemini 이미지 생성 + Sharp 1280×720 리사이즈.
 * 참고: gemini-client.ts + normalize.ts 조합
 */

import { execFile } from "child_process";
import { promisify } from "util";
import sharp from "sharp";
import { BRAND_NAME_UPPER } from "../brand";

const execFileAsync = promisify(execFile);

export interface ThumbnailGenOptions {
  /** 브리프 제목 */
  title: string;
  /** 언어 코드 */
  language: string;
  /** 커버 이미지 Buffer (있으면 리사이즈만, 없으면 Gemini 생성) */
  coverImageBuffer?: Buffer;
  /** 비디오 파일 경로 (있으면 중간 프레임 추출 → 텍스트 오버레이) */
  videoFilePath?: string;
  /** 커스텀 프롬프트 (Gemini 이미지 생성용) */
  customPrompt?: string;
}

export interface ThumbnailResult {
  /** 썸네일 JPEG Buffer */
  buffer: Buffer;
  /** 너비 */
  width: number;
  /** 높이 */
  height: number;
  success: boolean;
  error?: string;
}

const THUMBNAIL_WIDTH = 1280;
const THUMBNAIL_HEIGHT = 720;

/**
 * 커버 이미지 → 1280×720 JPEG 썸네일로 리사이즈.
 */
async function resizeToThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize({
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      fit: "cover",
      position: "centre",
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/**
 * Gemini로 썸네일 이미지 프롬프트 생성 후 텍스트 오버레이가 포함된
 * 브랜드 썸네일을 Sharp로 합성.
 */
async function generateThumbnailWithText(
  title: string,
  language: string,
): Promise<Buffer> {
  // 브랜드 색상 기반 SVG 썸네일 생성 (Gemini 이미지 API 대신 SVG fallback)
  const displayTitle =
    title.length > 60 ? title.slice(0, 57) + "..." : title;

  // 제목을 여러 줄로 분할 (최대 30자/줄)
  const words = displayTitle.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).trim().length > 30 && currentLine) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + " " + word : word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  const titleSvgLines = lines
    .map(
      (line, i) =>
        `<text x="640" y="${320 + i * 56}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="48" font-weight="700" fill="#FFFFFF">${escapeXml(line)}</text>`,
    )
    .join("\n");

  const svg = `<svg width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#151110"/>
      <stop offset="100%" style="stop-color:#241D1A"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="40" y="40" width="1200" height="4" fill="#D9863A" rx="2"/>
  <text x="640" y="220" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600" fill="#D9863A" letter-spacing="4">${BRAND_NAME_UPPER}</text>
  ${titleSvgLines}
  <text x="640" y="${340 + lines.length * 56}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" fill="#999999">${language.toUpperCase()}</text>
</svg>`;

  return sharp(Buffer.from(svg))
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
    .jpeg({ quality: 85 })
    .toBuffer();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 비디오 파일에서 중간 프레임 추출 (ffmpeg).
 * frame 75 (2.5초 지점@30fps) 추출 후 1280x720 리사이즈.
 */
async function extractVideoFrame(videoPath: string): Promise<Buffer> {
  const { stdout } = await execFileAsync("ffmpeg", [
    "-i", videoPath,
    "-vf", "select=eq(n\\,75)",
    "-frames:v", "1",
    "-f", "image2pipe",
    "-vcodec", "png",
    "-",
  ], { encoding: "buffer", maxBuffer: 10 * 1024 * 1024 });
  return stdout;
}

/**
 * 프레임 이미지 위에 제목 + 브랜드 배지 합성.
 */
async function compositeTextOverlay(
  frameBuffer: Buffer,
  title: string,
): Promise<Buffer> {
  const displayTitle = title.length > 50 ? title.slice(0, 47) + "..." : title;

  // 제목을 여러 줄로 분할
  const words = displayTitle.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).trim().length > 25 && currentLine) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + " " + word : word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  const titleSvgLines = lines
    .map(
      (line, i) =>
        `<text x="640" y="${560 + i * 60}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="52" font-weight="800" fill="#FFFFFF" stroke="#000000" stroke-width="3">${escapeXml(line)}</text>`,
    )
    .join("\n");

  const overlaySvg = `<svg width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="transparent"/>
  <rect width="100%" height="100%" fill="rgba(0,0,0,0.35)"/>
  <text x="50" y="50" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="#D9863A" letter-spacing="3">${BRAND_NAME_UPPER}</text>
  ${titleSvgLines}
</svg>`;

  return sharp(frameBuffer)
    .resize({ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT, fit: "cover" })
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * 썸네일 생성 메인 함수.
 * 우선순위: videoFilePath → coverImageBuffer → SVG 브랜드 썸네일.
 */
export async function generateThumbnail(
  options: ThumbnailGenOptions,
): Promise<ThumbnailResult> {
  try {
    let buffer: Buffer;

    if (options.videoFilePath) {
      // Phase 4 M11: 비디오 프레임 추출 + 텍스트 오버레이
      try {
        const frameBuffer = await extractVideoFrame(options.videoFilePath);
        buffer = await compositeTextOverlay(frameBuffer, options.title);
      } catch (err) {
        console.warn(`Thumbnail: video frame extraction failed, using SVG fallback: ${err instanceof Error ? err.message : err}`);
        buffer = await generateThumbnailWithText(options.title, options.language);
      }
    } else if (options.coverImageBuffer) {
      buffer = await resizeToThumbnail(options.coverImageBuffer);
    } else {
      buffer = await generateThumbnailWithText(
        options.title,
        options.language,
      );
    }

    const metadata = await sharp(buffer).metadata();

    return {
      buffer,
      width: metadata.width ?? THUMBNAIL_WIDTH,
      height: metadata.height ?? THUMBNAIL_HEIGHT,
      success: true,
    };
  } catch (err) {
    return {
      buffer: Buffer.alloc(0),
      width: 0,
      height: 0,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
