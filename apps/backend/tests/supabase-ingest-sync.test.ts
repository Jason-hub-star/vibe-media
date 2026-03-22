import { describe, expect, it } from "vitest";

import { toStableUuid } from "../src/shared/supabase-id";

describe("supabase ingest sync", () => {
  it("maps snapshot-style ids to deterministic uuids", () => {
    expect(toStableUuid("source-616388d9c125")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(toStableUuid("source-616388d9c125")).toBe(toStableUuid("source-616388d9c125"));
  });

  it("keeps valid uuids unchanged", () => {
    const value = "123e4567-e89b-12d3-a456-426614174000";

    expect(toStableUuid(value)).toBe(value);
    expect(toStableUuid(null)).toBeNull();
  });
});
