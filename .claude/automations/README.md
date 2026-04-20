# VibeHub Automation Pack

이 폴더는 Claude 스케줄러에 등록할 운영 프롬프트 모음이다.

## Recommended Set

| File | Purpose | Suggested cadence |
| --- | --- | --- |
| `daily-pipeline.md` | fetch -> ingest -> sync 실행 + Telegram 보고 | 매일 1회 |
| `daily-editorial-review.md` | draft 브리프 자동 가공 + 저가치/아티팩트/내부용어 차단 + review 전송 + guardrail auto-approve | 매일 1회, 파이프라인 이후 |
| `daily-drift-guard.md` | 파이프라인/오케스트레이션 드리프트 감시, 회귀 탐지 | 매일 1회, editorial review 이후 |
| `daily-auto-publish.md` | approved 브리프 quality check + scheduled/published 전환 + pending discover 경량 quality check + thin radar hold 후 approved/published 전환 (`publish:auto-dry` -> `publish:auto` → discover publish) | 매일 1회, drift guard 이후 |
| `youtube-link-intake.md` | YouTube 수동 업로드 후 public URL을 canonical brief link로 등록 | 업로드 완료 시 수동 실행 |
| `daily-dedup-guard.md` | brief 의미적 중복 감지 (Jaccard + 동일 소스) | 매일 1회, editorial review 전후 |
| `weekly-source-health.md` | 소스 건강성 점검 + 품질 피드백 + 신규 소스 발견 | 주 1회 |
| `weekly-ingest-research.md` | 새 source/tool 조사와 parser stack 후보 추적 | 주 1회 |
| `weekly-autoresearch-loop.md` | 작은 실험을 반복하며 keep/discard 판정 | 주 2-3회 |
| `weekly-harness-review.md` | harness_pattern discover 아이템 → jasonob 하네스 후보 검토 | 주 1회 |
| `weekly-seo-audit.md` | 공개 사이트 SEO + AdSense 재심사 준비 점검 (메타/sitemap/JSON-LD/hreflang/OG/소유권/thin content/trust surface) | 주 1회 |
| `weekly-image-health.md` | cover_image_url HEAD 검증 → 깨진 URL 자동 복구/리포트 | 주 1회, source-health 이후 |
| `daily-media-publish.md` | Shorts+Longform 미디어 생성 → Threads + YouTube API 자동 업로드 (unlisted) | 매일 1회, auto-publish 이후 |
| `daily-youtube-repair.md` | YouTube 누락 업로드 백필 + unlisted/private → public 전환 | 매일 1회, media-publish 이후 |

## Execution Order (Daily)

```
daily-pipeline → daily-dedup-guard → daily-editorial-review → daily-drift-guard → daily-auto-publish
  ├→ daily-media-publish (Long-form + Shorts 영상 렌더)
  ├→ daily-youtube-repair (누락 업로드 백필 + 공개 전환)
  └→ newsletter:send (EN + ES Resend Broadcasts)
```

## Why These Automations

- `daily-pipeline`은 운영 본체다.
- `daily-editorial-review`는 RSS 요약 1줄짜리 draft를 레퍼런스 수준의 브리프로 가공하고, 저가치/glossary/보일러플레이트/내부용어/저품질 이미지 신호를 먼저 걸러낸 뒤 guardrail 기준을 통과한 brief만 자동 승인한다.
- `daily-drift-guard`는 실패를 늦게 발견하지 않도록 한다.
- `daily-auto-publish`는 approved 브리프를 quality gate 뒤에만 예약/발행하고, pending discover 항목도 경량 검증 뒤 thin-content 신호가 없을 때만 자동 발행한다.
- `youtube-link-intake`는 수동 YouTube 업로드 뒤 `/vh-youtube` 또는 `publish:link-youtube`로 브리프-영상 연결을 완료한다.
- `daily-dedup-guard`는 같은 기사로 brief가 중복 생성되는 것을 방지한다.
- `weekly-source-health`는 소스 건강성 점검, 성과 기반 maxItems 조정 제안, 새 소스 후보 발견을 수행한다.
- `weekly-ingest-research`는 source catalog와 parser/tool 선택을 계속 최신화한다.
- `weekly-autoresearch-loop`는 Karpathy의 `autoresearch` 패턴처럼 고정 시간 실험 -> 메트릭 비교 -> keep/discard를 VibeHub 운영에 맞게 적용한다.
- `weekly-harness-review`는 harness_pattern으로 분류된 discover 아이템을 검토하고, jasonob 하네스 레지스트리에 candidate 등록 여부를 판단한다.
- `weekly-seo-audit`는 메타데이터/sitemap/JSON-LD/hreflang/OG 이미지뿐 아니라 Search Console 소유권 신호, ads.txt, thin-content index hygiene, 신뢰 페이지 존재 여부까지 점검해 SEO/AdSense 회귀를 방지한다.
- `daily-media-publish`는 published brief에서 Long-form(16:9) + Shorts(9:16) 두 트랙으로 영상을 생성하고 YouTube에 업로드한다.
- `daily-youtube-repair`는 media-publish 이후 남는 YouTube 누락/비공개 상태를 자동 복구해 조회수 누락을 줄인다.

## Handoff Rule

- 새 인수인계 문서는 `HANDOFF-TEMPLATE.md`를 복사해서 작성한다.
- 운영판 `HANDOFF.md`에는 현재 구현과 수동 경계, 실패 semantics를 반드시 적는다.
- handoff 내용이 코드와 충돌하면 문서보다 구현을 우선 확인하고 즉시 갱신한다.

## 로컬 LLM 모델 배정 (2026-04-14 기준)

파이프라인 스테이지별 Ollama 로컬 모델. 모두 `trial:all baseline-pass` 검증 완료.

| 스테이지 | 모델 | 역할 |
|---------|------|------|
| classifier | `vibehub-classifier-g4` | 아이템 카테고리 + targetSurface 분류 (JSON, temp 0.05) |
| critic | `gemma4:26b-a4b-it-q4_K_M` | 품질 평가 + block/pass 결정 (26B MoE, 4B active) |
| brief_draft | `gemma4:26b-a4b-it-q4_K_M` | Brief 초안 생성 (critic과 동일 모델) |
| discover_draft | `vibehub-discover-draft-g4` | Discover 초안 평가 (Gemma4 4B + JSON schema 강제, temp 0.1) |
| chat | `vibehub-chat-g4` | Telegram 운영 대화 |
| router | `vibehub-router-g4` | local/claude/codex 라우팅 |
| memory | `vibehub-memory-g4` | 메모리 저장 결정 |
| search | `vibehub-search-g4` | 웹 검색 필요 여부 결정 |

**미적용 (다음 실험 대상):**
- `translate:variant --locale=es` → **❌ 로컬 실험 실패 (2026-04-14). Gemini Flash 유지.**
  gemma4:26b 3건 테스트: JSON 빈 응답(5분+) + 모델 eviction(메모리 압박). ~~qwen2.5vl:7b~~ (vision 전용), qwen2.5:7b 미설치. 현 하드웨어로는 로컬 번역 불가.
- OG 이미지 VLM fallback → `qwen2.5vl:7b` / `granite3.2-vision:2b` 구조 설계 필요

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
