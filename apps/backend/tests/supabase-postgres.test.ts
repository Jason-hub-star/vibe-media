import { describe, expect, it } from "vitest";

import { getSupabaseDbUrl } from "../src/shared/supabase-postgres";

describe("supabase postgres config", () => {
  it("rejects placeholder database urls", () => {
    process.env.SUPABASE_DB_URL = "postgresql://postgres:[YOUR-PASSWORD]@example.com:6543/postgres";

    expect(() => getSupabaseDbUrl()).toThrow("[YOUR-PASSWORD]");
  });
});
