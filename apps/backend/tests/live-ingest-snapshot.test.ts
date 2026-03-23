import { describe, expect, it } from "vitest";

import { materializeLiveIngestSnapshot } from "../src/shared/live-ingest-snapshot";
import type { LiveSourceFetchReport } from "../src/shared/live-source-fetch";

describe("live ingest snapshot", () => {
  it("materializes source/run/item/classification tables from a live fetch report", () => {
    const report = {
      performedAt: "2026-03-22T00:30:00.000Z",
      sourceStatuses: [
        {
          sourceId: "openai-news-rss",
          sourceName: "OpenAI News",
          status: "fetched",
          itemCount: 1,
          note: null
        }
      ],
      items: [
        {
          id: "live-openai-one",
          sourceId: "openai-news-rss",
          sourceName: "OpenAI News",
          sourceTier: "auto-safe",
          title: "OpenAI Agents SDK update",
          url: "https://example.com/openai-agents-sdk",
          publishedAt: "2026-03-22T00:00:00.000Z",
          parsedSummary: "Useful summary",
          contentMarkdown: "# Useful body",
          parserName: "defuddle",
          parseStatus: "content-enriched",
          contentType: "article",
          tags: ["sdk", "release"]
        }
      ],
      fixtures: [
        {
          id: "live-openai-one",
          sourceName: "OpenAI News",
          sourceTier: "auto-safe",
          title: "OpenAI Agents SDK update",
          contentType: "article",
          parsedSummary: "Useful summary",
          tags: ["sdk", "release"]
        }
      ],
      cycleReport: {
        cycleStartedAt: "2026-03-22T00:30:00.000Z",
        sourcesTouched: 1,
        inboxItems: [
          {
            id: "live-openai-one",
            sourceName: "OpenAI News",
            sourceTier: "auto-safe",
            title: "OpenAI Agents SDK update",
            contentType: "article",
            stage: "drafted",
            targetSurface: "both",
            confidence: 0.93,
            parsedSummary: "Useful summary"
          }
        ],
        ingestRuns: [
          {
            id: "run-openai",
            sourceName: "OpenAI News",
            runStatus: "drafted",
            startedAt: "2026-03-22T00:30:00.000Z",
            finishedAt: "2026-03-22T00:30:00.000Z",
            itemCount: 1,
            errorMessage: null
          }
        ],
        reviewItems: [],
        publishItems: [],
        exceptionItems: [],
        archiveItems: [],
        discardItems: []
      }
    } satisfies LiveSourceFetchReport;

    const snapshot = materializeLiveIngestSnapshot(report);

    expect(snapshot.tables.sources).toHaveLength(5);
    expect(snapshot.tables.ingest_runs).toHaveLength(1);
    expect(snapshot.tables.ingested_items).toHaveLength(1);
    expect(snapshot.tables.item_classifications).toHaveLength(1);
    expect(snapshot.projections.inboxItems[0]?.targetSurface).toBe("both");
    expect(snapshot.tables.item_classifications[0]?.category).toBe("sdk");
    expect(snapshot.tables.ingested_items[0]?.parsed_content).toMatchObject({
      contentMarkdown: "# Useful body",
      parserName: "defuddle",
      parseStatus: "content-enriched"
    });
  });

  it("marks repeated dedupe keys as duplicate_of archive rows", () => {
    const report = {
      performedAt: "2026-03-22T00:30:00.000Z",
      sourceStatuses: [
        {
          sourceId: "openai-news-rss",
          sourceName: "OpenAI News",
          status: "fetched",
          itemCount: 2,
          note: null
        }
      ],
      items: [
        {
          id: "live-openai-one",
          sourceId: "openai-news-rss",
          sourceName: "OpenAI News",
          sourceTier: "auto-safe",
          title: "OpenAI Agents SDK update",
          url: "https://example.com/openai-agents-sdk",
          publishedAt: "2026-03-22T00:00:00.000Z",
          parsedSummary: "Useful summary",
          contentMarkdown: "# Useful body",
          parserName: "defuddle",
          parseStatus: "content-enriched",
          contentType: "article",
          tags: ["sdk", "release"]
        },
        {
          id: "live-openai-two",
          sourceId: "openai-news-rss",
          sourceName: "OpenAI News",
          sourceTier: "auto-safe",
          title: "OpenAI Agents SDK update duplicate",
          url: "https://example.com/openai-agents-sdk",
          publishedAt: "2026-03-22T00:05:00.000Z",
          parsedSummary: "Useful summary duplicate",
          contentMarkdown: "# Useful body duplicate",
          parserName: "defuddle",
          parseStatus: "content-enriched",
          contentType: "article",
          tags: ["sdk", "release"]
        }
      ],
      fixtures: [],
      cycleReport: {
        cycleStartedAt: "2026-03-22T00:30:00.000Z",
        sourcesTouched: 1,
        inboxItems: [
          {
            id: "live-openai-one",
            sourceName: "OpenAI News",
            sourceTier: "auto-safe",
            title: "OpenAI Agents SDK update",
            contentType: "article",
            stage: "drafted",
            targetSurface: "brief",
            confidence: 0.93,
            parsedSummary: "Useful summary"
          },
          {
            id: "live-openai-two",
            sourceName: "OpenAI News",
            sourceTier: "auto-safe",
            title: "OpenAI Agents SDK update duplicate",
            contentType: "article",
            stage: "drafted",
            targetSurface: "brief",
            confidence: 0.82,
            parsedSummary: "Useful summary duplicate"
          }
        ],
        ingestRuns: [
          {
            id: "run-openai",
            sourceName: "OpenAI News",
            runStatus: "drafted",
            startedAt: "2026-03-22T00:30:00.000Z",
            finishedAt: "2026-03-22T00:30:00.000Z",
            itemCount: 2,
            errorMessage: null
          }
        ],
        reviewItems: [],
        publishItems: [],
        exceptionItems: [],
        archiveItems: [],
        discardItems: []
      }
    } satisfies LiveSourceFetchReport;

    const snapshot = materializeLiveIngestSnapshot(report);
    const duplicate = snapshot.tables.item_classifications.find((row) => row.item_id === "live-openai-two");

    expect(duplicate?.duplicate_of).toBe("live-openai-one");
    expect(duplicate?.target_surface).toBe("archive");
    expect(duplicate?.policy_flags).toContain("duplicate");
  });
});
