const BLOCKED_DOMAINS = ["pixel.", "track.", "beacon.", "analytics.", "1x1."];

/** Filename patterns too small or generic for a card cover */
const BLOCKED_FILENAME_PATTERNS = [
  /favicon/i,
  /apple-touch-icon/i,
  /icon[-_]?\d*x?\d*\./i,
  /logo[-_]?small/i,
  /touch[-_]icon/i
];

/**
 * Validates a URL is suitable for use as a brief cover image.
 * Rejects data URIs, SVGs, tracking pixels, favicons, small icons, and overly long URLs.
 */
export function isValidCoverImageUrl(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  if (url.length > 2048) return false;

  const lower = url.toLowerCase();
  if (lower.endsWith(".svg")) return false;

  // Reject favicon / small icon patterns
  const filename = lower.split("/").pop() ?? "";
  for (const pattern of BLOCKED_FILENAME_PATTERNS) {
    if (pattern.test(filename)) return false;
  }

  try {
    const hostname = new URL(url).hostname;
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname.startsWith(blocked) || hostname.includes(`.${blocked}`)) {
        return false;
      }
    }
  } catch {
    return false;
  }

  return true;
}
