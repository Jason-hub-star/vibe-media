import type { CategoryColorToken } from "@vibehub/design-tokens";

const PALETTE: CategoryColorToken[] = ["mint", "sky", "purple", "yellow", "orange", "rose"];

/**
 * Deterministically maps a brief's topic (or slug) to one of the 6 accent colors.
 * Same input always produces the same color — no randomness.
 */
export function presentBriefAccentColor(
  topic: string | undefined,
  slug: string
): CategoryColorToken {
  const seed = topic || slug;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
