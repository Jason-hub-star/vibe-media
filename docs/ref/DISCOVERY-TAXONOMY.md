# Discovery Taxonomy

## Purpose
- `radar`와 `admin/discover`가 무엇을 담을 수 있는지 고정하는 분류 기준이다.
- 분류는 UI 필터, admin 큐레이션, 향후 Supabase 스키마 설계의 기준이 된다.

## Core Discovery Categories
- `open_source`
- `skill`
- `plugin`
- `os`
- `website`
- `event`
- `contest`
- `news`

## Builder Workflow Categories
- `model`
- `api`
- `sdk`
- `agent`
- `template`
- `integration`

## Knowledge Categories
- `research`
- `dataset`
- `benchmark`
- `tutorial`
- `newsletter`
- `repo_list`

## Opportunity Categories
- `job`
- `grant`
- `community`

## Asset Categories
- `asset`

## Notes
- 하나의 항목은 하나의 대표 category만 가진다.
- 세부 분류는 `tags`로 보조한다.
- category를 더 늘릴 때는 `packages/content-contracts/src/discover.ts`, presenter, admin filter 순서로 같이 수정한다.

---

## Exposure Rules

### Status 정의

| Status | 의미 | UI 뱃지 |
|--------|------|---------|
| `tracked` | 기본 등록 상태. 레지스트리에 존재함을 표시 | 없음 (기본값) |
| `watching` | 주시 대상. 변화를 추적 중 | "Watching" (yellow) |
| `featured` | 에디터 픽. 주요 추천 항목 | "Featured" (mint) |

- 7일 이내 발행 + `featured` → **"New Pick"** 뱃지 표시
- 7일 이내 발행 + `tracked`/`watching` → **"New"** 뱃지 표시

### `highlighted` 플래그 vs `featured` 상태

| 구분 | 역할 | 소비처 |
|------|------|--------|
| `highlighted` (boolean) | `/radar` 상단 "Featured Picks" 섹션 노출 여부 | `radar/page.tsx` — 아이템 분리 기준 |
| `featured` (status) | 에디토리얼 중요도 등급 | `DiscoverCard` — 뱃지 표시 |

- `highlighted=true`이면 레이더 최상단 Featured Picks 섹션에 그룹핑됨
- `status=featured`이면 카드에 "Featured" 뱃지가 표시됨
- 두 값은 독립적: `highlighted=true + status=tracked` 조합 가능 (상단 노출되지만 뱃지 없음)

### 공개 노출 조건 (`/radar`)

```
reviewStatus = "approved" AND publishedAt IS NOT NULL
```

- `isPublished()` 가드 (`packages/content-contracts/src/editorial-guards.ts`)로 강제
- draft, pending, rejected 항목은 절대 공개 surface에 노출되지 않음

### Admin 노출 조건 (`/admin/discover`)

- **모든 항목** 노출 (draft, pending, rejected 포함)
- `listAllDiscoverItems()` 사용 — `isPublished` 필터 미적용
- ReviewStatus 뱃지가 카드에 표시되어 큐레이션 상태 즉시 확인 가능

### Brief ↔ Discover 연계

- `relatedBriefSlugs`는 자동 매칭으로 채워짐 (하드코딩 없음)
- 매칭 기준: discover의 `tags` ↔ published brief의 `title` 토큰 교차
  - tag ↔ title 토큰 일치: +2점
  - category ↔ title 토큰 일치: +1점
- 최대 3개 관련 Brief 연결
- `/radar/[id]` 상세 페이지 하단에 "Related Briefs" 섹션으로 렌더

### Action Link 규칙

- 모든 action의 `href`는 유효한 URL 형식이어야 함 (`http:` 또는 `https:` 프로토콜)
- `isValidActionHref()` (`packages/content-contracts/src/discover.ts`)로 검증
- 빈 문자열, 상대 경로, 잘못된 URL은 렌더링에서 자동 제외됨
- 런타임 HTTP 체크는 수행하지 않음 (비용/지연 사유)
