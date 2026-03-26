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
  purple: "#bc9aff",
  border: "#1e1a18"
} as const;

/** RGB channel triplets for alpha-variant usage: rgba(var(--color-X-rgb), alpha) */
export const colorRgbTokens = {
  ink: "21, 17, 16",
  inkSoft: "42, 34, 31",
  cream: "244, 238, 226",
  orange: "240, 138, 36",
  mint: "152, 240, 225",
  yellow: "247, 214, 74",
  rose: "217, 107, 136",
  sky: "142, 168, 255",
  purple: "188, 154, 255"
} as const;

export const typographyTokens = {
  display: "var(--font-display)",
  body: "var(--font-body)",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Mono', 'Segoe UI Mono', Menlo, monospace"
} as const;

export const spacingTokens = {
  section: "clamp(3rem, 6vw, 6rem)",
  gutter: "clamp(1rem, 2vw, 1.5rem)",
  radius: "20px",
  radiusMd: "12px",
  radiusSm: "8px"
} as const;

export const typeScale = {
  h1: "clamp(1.6rem, 3.2vw, 2.4rem)",
  h2: "clamp(1.1rem, 2vw, 1.5rem)",
  h3: "clamp(0.9rem, 1.4vw, 1.1rem)",
  body: "0.92rem",
  small: "0.85rem",
  caption: "0.76rem",
  label: "0.65rem"
} as const;

// ── Discover Category Visual Tokens ──────────────────────────────────────────
// 카테고리 색상/아이콘 변경 = 여기 1줄 수정 → 프리젠터가 자동 반영
// 6색 팔레트를 그룹별로 순환 배정: core=mint, builder=sky, knowledge=purple, opportunity=yellow, asset=orange
export type CategoryColorToken = "mint" | "sky" | "purple" | "yellow" | "orange" | "rose";

export interface CategoryVisual {
  color: CategoryColorToken;
  icon: string;
}

export const discoverCategoryVisuals: Record<string, CategoryVisual> = {
  // Core — mint
  open_source: { color: "mint", icon: "🔧" },
  skill: { color: "mint", icon: "🎯" },
  plugin: { color: "mint", icon: "🧩" },
  os: { color: "mint", icon: "💻" },
  website: { color: "mint", icon: "🌐" },
  event: { color: "mint", icon: "🎪" },
  contest: { color: "mint", icon: "🏆" },
  news: { color: "mint", icon: "📰" },
  // Builder — sky
  model: { color: "sky", icon: "🧠" },
  api: { color: "sky", icon: "⚡" },
  sdk: { color: "sky", icon: "📦" },
  agent: { color: "sky", icon: "🤖" },
  template: { color: "sky", icon: "📐" },
  integration: { color: "sky", icon: "🔗" },
  // Knowledge — purple
  research: { color: "purple", icon: "🔬" },
  dataset: { color: "purple", icon: "📊" },
  benchmark: { color: "purple", icon: "📈" },
  tutorial: { color: "purple", icon: "📚" },
  newsletter: { color: "purple", icon: "📮" },
  repo_list: { color: "purple", icon: "📋" },
  // Opportunity — yellow
  job: { color: "yellow", icon: "💼" },
  grant: { color: "yellow", icon: "💰" },
  community: { color: "yellow", icon: "👥" },
  // Asset — orange
  asset: { color: "orange", icon: "🎨" },
};

// ── Brand Constants ──────────────────────────────────────────────────────────
export const brandTokens = {
  name: "VibeHub",
  domain: "vibehub.tech",
  briefTagline: "Daily AI Briefs",
  radarTagline: "AI Discovery Hub",
} as const;

/** CategoryColorToken → hex 매핑 (OG 이미지 등 서버사이드 렌더용) */
export const categoryAccentHex: Record<CategoryColorToken, string> = {
  mint: colorTokens.mint,
  sky: colorTokens.sky,
  purple: colorTokens.purple,
  yellow: colorTokens.yellow,
  orange: colorTokens.orange,
  rose: colorTokens.rose,
};

// 카테고리 그룹 라벨 (프론트엔드 섹션 헤더용)
export const discoverGroupLabels: Record<string, string> = {
  core: "Tools & Resources",
  builder: "Builder Stack",
  knowledge: "Knowledge",
  opportunity: "Opportunities",
  asset: "Assets",
};

export const stateTokens = {
  analysis_running: colorTokens.sky,
  capcut_pending: colorTokens.yellow,
  parent_review: colorTokens.yellow,
  capcut_done: colorTokens.mint,
  upload_ready: colorTokens.mint,
  blocked: colorTokens.rose
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
    --color-purple: ${colorTokens.purple};
    --color-border: ${colorTokens.border};
    --color-ink-rgb: ${colorRgbTokens.ink};
    --color-ink-soft-rgb: ${colorRgbTokens.inkSoft};
    --color-cream-rgb: ${colorRgbTokens.cream};
    --color-orange-rgb: ${colorRgbTokens.orange};
    --color-mint-rgb: ${colorRgbTokens.mint};
    --color-yellow-rgb: ${colorRgbTokens.yellow};
    --color-rose-rgb: ${colorRgbTokens.rose};
    --color-sky-rgb: ${colorRgbTokens.sky};
    --color-purple-rgb: ${colorRgbTokens.purple};
    --space-section: ${spacingTokens.section};
    --space-gutter: ${spacingTokens.gutter};
    --radius-panel: ${spacingTokens.radius};
    --radius-md: ${spacingTokens.radiusMd};
    --radius-sm: ${spacingTokens.radiusSm};
    --type-h1: ${typeScale.h1};
    --type-h2: ${typeScale.h2};
    --type-h3: ${typeScale.h3};
    --type-body: ${typeScale.body};
    --type-small: ${typeScale.small};
    --type-caption: ${typeScale.caption};
    --type-label: ${typeScale.label};
    --font-mono: ${typographyTokens.mono};
  }
`;
