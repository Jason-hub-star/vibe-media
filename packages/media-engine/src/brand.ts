/**
 * 브랜드 상수 — 하드코딩 방지.
 * 환경변수로 오버라이드 가능.
 */

/** 브랜드 표시명 */
export const BRAND_NAME = process.env.BRAND_NAME ?? "VibeHub";

/** 브랜드 표시명 (대문자) */
export const BRAND_NAME_UPPER = BRAND_NAME.toUpperCase();

/** Threads 핸들 (@ 없이) */
export const THREADS_HANDLE = process.env.THREADS_HANDLE ?? "vibehub";

/** YouTube 채널 핸들 (@ 없이) */
export const YOUTUBE_CHANNEL = process.env.YOUTUBE_CHANNEL ?? "vibehub";

/** Podcast URL (Spotify) */
export const PODCAST_URL = process.env.PODCAST_URL ?? "https://open.spotify.com/show/vibehub";

/** 사이트 URL */
export const SITE_URL = process.env.SITE_URL ?? "https://vibehub.tech";
