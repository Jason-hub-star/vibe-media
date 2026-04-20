import { describe, expect, it } from "vitest";

import { runBriefQualityCheck } from "../src/shared/brief-quality-check";
import {
  assertBriefCanApprove,
  assertBriefCanSchedule,
  resolveReviewStatus,
  resolveReviewTimestamp,
  resolveVideoStatusForReviewDecision
} from "../src/shared/supabase-editorial-actions";

describe("supabase editorial actions", () => {
  it("maps review decisions to workflow statuses", () => {
    expect(resolveReviewStatus("approve")).toBe("approved");
    expect(resolveReviewStatus("changes_requested")).toBe("changes_requested");
    expect(resolveReviewStatus("reject")).toBe("rejected");
  });

  it("only stamps reviewed_at for terminal review decisions", () => {
    const now = "2026-03-22T02:00:00.000Z";

    expect(resolveReviewTimestamp("approve", now)).toBe(now);
    expect(resolveReviewTimestamp("reject", now)).toBe(now);
    expect(resolveReviewTimestamp("changes_requested", now)).toBeNull();
  });

  it("maps video review decisions onto the guarded next status", () => {
    expect(resolveVideoStatusForReviewDecision("approve")).toBe("upload_ready");
    expect(resolveVideoStatusForReviewDecision("changes_requested")).toBe("capcut_pending");
    expect(resolveVideoStatusForReviewDecision("reject")).toBe("blocked");
  });

  it("requires review status before brief approval or scheduling", () => {
    expect(() => assertBriefCanApprove("draft")).toThrow("review before approve");
    expect(() => assertBriefCanSchedule("scheduled")).toThrow("review before schedule");
    expect(() => assertBriefCanApprove("review")).not.toThrow();
    expect(() => assertBriefCanSchedule("review")).not.toThrow();
  });

  it("blocks publish for briefs with insufficient body depth", () => {
    const shallow = runBriefQualityCheck({
      title: "Creating with Sora Safely",
      summary: "To address the novel safety challenges posed by a state-of-the-art video model.",
      body: ["One paragraph only."],
      source_links: [{ label: "OpenAI News", href: "https://openai.com/news/" }],
      source_count: 1
    });

    expect(shallow.passed).toBe(false);
    expect(shallow.failures.some((f) => f.includes("body paragraphs"))).toBe(true);
  });

  it("passes quality check for well-formed briefs", () => {
    const good = runBriefQualityCheck({
      title: "OpenAI launches GPT-5.4 mini and nano — smaller, faster, cheaper",
      summary: "OpenAI released two new compact models optimized for speed and cost, expanding access to smaller teams and edge deployments.",
      body: [
        "OpenAI announced GPT-5.4 mini and nano today.",
        "## Why it matters",
        "Smaller models lower the barrier to entry for startups and solo developers.",
        "## Technical details",
        "Mini targets 4x throughput at half the cost; nano fits on-device inference.",
        "## Competitive context",
        "Google and Anthropic have also released compact model variants this quarter."
      ],
      source_links: [
        { label: "OpenAI Blog", href: "https://openai.com/blog/" },
        { label: "TechCrunch", href: "https://techcrunch.com/openai-gpt54/" }
      ],
      source_count: 2,
      cover_image_url: "https://images.openai.com/blog/gpt-5-4-mini-cover.jpg"
    });

    expect(good.passed).toBe(true);
    expect(good.failures).toHaveLength(0);
  });

  it("blocks briefs with artifact text or invalid icon-only cover images", () => {
    const result = runBriefQualityCheck({
      title: "Anthropic expands Claude deployment controls for teams",
      summary: "Summary: Anthropic added deployment controls for enterprise teams and outlined how admins can manage access across multiple workspaces.",
      body: [
        "Anthropic rolled out broader deployment controls for enterprise admins this week.",
        "## Why it matters",
        "Centralized access rules make it easier for larger teams to govern model usage without slowing down product teams.",
        "## Details",
        "The update adds workspace-level controls, policy settings, and expanded audit visibility for administrators."
      ],
      source_links: [
        { label: "Anthropic", href: "https://www.anthropic.com/news/" },
        { label: "The Verge", href: "https://www.theverge.com/anthropic-admin-controls" }
      ],
      source_count: 2,
      cover_image_url: "https://cdn.example.com/favicon-32x32.png"
    });

    expect(result.passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("artifact text found"))).toBe(true);
    expect(
      result.failures.some((failure) => failure.includes("cover image failed publisher-quality validation"))
    ).toBe(true);
  });

  it("accepts a reader-facing angle without requiring a literal 'Why it matters' heading", () => {
    const result = runBriefQualityCheck({
      title: "Anthropic adds admin controls for enterprise Claude rollouts",
      summary:
        "Anthropic expanded admin controls for enterprise Claude deployments, giving larger teams more visibility into rollout policy and workspace governance.",
      body: [
        "Anthropic introduced broader admin controls for enterprise customers managing Claude deployments across multiple teams.",
        "The update gives admins more policy visibility and reduces rollout friction for organizations that need tighter governance before wider adoption.",
        "Anthropic says the new controls are designed to help larger companies manage workspace usage, access settings, and operational risk more consistently."
      ],
      source_links: [
        { label: "Anthropic", href: "https://www.anthropic.com/news/" },
        { label: "TechCrunch", href: "https://techcrunch.com/anthropic-admin-controls/" }
      ],
      source_count: 2,
      cover_image_url: "https://images.example.com/anthropic-admin-controls.jpg"
    });

    expect(result.passed).toBe(true);
    expect(
      result.failures.some((failure) => failure.includes("missing reader-facing angle"))
    ).toBe(false);
  });

  it("does not reject substantive briefs just because a source mentions release notes in the body", () => {
    const result = runBriefQualityCheck({
      title: "Vercel expands deployment controls for regulated teams",
      summary:
        "Vercel added new deployment controls for regulated teams, with broader policy management that matters to organizations balancing speed and compliance.",
      body: [
        "Vercel published a product update that references earlier release notes while outlining a larger push into compliance-focused deployment controls.",
        "The change matters for teams that need clearer approval paths because it reduces rollout risk and gives organizations a more practical way to manage production access.",
        "Vercel said the new controls cover policy settings, role boundaries, and audit support for customers with stricter operational requirements."
      ],
      source_links: [
        { label: "Vercel", href: "https://vercel.com/changelog/" },
        { label: "InfoQ", href: "https://www.infoq.com/news/2026/04/vercel-deployment-controls/" }
      ],
      source_count: 2,
      cover_image_url: "https://images.example.com/vercel-controls.jpg"
    });

    expect(result.passed).toBe(true);
    expect(
      result.failures.some((failure) => failure.includes("low-value changelog pattern"))
    ).toBe(false);
  });

  it("blocks canonical briefs that still contain Hangul", () => {
    const korean = runBriefQualityCheck({
      title: "지푸, 초저가 코딩 모델 GLM-5.1 출시",
      summary: "지푸 AI가 코딩 특화 모델을 출시하며 고성능 저비용 전략을 강조했다.",
      body: [
        "지푸 AI가 새 코딩 모델을 공개했다.",
        "## Why it matters",
        "개발자 시장에서 가격 경쟁을 본격화할 수 있다.",
        "## Details",
        "기존 상용 모델과 비슷한 성능을 더 낮은 가격에 제시했다.",
      ],
      source_links: [{ label: "AI Times Korea", href: "https://www.aitimes.com/example" }],
      source_count: 1,
    });

    expect(korean.passed).toBe(false);
    expect(korean.failures).toContain("canonical brief must be in English only");
  });
});
