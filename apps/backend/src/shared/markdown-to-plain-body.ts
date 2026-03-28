/**
 * Markdown → plain text body 문단 배열 변환.
 * Frontend가 plain text만 렌더링하므로 모든 markdown 문법을 제거한다.
 * `## 헤딩`만 보존 (프론트 parseBriefSections에서 섹션 구분으로 사용).
 */

const MIN_BODY_PARAGRAPHS = 3;

/** markdown 인라인 문법을 plain text로 변환 */
function stripInlineMarkdown(text: string): string {
  return text
    // 링크 [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // 참조형 링크 [text⁠] → text
    .replace(/\[([^\]]+)⁠?\]/g, "$1")
    // invisible separator (U+2060 word joiner, U+200B zero-width space)
    .replace(/[\u2060\u200B\u2061\u2062\u2063]/g, "")
    // 볼드+이탤릭 ***text*** → text
    .replace(/\*{3}(.+?)\*{3}/g, "$1")
    // 볼드 **text** → text
    .replace(/\*{2}(.+?)\*{2}/g, "$1")
    // 이탤릭 *text* → text (단어 중간 * 제외)
    .replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, "$1")
    // 인라인 코드 `text` → text
    .replace(/`([^`]+)`/g, "$1")
    // 취소선 ~~text~~ → text
    .replace(/~~(.+?)~~/g, "$1")
    .trim();
}

/** markdown 블록 요소를 정제 */
function stripBlockMarkdown(md: string): string {
  return md
    // 이미지 ![alt](url)
    .replace(/!\[.*?\]\(.*?\)\n*/g, "")
    // HTML audio/video 태그
    .replace(/<(?:audio|video|source)[^>]*>.*?<\/(?:audio|video)>/gs, "")
    // HTML <p> 태그
    .replace(/<p>.*?<\/p>/gs, "")
    // HTML 기타 인라인 태그 (<a>, <strong>, <em> 등)
    .replace(/<\/?(?:a|strong|em|b|i|span|br|div)[^>]*>/gi, "")
    // blockquote > prefix
    .replace(/^>\s?/gm, "")
    // 수평선 ---/***
    .replace(/^[-*]{3,}\s*$/gm, "")
    // unordered list - item → item
    .replace(/^[-*+]\s+/gm, "• ")
    // ordered list 1. item → item
    .replace(/^(\d+)\.\s+/gm, "$1. ")
    // 코드 블록 ```...``` (내용은 보존, 펜스만 제거)
    .replace(/^```\w*\n?/gm, "")
    // 이스케이프된 bracket \[ \]
    .replace(/\\([[\]])/g, "$1")
    .trim();
}

/** 문단 내 줄바꿈 정리 (리스트 항목은 한 문단으로 합침) */
function normalizeParagraph(para: string): string {
  const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";

  // ## 헤딩은 단독 보존 (프론트 섹션 구분)
  if (lines[0].startsWith("## ")) {
    return lines[0];
  }

  // 리스트 항목(• 로 시작)이면 줄바꿈 유지
  if (lines.some((l) => l.startsWith("• ")) || lines.some((l) => /^\d+\.\s/.test(l))) {
    return lines.join("\n");
  }

  // 일반 문단: 한 줄로 합침
  return lines.join(" ");
}

export function markdownToPlainBody(md: string): string[] {
  const blockCleaned = stripBlockMarkdown(md);

  const paragraphs = blockCleaned
    .split(/\n{2,}/)
    .map((p) => stripInlineMarkdown(p))
    .map((p) => normalizeParagraph(p))
    .filter((p) => p.length > 0);

  return paragraphs.length >= MIN_BODY_PARAGRAPHS ? paragraphs : [];
}
