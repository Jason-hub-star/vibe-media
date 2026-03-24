import { describe, expect, it } from "vitest";

import { getSupabaseDbUrl, isRetryableSupabaseError } from "../src/shared/supabase-postgres";

describe("supabase postgres config", () => {
  it("rejects placeholder database urls", () => {
    process.env.SUPABASE_DB_URL = "postgresql://postgres:[YOUR-PASSWORD]@example.com:6543/postgres";

    expect(() => getSupabaseDbUrl()).toThrow("[YOUR-PASSWORD]");
  });

  it("retries pooler and prepared-statement style transient errors", () => {
    expect(isRetryableSupabaseError(Object.assign(new Error("Circuit breaker open: Too many authentication errors"), { code: "XX000" }))).toBe(true);
    expect(isRetryableSupabaseError(Object.assign(new Error('prepared statement "lrupsc_1_0" already exists'), { code: "42P05" }))).toBe(true);
    expect(isRetryableSupabaseError(Object.assign(new Error("unique violation"), { code: "23505" }))).toBe(false);
  });
});
