import { SITE_URL } from "@/lib/constants";
import { listBriefs } from "@/features/brief/use-case/list-briefs";

export async function GET() {
  const briefs = await listBriefs();

  /** Escape ]]> inside CDATA blocks to prevent premature close. */
  const cdata = (s: string) => s.replace(/]]>/g, "]]]]><![CDATA[>");

  const items = briefs
    .map(
      (brief) => `
    <item>
      <title><![CDATA[${cdata(brief.title)}]]></title>
      <link>${SITE_URL}/en/brief/${brief.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/en/brief/${brief.slug}</guid>
      <description><![CDATA[${cdata(brief.summary)}]]></description>
      ${brief.publishedAt ? `<pubDate>${new Date(brief.publishedAt).toUTCString()}</pubDate>` : ""}
    </item>`
    )
    .join("");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>VibeHub — Daily AI Briefs</title>
    <link>${SITE_URL}</link>
    <description>Curated AI news briefs from 30+ global sources, published daily.</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate"
    }
  });
}
