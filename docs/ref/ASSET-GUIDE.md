# VibeHub Asset Guide

## Asset Strategy
- keep screenshots ephemeral
- prefer `webp`, optional `avif` for hero/banner — `png`/`jpg`도 `next/image`가 자동 WebP 변환하므로 허용
- logo-mark는 SVG `<text>` 기반 (Helvetica Neue Bold "VH"), ribbon/sprites는 SVG 유지
- static brand assets should stay aligned with the current design-token palette

## Placeholder Slots
- `brief-hero-placeholder`
- `radar-hero-placeholder`
- `newsletter-hero-placeholder`
- `admin-video-banner-placeholder`
- `source-strip-placeholder`

## Monorepo public/ 이중 구조 (Vercel 배포)

Vercel 배포 시 정적 에셋은 **monorepo 루트 `public/`** 에서 서빙된다 (`apps/web/public/` 아님).
로컬 dev에서는 Next.js가 `apps/web/public/`을 직접 참조하므로 차이가 발생할 수 있다.

- **정본**: `apps/web/public/` — 에셋 추가/수정은 여기서 먼저
- **배포용 복사본**: 루트 `public/` — `apps/web/public/`과 동기화 필수
- **에셋 추가 시**: 양쪽 모두에 파일 배치. 한쪽만 넣으면 dev 또는 prod에서 404 발생
- **검증**: `diff <(cd apps/web/public && find . -type f | sort) <(cd public && find . -type f | sort)`

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
- 로고: `logo-mark.svg` + `favicon.svg` — SVG `<text>` 폰트 기반 "VH" (Helvetica Neue 700, orange 배경)
- 워드마크: `logo-wordmark.svg` — 미니 VH 마크 + "VIBEHUB" 텍스트
- dynamic icons: `icon.tsx` (32×32), `apple-icon.tsx` (180×180) — `colorTokens` 기반 "VH" 텍스트 렌더
- 플레이스홀더 교체 현황 (2026-03-31):
  - `radar-hero-placeholder.png` — AI 생성 레이더 비주얼 (동심원+데이터 노드)
  - `newsletter-hero-placeholder.png` — AI 생성 봉투+회로 비주얼
  - `source-strip-placeholder.jpg` — AI 생성 카드 모자이크 비주얼
  - `brief-hero-placeholder.svg` — 미사용 (교체 불요)
  - `admin-video-banner-placeholder.svg` — 내부 admin용 (교체 불요)
- screenshot evidence is not a persistent asset category
