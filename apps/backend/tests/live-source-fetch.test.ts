import { describe, expect, it } from "vitest";

import { parseGitHubReleaseItems, parseRssItems } from "../src/shared/live-source-parse";

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
});
