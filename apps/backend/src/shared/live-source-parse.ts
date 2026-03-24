export interface ParsedRssItem {
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string;
  imageUrl: string | null;
}

export interface ParsedGitHubReleaseItem {
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(block: string, tagName: string) {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
  return match?.[1] ? stripHtml(match[1]) : "";
}

function extractImageUrl(block: string): string | null {
  // 1. <enclosure url="..." type="image/...">
  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\//i);
  if (enclosure?.[1]) return decodeHtmlEntities(enclosure[1]);
  // 2. <media:content url="...">
  const media = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (media?.[1]) return decodeHtmlEntities(media[1]);
  // 3. <media:thumbnail url="...">
  const thumb = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumb?.[1]) return decodeHtmlEntities(thumb[1]);
  // 4. first <img src="..."> in content
  const img = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img?.[1]) return decodeHtmlEntities(img[1]);
  return null;
}

function summarizeText(value: string, maxLength = 220) {
  const compact = stripHtml(value);
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

export function parseRssItems(xml: string): ParsedRssItem[] {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  return itemBlocks
    .map((block) => ({
      title: extractTag(block, "title"),
      url: extractTag(block, "link"),
      publishedAt: extractTag(block, "pubDate") || null,
      summary: summarizeText(extractTag(block, "description") || extractTag(block, "content:encoded")),
      imageUrl: extractImageUrl(block)
    }))
    .filter((item) => item.title && item.url);
}

export function parseGitHubReleaseItems(payload: string): ParsedGitHubReleaseItem[] {
  const releases = JSON.parse(payload) as Array<{
    name?: string;
    tag_name?: string;
    html_url?: string;
    body?: string;
    published_at?: string | null;
    draft?: boolean;
  }>;

  return releases
    .filter((release) => !release.draft && release.html_url)
    .map((release) => ({
      title: String(release.name || release.tag_name || "Untitled release").trim(),
      url: String(release.html_url || "").trim(),
      publishedAt: release.published_at || null,
      summary: summarizeText(release.body || "GitHub release body is empty.")
    }))
    .filter((item) => item.title && item.url);
}
