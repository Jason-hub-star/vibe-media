import { afterEach, describe, expect, it, vi } from "vitest";

import { runLiveSourceFetch } from "../src/shared/live-source-fetch";
import { parseGitHubReleaseItems, parseRssItems } from "../src/shared/live-source-parse";
import type { LiveSourceDefinition } from "../src/shared/live-source-registry";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("live source parsers", () => {
  it("parses RSS items into normalized entries", () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title>OpenAI Agents SDK update</title>
            <link>https://example.com/openai-agents-sdk</link>
            <pubDate>Sat, 21 Mar 2026 10:00:00 GMT</pubDate>
            <description><![CDATA[<p>Useful SDK update for builders.</p>]]></description>
          </item>
        </channel>
      </rss>
    `;

    const items = parseRssItems(xml);

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("OpenAI Agents SDK update");
    expect(items[0]?.url).toBe("https://example.com/openai-agents-sdk");
    expect(items[0]?.summary).toContain("Useful SDK update");
  });

  it("parses GitHub release payloads into normalized entries", () => {
    const payload = JSON.stringify([
      {
        name: "v1.2.3",
        html_url: "https://github.com/example/repo/releases/tag/v1.2.3",
        body: "Release notes for the SDK update",
        published_at: "2026-03-21T10:00:00.000Z",
        draft: false
      }
    ]);

    const items = parseGitHubReleaseItems(payload);

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("v1.2.3");
    expect(items[0]?.url).toContain("/releases/tag/v1.2.3");
    expect(items[0]?.summary).toContain("Release notes");
  });

  it("enriches rss article items with Defuddle markdown when article fetch succeeds", async () => {
    const sources: LiveSourceDefinition[] = [
      {
        id: "openai-news-rss",
        sourceName: "OpenAI News",
        sourceTier: "auto-safe",
        fetchKind: "rss",
        href: "https://example.com/news",
        feedUrl: "https://example.com/news/rss.xml",
        contentType: "article",
        defaultTags: ["launch"],
        maxItems: 1,
        enabled: true
      }
    ];
    const feedXml = `
      <rss>
        <channel>
          <item>
            <title>OpenAI Agents SDK update</title>
            <link>https://example.com/openai-agents-sdk</link>
            <pubDate>Sat, 21 Mar 2026 10:00:00 GMT</pubDate>
            <description><![CDATA[<p>Useful SDK update for builders.</p>]]></description>
          </item>
        </channel>
      </rss>
    `;
    const articleHtml = `
      <html>
        <body>
          <article>
            <h1>OpenAI Agents SDK update</h1>
            <p>Useful body content for builders.</p>
          </article>
        </body>
      </html>
    `;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rss.xml")) {
        return new Response(feedXml, { status: 200 });
      }
      return new Response(articleHtml, { status: 200 });
    }) as typeof fetch;

    const report = await runLiveSourceFetch(sources, "2026-03-23T00:00:00.000Z");

    expect(report.items).toHaveLength(1);
    expect(report.items[0]?.parseStatus).toBe("content-enriched");
    expect(report.items[0]?.parserName).toBe("defuddle");
    expect(report.items[0]?.contentMarkdown).toContain("Useful body content");
    expect(report.cycleReport.inboxItems[0]?.parsedSummary).toContain("Useful body content");
  });

  it("falls back to summary-only content when article enrichment fails", async () => {
    const sources: LiveSourceDefinition[] = [
      {
        id: "openai-news-rss",
        sourceName: "OpenAI News",
        sourceTier: "auto-safe",
        fetchKind: "rss",
        href: "https://example.com/news",
        feedUrl: "https://example.com/news/rss.xml",
        contentType: "article",
        defaultTags: ["launch"],
        maxItems: 1,
        enabled: true
      }
    ];
    const feedXml = `
      <rss>
        <channel>
          <item>
            <title>OpenAI Agents SDK update</title>
            <link>https://example.com/openai-agents-sdk</link>
            <pubDate>Sat, 21 Mar 2026 10:00:00 GMT</pubDate>
            <description><![CDATA[<p>Useful SDK update for builders.</p>]]></description>
          </item>
        </channel>
      </rss>
    `;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rss.xml")) {
        return new Response(feedXml, { status: 200 });
      }
      return new Response("nope", { status: 500 });
    }) as typeof fetch;

    const report = await runLiveSourceFetch(sources, "2026-03-23T00:00:00.000Z");

    expect(report.items).toHaveLength(1);
    expect(report.items[0]?.parseStatus).toBe("content-failed");
    expect(report.items[0]?.parserName).toBe("rss-summary");
    expect(report.items[0]?.contentMarkdown).toBeUndefined();
    expect(report.items[0]?.parsedSummary).toContain("Useful SDK update");
  });
});
