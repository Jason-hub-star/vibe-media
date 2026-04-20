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

export interface SearchPexelsVideosBatchOptions {
  /** 최근 사용 이력 등으로 제외할 비디오 ID 목록 */
  excludeIds?: Iterable<number>;
  /** 키워드당 조회할 후보 수 (기본 8, 최대 15) */
  perKeywordCandidates?: number;
  /** 키워드/후보 셔플용 시드 */
  seed?: string;
}

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
 * 문자열 시드를 32-bit 정수로 해시.
 */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 간단한 deterministic PRNG (mulberry32).
 */
function createSeededRandom(seed: string): () => number {
  let t = hashSeed(seed) || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRandom<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i]!, out[j]!] = [out[j]!, out[i]!];
  }
  return out;
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
  options: SearchPexelsVideosBatchOptions = {},
): Promise<PexelsVideoResult[]> {
  const results: PexelsVideoResult[] = [];
  const excludeIds = new Set<number>(options.excludeIds ?? []);
  const usedIds = new Set<number>();
  const rand = createSeededRandom(options.seed ?? `${Date.now()}`);
  const keywordOrder = shuffleWithRandom(
    keywords.filter((k) => k.trim().length > 0),
    rand,
  );
  const perKeywordCandidates = Math.max(
    3,
    Math.min(options.perKeywordCandidates ?? 8, 15),
  );

  for (const keyword of keywordOrder) {
    try {
      // 중복 방지: 여러 개 요청해서 미사용/미제외 ID 선택
      const videos = await searchPexelsVideos(
        keyword,
        orientation,
        perKeywordCandidates,
        apiKey,
      );
      const shuffledCandidates = shuffleWithRandom(videos, rand);
      const unique = shuffledCandidates.find(
        (v) => !usedIds.has(v.id) && !excludeIds.has(v.id),
      );
      if (unique) {
        results.push(unique);
        usedIds.add(unique.id);
      } else {
        // 제외 목록 밖이면서 이번 실행에서만 미사용인 후보 우선
        const fallback = shuffledCandidates.find((v) => !usedIds.has(v.id));
        if (fallback) {
          results.push(fallback);
          usedIds.add(fallback.id);
          continue;
        }

        // 최후 fallback: 중복이라도 없는 것보단 나음
        if (shuffledCandidates.length > 0) {
          const any = shuffledCandidates[0]!;
          results.push(any);
          usedIds.add(any.id);
        }
      }
    } catch (err) {
      console.warn(
        `Pexels Video search failed for "${keyword}": ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return results;
}
