import { describe, expect, it } from "vitest";

import type {
  BriefListItem,
  DiscoverItem,
  ExceptionQueueItem,
  PublishQueueItem,
  ShowcaseEntry,
  VideoJob
} from "./index";

describe("shared contract shapes", () => {
  it("accepts a valid brief list item", () => {
    const brief: BriefListItem = {
      slug: "openai-agents-sdk-update",
      title: "Agents SDK update",
      summary: "What changed and why it matters.",
      status: "review",
      publishedAt: null,
      sourceCount: 3
    };

    expect(brief.status).toBe("review");
  });

  it("accepts a valid video job", () => {
    const job: VideoJob = {
      id: "job-1",
      title: "Minecraft evening run",
      kind: "gameplay",
      status: "capcut_pending",
      assetLinkState: "partial",
      sourceSession: "2026-03-21-evening",
      transcriptState: "draft",
      highlightCount: 3,
      riskySegmentCount: 1,
      exceptionReason: null,
      nextAction: "Finish subtitles and timing in CapCut."
    };

    expect(job.assetLinkState).toBe("partial");
  });

  it("accepts a valid discover item", () => {
    const item: DiscoverItem = {
      id: "discover-stitch",
      slug: "stitch-sdk",
      title: "Stitch SDK",
      category: "plugin",
      summary: "Design variant generation for rapid exploration.",
      status: "featured",
      tags: ["design", "sdk"],
      highlighted: true,
      actions: [
        { kind: "github", label: "GitHub", href: "https://github.com/google-labs-code/stitch-sdk" }
      ]
    };

    expect(item.category).toBe("plugin");
  });

  it("accepts a valid publish queue item", () => {
    const item: PublishQueueItem = {
      id: "publish-1",
      title: "Minecraft evening run",
      targetType: "video",
      queueStatus: "uploaded_private",
      sourceLabel: "minecraft-session-0321",
      scheduledFor: "2026-03-22T20:00:00.000Z",
      nextAction: "Parent-approved private upload can move into the evening slot."
    };

    expect(item.queueStatus).toBe("uploaded_private");
  });

  it("accepts a valid showcase entry", () => {
    const item: ShowcaseEntry = {
      id: "showcase-1",
      slug: "multi-agent-editorial-console",
      title: "Multi-agent editorial console",
      summary: "운영 파이프라인을 해치지 않고 전시 레인을 붙이는 관리형 프론트엔드 실험입니다.",
      body: ["첫 공개는 홈 티저와 Radar 전시 묶음부터 시작합니다."],
      coverAsset: "/placeholders/source-strip-placeholder.svg",
      tags: ["showcase", "agents", "editorial"],
      primaryLink: {
        kind: "demo",
        label: "Open demo",
        href: "https://example.com/demo"
      },
      links: [
        {
          kind: "github",
          label: "GitHub",
          href: "https://github.com/example/repo"
        }
      ],
      reviewStatus: "approved",
      scheduledAt: null,
      publishedAt: "2026-03-22T09:00:00.000Z",
      origin: "editorial",
      createdBy: "operator",
      submittedBy: null,
      authorLabel: "VibeHub Curation",
      sourceDiscoverItemId: null,
      featuredHome: true,
      featuredRadar: true,
      displayOrder: 1
    };

    expect(item.origin).toBe("editorial");
  });

  it("accepts a valid exception queue item", () => {
    const item: ExceptionQueueItem = {
      id: "exception-1",
      title: "Karpathy interview brief",
      targetType: "brief",
      currentStage: "review",
      reason: "quote boundary review needed",
      confidence: 0.78,
      sourceLabel: "Transcript Mirror",
      nextAction: "Lock direct quote boundaries before publish queue entry."
    };

    expect(item.targetType).toBe("brief");
  });
});
