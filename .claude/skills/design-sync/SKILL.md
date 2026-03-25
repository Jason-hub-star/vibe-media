---
name: design-sync
description: 디자인 토큰 SSOT에서 프론트엔드 프리젠터/CSS가 올바르게 파생되는지 검증하고, 카테고리/색상/아이콘 변경 시 전파 누락을 잡아준다.
argument-hint: "[check|add-category <id> <label> <group>|add-color <name> <hex>]"
user_invocable: true
---

# Design Sync

디자인 토큰 SSOT 기반으로 프론트엔드 시각 요소의 정합성을 검증하고 업데이트를 안내한다.

## Architecture (SSOT 레이어)

```
Layer 1: content-contracts/discover.ts
  → DISCOVER_CATEGORIES array (id, label, group)
  → 타입, 허용목록, 라벨 자동 파생

Layer 2: design-tokens/index.ts
  → discoverCategoryVisuals (color, icon per category)
  → discoverGroupLabels (그룹별 헤더 라벨)
  → colorTokens / colorRgbTokens (팔레트)

Layer 3: web presenters (자동 파생 — 수동 편집 금지)
  → present-discover-category.ts → Layer 1 + 2 합성
  → discovery.css → category-pill-{color} 클래스
```

## Commands

### `check` (기본값)

3개 레이어 간 정합성을 검증한다.

#### Step 1: DISCOVER_CATEGORIES ↔ discoverCategoryVisuals 동기화

```bash
# content-contracts에 정의된 카테고리 ID 목록
grep -oP "id: \"[^\"]+\"" packages/content-contracts/src/discover.ts | sort

# design-tokens에 정의된 카테고리 visual 키 목록
grep -oP "^\s+\w+:" packages/design-tokens/src/index.ts | grep -A0 "discoverCategoryVisuals" | sort
```

- DISCOVER_CATEGORIES에는 있지만 discoverCategoryVisuals에 없는 카테고리 → ⚠️ 누락
- discoverCategoryVisuals에는 있지만 DISCOVER_CATEGORIES에 없는 키 → ⚠️ 고아

#### Step 2: discoverCategoryVisuals ↔ CSS category-pill 동기화

```bash
# design-tokens에 정의된 color token 목록
grep "color:" packages/design-tokens/src/index.ts | grep -oP '"[a-z]+"' | sort -u

# CSS에 정의된 category-pill-{color} 클래스 목록
grep -oP "category-pill-[a-z]+" apps/web/app/discovery.css | sort -u
```

- 사용되는 color에 대응하는 `.category-pill-{color}` CSS 클래스가 없으면 → ⚠️ 누락

#### Step 3: discoverGroupLabels 커버리지

DISCOVER_CATEGORIES의 모든 group 값이 discoverGroupLabels에 키로 존재하는지 확인.

#### Step 4: 결과 보고

```
## Design Sync Report

| Layer | Source | Target | Status |
|-------|--------|--------|--------|
| Category → Visual | DISCOVER_CATEGORIES (24) | discoverCategoryVisuals (24) | ✅ 동기화됨 |
| Color → CSS | 6 colors used | 6 pill classes | ✅ 동기화됨 |
| Group → Labels | 5 groups | 5 labels | ✅ 동기화됨 |

판정: ✅ Design sync: all layers aligned
```

### `add-category <id> <label> <group>`

새 카테고리를 SSOT 3개 레이어에 한번에 추가한다.

1. `packages/content-contracts/src/discover.ts` — DISCOVER_CATEGORIES 배열에 추가
2. `packages/design-tokens/src/index.ts` — discoverCategoryVisuals에 color + icon 추가 (group별 기본 색상 적용)
3. CSS에 새 color가 필요하면 `apps/web/app/discovery.css`에 `.category-pill-{color}` 추가
4. typecheck 실행으로 전파 검증

### `add-color <name> <hex>`

새 색상 토큰을 추가한다.

1. `packages/design-tokens/src/index.ts` — colorTokens + colorRgbTokens에 추가
2. `rootCssVariables`에 CSS 변수 추가
3. `apps/web/app/discovery.css`에 `.category-pill-{name}` 클래스 추가

## Rules

- 프리젠터 파일에 하드코딩된 라벨/색상/아이콘이 있으면 경고한다
- 디자인 변경은 항상 design-tokens 패키지에서 시작한다 (CLAUDE.md 규칙)
- 카테고리 추가 후 반드시 typecheck를 실행한다
- 이 스킬은 advisory — 위반이 있어도 빌드를 막지는 않지만 사용자에게 알린다
