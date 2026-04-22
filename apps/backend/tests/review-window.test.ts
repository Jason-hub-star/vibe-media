import { afterEach, describe, expect, it } from "vitest";

import {
  classifyBriefForReviewWindow,
  getPublicBriefRobots,
  getPublicPageRobots,
  selectReviewWindowFeaturedBriefs,
  shouldIndexBriefInReviewWindow,
  shouldIncludeStaticPathInSitemap,
} from "@/lib/review-window";

const ORIGINAL_REVIEW_WINDOW = process.env.VIBEHUB_PUBLIC_REVIEW_WINDOW;

afterEach(() => {
  if (ORIGINAL_REVIEW_WINDOW === undefined) {
    delete process.env.VIBEHUB_PUBLIC_REVIEW_WINDOW;
    return;
  }

  process.env.VIBEHUB_PUBLIC_REVIEW_WINDOW = ORIGINAL_REVIEW_WINDOW;
});

describe("review window helpers", () => {
  it("noindexes radar, sources, and newsletter pages while the review window is active", () => {
    delete process.env.VIBEHUB_PUBLIC_REVIEW_WINDOW;

    expect(getPublicPageRobots("radar-list")).toEqual({ index: false, follow: true });
    expect(getPublicPageRobots("radar-detail")).toEqual({ index: false, follow: true });
    expect(getPublicPageRobots("sources")).toEqual({ index: false, follow: true });
    expect(getPublicPageRobots("newsletter")).toEqual({ index: false, follow: true });
    expect(getPublicPageRobots("brief-list")).toEqual({ index: true, follow: true });
    expect(getPublicPageRobots("contact")).toEqual({ index: true, follow: true });
  });

  it("keeps radar out of the sitemap while preserving trust pages", () => {
    delete process.env.VIBEHUB_PUBLIC_REVIEW_WINDOW;

    expect(shouldIncludeStaticPathInSitemap("/radar")).toBe(false);
    expect(shouldIncludeStaticPathInSitemap("/sources")).toBe(false);
    expect(shouldIncludeStaticPathInSitemap("/newsletter")).toBe(false);
    expect(shouldIncludeStaticPathInSitemap("/brief")).toBe(true);
    expect(shouldIncludeStaticPathInSitemap("/editorial-policy")).toBe(true);
    expect(shouldIncludeStaticPathInSitemap("/team")).toBe(true);
    expect(shouldIncludeStaticPathInSitemap("/contact")).toBe(true);
  });

  it("buckets strong, rewrite-needed, and low-value briefs for the review window", () => {
    const keep = classifyBriefForReviewWindow({
      slug: "openai-enterprise-controls",
      title: "OpenAI adds enterprise controls for multi-team deployments",
      summary:
        "OpenAI introduced broader admin controls for enterprise teams, expanding governance options while reducing rollout friction for larger organizations.",
      status: "published",
      publishedAt: "2026-04-20T00:00:00.000Z",
      sourceCount: 3,
      readTimeMinutes: 4,
      bodyElementCount: 9,
      headingCount: 4,
      bodyPreview:
        "OpenAI expanded enterprise control features for admins this week, adding more visibility into workspace usage and policy settings. The update gives larger organizations a clearer path to safe deployment at scale.",
      coverImage: "https://images.example.com/openai-controls.jpg",
    });
    const rewrite = classifyBriefForReviewWindow({
      slug: "anthropic-product-update",
      title: "Anthropic expands admin tooling for Claude teams",
      summary:
        "Anthropic expanded admin tooling for team deployments and outlined new policy controls for enterprise customers across Claude workspaces.",
      status: "published",
      publishedAt: "2026-04-19T00:00:00.000Z",
      sourceCount: 2,
      readTimeMinutes: 2,
      bodyElementCount: 7,
      headingCount: 3,
      bodyPreview:
        "Anthropic published an update for enterprise customers and the story still needs editorial cleanup before it should lead the public surface.",
      coverImage: "https://cdn.example.com/favicon-32x32.png",
    });
    const hide = classifyBriefForReviewWindow({
      slug: "tooling-changelog",
      title: "Workbench changelog and updated dependencies",
      summary: "Updated dependencies and release notes for the latest maintenance release.",
      status: "published",
      publishedAt: "2026-04-18T00:00:00.000Z",
      sourceCount: 1,
      readTimeMinutes: 1,
      bodyElementCount: 3,
      headingCount: 0,
      bodyPreview: "Maintenance update only.",
      coverImage: "https://cdn.example.com/favicon.ico",
    });

    expect(keep).toBe("keep");
    expect(rewrite).toBe("rewrite");
    expect(hide).toBe("hide");
  });

  it("only features keep-tier briefs on the home surface during the review window", () => {
    delete process.env.VIBEHUB_PUBLIC_REVIEW_WINDOW;

    const featured = selectReviewWindowFeaturedBriefs([
      {
        slug: "keep-brief",
        title: "OpenAI adds enterprise controls for multi-team deployments",
        summary:
          "OpenAI introduced broader admin controls for enterprise teams, expanding governance options while reducing rollout friction for larger organizations.",
        status: "published",
        publishedAt: "2026-04-20T00:00:00.000Z",
        sourceCount: 3,
        readTimeMinutes: 4,
        bodyElementCount: 9,
        headingCount: 4,
        bodyPreview:
          "OpenAI expanded enterprise control features for admins this week, adding more visibility into workspace usage and policy settings. The update gives larger organizations a clearer path to safe deployment at scale.",
        coverImage: "https://images.example.com/openai-controls.jpg",
      },
      {
        slug: "rewrite-brief",
        title: "Anthropic expands admin tooling for Claude teams",
        summary:
          "Anthropic expanded admin tooling for team deployments and outlined new policy controls for enterprise customers across Claude workspaces.",
        status: "published",
        publishedAt: "2026-04-19T00:00:00.000Z",
        sourceCount: 2,
        readTimeMinutes: 2,
        bodyElementCount: 7,
        headingCount: 3,
        bodyPreview:
          "Anthropic published an update for enterprise customers and the story still needs editorial cleanup before it should lead the public surface.",
        coverImage: "https://cdn.example.com/favicon-32x32.png",
      },
    ]);

    expect(featured).toHaveLength(1);
    expect(featured[0]?.slug).toBe("keep-brief");
  });

  it("keeps quarantined or rewrite-tier briefs out of the review-window index", () => {
    delete process.env.VIBEHUB_PUBLIC_REVIEW_WINDOW;

    const strongBrief = {
      slug: "strong-brief",
      title: "OpenAI adds enterprise controls for multi-team deployments",
      summary:
        "OpenAI introduced broader admin controls for enterprise teams, expanding governance options while reducing rollout friction for larger organizations.",
      status: "published" as const,
      publishedAt: "2026-04-20T00:00:00.000Z",
      sourceCount: 3,
      readTimeMinutes: 4,
      bodyElementCount: 9,
      headingCount: 4,
      bodyPreview:
        "OpenAI expanded enterprise control features for admins this week, adding more visibility into workspace usage and policy settings. The update gives larger organizations a clearer path to safe deployment at scale.",
      coverImage: "https://images.example.com/openai-controls.jpg",
    };
    const quarantinedBrief = {
      ...strongBrief,
      slug: "elon-musk-s-last-co-founder-reportedly-leaves-xai-live-b73",
    };
    const rewriteBrief = {
      ...strongBrief,
      slug: "one-source-brief",
      sourceCount: 1,
    };

    expect(shouldIndexBriefInReviewWindow(strongBrief)).toBe(true);
    expect(shouldIndexBriefInReviewWindow(quarantinedBrief)).toBe(false);
    expect(shouldIndexBriefInReviewWindow(rewriteBrief)).toBe(false);
    expect(getPublicBriefRobots(quarantinedBrief)).toEqual({ index: false, follow: true });
  });

  it("blocks short or source-dump briefs from the review-window index", () => {
    delete process.env.VIBEHUB_PUBLIC_REVIEW_WINDOW;

    const shortBrief = {
      slug: "short-but-polished",
      title: "Google opens Personal Intelligence to more free users",
      summary:
        "Google expanded Personal Intelligence to free users, connecting Gemini and Search with personal account data in ways that raise privacy questions.",
      status: "published" as const,
      publishedAt: "2026-04-20T00:00:00.000Z",
      sourceCount: 3,
      readTimeMinutes: 2,
      bodyElementCount: 7,
      headingCount: 3,
      bodyPreview:
        "Google expanded the feature to more users and explained the privacy controls that matter for account-level personalization.",
      coverImage: "https://images.example.com/google-personal-intelligence.jpg",
    };
    const sourceDumpBrief = {
      ...shortBrief,
      slug: "source-dump",
      readTimeMinutes: 8,
      bodyElementCount: 29,
      headingCount: 0,
      bodyPreview:
        "For decades, artificial intelligence has been evaluated through narrow tests. #### What happens when AI fails",
    };

    expect(classifyBriefForReviewWindow(shortBrief)).toBe("rewrite");
    expect(classifyBriefForReviewWindow(sourceDumpBrief)).toBe("hide");
    expect(shouldIndexBriefInReviewWindow(shortBrief)).toBe(false);
    expect(shouldIndexBriefInReviewWindow(sourceDumpBrief)).toBe(false);
  });
});
