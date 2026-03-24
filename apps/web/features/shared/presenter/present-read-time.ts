const WORDS_PER_MINUTE = 200;

/** Format a read time estimate from minute count. */
export function presentReadTime(minutes: number): string {
  const clamped = Math.max(1, Math.round(minutes));
  return `${clamped} min read`;
}

/** Calculate read time from word count. */
export function calcReadTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
