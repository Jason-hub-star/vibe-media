import { describe, expect, it } from "vitest";

import type {
  InboxItem,
  BriefListItem,
  ReviewItem,
  PublishQueueItem,
  ExceptionQueueItem,
  DiscoverItem,
  IngestRun,
  SourceEntry,
  VideoJob,
  ShowcaseEntry,
  AssetSlot,
} from "@vibehub/content-contracts";

import { presentInboxCard } from "../../web/features/inbox/presenter/present-inbox-card";
import { presentBriefCard } from "../../web/features/admin-briefs/presenter/present-brief-card";
import { presentReviewCard } from "../../web/features/review/presenter/present-review-card";
import { presentPublishCard } from "../../web/features/publish/presenter/present-publish-card";
import { presentExceptionCard } from "../../web/features/exceptions/presenter/present-exception-card";
import { presentDiscoverCard } from "../../web/features/discover/presenter/present-discover-card";
import { presentRunCard } from "../../web/features/runs/presenter/present-run-card";
import { presentSourceCard } from "../../web/features/sources/presenter/present-source-card";
import { presentVideoJobCard } from "../../web/features/video-jobs/presenter/present-video-job-card";
import { presentShowcaseCard } from "../../web/features/showcase/presenter/present-showcase-card";
import { presentAssetCard } from "../../web/features/assets/presenter/present-asset-card";

describe("Admin card presenters", () => {
  it("presentInboxCard maps fields correctly", () => {
    const item: InboxItem = {
      id: "inbox-1",
      sourceName: "OpenAI News",
      sourceTier: "auto-safe",
      title: "GPT-5 Announced",
      stage: "classified",
      targetSurface: "brief",
      confidence: 0.92,
      parsedSummary: "OpenAI announced GPT-5",
      contentType: "article",
    };
    const card = presentInboxCard(item);
    expect(card.id).toBe("inbox-1");
    expect(card.href).toBe("/admin/inbox/inbox-1");
    expect(card.title).toBe("GPT-5 Announced");
    expect(card.subtitle).toBe("OpenAI News");
    expect(card.status).toBe("classified");
    expect(card.metadata!.some((m) => m.value === "92%")).toBe(true);
  });

  it("presentBriefCard uses slug for href", () => {
    const item: BriefListItem = {
      slug: "gpt-5-weekly",
      title: "GPT-5 Weekly Brief",
      summary: "A weekly roundup of GPT-5 developments across the AI ecosystem and beyond the usual suspects",
      status: "published",
      publishedAt: "2026-03-20",
      sourceCount: 3,
    };
    const card = presentBriefCard(item);
    expect(card.href).toBe("/admin/briefs/gpt-5-weekly");
    expect(card.status).toBe("published");
    expect(card.subtitle!.length).toBeLessThanOrEqual(83);
  });

  it("presentReviewCard defaults reviewStatus to pending", () => {
    const item: ReviewItem = {
      id: "rev-1",
      sourceItemId: "source-1",
      sourceLabel: "Anthropic Research",
      sourceExcerpt: "excerpt",
      sourceHref: "https://example.com",
      parsedSummary: "summary",
      keyPoints: ["point1"],
      targetSurface: "brief",
      reviewReason: "Needs editorial review",
      previewTitle: "Claude 4 Review",
      previewSummary: "preview",
      confidence: 0.78,
    };
    const card = presentReviewCard(item);
    expect(card.href).toBe("/admin/review/rev-1");
    expect(card.status).toBe("pending");
    expect(card.title).toBe("Claude 4 Review");
  });

  it("presentPublishCard shows targetType as category", () => {
    const item: PublishQueueItem = {
      id: "pub-1",
      title: "AI Weekly #42",
      targetType: "brief",
      queueStatus: "scheduled",
      sourceLabel: "Internal",
      scheduledFor: "2026-03-25",
      nextAction: "Publish",
    };
    const card = presentPublishCard(item);
    expect(card.category).toBe("brief");
    expect(card.status).toBe("scheduled");
    expect(card.metadata!.some((m) => m.value.includes("2026-03-25"))).toBe(true);
  });

  it("presentExceptionCard truncates reason", () => {
    const item: ExceptionQueueItem = {
      id: "exc-1",
      title: "Blocked Item",
      targetType: "brief",
      currentStage: "review",
      reason: "This is a very long reason that should be truncated at sixty characters to fit the card",
      confidence: 0.45,
      sourceLabel: "OpenAI News",
      nextAction: "Review manually",
    };
    const card = presentExceptionCard(item);
    expect(card.status).toBe("review");
    const reasonMeta = card.metadata!.find((m) => m.label.toLowerCase().includes("reason"));
    expect(reasonMeta).toBeDefined();
    expect(reasonMeta!.value.length).toBeLessThanOrEqual(63);
  });

  it("presentDiscoverCard shows tags", () => {
    const item: DiscoverItem = {
      id: "disc-1",
      slug: "cool-tool",
      title: "Cool AI Tool",
      category: "open_source",
      summary: "A very cool tool",
      status: "featured",
      tags: ["ai", "tool", "open-source", "extra"],
      actions: [],
      highlighted: true,
    };
    const card = presentDiscoverCard(item);
    expect(card.href).toBe("/admin/discover/disc-1");
    expect(card.category).toBe("open_source");
    const tagsMeta = card.metadata!.find((m) => m.label.toLowerCase().includes("tag"));
    expect(tagsMeta).toBeDefined();
    expect(tagsMeta!.value).not.toContain("extra");
  });

  it("presentRunCard maps runStatus", () => {
    const item: IngestRun = {
      id: "run-1",
      sourceName: "GitHub Releases",
      runStatus: "fetching",
      startedAt: "2026-03-23T10:00:00Z",
      finishedAt: null,
      itemCount: 5,
      errorMessage: null,
    };
    const card = presentRunCard(item);
    expect(card.status).toBe("fetching");
    expect(card.title).toBe("GitHub Releases");
  });

  it("presentSourceCard maps freshness to Korean label", () => {
    const item: SourceEntry = {
      id: "src-1",
      label: "OpenAI News",
      category: "company",
      href: "https://openai.com/news",
      freshness: "daily",
    };
    const card = presentSourceCard(item);
    expect(card.statusLabel).toBe("매일");
    expect(card.category).toBe("company");
  });

  it("presentVideoJobCard maps status", () => {
    const item: VideoJob = {
      id: "vj-1",
      title: "Minecraft Session #3",
      sourceSession: "2026-03-20",
      kind: "gameplay",
      status: "analysis_running",
      assetLinkState: "missing",
      transcriptState: "missing",
      highlightCount: 2,
      riskySegmentCount: 0,
      nextAction: "Wait for CapCut",
      exceptionReason: null,
    };
    const card = presentVideoJobCard(item);
    expect(card.status).toBe("analysis_running");
    expect(card.title).toBe("Minecraft Session #3");
  });

  it("presentShowcaseCard truncates summary", () => {
    const item: ShowcaseEntry = {
      id: "sc-1",
      slug: "vibe-coding-demo",
      title: "Vibe Coding Demo",
      summary: "A showcase entry with a very long summary that exceeds eighty characters and should be trimmed down properly",
      body: ["paragraph"],
      coverAsset: null,
      tags: ["demo"],
      primaryLink: { kind: "primary", label: "Visit", href: "https://example.com/demo" },
      links: [],
      scheduledAt: null,
      origin: "editorial",
      createdBy: null,
      submittedBy: null,
      authorLabel: null,
      sourceDiscoverItemId: null,
      featuredHome: true,
      featuredRadar: false,
      reviewStatus: "approved",
      publishedAt: "2026-03-22",
      displayOrder: 1,
    };
    const card = presentShowcaseCard(item);
    expect(card.subtitle!.length).toBeLessThanOrEqual(83);
    expect(card.status).toBe("approved");
  });

  it("presentAssetCard maps name and type", () => {
    const item: AssetSlot = {
      id: "asset-1",
      name: "Hero Banner",
      type: "hero",
      path: "/placeholders/hero.svg",
      spec: { ratio: "16:9", minSize: "1200x675", format: "svg" },
    };
    const card = presentAssetCard(item);
    expect(card.title).toBe("Hero Banner");
    expect(card.status).toBe("hero");
  });
});
