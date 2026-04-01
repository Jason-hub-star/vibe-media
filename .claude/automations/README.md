# VibeHub Automation Pack

이 폴더는 Claude 스케줄러에 등록할 운영 프롬프트 모음이다.

## Recommended Set

| File | Purpose | Suggested cadence |
| --- | --- | --- |
| `daily-pipeline.md` | fetch -> ingest -> sync 실행 + Telegram 보고 | 매일 1회 |
| `daily-editorial-review.md` | draft 브리프 자동 가공 + review 전송 + guardrail auto-approve | 매일 1회, 파이프라인 이후 |
| `daily-drift-guard.md` | 파이프라인/오케스트레이션 드리프트 감시, 회귀 탐지 | 매일 1회, editorial review 이후 |
| `daily-auto-publish.md` | approved 브리프 quality check + scheduled/published 전환 + pending discover 경량 quality check + approved/published 전환 (`publish:auto-dry` -> `publish:auto` → discover publish) | 매일 1회, drift guard 이후 |
| `youtube-link-intake.md` | YouTube 수동 업로드 후 public URL을 canonical brief link로 등록 | 업로드 완료 시 수동 실행 |
| `daily-dedup-guard.md` | brief 의미적 중복 감지 (Jaccard + 동일 소스) | 매일 1회, editorial review 전후 |
| `weekly-source-health.md` | 소스 건강성 점검 + 품질 피드백 + 신규 소스 발견 | 주 1회 |
| `weekly-ingest-research.md` | 새 source/tool 조사와 parser stack 후보 추적 | 주 1회 |
| `weekly-autoresearch-loop.md` | 작은 실험을 반복하며 keep/discard 판정 | 주 2-3회 |
| `weekly-seo-audit.md` | 공개 사이트 SEO 건강성 점검 (메타/sitemap/JSON-LD/hreflang/OG) | 주 1회 |
| `weekly-image-health.md` | cover_image_url HEAD 검증 → 깨진 URL 자동 복구/리포트 | 주 1회, source-health 이후 |
| `daily-media-publish.md` | Shorts+Longform 미디어 생성 → Threads + YouTube API 자동 업로드 (unlisted) | 매일 1회, auto-publish 이후 |

## Execution Order (Daily)

```
daily-pipeline → daily-dedup-guard → daily-editorial-review → daily-drift-guard → daily-auto-publish
  ├→ daily-media-publish (Long-form + Shorts 영상 렌더)
  └→ newsletter:send (EN + ES Resend Broadcasts)
```

## Why These Automations

- `daily-pipeline`은 운영 본체다.
- `daily-editorial-review`는 RSS 요약 1줄짜리 draft를 레퍼런스 수준의 브리프로 가공하고, guardrail 기준을 통과한 brief는 자동 승인한다.
- `daily-drift-guard`는 실패를 늦게 발견하지 않도록 한다.
- `daily-auto-publish`는 approved 브리프를 quality gate 뒤에만 예약/발행하고, pending discover 항목도 경량 검증 후 자동 발행한다.
- `youtube-link-intake`는 수동 YouTube 업로드 뒤 `/vh-youtube` 또는 `publish:link-youtube`로 브리프-영상 연결을 완료한다.
- `daily-dedup-guard`는 같은 기사로 brief가 중복 생성되는 것을 방지한다.
- `weekly-source-health`는 소스 건강성 점검, 성과 기반 maxItems 조정 제안, 새 소스 후보 발견을 수행한다.
- `weekly-ingest-research`는 source catalog와 parser/tool 선택을 계속 최신화한다.
- `weekly-autoresearch-loop`는 Karpathy의 `autoresearch` 패턴처럼 고정 시간 실험 -> 메트릭 비교 -> keep/discard를 VibeHub 운영에 맞게 적용한다.
- `weekly-seo-audit`는 메타데이터/sitemap/JSON-LD/hreflang/OG 이미지의 정합성을 주간 단위로 점검해 SEO 회귀를 방지한다.
- `daily-media-publish`는 published brief에서 Long-form(16:9) + Shorts(9:16) 두 트랙으로 영상을 생성하고 YouTube에 업로드한다.

## Handoff Rule

- 새 인수인계 문서는 `HANDOFF-TEMPLATE.md`를 복사해서 작성한다.
- 운영판 `HANDOFF.md`에는 현재 구현과 수동 경계, 실패 semantics를 반드시 적는다.
- handoff 내용이 코드와 충돌하면 문서보다 구현을 우선 확인하고 즉시 갱신한다.

## OSS Shortlist

- `Defuddle`: Phase 1 실제 도입 대상
- `Docling`: planned, PDF/doc source 도입 시점까지 gated
- `OpenDataLoader PDF`: planned fallback, PDF/doc source 도입 시점까지 gated
- `Crawl4AI`: render-required collector candidate
- `Promptfoo`: Phase 2 eval/regression gate
- `Langfuse`: planned, live multi-LLM chain 생기기 전까지 보류
- `LiteLLM`: planned, backend direct multi-provider 호출 전까지 보류

## Operating Rule

- 한 자동화가 한 번에 하나의 결정만 내리게 한다.
- 문서 업데이트는 증거가 충분할 때만 한다.
- promote 전에 항상 shadow/eval 증거를 남긴다.
- 새 오픈소스 도입은 "바로 제품화"가 아니라 "작은 실험 -> keep/discard" 순서로 진행한다.
