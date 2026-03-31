/**
 * Scene Splitter — 스크립트 문장 경계 기준으로 씬 분할.
 *
 * 문장(`.?!`) 기준 N등분, 각 씬에 ShortWord[] startFrame/endFrame 매핑,
 * kenBurns 4패턴 순환, Pexels 배경 연결.
 */

import type { ShortWord, ShortScene } from "../remotion/BriefShort";
import type { PexelsVideoResult } from "../image/pexels-video-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SceneSplitInput {
  /** 전체 스크립트 텍스트 */
  script: string;
  /** word-level 타임스탬프 배열 */
  words: ShortWord[];
  /** 분할할 씬 수 (Shorts: 4, Longform: 8) */
  sceneCount: number;
  /** Pexels 배경 비디오 (씬 수만큼 필요) */
  backgrounds: PexelsVideoResult[];
  /** 롱폼 챕터 제목 (선택) */
  chapterTitles?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEN_BURNS_PATTERNS: ShortScene["kenBurns"][] = [
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
];

/** 문장 경계 정규식 — .?! 뒤 공백 또는 문자열 끝 */
const SENTENCE_BOUNDARY = /[.?!]+(?:\s|$)/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 텍스트를 문장 단위로 분리.
 * 빈 문장은 제거.
 */
export function splitSentences(text: string): string[] {
  // 문장 끝 기준으로 분할
  const parts: string[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(SENTENCE_BOUNDARY)) {
    const end = match.index! + match[0].length;
    const sentence = text.slice(lastIndex, end).trim();
    if (sentence) parts.push(sentence);
    lastIndex = end;
  }

  // 마지막 문장 (마침표 없는 경우)
  const remaining = text.slice(lastIndex).trim();
  if (remaining) parts.push(remaining);

  return parts;
}

/**
 * 문장 배열을 N개 그룹으로 균등 분할.
 * 문장이 쪼개지지 않도록 가장 가까운 경계로 조정.
 */
export function groupSentences(
  sentences: string[],
  groupCount: number,
): string[][] {
  const count = Math.min(groupCount, sentences.length);
  if (count <= 0) return [];
  if (count === 1) return [sentences];

  const groups: string[][] = [];
  const perGroup = sentences.length / count;

  for (let i = 0; i < count; i++) {
    const start = Math.round(i * perGroup);
    const end = Math.round((i + 1) * perGroup);
    groups.push(sentences.slice(start, end));
  }

  return groups.filter((g) => g.length > 0);
}

/**
 * 텍스트 그룹에 해당하는 words의 start/end 프레임 범위 계산.
 * 그룹 텍스트의 단어를 words 배열에서 순차 매칭.
 */
function findFrameRange(
  groupText: string,
  words: ShortWord[],
  searchStartIndex: number,
): { startFrame: number; endFrame: number; nextIndex: number } {
  // 그룹의 단어 토큰들
  const groupTokens = groupText
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z0-9\u00C0-\u024F\uAC00-\uD7AF]/g, "").toLowerCase())
    .filter(Boolean);

  if (groupTokens.length === 0 || words.length === 0) {
    // fallback: 이전 프레임부터 시작
    const sf = words[searchStartIndex]?.startFrame ?? 0;
    return { startFrame: sf, endFrame: sf + 30, nextIndex: searchStartIndex };
  }

  let firstMatch = -1;
  let lastMatch = -1;
  let wi = searchStartIndex;
  let ti = 0;

  while (wi < words.length && ti < groupTokens.length) {
    const wordClean = words[wi]!.text
      .replace(/[^a-zA-Z0-9\u00C0-\u024F\uAC00-\uD7AF]/g, "")
      .toLowerCase();

    if (wordClean === groupTokens[ti]) {
      if (firstMatch === -1) firstMatch = wi;
      lastMatch = wi;
      ti++;
    }
    wi++;
  }

  // 매칭 실패 fallback
  if (firstMatch === -1) {
    const sf = words[searchStartIndex]?.startFrame ?? 0;
    const ef = words[Math.min(searchStartIndex + 5, words.length - 1)]?.endFrame ?? sf + 60;
    return { startFrame: sf, endFrame: ef, nextIndex: searchStartIndex + 1 };
  }

  return {
    startFrame: words[firstMatch]!.startFrame,
    endFrame: words[lastMatch]!.endFrame,
    nextIndex: lastMatch + 1,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * 프레임 균등 분배 기반 씬 분할.
 *
 * 전체 오디오 길이를 N등분하여 각 씬에 균등한 시간 할당.
 * 문장 매칭 대신 단순 시간 분배 → 안정적인 씬 전환 보장.
 */
export function splitScenes(input: SceneSplitInput): ShortScene[] {
  const { words, sceneCount, backgrounds, chapterTitles } = input;

  if (words.length === 0 || sceneCount <= 0) return [];

  const totalEndFrame = words[words.length - 1]!.endFrame;
  const framesPerScene = totalEndFrame / sceneCount;

  const scenes: ShortScene[] = [];

  for (let i = 0; i < sceneCount; i++) {
    const startFrame = Math.round(i * framesPerScene);
    const endFrame = Math.round((i + 1) * framesPerScene);
    const bg = backgrounds[i % backgrounds.length];

    scenes.push({
      backgroundSrc: bg?.videoUrl ?? "",
      videoSrc: bg?.videoUrl,
      startFrame,
      endFrame,
      kenBurns: KEN_BURNS_PATTERNS[i % KEN_BURNS_PATTERNS.length],
      chapterTitle: chapterTitles?.[i],
    });
  }

  return scenes;
}
