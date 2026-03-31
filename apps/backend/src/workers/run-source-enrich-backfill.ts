/**
 * run-source-enrich-backfill.ts
 *
 * approved 상태이지만 source_count < 2인 브리프에 대해
 * Hacker News Algolia API + DuckDuckGo로 두 번째 소스를 찾아 추가한다.
 */
import { createSupabaseSql } from "../shared/supabase-postgres";

const DRY_RUN = process.argv.includes("--dry-run");
const MAX_BRIEFS = parseInt(
  process.argv.find((a) => a.startsWith("--max="))?.split("=")[1] ?? "50",
  10
);

interface BriefRow {
  id: string;
  slug: string;
  title: string;
  source_links: { label: string; href: string }[];
  source_count: number;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

const BLOCKED_DOMAINS = new Set([
  "youtube.com","twitter.com","x.com","facebook.com","instagram.com",
  "reddit.com","wikipedia.org","linkedin.com","tiktok.com","pinterest.com",
  "news.ycombinator.com",
]);

// ─── 1. Hacker News Algolia 검색 ──────────────────────────────────────────────
async function searchHackerNews(
  title: string,
  existingDomains: Set<string>
): Promise<{ url: string; label: string } | null> {
  // 핵심 키워드만 추출 (앞 60자, 영어 기준)
  const query = title.replace(/[^a-zA-Z0-9\s]/g, " ").trim().slice(0, 60);
  if (!query) return null;

  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();

    for (const hit of data.hits ?? []) {
      const articleUrl: string = hit.url ?? "";
      const articleTitle: string = hit.title ?? "";
      if (!articleUrl.startsWith("https://")) continue;
      const domain = extractDomain(articleUrl);
      if (!domain || BLOCKED_DOMAINS.has(domain)) continue;
      if (existingDomains.has(domain)) continue;
      return { url: articleUrl, label: articleTitle };
    }
    return null;
  } catch { return null; }
}

// ─── 2. DuckDuckGo Instant Answer API ─────────────────────────────────────────
async function searchDuckDuckGoInstant(
  title: string,
  existingDomains: Set<string>
): Promise<{ url: string; label: string } | null> {
  const query = title.slice(0, 80);
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "vibehub-enricher/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    // AbstractURL: 가장 관련 높은 단일 결과
    if (data.AbstractURL) {
      const domain = extractDomain(data.AbstractURL);
      if (domain && !BLOCKED_DOMAINS.has(domain) && !existingDomains.has(domain)) {
        return { url: data.AbstractURL, label: data.AbstractSource ?? title };
      }
    }

    // RelatedTopics에서 URL 추출
    for (const topic of data.RelatedTopics ?? []) {
      const u: string = topic.FirstURL ?? "";
      if (!u.startsWith("https://")) continue;
      const domain = extractDomain(u);
      if (!domain || BLOCKED_DOMAINS.has(domain)) continue;
      if (existingDomains.has(domain)) continue;
      return { url: u, label: topic.Text?.slice(0, 80) ?? title };
    }
    return null;
  } catch { return null; }
}

// ─── 3. DuckDuckGo HTML 검색 (최후 수단) ─────────────────────────────────────
async function searchDuckDuckGoHtml(
  title: string,
  existingDomains: Set<string>
): Promise<{ url: string; label: string } | null> {
  const query = title.slice(0, 80);
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // result__url 클래스에서 실제 도메인 추출
    const urlPattern = /class="result__url"[^>]*>\s*([^\s<]+)\s*</g;
    const titlePattern = /class="result__a"[^>]*>([^<]+)<\/a>/g;

    const domains: string[] = [];
    const titles: string[] = [];
    let m: RegExpExecArray | null;

    while ((m = urlPattern.exec(html)) !== null) domains.push(m[1].trim());
    while ((m = titlePattern.exec(html)) !== null) titles.push(m[1].trim());

    // uddg= 파라미터에서 실제 URL 추출
    const uddgPattern = /uddg=([^&"]+)/g;
    const realUrls: string[] = [];
    while ((m = uddgPattern.exec(html)) !== null) {
      try { realUrls.push(decodeURIComponent(m[1])); } catch { /* skip */ }
    }

    for (let i = 0; i < realUrls.length; i++) {
      const u = realUrls[i];
      if (!u.startsWith("https://")) continue;
      const domain = extractDomain(u);
      if (!domain || BLOCKED_DOMAINS.has(domain)) continue;
      if (existingDomains.has(domain)) continue;
      return { url: u, label: titles[i] ?? title };
    }
    return null;
  } catch { return null; }
}

// ─── 통합 소스 탐색 ────────────────────────────────────────────────────────────
async function findSecondSource(
  title: string,
  existingDomains: Set<string>
): Promise<{ url: string; label: string; via: string } | null> {
  // 영어 제목이면 HN 먼저
  const isEnglish = !/[\uAC00-\uD7A3]/.test(title);
  if (isEnglish) {
    const hn = await searchHackerNews(title, existingDomains);
    if (hn) return { ...hn, via: "HN" };
  }

  const ddgInstant = await searchDuckDuckGoInstant(title, existingDomains);
  if (ddgInstant) return { ...ddgInstant, via: "DDG-Instant" };

  const ddgHtml = await searchDuckDuckGoHtml(title, existingDomains);
  if (ddgHtml) return { ...ddgHtml, via: "DDG-HTML" };

  return null;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
const sql = createSupabaseSql();

try {
  const briefs = await sql<BriefRow[]>`
    SELECT id, slug, title, source_links, source_count
    FROM brief_posts
    WHERE review_status = 'approved'
      AND status IN ('review', 'scheduled')
      AND source_count < 2
    ORDER BY slug ASC
    LIMIT ${MAX_BRIEFS}
  `;

  console.log(`\n대상 브리프: ${briefs.length}건 (source_count < 2)\n`);

  let enriched = 0;
  let failed = 0;

  for (const brief of briefs) {
    const existingUrls = (brief.source_links ?? []).map((l) => l.href);
    const existingDomains = new Set(existingUrls.map(extractDomain));

    console.log(`\n[${brief.slug.slice(0, 60)}]`);
    console.log(`  제목: ${brief.title.slice(0, 80)}`);

    const candidate = await findSecondSource(brief.title, existingDomains);

    if (!candidate) {
      console.log(`  ❌ 소스 없음`);
      failed++;
      continue;
    }

    console.log(`  ✅ [${candidate.via}] ${candidate.url.slice(0, 75)}`);

    if (!DRY_RUN) {
      const newSourceLinks = [
        ...(brief.source_links ?? []),
        { label: candidate.label, href: candidate.url },
      ];
      await sql`
        UPDATE brief_posts
        SET source_links = ${sql.json(newSourceLinks)},
            source_count = ${newSourceLinks.length}
        WHERE id = ${brief.id}::uuid
      `;
    }

    enriched++;
    await new Promise((r) => setTimeout(r, 700));
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`완료: ${enriched}건 보강, ${failed}건 실패`);
  if (DRY_RUN) console.log("(DRY RUN — DB 변경 없음)");
} finally {
  await sql.end();
}
