# Daily Editorial Review — 인수인계 문서

## 이 자동화가 하는 일

매일 `daily-pipeline` 이후 실행되며, **draft 상태 브리프를 자동으로 가공**합니다.

현재 파이프라인이 RSS에서 수집한 브리프는 **요약 1줄 + 소스 1개**뿐입니다.
이 자동화가 그걸 **3단락 이상 본문 + 소스 2개 이상 + 커버 이미지**가 있는 읽을 만한 브리프로 만듭니다.

## 실행 순서

```
1. daily-pipeline.md      (fetch → ingest → sync)
2. daily-editorial-review.md   ← 이것
3. daily-drift-guard.md   (회귀 탐지)
```

## 가공 프로세스

```
[draft 브리프 조회]
  → body 1단락 이하인 것만 대상 (최대 5개/회)

[각 브리프마다]
  → 원문 페이지 WebFetch
  → 관련 기사 WebSearch
  → OG 이미지 추출
  → 본문 3단락 + 섹션 헤딩 작성
  → 소스 2개 이상 확보
  → Quality Check 6/6 통과 확인
  → DB 업데이트 (status: draft → review)
  → admin_reviews 레코드 생성
```

## 레퍼런스 브리프 (기준)

DB slug: `openai-gpt-5-4-mini-nano-launch`

이 브리프가 "좋은 브리프"의 기준입니다. 구조:

```
title:   [주체] [동사] [대상] — [부가설명]         (15-70자)
summary: [누가] [무엇을] [왜] 1-2문장              (50-200자)
body:
  [리드 단락]
  ## Why it matters
  [영향 분석]
  ## [기술/세부 헤딩]
  [기술 설명]
  ## [맥락 헤딩]
  [맥락 분석]
sources: 원문 + 보도/문서 (최소 2개)
cover_image_url: OG 이미지 URL (nullable)
```

## Quality Check 통과 조건 (6항목)

| 항목 | 통과 |
|------|------|
| Title | 15-70자 |
| Summary | 50-200자 |
| Body paragraphs | ≥3 (헤딩 제외) |
| Source count | ≥2 |
| Source URLs | 전부 HTTPS |
| Internal terms | pipeline/ingest/draft/classify/orchestrat 없음 |

**6/6 통과해야만 DB에 기록.** 하나라도 실패하면 건너뛴다.

## 안전장치

- `WHERE status = 'draft'` — 이미 review/published인 건 절대 안 건드림
- `AND jsonb_array_length(body) <= 1` — 이미 가공된 건 재가공 안 함
- 원문 접근 실패 시 그 브리프는 건너뜀 (추측으로 채우지 않음)
- 한 번에 최대 5개만 처리

## DB 컬럼 참고

`brief_posts` 테이블:
- `title`, `summary`: text
- `body`: jsonb (string 배열, `## ` 접두사 = 섹션 헤딩)
- `source_links`: jsonb (배열, `{label, href}`)
- `source_count`: integer
- `cover_image_url`: text (nullable, OG 이미지 URL)
- `status`: draft → review → scheduled → published
- `review_status`: pending → approved/changes_requested/rejected

## 드라이런 결과 (2026-03-24)

"Creating with Sora Safely" 브리프를 가공:
- 원문: RSS 요약 1줄 + OpenAI News 소스 1개
- 가공 후: 4단락 + 3섹션 헤딩 + 소스 3개 + Quality 6/6
- slug: `openai-sora-2-safety-stack`
- status: draft → review 자동 전환 확인

## 관련 파일

| 파일 | 역할 |
|------|------|
| `.claude/automations/daily-editorial-review.md` | 자동화 프롬프트 |
| `apps/backend/src/shared/supabase-editorial-sync.ts` | editorial 동기화 |
| `apps/backend/src/shared/supabase-editorial-read.ts` | editorial 읽기 |
| `apps/backend/src/features/briefs/send-to-review.ts` | 검수 전송 액션 |
| `apps/web/features/admin-briefs/view/BriefDetailContent.tsx` | 어드민 상세 (Quality Check 포함) |
| `packages/content-contracts/src/brief.ts` | BriefListItem/BriefDetail 타입 |

## 아직 자동화되지 않은 단계

| 단계 | 상태 | 비고 |
|------|------|------|
| review → approved | **수동** | 어드민에서 승인 버튼 클릭 필요 |
| approved → scheduled | **수동** | 어드민에서 예약 버튼 필요 |
| scheduled → published | **수동** | 자동 발행 워커 미구현 |

이 단계들은 critic 자동 검증과 auto-publish 워커로 확장 가능하지만, 현재는 사람이 최종 판단합니다.
