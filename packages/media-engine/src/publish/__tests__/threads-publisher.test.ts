import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createThreadsPublisher } from "../threads-publisher";
import type { PublishPayload } from "../../types";

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("THREADS_USER_ID", "123456");
  vi.stubEnv("THREADS_ACCESS_TOKEN", "test-token");
  vi.stubEnv("THREADS_HANDLE", "testhandle");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const basePayload: PublishPayload = {
  title: "Test Brief",
  markdownBody: "This is a test brief body.",
  tags: ["ai", "tech"],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ThreadsPublisher", () => {
  it("should publish successfully with 2-step flow", async () => {
    // createContainer → returns id
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "container-123" }),
      })
      // publishContainer → returns id
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "post-456" }),
      });

    const publisher = createThreadsPublisher();
    const result = await publisher.publish(basePayload);

    expect(result.success).toBe(true);
    expect(result.publishedUrl).toContain("post-456");
    expect(result.channel).toBe("threads");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should handle dryRun without API calls", async () => {
    const publisher = createThreadsPublisher();
    const result = await publisher.publish(basePayload, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.error).toContain("DRY RUN");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should truncate text exceeding 500 chars", async () => {
    const longPayload: PublishPayload = {
      title: "A".repeat(300),
      markdownBody: "B".repeat(300),
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "container-789" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "post-abc" }),
      });

    const publisher = createThreadsPublisher();
    const result = await publisher.publish(longPayload);

    expect(result.success).toBe(true);

    // createContainer 호출의 body를 확인
    const firstCall = mockFetch.mock.calls[0];
    const body = firstCall[1].body as string;
    const params = new URLSearchParams(body);
    const text = params.get("text") ?? "";
    expect(text.length).toBeLessThanOrEqual(500);
    expect(text.endsWith("...")).toBe(true);
  });

  it("should handle API error gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Bad Request",
    });

    const publisher = createThreadsPublisher();
    const result = await publisher.publish(basePayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("400");
  });

  it("should retry on 429 rate limit", async () => {
    mockFetch
      // First attempt: 429
      .mockResolvedValueOnce({ ok: false, status: 429 })
      // Retry: success
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "container-retry" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "post-retry" }),
      });

    const publisher = createThreadsPublisher();
    const result = await publisher.publish(basePayload);

    expect(result.success).toBe(true);
    // 429 + retry + publish = 3 calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("should throw if credentials are missing", async () => {
    vi.stubEnv("THREADS_USER_ID", "");
    vi.stubEnv("THREADS_ACCESS_TOKEN", "");

    const publisher = createThreadsPublisher({ userId: "", accessToken: "" });
    const result = await publisher.publish(basePayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not configured");
  });

  it("should inject cross-promo reply", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "reply-container" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "reply-post" }),
      });

    const publisher = createThreadsPublisher();
    const result = await publisher.injectCrossPromo!(
      "https://www.threads.net/@vibehub/post/post-456",
      [
        {
          targetChannel: "ghost",
          url: "https://vibehub.tech/article",
          text: "Read full article",
        },
      ],
    );

    expect(result.success).toBe(true);

    // reply_to_id가 포함되었는지 확인
    const firstCall = mockFetch.mock.calls[0];
    const body = firstCall[1].body as string;
    const params = new URLSearchParams(body);
    expect(params.get("reply_to_id")).toBe("post-456");
  });
});
