/**
 * Pexels Video API Client — 키워드 기반 스톡 비디오 검색.
 *
 * Pexels 이미지(`/v1/search`)를 비디오(`/videos/search`)로 확장.
 * Shorts: orientation=portrait, Longform: orientation=landscape.
 * 비용: $0 (Pexels 무료 API).
 */

import { fetchWithRetry } from "../publish/fetch-with-retry";

const PEXELS_VIDEO_API = "https://api.pexels.com/videos/search";

export interface PexelsVideoResult {
  /** HD mp4 다운로드 URL */
  videoUrl: string;
  /** 비디오 너비 */
  width: number;
  /** 비디오 높이 */
  height: number;
  /** 비디오 길이 (초) */
  duration: number;
  /** Pexels 비디오 ID */
  id: number;
}

export type PexelsOrientation = "portrait" | "landscape";

interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  video_files: PexelsVideoFile[];
}

interface PexelsVideoSearchResponse {
  videos: PexelsVideo[];
  total_results: number;
}

/**
 * Pexels Video API에서 HD mp4 파일 URL 추출.
 * quality="hd" + file_type="video/mp4" 우선, 없으면 가장 큰 mp4.
 */
function pickBestVideoFile(
  files: PexelsVideoFile[],
): PexelsVideoFile | null {
  const mp4s = files.filter((f) => f.file_type === "video/mp4");
  if (mp4s.length === 0) return null;

  // HD 우선
  const hd = mp4s.find((f) => f.quality === "hd");
  if (hd) return hd;

  // HD 없으면 가장 큰 해상도
  return mp4s.sort((a, b) => b.width * b.height - a.width * a.height)[0]!;
}

/**
 * Pexels Video 검색 — 키워드 기반 비디오 클립 조회.
 *
 * @param keyword 검색 키워드 (영어 권장)
 * @param orientation "portrait" (Shorts 9:16) | "landscape" (Longform 16:9)
 * @param count 반환할 비디오 수 (기본 1)
 * @param apiKey Pexels API Key (기본: PEXELS_API_KEY 환경변수)
 */
export async function searchPexelsVideos(
  keyword: string,
  orientation: PexelsOrientation = "portrait",
  count: number = 1,
  apiKey?: string,
): Promise<PexelsVideoResult[]> {
  const key = apiKey ?? process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY not configured");

  const params = new URLSearchParams({
    query: keyword,
    per_page: String(Math.min(count * 2, 15)), // 여유분 요청
    orientation,
  });

  const response = await fetchWithRetry(
    `${PEXELS_VIDEO_API}?${params}`,
    {
      headers: { Authorization: key },
    },
    { maxRetries: 2, baseDelayMs: 1000 },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pexels Video API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as PexelsVideoSearchResponse;

  const results: PexelsVideoResult[] = [];
  for (const video of data.videos) {
    if (results.length >= count) break;

    const file = pickBestVideoFile(video.video_files);
    if (!file) continue;

    results.push({
      videoUrl: file.link,
      width: file.width,
      height: file.height,
      duration: video.duration,
      id: video.id,
    });
  }

  return results;
}

/**
 * 여러 키워드로 Pexels Video 배치 검색.
 * 각 키워드당 1개 비디오. 실패한 키워드는 건너뜀.
 */
export async function searchPexelsVideosBatch(
  keywords: string[],
  orientation: PexelsOrientation = "portrait",
  apiKey?: string,
): Promise<PexelsVideoResult[]> {
  const results: PexelsVideoResult[] = [];
  const usedIds = new Set<number>();

  for (const keyword of keywords) {
    try {
      // 중복 방지: 여러 개 요청해서 미사용 ID 선택
      const videos = await searchPexelsVideos(keyword, orientation, 3, apiKey);
      const unique = videos.find((v) => !usedIds.has(v.id));
      if (unique) {
        results.push(unique);
        usedIds.add(unique.id);
      } else if (videos.length > 0) {
        // 중복이라도 없는 것보단 나음
        results.push(videos[0]!);
      }
    } catch (err) {
      console.warn(
        `Pexels Video search failed for "${keyword}": ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return results;
}
