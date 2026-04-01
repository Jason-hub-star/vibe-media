import "server-only";

const OG_FETCH_TIMEOUT_MS = 6_000;
const OG_MAX_BYTES = 32_768;

export interface OgMetadata {
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
}

const EMPTY_METADATA: OgMetadata = {
  ogTitle: null,
  ogDescription: null,
  ogImage: null,
};

/** Block SSRF: private/reserved IP ranges and localhost */
function isBlockedHost(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  ) {
    return true;
  }

  // Strip IPv6 brackets
  const bare = hostname.replace(/^\[|\]$/g, "");

  // IPv4 private ranges
  if (
    /^127\./.test(bare) ||
    /^10\./.test(bare) ||
    /^192\.168\./.test(bare) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(bare) ||
    /^0\./.test(bare) ||
    bare === "169.254.169.254"
  ) {
    return true;
  }

  return false;
}

/** Basic og:image validation: must be https, not SVG, not a favicon path */
function isValidOgImage(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;

    const lower = parsed.pathname.toLowerCase();
    if (lower.endsWith(".svg")) return false;
    if (/favicon/i.test(lower)) return false;

    return true;
  } catch {
    return false;
  }
}

function extractMeta(
  html: string,
  property: string,
  attrName: "property" | "name" = "property",
): string | null {
  // attribute order 1: name/property first, then content
  const pattern1 = new RegExp(
    `<meta[^>]+${attrName}=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  // attribute order 2: content first, then name/property
  const pattern2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attrName}=["']${property}["']`,
    "i",
  );

  return html.match(pattern1)?.[1]?.trim() ?? html.match(pattern2)?.[1]?.trim() ?? null;
}

/**
 * Fetch OG metadata from a URL.
 * Reads only the first 32KB of HTML with a 6-second timeout.
 * Blocks private IP ranges to prevent SSRF.
 */
export async function fetchOgMetadata(url: string): Promise<OgMetadata> {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return EMPTY_METADATA;
    }

    if (isBlockedHost(parsed.hostname)) {
      return EMPTY_METADATA;
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(OG_FETCH_TIMEOUT_MS),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "vibehub-media",
      },
      redirect: "follow",
    });

    if (!response.ok || !response.body) return EMPTY_METADATA;

    // Stream only the first 32KB
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (totalBytes < OG_MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      totalBytes += value.length;
    }
    reader.cancel();

    const html = new TextDecoder().decode(Buffer.concat(chunks));

    // --- og:title -> <title> fallback ---
    const ogTitle =
      extractMeta(html, "og:title") ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      null;

    // --- og:description -> <meta name="description"> fallback ---
    const ogDescription =
      extractMeta(html, "og:description") ??
      extractMeta(html, "description", "name") ??
      null;

    // --- og:image -> twitter:image fallback ---
    const rawOgImage =
      extractMeta(html, "og:image") ??
      extractMeta(html, "twitter:image", "name") ??
      extractMeta(html, "twitter:image", "property") ??
      null;

    const ogImage = rawOgImage && isValidOgImage(rawOgImage) ? rawOgImage : null;

    return { ogTitle, ogDescription, ogImage };
  } catch {
    return EMPTY_METADATA;
  }
}
