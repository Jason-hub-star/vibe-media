import { createSupabaseSql } from "./supabase-postgres";
import { enrichArticleContent } from "./live-source-fetch";

const MIN_BODY_PARAGRAPHS = 3;

interface ThinBriefRow {
  slug: string;
  title: string;
  status: string;
  body: string[];
  cover_image_url: string | null;
  source_url: string | null;
  existing_markdown: string | null;
}

interface EnrichResult {
  slug: string;
  title: string;
  bodyUpdated: boolean;
  imageUpdated: boolean;
  newBodyLen: number;
  newImageUrl: string | null;
  error: string | null;
}

/** markdown 문자열을 brief body 문단 배열로 변환 */
function markdownToBodyParagraphs(md: string): string[] {
  // 이미지 alt text, audio/video 태그, 빈 줄 제거
  const cleaned = md
    .replace(/!\[.*?\]\(.*?\)\n*/g, "")
    .replace(/<(?:audio|video|source)[^>]*>.*?<\/(?:audio|video)>/gs, "")
    .replace(/<p>.*?<\/p>/gs, "")
    .trim();

  // 더블 newline 기준 분할 → 빈 문단 제거
  return cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** 소스 도메인 → fallback cover image */
const SOURCE_DOMAIN_FALLBACK_IMAGES: Record<string, string> = {
  "openai.com":
    "https://images.ctfassets.net/kftzwdyauwt9/6tvi0m9Z8P15gx4gd3ClmR/cfb5e925a1d3b2f9ac2ccbcd311c50cc/Frame__2_.png?w=1600&h=900&fit=fill",
  "anthropic.com":
    "https://www.anthropic.com/images/icons/apple-touch-icon.png",
  "blog.google":
    "https://blog.google/static/blogv2/images/google-1000x1000.png"
};

function getFallbackImageByDomain(sourceUrl: string): string | null {
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
    for (const [domain, fallback] of Object.entries(SOURCE_DOMAIN_FALLBACK_IMAGES)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return fallback;
      }
    }
  } catch { /* invalid URL */ }
  return null;
}

/** og:image만 별도 추출 (markdown 불필요 시) */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "vibehub-media"
      }
    });
    if (!response.ok) return null;

    const html = await response.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

export async function runBriefEnrichBackfill(dryRun = false) {
  const sql = createSupabaseSql();

  try {
    // 1) body 부실(≤1문단) 또는 cover_image_url 없는 brief 조회
    const rows = await sql<ThinBriefRow[]>`
      SELECT
        bp.slug,
        bp.title,
        bp.status,
        bp.body,
        bp.cover_image_url,
        ii.url AS source_url,
        ii.parsed_content->>'contentMarkdown' AS existing_markdown
      FROM brief_posts bp
      LEFT JOIN ingested_items ii ON ii.id = bp.source_item_id
      WHERE bp.status IN ('published', 'scheduled', 'review')
        AND (
          jsonb_array_length(bp.body) <= 1
          OR bp.cover_image_url IS NULL
        )
      ORDER BY bp.published_at DESC NULLS LAST
    `;

    console.log(`Found ${rows.length} briefs needing enrichment`);

    const results: EnrichResult[] = [];

    for (const row of rows) {
      const result: EnrichResult = {
        slug: row.slug,
        title: row.title,
        bodyUpdated: false,
        imageUpdated: false,
        newBodyLen: row.body.length,
        newImageUrl: row.cover_image_url,
        error: null
      };

      try {
        const needsBody = row.body.length <= 1;
        const needsImage = !row.cover_image_url;

        let newBody: string[] | null = null;
        let newImageUrl: string | null = null;

        // Case A: 이미 markdown이 ingested_items에 있으면 그걸 사용
        if (needsBody && row.existing_markdown) {
          newBody = markdownToBodyParagraphs(row.existing_markdown);
          if (newBody.length >= MIN_BODY_PARAGRAPHS) {
            result.bodyUpdated = true;
            result.newBodyLen = newBody.length;
          } else {
            newBody = null; // 변환 결과가 너무 짧으면 스킵
          }
        }

        // Case B: source URL에서 재추출 필요
        if (row.source_url && ((!newBody && needsBody) || needsImage)) {
          try {
            const enriched = await enrichArticleContent(row.source_url);

            // body 재추출
            if (!newBody && needsBody && enriched.contentMarkdown) {
              newBody = markdownToBodyParagraphs(enriched.contentMarkdown);
              if (newBody.length >= MIN_BODY_PARAGRAPHS) {
                result.bodyUpdated = true;
                result.newBodyLen = newBody.length;
              } else {
                newBody = null;
              }
            }

            // og:image 추출
            if (needsImage && enriched.ogImageUrl) {
              newImageUrl = enriched.ogImageUrl;
              result.imageUpdated = true;
              result.newImageUrl = newImageUrl;
            }
          } catch {
            // enrichArticleContent 실패 시 og:image만 별도 시도
            if (needsImage) {
              newImageUrl = await fetchOgImage(row.source_url);
              if (newImageUrl) {
                result.imageUpdated = true;
                result.newImageUrl = newImageUrl;
              }
            }
          }
        }

        // Case C: 여전히 이미지 없으면 소스 도메인 fallback
        if (needsImage && !newImageUrl && row.source_url) {
          newImageUrl = getFallbackImageByDomain(row.source_url);
          if (newImageUrl) {
            result.imageUpdated = true;
            result.newImageUrl = newImageUrl;
          }
        }

        // DB 업데이트
        if (!dryRun && (result.bodyUpdated || result.imageUpdated)) {
          if (result.bodyUpdated && result.imageUpdated) {
            await sql`
              UPDATE brief_posts
              SET body = ${sql.json(newBody)},
                  cover_image_url = ${newImageUrl}
              WHERE slug = ${row.slug}
            `;
          } else if (result.bodyUpdated) {
            await sql`
              UPDATE brief_posts
              SET body = ${sql.json(newBody)}
              WHERE slug = ${row.slug}
            `;
          } else if (result.imageUpdated) {
            await sql`
              UPDATE brief_posts
              SET cover_image_url = ${newImageUrl}
              WHERE slug = ${row.slug}
            `;
          }
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
      }

      results.push(result);
    }

    return {
      scanned: rows.length,
      bodyUpdated: results.filter((r) => r.bodyUpdated).length,
      imageUpdated: results.filter((r) => r.imageUpdated).length,
      errors: results.filter((r) => r.error).length,
      results,
      dryRun
    };
  } finally {
    await sql.end({ timeout: 5000 });
  }
}
