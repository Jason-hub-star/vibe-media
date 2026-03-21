export interface DesignAssetSlot {
  id: string;
  name: string;
  type: "hero" | "banner" | "sprite" | "logo" | "thumbnail";
  path: string;
  spec: {
    ratio: string;
    minSize: string;
    format: "svg" | "webp" | "avif";
  };
}

export const colorTokens = {
  ink: "#151110",
  inkSoft: "#2a221f",
  cream: "#f4eee2",
  creamMuted: "#e5d9c5",
  orange: "#f08a24",
  mint: "#98f0e1",
  yellow: "#f7d64a",
  rose: "#d96b88",
  sky: "#8ea8ff",
  border: "#1e1a18"
} as const;

export const typographyTokens = {
  display: "var(--font-display)",
  body: "var(--font-body)"
} as const;

export const spacingTokens = {
  section: "clamp(3rem, 6vw, 6rem)",
  gutter: "clamp(1rem, 2vw, 1.5rem)",
  radius: "20px"
} as const;

export const stateTokens = {
  collected: colorTokens.sky,
  drafted: colorTokens.yellow,
  asset_pending: colorTokens.rose,
  review: colorTokens.orange,
  ready: colorTokens.mint
} as const;

export const assetSlots: DesignAssetSlot[] = [
  {
    id: "brief-hero",
    name: "brief-hero-placeholder",
    type: "hero",
    path: "/placeholders/brief-hero-placeholder.svg",
    spec: { ratio: "4:3", minSize: "1600x1200", format: "webp" }
  },
  {
    id: "radar-hero",
    name: "radar-hero-placeholder",
    type: "hero",
    path: "/placeholders/radar-hero-placeholder.svg",
    spec: { ratio: "16:10", minSize: "1680x1050", format: "webp" }
  },
  {
    id: "newsletter-hero",
    name: "newsletter-hero-placeholder",
    type: "banner",
    path: "/placeholders/newsletter-hero-placeholder.svg",
    spec: { ratio: "16:9", minSize: "1920x1080", format: "webp" }
  },
  {
    id: "admin-video-banner",
    name: "admin-video-banner-placeholder",
    type: "banner",
    path: "/placeholders/admin-video-banner-placeholder.svg",
    spec: { ratio: "21:9", minSize: "1920x820", format: "webp" }
  },
  {
    id: "source-strip",
    name: "source-strip-placeholder",
    type: "thumbnail",
    path: "/placeholders/source-strip-placeholder.svg",
    spec: { ratio: "3:2", minSize: "1200x800", format: "webp" }
  }
];

export const rootCssVariables = `
  :root {
    --color-ink: ${colorTokens.ink};
    --color-ink-soft: ${colorTokens.inkSoft};
    --color-cream: ${colorTokens.cream};
    --color-cream-muted: ${colorTokens.creamMuted};
    --color-orange: ${colorTokens.orange};
    --color-mint: ${colorTokens.mint};
    --color-yellow: ${colorTokens.yellow};
    --color-rose: ${colorTokens.rose};
    --color-sky: ${colorTokens.sky};
    --color-border: ${colorTokens.border};
    --space-section: ${spacingTokens.section};
    --space-gutter: ${spacingTokens.gutter};
    --radius-panel: ${spacingTokens.radius};
  }
`;
