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

  it("blocks publish for briefs with insufficient body or sources", () => {
    const shallow = runBriefQualityCheck({
      title: "Creating with Sora Safely",
      summary: "To address the novel safety challenges posed by a state-of-the-art video model.",
      body: ["One paragraph only."],
      source_links: [{ label: "OpenAI News", href: "https://openai.com/news/" }],
      source_count: 1
    });

    expect(shallow.passed).toBe(false);
    expect(shallow.failures.some((f) => f.includes("body paragraphs"))).toBe(true);
    expect(shallow.failures.some((f) => f.includes("source count"))).toBe(true);
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
      source_count: 2
    });

    expect(good.passed).toBe(true);
    expect(good.failures).toHaveLength(0);
  });
});
