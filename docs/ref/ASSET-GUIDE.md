# VibeHub Asset Guide

## Asset Strategy
- keep screenshots ephemeral
- prefer `webp`, optional `avif` for hero/banner
- use SVG for logo, ribbon, sprites, and utility icons
- static brand assets should stay aligned with the current design-token palette

## Placeholder Slots
- `brief-hero-placeholder`
- `radar-hero-placeholder`
- `newsletter-hero-placeholder`
- `admin-video-banner-placeholder`
- `source-strip-placeholder`

## Replacement Rule
- every slot documents ratio, minimum size, and preferred format

## Brand Palette Sync
- current palette SSOT lives in `packages/design-tokens/src/index.ts`
- static SVG assets (`public/brand/*`, `public/placeholders/*`, `public/sprites/*`) should mirror the same palette family instead of keeping legacy hardcoded colors
- fallback-generated media assets (Remotion intro/outro, audiogram, thumbnail SVG) should use the same brand background/accent defaults
- 2026-03-27 baseline:
  - ink `#151110`
  - inkSoft `#241d1a`
  - cream `#f2ecdf`
  - orange `#d9863a`
  - mint `#8fcfbe`
  - yellow `#d7bc62`
  - rose `#c97a8d`
  - sky `#92abd8`
  - purple `#a88fd0`

## Current Asset Reality
- 현재 자산은 placeholder + small brand/sprite 세트만 포함한다
- 실제 생성 자산 교체 전까지 public page는 placeholder를 유지한다
- `radar-hero-placeholder`는 향후 discovery 허브 대표 비주얼 또는 배너로 교체한다
- screenshot evidence is not a persistent asset category
