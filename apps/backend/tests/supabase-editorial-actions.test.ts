import { describe, expect, it } from "vitest";

import { runBriefQualityCheck } from "../src/shared/brief-quality-check";
import {
  assertBriefCanApprove,
  assertBriefCanSchedule,
  resolveReviewStatus,
  resolveReviewTimestamp,
  resolveVideoStatusForReviewDecision
} from "../src/shared/supabase-editorial-actions";

const LONG_READER_CONTEXT =
  "For developers, product teams, and operators, the change matters because it affects rollout planning, cost control, governance, and the way smaller organizations decide whether an AI system is ready for production use. The brief adds context beyond the source announcement by explaining who is affected, what changes operationally, and which tradeoffs readers should watch before they adopt the update. It also separates the practical implications from launch-day positioning, giving readers enough background to understand whether the change is urgent, optional, risky, or mostly a signal of where the market is moving next.";
const LONG_TECH_CONTEXT =
  "The technical details are not just feature names. They include deployment limits, pricing pressure, latency expectations, security posture, and the practical workflow changes that teams need to understand before they move from experimentation to daily usage. This context helps readers compare the update with alternatives instead of treating the source as a standalone marketing announcement. A publishable brief should translate those details into operational consequences, including what teams need to test, what they can ignore for now, and what could become a blocker during a real rollout.";
const LONG_MARKET_CONTEXT =
  "The competitive context matters because model providers, cloud platforms, and enterprise software vendors are racing to turn AI releases into durable workflow products. A stronger brief should explain whether the move changes access, governance, safety expectations, or buyer behavior, rather than simply repeating that a company launched a new capability. That context is what makes the article useful for readers who are deciding whether to adopt, wait, compare vendors, or treat the announcement as background noise.";
const LONG_ADOPTION_CONTEXT =
  "The adoption lens is equally important. Readers need to know what should happen next, which teams are most likely to benefit first, and what evidence would prove the announcement is more than a positioning exercise. That means comparing the release with existing workflows, identifying missing details, and explaining the near-term decision a practical team would make after reading the story. It should leave a reader with enough context to act without opening the original source immediately.";

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
        `OpenAI announced GPT-5.4 mini and nano today, positioning the smaller models as a practical option for teams that need lower latency, predictable cost, and easier deployment controls. ${LONG_READER_CONTEXT}`,
        "## Why it matters",
        `Smaller models lower the barrier to entry for startups and solo developers while giving enterprise teams more room to test AI features before committing to larger deployments. ${LONG_READER_CONTEXT}`,
        "## Technical details",
        `Mini targets higher throughput at lower cost, while nano is framed for constrained environments where response time and operating expense matter more than maximum benchmark scores. ${LONG_TECH_CONTEXT}`,
        "## Competitive context",
        `Google and Anthropic have also released compact model variants this quarter, making smaller frontier-adjacent models a central part of platform competition rather than a niche developer option. ${LONG_MARKET_CONTEXT}`,
        "## Adoption watch",
        `The next signal to watch is whether developers actually shift production workloads toward these smaller models, rather than only using them for prototypes and background tasks. ${LONG_ADOPTION_CONTEXT}`
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

  it("blocks truncated summaries and notes-style topics before publication", () => {
    const result = runBriefQualityCheck({
      title: "Generative UI Notes from a product prototype",
      summary: "A short collection of observations about generative UI patterns...",
      body: [
        `A design team published prototype observations about generative interfaces, but the framing remains closer to internal notes than a reader-ready news brief. ${LONG_READER_CONTEXT}`,
        `The topic could become useful if it explains how developers and product teams should evaluate the tradeoffs in generative UI workflows. ${LONG_TECH_CONTEXT}`,
        `Without that added context, the article risks reading like a lightly repackaged notebook rather than a publisher-quality brief. ${LONG_MARKET_CONTEXT}`
      ],
      source_links: [
        { label: "CSS-Tricks", href: "https://css-tricks.com/generative-ui-notes/" },
        { label: "Nielsen Norman Group", href: "https://www.nngroup.com/articles/generative-ui/" }
      ],
      source_count: 2,
      cover_image_url: "https://images.example.com/generative-ui.jpg"
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("summary appears truncated");
    expect(result.failures.some((failure) => failure.includes("thin title pattern found"))).toBe(true);
  });

  it("blocks short bodies even when paragraph count is high enough", () => {
    const result = runBriefQualityCheck({
      title: "Harvey raises new funding for legal AI agents",
      summary:
        "Harvey raised new funding for legal AI agents, highlighting investor demand for vertical AI software in regulated professional workflows.",
      body: [
        "Harvey raised a new funding round for legal AI.",
        "## Why it matters",
        "The move matters for law firms evaluating AI workflow tools.",
        "## Context",
        "The company is competing with other vertical AI startups."
      ],
      source_links: [
        { label: "AI Times", href: "https://www.aitimes.com/harvey-funding" },
        { label: "TechCrunch", href: "https://techcrunch.com/harvey-funding" }
      ],
      source_count: 2,
      cover_image_url: "https://images.example.com/harvey.jpg"
    });

    expect(result.passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("body word count"))).toBe(true);
  });

  it("requires at least two distinct source domains", () => {
    const result = runBriefQualityCheck({
      title: "OpenAI expands enterprise controls for teams",
      summary:
        "OpenAI expanded enterprise controls for teams, adding governance options that matter to organizations managing AI deployments.",
      body: [
        `OpenAI introduced new controls for enterprise customers that need clearer governance before expanding AI access. ${LONG_READER_CONTEXT}`,
        `The technical changes affect policy settings, rollout controls, and operational visibility for admins responsible for production usage. ${LONG_TECH_CONTEXT}`,
        `The update also fits a broader market push toward enterprise-grade AI tooling with clearer buyer controls. ${LONG_MARKET_CONTEXT}`
      ],
      source_links: [
        { label: "OpenAI Blog", href: "https://openai.com/blog/enterprise-controls" },
        { label: "OpenAI News", href: "https://openai.com/news/enterprise-controls" }
      ],
      source_count: 2,
      cover_image_url: "https://images.example.com/openai-controls.jpg"
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("source domain count 1 (expected ≥2)");
  });

  it("accepts a reader-facing angle without requiring a literal 'Why it matters' heading", () => {
    const result = runBriefQualityCheck({
      title: "Anthropic adds admin controls for enterprise Claude rollouts",
      summary:
        "Anthropic expanded admin controls for enterprise Claude deployments, giving larger teams more visibility into rollout policy and workspace governance.",
      body: [
        `Anthropic introduced broader admin controls for enterprise customers managing Claude deployments across multiple teams, with a focus on policy visibility and safer adoption paths. ${LONG_READER_CONTEXT}`,
        `The update gives admins more policy visibility and reduces rollout friction for organizations that need tighter governance before wider adoption. ${LONG_TECH_CONTEXT}`,
        `Anthropic says the new controls are designed to help larger companies manage workspace usage, access settings, and operational risk more consistently. ${LONG_MARKET_CONTEXT}`,
        `For readers comparing enterprise AI tools, the practical question is whether these controls reduce review overhead without creating another layer of admin work. ${LONG_ADOPTION_CONTEXT}`,
        `That adoption question matters because governance features only become valuable when they change how quickly teams can approve, monitor, and adjust real deployments. ${LONG_READER_CONTEXT}`,
        `The follow-up signal will be whether customers describe the controls as part of daily administration, not just compliance documentation. ${LONG_TECH_CONTEXT}`
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
        `Vercel published a product update that references earlier release notes while outlining a larger push into compliance-focused deployment controls for production teams. ${LONG_READER_CONTEXT}`,
        `The change matters for teams that need clearer approval paths because it reduces rollout risk and gives organizations a more practical way to manage production access. ${LONG_TECH_CONTEXT}`,
        `Vercel said the new controls cover policy settings, role boundaries, and audit support for customers with stricter operational requirements. ${LONG_MARKET_CONTEXT}`,
        `The adoption question is whether regulated teams can use these controls without slowing down normal deployment cycles or creating duplicate approval processes. ${LONG_ADOPTION_CONTEXT}`,
        `That matters for platform buyers because governance features can become either a selling point or a maintenance burden depending on how clearly they map to existing engineering workflows. ${LONG_READER_CONTEXT}`,
        `The next useful proof point would be customer evidence that these controls reduce production risk while preserving deployment speed. ${LONG_TECH_CONTEXT}`
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
