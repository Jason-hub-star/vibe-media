import { createHash } from "node:crypto";

export function toStableUuid(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    return normalized;
  }

  const chars = createHash("sha1").update(normalized).digest("hex").slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = "8";

  return [
    chars.slice(0, 8).join(""),
    chars.slice(8, 12).join(""),
    chars.slice(12, 16).join(""),
    chars.slice(16, 20).join(""),
    chars.slice(20, 32).join("")
  ].join("-");
}
