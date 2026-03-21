import { describe, expect, it } from "vitest";

import { canMoveBriefStatus, canMoveVideoJobStatus } from "../src/shared/status-rules";

describe("admin status transition rules", () => {
  it("allows only the planned brief transitions", () => {
    expect(canMoveBriefStatus("draft", "review")).toBe(true);
    expect(canMoveBriefStatus("draft", "published")).toBe(false);
  });

  it("allows only the planned video job transitions", () => {
    expect(canMoveVideoJobStatus("drafted", "review")).toBe(true);
    expect(canMoveVideoJobStatus("review", "collected")).toBe(false);
  });
});
