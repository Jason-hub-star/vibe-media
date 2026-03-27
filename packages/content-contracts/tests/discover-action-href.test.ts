import { describe, expect, it } from "vitest";
import { isValidActionHref } from "../src/discover";

describe("isValidActionHref", () => {
  it("accepts valid https URLs", () => {
    expect(isValidActionHref("https://github.com/example/repo")).toBe(true);
  });

  it("accepts valid http URLs", () => {
    expect(isValidActionHref("http://example.com")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidActionHref("")).toBe(false);
  });

  it("rejects whitespace-only string", () => {
    expect(isValidActionHref("   ")).toBe(false);
  });

  it("rejects relative paths", () => {
    expect(isValidActionHref("/brief/some-slug")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isValidActionHref("not a url")).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(isValidActionHref("ftp://files.example.com/data")).toBe(false);
    expect(isValidActionHref("javascript:alert(1)")).toBe(false);
  });
});
