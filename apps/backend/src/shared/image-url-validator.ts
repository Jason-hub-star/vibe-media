const BLOCKED_DOMAINS = ["pixel.", "track.", "beacon.", "analytics.", "1x1."];

/**
 * Validates a URL is suitable for use as a brief cover image.
 * Rejects data URIs, SVGs, tracking pixels, and overly long URLs.
 */
export function isValidCoverImageUrl(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  if (url.length > 2048) return false;

  const lower = url.toLowerCase();
  if (lower.endsWith(".svg")) return false;

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
