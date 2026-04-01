import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isValidCoverImageUrl } from "./image-url-validator";

describe("isValidCoverImageUrl", () => {
  it("accepts a valid https image URL", () => {
    assert.equal(isValidCoverImageUrl("https://example.com/image.jpg"), true);
  });

  it("rejects http (non-https)", () => {
    assert.equal(isValidCoverImageUrl("http://example.com/image.jpg"), false);
  });

  it("rejects data URIs", () => {
    assert.equal(isValidCoverImageUrl("data:image/png;base64,abc"), false);
  });

  it("rejects SVG extensions", () => {
    assert.equal(isValidCoverImageUrl("https://example.com/logo.svg"), false);
  });

  it("rejects tracking pixel domains", () => {
    assert.equal(isValidCoverImageUrl("https://pixel.example.com/t.gif"), false);
    assert.equal(isValidCoverImageUrl("https://track.example.com/t.gif"), false);
    assert.equal(isValidCoverImageUrl("https://beacon.example.com/t.gif"), false);
  });

  it("rejects URLs longer than 2048 chars", () => {
    const longUrl = `https://example.com/${"a".repeat(2040)}`;
    assert.equal(isValidCoverImageUrl(longUrl), false);
  });

  it("accepts normal OG images", () => {
    assert.equal(
      isValidCoverImageUrl("https://images.ctfassets.net/abc/image.png?w=1600"),
      true
    );
  });
});
