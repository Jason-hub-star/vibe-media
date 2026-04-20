# Decision Log

이 문서는 현재 진행 중(pending)인 결정만 관리한다.
완료된 결정은 `docs/archive/decisions-resolved.md`에 보관.

## Pending

### 2026-04-20 — [daily-media-publish] MimikaStudio 오프라인 → 영상 생성 중단
- 상태: pending (수동 조치 필요)
- 발생: 2026-04-20 13:00 (자동화 태스크 실행 중)
- 증상:
  - `http://localhost:7693/api/health` → HTTP 000 (연결 불가)
  - `/Users/family/MimikaStudio/bin/mimikactl` 경로 존재하지 않음 (바이너리 없음)
  - 기동 시도 불가 → 영상 생성 전면 중단
- 추가 확인:
  - 오늘(2026-04-20) published 브리프도 0건 (Supabase 조회 결과) → 영상 생성 대상 없음
  - Telegram으로 오류 보고 전송 완료
- 조치 필요:
  - MimikaStudio 수동 기동 또는 재설치
  - 준비 완료 후 `npm run video:render -w @vibehub/backend -- <slug>` 수동 실행

### 2026-04-20 — [Autoresearch KEEP] markdownToPlainBody "Summary:" 보일러플레이트 필터
- 상태: pending (코드 적용 필요)
- 배경:
  - weekly-autoresearch-loop 실험 (2026-04-20). Self-critique 3회 연속(2026-04-01 #1, 2026-04-06 #5~8, 2026-04-13 #9~11)에서 body "Summary:" boilerplate가 반복 발견됨. 제안 #1 미적용 상태.
  - `markdownToPlainBody.ts` 분석 결과: `normalizeParagraph()`가 `## Summary` 헤딩을 그대로 보존하는 로직 존재 (`if (lines[0].startsWith("## "))` 조건). "Summary:" 텍스트 접두어 필터 없음.
  - Defuddle은 RSS 기사 원문에서 "## Summary", "### Summary", "Summary: ..." 형태의 섹션을 충실히 추출하며, 이것이 brief body에 그대로 노출됨.
  - 기존 KEEP 항목(2026-04-08 summary truncation gate)과는 구분되는 별도 이슈 (truncation ≠ boilerplate 섹션 제목).
- keep 근거:
  - 기준선 대비 명확한 개선 (self-critique 3회 연속 동일 패턴 → 0건 목표)
  - 예외 유입 악화 없음 (additive filter, MIN_BODY_PARAGRAPHS=3 가드 유지)
  - 운영 복잡도 증가 없음 (markdownToPlainBody 내 2-3줄 추가)
- 적용 방법: `apps/backend/src/shared/markdown-to-plain-body.ts`의 `markdownToPlainBody()` 내 paragraphs 필터 단계에 아래 조건 추가:
  ```ts
  // "## Summary" / "# Summary" 단독 헤딩 및 "Summary: ..." 접두 단락 제거 (Defuddle 보일러플레이트)
  .filter((p) => !/^#{1,3}\s+Summary\s*$/i.test(p))
  .filter((p) => !/^Summary:\s+/i.test(p))
  ```
  또는 `.filter()` 연산을 별도 `stripBoilerplateParagraphs()` 함수로 추출해 단위 테스트 추가.
- 후속 지표 (다음 2주 관찰):
  - self-critique 실행 시 "Summary:" boilerplate 검출 건수 → 목표 0건
  - MIN_BODY_PARAGRAPHS 미달로 body=[] 공란 brief 증가 여부 확인 (있으면 필터 범위 재검토)

### 2026-04-15 — 26B 로컬 모델 retire, critic/brief_draft → vibehub-chat-g4
- 상태: resolved (candidate for archive 이동 after 1주 관찰)
- 배경:
  - `gemma4:26b-a4b-it-q4_K_M` (17GB, 26B MoE / 4B active)을 critic/brief_draft stage 로컬 후보로 2026-04-14 배정했으나, translate:variant 실험에서 Brief 1 JSON 파싱 실패 + Brief 2 15분+ 무응답 + Ollama 메모리 압박으로 eviction 전례.
  - 현재 하드웨어에서 26B weight(17GB) 로드가 다른 4B 태그 6개와 동시 warm 시 메모리 부족 유발.
  - 확인 사항 (2026-04-15):
    - `ollama show vibehub-chat-g4` → architecture=gemma4, parameters=7.5B, Q4_K_M, 5GB
    - `ollama list` → vibehub-*-g4 6개 태그 모두 5GB (동일 7.5B 베이스), 26B만 17GB
    - SQLite `models.notes`의 "Gemma 4 26B MoE" 기재는 오기였음 → 정정
- 결정:
  - `gemma4:26b-a4b-it-q4_K_M` (id=9) → `retired` (Ollama 태그는 보존, orchestrator auto-activation만 차단)
  - `vibehub-chat-g4` (id=4) `role_capabilities`에 `critic,brief_draft` 추가
  - runtime_state `active_stage_brief_draft_model_id` / `active_stage_critic_model_id` = 4
  - `stable_activation_snapshot_json` 동기 갱신
- 근거 지표: 번역 실험 실패 1건(2026-04-14) + 메모리 eviction 1건. auto-rollback 지표 누적 전에 운영자 판단으로 수동 retire.
- 관찰 기간: 2026-04-22까지 critic/brief_draft shadow 결과 확인 후 archive 이동 판단.
- 롤백 절차: `orchestrator.sqlite.bak-20260415`로 복원 + `models.status` id=9를 `active`로 되돌림.

### 2026-04-14 — LiteLLM 공급망 침해 이슈 인지 (Hold 결정)
- 상태: noted — 도입 보류
- 배경: 2026-03 TeamPCP가 Trivy CI/CD 취약점을 통해 LiteLLM v1.82.7~v1.82.8에 백도어 삽입. 이후 stable 패치 완료. Crawl4AI도 litellm 교체. 단독 도입 시 공급망 리스크 평가 필요.
- 결정: 안정 태그 추적 유지, 독립 도입 보류. provider abstraction 필요성 생길 때 재평가.

### 2026-04-14 — Promptfoo OpenAI 인수 인지 (Hold 결정)
- 상태: noted — 관찰 유지
- 배경: 2026-03 OpenAI가 Promptfoo 인수. 오픈소스/MIT 유지 선언. 로드맵 불확실. 현재 live eval 체인 없음.
- 결정: 보류. stage-level regression suite 필요성 생길 때 재검토.

### 2026-04-14 — Langfuse v4 실험 후보 승격
- 상태: pending (운영자 승인 대기)
- 배경: v4.2.0 (2026-04-10) SDK 전면 재작성. observations-first 아키텍처. brief/critic trace 추적에 적합. 자가호스팅 가능.
- 제안 실험: critic stage 1개에 Langfuse trace 붙여 품질 drift 여부 확인.
- 후속 조치: 운영자 승인 시 → sidecar 방식으로 소규모 검증 시작.

### 2026-04-14 — daily-media-publish: Step 1 쿼리 갭 — file:// YouTube 레코드를 "완료"로 오인
- 상태: noted — 수동 우회 성공, 쿼리 수정 검토 필요
- 배경:
  - `publish:channels` 첫 실행 시 YouTube API 미설정(또는 영상 없음)으로 `createYouTubeLocalPublisher`가 동작, `published_url = file://...` 레코드를 `success=true`로 기록.
  - Step 1 조회 쿼리(`AND NOT EXISTS ... success = true`)가 이 레코드를 "YouTube 업로드 완료"로 판단해 브리프를 제외.
  - 실제로는 영상 파일도 없고 `youtube_video_id`도 null인 상태였음.
- 우회: `channel_publish_results.published_url LIKE 'https://%'` 조건으로 실질 URL 존재 여부를 추가 확인한 뒤 `--force-youtube`로 재업로드 성공.
- 결정: Step 1 쿼리를 `AND published_url LIKE 'https://%'` 조건 추가로 강화 검토. 또는 `createYouTubeLocalPublisher` success 플래그를 false로 수정 검토.

### 2026-04-14 — daily-media-publish: Longform Remotion 렌더 크래시
- 상태: error — shorts로 대체 업로드 완료
- 배경:
  - Longform(143.8s, 9청크 TTS) Remotion 렌더 중 chrome-headless compositor crash: `Could not extract frame from compositor Error: Request closed / Protocol error`.
  - Shorts(46.3s)는 정상 완료. Longform mp4 생성 실패.
- 우회: shorts.mp4(48MB)를 YouTube에 unlisted 업로드 성공 (`https://www.youtube.com/watch?v=C9zopq-ix0M`).
- 결정: Longform 렌더 크래시는 메모리/리소스 부족 가능성. Chrome compositor concurrency 제한 또는 Remotion RAM 설정 조정 검토.

### 2026-04-13 — daily-media-publish: MimikaStudio 기동 실패
- 상태: error — 태스크 중단
- 배경:
  - 오후 1시 자동 실행 시 MimikaStudio `/api/health` 응답 없음 (HTTP 000).
  - `/Users/family/MimikaStudio/bin/mimikactl` 파일이 존재하지 않아 백엔드 기동 시도 실패 (Exit 127).
  - Shorts/Longform 렌더 및 YouTube 업로드 모두 진행 불가.
- 결정: 태스크 종료. 수동으로 MimikaStudio 설치/경로 확인 후 재실행 필요.
- 후속 조치 필요:
  - `/Users/family/MimikaStudio/bin/` 경로 확인 및 mimikactl 재설치
  - 또는 실제 실행 경로를 `daily-media-publish.md` 태스크 파일에 반영

### 2026-04-13 — Daily pipeline execSync timeout 120s → 300s (autoresearch keep)
- 상태: applied
- 배경:
  - 5일치 pipeline 로그(04-05~04-09) 분석 결과, 04-05·04-08 두 번의 0-item / 1 blocking error 실행이 모두 정확히 120.0~120.1초에 종료됨. execSync timeout=120_000ms 컷오프와 일치.
  - 정상 실행 소요 시간: 91.3s (04-06) → 101.4s (04-07) → 112.0s (04-09) — 상승 추세.
  - 현재 25+ 활성 소스 + 순차 article 보강(Defuddle, max 10s/건)이 맞물려 슬로우 네트워크 날에는 120s를 초과함.
- 결정: `run-daily-pipeline.ts` execSync timeout을 120_000 → 300_000ms로 변경.
- 적용 범위: `apps/backend/src/workers/run-daily-pipeline.ts` 한 줄
- 후속 지표 (다음 2주 관찰):
  - 0-item / blocking error 실행 빈도가 감소했는지 확인
  - 정상 실행 소요 시간이 300s를 초과하는 케이스가 없는지 확인 (있으면 소스별 병렬화 검토 필요)
  - 04-09 신규 Defuddle "Failed to parse URL" 에러가 다시 나타나는지 추적 (상대 URL 소스 특정)

### 2026-04-10 — Claude Code 3티어 모델 전략 도입 (Opus/Sonnet/Haiku 역할 분화)
- 상태: pending (1주일 관찰 후 확정/롤백)
- 배경:
  - 기본 모델이 Opus 4.6 (1M context) 단일로 돌아 일반 grep/Read/문서 탐색까지 Opus가 소모되며 비용·컨텍스트 낭비가 컸다.
  - `everything-claude-code` 레포 등에서 권고되는 "단일 Sonnet 전환"보다 한 단계 정교한 3티어 분화가 주인님 워크플로에 더 적합하다고 판단.
- 결정: 역할별 모델 티어를 다음과 같이 분리한다.
  - **Opus**: 플랜/아키텍처/트레이드오프 결정, `codex:codex-rescue` 2차 진단
  - **Sonnet**: 일반 구현/리팩터/테스트 (메인 세션 기본값)
  - **Haiku**: 서치/문서 읽기/grep (Explore 서브에이전트)
- 적용:
  1. `~/.claude/settings.json` (글로벌)
     - `"model": "sonnet"` (메인 세션 기본값)
     - `env.MAX_THINKING_TOKENS: "10000"` (thinking 토큰 31999 → 10000)
     - 백업: `~/.claude/settings.json.bak`
  2. `.claude/skills/big-task/SKILL.md`
     - 상단에 "Model Tier 전략" 섹션 신설
     - Phase 0 탐색: Explore를 `model: "haiku"`로 명시 호출
     - Phase 0 플랜: `Plan` 서브에이전트를 `model: "opus"`로 호출 + 길이 제약 `≤40 lines, bullet only, no risk inventory`
     - Phase 1~N: 3회 재시도 실패 시 `codex:codex-rescue`를 `model: "opus"`로 호출
  3. `.claude/plans/model-tier-rollout.md` 신규 — 롤아웃 체크리스트, 화이트리스트, 롤백 절차 정본
- 검증:
  - Agent 툴 `model` 파라미터 오버라이드 동작 확인 완료 (Explore/haiku + Plan/opus 실제 호출 테스트)
  - 길이 제약 ≤40 lines 실제로 지켜짐 (Plan/opus 테스트 산출물로 확인)
  - 메인 세션 sonnet 기본값은 다음 신규 세션에서 `/model` 명령으로 수동 확인 필요
- 후속 지표 (1주일 관찰):
  - 일일 토큰 비용 변화
  - 플랜 품질 주관 평가 (부풀림 발생 여부)
  - 구현 단계에서 sonnet이 막혀 opus로 수동 전환한 빈도
  - 복잡한 디버깅에서 `MAX_THINKING_TOKENS=10000` 축소로 인한 추론 품질 저하 체감 여부
- 차기 롤아웃 후보 (본 결정 범위 밖, 별도 진행):
  - vercel-plugin을 VibeHub 루트에서 비활성 + `apps/web`에서만 활성 (Opus Plan 산출물로 실행 플랜 확보됨)
  - CLAUDE.md Tier 3 섹션 다이어트
  - MCP 서버 프로젝트별 위생
  - `everything-claude-code`에서 Strategy Compact / Instinct / Agent Shield 3종 선별 이식
- 롤백 절차:
  - `cp ~/.claude/settings.json.bak ~/.claude/settings.json`
  - `git checkout .claude/skills/big-task/SKILL.md`
  - `.claude/plans/model-tier-rollout.md`는 회고 자료로 보존
- Next Actions (실행 순서·트리거·판정 규칙): `.claude/plans/model-tier-rollout.md` § Next Actions
  - 다음 신규 세션 첫 5분 액션 2개, 이번 주 롤아웃 1개, 1주일 후 평가 1개, 후속 후보 4개로 정렬됨
  - 평가일: 2026-04-17 (pending 판정)

### 2026-04-09 — 배경 영상 반복 방지 가드 추가 (Pexels history + cooldown)
- 상태: pending (운영 모니터링 필요)
- 배경:
  - Shorts/Longform에서 Pexels 배경이 일정 주기마다 반복되어 시청 체감 다양성이 떨어짐.
  - 기존 로직은 "한 번의 렌더 실행 내부" 중복만 제한하고, 영상 간 재사용은 막지 못함.
- 적용:
  1. `searchPexelsVideosBatch` 확장
     - `excludeIds`, `seed`, `perKeywordCandidates` 옵션 추가
     - 키워드/후보 셔플로 고정 순서 선택 완화
  2. 배경 이력 저장 추가
     - `state/pexels-video-history.json`에 사용한 Pexels video ID 누적 기록
  3. 재사용 쿨다운 추가
     - 최근 사용 ID 제외 + 최근 N일(`cooldown`) 내 사용 ID 재선택 금지
  4. 후보 부족 fallback
     - 1차 키워드로 scene 수를 못 채우면 fallback 키워드로 추가 보충
- 기본값 (강화):
  - `PEXELS_BG_REUSE_COOLDOWN_DAYS=21`
  - `PEXELS_BG_EXCLUDE_LIMIT=180`
  - `PEXELS_BG_PER_KEYWORD_CANDIDATES=10`
- 후속 지표:
  - 최근 7일 영상 기준 배경 ID 중복률, scene별 고유 ID 비율, "같은 배경 반복" 피드백 건수

### 2026-04-09 — YouTube 조회수 회복 운영안 (복구 워커 + 공개 전환 + 썸네일 보강)
- 상태: pending (운영자 적용/모니터링 필요)
- 배경:
  - 최근 운영 로그에서 `published` 대비 실제 YouTube 공개 URL(`https://`) 연결률이 낮았고, `unlisted/private` 잔존 영상이 확인됨.
  - 썸네일 누락과 동일 brief 중복 업로드/중복 기록도 함께 발생해 조회수 누락(노출/CTR) 리스크가 누적됨.
- 적용:
  1. `run-publish-channels.ts`
     - `thumbnail.png` 누락 시 비디오 프레임 기반 자동 생성
     - 동일 brief에 대해 기존 YouTube `https://` 성공 이력이 있으면 기본 중복 업로드 skip (`--force-youtube`로만 재업로드)
     - Shorts 결과 채널 표기 정정 (`youtube-shorts`)
  2. `run-youtube-repair.ts` 신규
     - published brief 중 YouTube 성공 URL 누락 건 백필
     - 업로드된 `unlisted/private` 영상을 `public`으로 승격
  3. 자동화 반영
     - `daily-auto-publish` 이후 `daily-youtube-repair` 단계 추가
- 운영 전략 (쉽게 보기):
  1. 매일 `youtube:repair` 실행으로 누락/비공개를 먼저 복구
  2. 업로드 후 10분 안에 `public` 상태와 brief 연결 URL을 확인
  3. 주 1회 썸네일/제목 개선 실험으로 CTR 보정
- 모니터링 지표:
  - `youtube_url 연결률`, `public 전환 누락 건수`, `thumbnail 누락 건수`, `중복 업로드 건수`
  - 다음 7일 목표: `public 전환 누락 0건`, `youtube_url 연결률 90%+`

### 2026-04-08 — [Autoresearch KEEP] brief-quality-check summary truncation gate 추가
- 상태: pending (코드 적용 필요)
- 배경: `weekly-autoresearch-loop` 실험 (2026-04-08). 두 차례 연속 self-critique (2026-04-01, 2026-04-06)에서 10건 중 4건(40%) 브리프가 summary truncation(`...`/`…` 종결) 상태로 published됨. 동일 패턴이 자동 차단되지 않고 반복 발생.
- 분석:
  - `brief-quality-check.ts`의 `runBriefQualityCheck()`는 summary 길이(50-200)만 검사하며 truncation 패턴을 감지하지 않음.
  - `discover-quality-check.ts`의 `runDiscoverQualityCheck()`는 `isTruncated()` 함수(lines 20-23)로 `...`/`…` 종결 + 120자 미만이면 실패 처리. 동일 코드베이스 내 이미 검증된 패턴.
  - 두 게이트의 비대칭성이 40% truncation slip-through의 직접 원인.
- keep 근거:
  - 기준선보다 명확히 개선 (4/10 → 0 truncated auto-publish)
  - 예외 유입 악화 없음 (additive gate, Discover와 동일 기준)
  - 운영 복잡도 증가 없음 (기존 `isTruncated()` 로직 재사용)
- 적용 방법: `apps/backend/src/shared/brief-quality-check.ts`의 `runBriefQualityCheck()` 내 summary 길이 검사 직후에 아래 조건 추가:
  ```ts
  // summary truncation 방지 (Discover 게이트와 동일 기준)
  const summaryTrimmed = (brief.summary ?? "").trimEnd();
  if ((summaryTrimmed.endsWith("...") || summaryTrimmed.endsWith("…")) && summaryLen < 160) {
    failures.push("summary is truncated (ends with '...' and < 160 chars)");
  }
  ```
- 후속 지표: 다음 self-critique 10건 중 truncated summary 발행 건수 → 목표 0건

### 2026-04-07 — daily-media-publish: MimikaStudio 오프라인 → 미디어 미생성 (반복)
- 상태: action-required (운영자 조치 필요)
- 발생 시각: 2026-04-07 오후 1시 자동화 실행 (daily-media-publish 태스크)
- 브리프 2건 발행됨:
  1. `a-concrete-definition-of-an-ai-agent-live-235`
  2. `ai-can-help-with-survey-writing-but-it-still-requires-human--live-235`
- 실패 원인: MimikaStudio 오프라인 (`localhost:7693` 응답 없음) → Shorts/Longform 모두 실패
- NLM 오디오도 미존재 (`output/<slug>/audio.m4a` 없음)
- 선행 이력: 동일 문제 2026-04-06에도 발생 (3번째 반복)
- Telegram 보고 완료
- 결정 필요:
  1. **단기**: MimikaStudio 구동 후 수동 실행
     `npm run video:render -w @vibehub/backend -- a-concrete-definition-of-an-ai-agent-live-235`
  2. **중기**: 태스크 파일을 현재 파이프라인(`run-shorts-render.ts --longform-only`)으로 업데이트 — 4주째 미적용
  3. **장기**: MimikaStudio 자동 시작 훅 또는 태스크 실행 전 헬스체크

### 2026-04-07 — [Ingest Research] Langfuse v4 실험 후보 등록
- 상태: pending (운영자 결정 필요)
- 배경: weekly-ingest-research 자동화 조사 결과 Langfuse Python SDK v4 (2026-03 릴리스) 확인.
  - observation-centric 데이터 모델 (trace ↔ observation 조인 불필요), OpenTelemetry native, self-hostable.
  - brief/discover/critic 체인 trace를 남기기 위한 가장 작은 실험: 브리프 생성 1회 run을 Langfuse로 감싸 latency/cost 가시성 확인.
- 근거: Python SDK 완전 재작성(v4) + OTel native는 통합 복잡도를 낮춤. VibeHub Node 스택과 붙이려면 JS SDK (`langfuse` npm 패키지) 경유 필요.
- 결정 필요: 실험 진행 여부 — JS SDK로 1개 스테이지(critic) trace 추가 후 self-hosted Langfuse 대시보드 확인.
- 참고: Promptfoo가 OpenAI에 인수됨 (2026-03). MIT 유지, 기능 변화 없으나 vendor 위험 모니터링 필요.

### 2026-04-06 — vibehub-media-publish: podcast-rss 미등록 + cross-promo Threads 실패 (반복)
- 상태: known-issue (운영자 인지 필요)
- 발생 시각: 2026-04-06 오후 2시 자동화 실행 (vibehub-media-publish 태스크)
- 브리프: `anthropic-is-having-a-month-live-b73` ("Anthropic is having a month")
- 채널 결과:
  - ✅ Threads: 발행 성공 — https://www.threads.com/@vibehub/post/18332623285216720
  - ✅ YouTube: 로컬 메타데이터 저장 성공 (영상 파일 없음, 수동 업로드 필요)
  - ❌ podcast-rss: "No publisher registered for channel: podcast-rss" — voice 파일도 없음 (`longform-voice.wav`, `shorts-voice.wav` 모두 없음)
  - ❌ Cross-promo Threads: media ID 18073321655322558 리소스 없음 (OAuthException code 24)
- 뉴스레터:
  - ✅ EN 발송 성공 — broadcast id: 5cd637c8-0097-47ce-a8a4-ef7382eaceab
  - ❌ ES 발송 실패 — "오디언스에 연락처 없음" (반복 오류, 2026-04-03부터 지속)
- 참고: YouTube 영상 파일 없음은 1단계(daily-media-publish)의 MimikaStudio/NLM 미생성과 연관 (위 2026-04-06 항목 참조)
- 결정 필요:
  1. podcast-rss publisher 등록 여부 재검토 — 현재 `run-publish-channels.ts`에 구현 없음
  2. ES 뉴스레터 오디언스에 연락처 추가 (Resend 대시보드)
  3. Cross-promo 미디어 ID 만료 패턴 조사

### 2026-04-06 — daily-media-publish: NLM 동결 + MimikaStudio 오프라인 → 미디어 미생성
- 상태: action-required (운영자 조치 필요)
- 발생 시각: 2026-04-06 오후 1시 자동화 실행
- 브리프: `anthropic-is-having-a-month-live-b73` ("Anthropic is having a month", published_at: 2026-04-06 03:03)
- 실패 원인 (2중):
  1. NLM 파이프라인 동결 (2026-03-31): `run-video-locale-fanout.ts`가 `audio.m4a` 필요 → 파일 없음
  2. MimikaStudio 오프라인: fallback인 `run-shorts-render.ts --longform-only` 실행 불가 (`localhost:7693` 응답 없음)
- 선행 이력: 동일 문제 2026-04-02, 2026-04-03에도 발생. 2026-04-03은 MimikaStudio 온라인 상태여서 fallback 성공 (videoId: wy_4jIdOC44)
- 결정 필요:
  1. **단기**: MimikaStudio 구동 후 `npx tsx apps/backend/src/workers/run-shorts-render.ts anthropic-is-having-a-month-live-b73 --longform-only` 수동 실행
  2. **중기**: `daily-media-publish` 태스크 파일을 현재 파이프라인(`run-shorts-render.ts --longform-only`)으로 업데이트 — 3주째 미적용
  3. **장기**: MimikaStudio 자동 시작 훅 또는 태스크 실행 전 헬스체크 → 오프라인 시 알림

### 2026-04-03 — [Autoresearch KEEP] Defuddle schema.org 로그 억제 패턴 확장
- 상태: pending (코드 적용 필요)
- 배경: `pipeline-20260403-064709.log`에서 `Defuddle: Error parsing schema.org data: SyntaxError: Bad control character in string literal in JSON` 오류가 최초 등장 (이전 16개 로그에는 없음).
- 분석:
  - `live-source-fetch.ts`의 `shouldSuppressDefuddleLog` 함수는 `"without img"`, `"Defuddle Error processing document"` 두 패턴만 억제함.
  - `"Error parsing schema.org data"` 패턴은 억제 목록 누락 → 로그에 그대로 출력됨.
  - 오류는 비차단(non-blocking): Defuddle 내부에서 catch 후 파싱 계속, 269 items 정상 처리, blocking errors 0.
  - 억제 추가는 파싱 결과에 영향 없으며 로그 신호 품질만 개선.
- 결정: **keep** — `shouldSuppressDefuddleLog` 조건에 `text.includes("Error parsing schema.org data")` 추가
- 적용 범위: `apps/backend/src/shared/live-source-fetch.ts` L98 조건 한 줄
- 후속 지표: 다음 파이프라인 실행 후 해당 오류 라인 재등장 여부 확인
- 부차 발견: 2026-04-03 파이프라인 런타임 12964.2s (전일 81.9s 대비 158배 증가) — 별도 조사 필요, newsletter-sender `es` 채널 연락처 없음 경고 지속

### 2026-04-02 — daily-media-publish 태스크: NLM 오디오 미생성 (샌드박스 환경 한계)
- 상태: pending (운영자 조치 필요)
- 발생 시각: 2026-04-02 오후 1시 자동화 실행
- 브리프: `30-years-ago-robots-learned-to-walk-without-falling-live-38d` ("30 Years Ago, Robots Learned to Walk Without Falling")
- 배경: daily-media-publish 태스크가 샌드박스(sandbox) 환경에서 실행됨. `nlm` CLI는 macOS 전용 Python 툴로 샌드박스에서 사용 불가.
  `run-video-locale-fanout.ts` 실행 시 `output/<slug>/audio.m4a` 없음 → "Audio file not found" 오류 종료.
- 현재 상태:
  - ✅ 브리프 published 확인 (published_at: 2026-04-02 03:04)
  - ✅ `output/<slug>/youtube-metadata.json` + `youtube-upload-guide.txt` 존재 (이전 publish:channels 실행 결과)
  - ✅ YouTube OAuth 자격증명 설정 완료
  - ❌ `audio.m4a` 없음 → locale fanout/YouTube 업로드 불가
- 결정 필요:
  1. 운영자가 Mac에서 직접 NLM 팟캐스트 생성: `nlm`으로 audio.m4a 저장 → `run-video-locale-fanout.ts` 실행
  2. 또는 `notebooklm-download` 스킬로 기존 NotebookLM 노트북에서 다운로드 (노트북이 있는 경우)
  3. 장기: daily-media-publish 태스크를 Mac에서 직접 실행하도록 설정 변경 검토

### 2026-04-01 — Whisper Metal GPU 오염 버그 (video:render 파이프라인)
- 상태: pending (픽스 필요)
- 배경: `npm run video:render` 실행 시 MimikaStudio TTS 완료 직후 whisper-cli가 exit code 3으로 실패.
  Metal GPU 상태 오염으로 추정 — tsx 프로세스 내에서 spawn된 whisper-cli의 `ggml_metal_library_compile_pipeline`(bfloat 테스트)이 완료 메시지 없이 종료됨.
  같은 whisper 명령을 독립 shell 또는 tsx 종료 후 실행하면 정상 동작.
- 임시 조치: `complete-longform-render.ts`로 tsx 종료 후 whisper 실행 → 나머지 단계 수동 완성.
  YouTube 설명 5000자 초과 버그도 발견 → `upload-youtube-direct.ts`로 우회.
- 결정 필요:
  1. `whisper-word-level.ts`의 `spawnAsync`에 `env: { ...process.env, GGML_METAL_DISABLE: '1' }` 추가 — 단 CPU 폴백 성능 확인 필요
  2. 또는 video:render 워커를 TTS 단계와 Whisper 단계를 별도 프로세스로 분리
  3. `buildDescription`에 5000자 truncation 추가 필요 (현재 full body 삽입 시 초과)

### 2026-03-27 — Newsletter 페이지 Brief 미리보기 추가
- 상태: pending
- 배경: 뉴스레터 페이지에 폼만 있어 "구독하면 뭘 받는지" 알 수 없음
- 결정: 최신 published Brief 3개를 미리보기 카드로 표시, 서버 컴포넌트에서 fetch
- 영향: 기존 `listBriefs` API 재활용, 추가 엔드포인트 불필요

### 2026-04-03 — daily-media-publish 태스크 파일 파이프라인 불일치
- 상태: action-required
- 배경: `daily-media-publish` 스케줄 태스크 파일이 `run-video-locale-fanout.ts` (NLM 기반, `audio.m4a` 필요)를 호출하도록 되어 있으나, NLM 파이프라인은 2026-03-31에 삭제됨. `audio.m4a` 파일 없음으로 해당 커맨드 실패.
- 현재 메인 트랙: `run-shorts-render.ts --longform-only` (MimikaStudio TTS + Remotion)
- 조치: 자동 실행 시 `run-shorts-render.ts --longform-only`로 fallback, YouTube 업로드는 `run-publish-channels.ts`로 수행 → 성공 (videoId: wy_4jIdOC44)
- 결정: `daily-media-publish` 태스크 파일의 커맨드를 현재 파이프라인(`run-shorts-render.ts + run-publish-channels.ts`)으로 업데이트 필요
- 영향: 태스크 파일 업데이트 전까지 매일 fallback 로직 필요

### 2026-04-07 — vibehub-media-publish 자동 실행 결과
- 상태: partial-success
- 발행 브리프 (2건):
  1. `ai-can-help-with-survey-writing-but-it-still-requires-human--live-235`
  2. `a-concrete-definition-of-an-ai-agent-live-235`
- 채널별 결과:
  - ✅ Threads (EN): 2건 발행 성공
    - https://www.threads.com/@vibehub/post/18127128055572700
    - https://www.threads.com/@vibehub/post/17952131658006540
  - ✅ YouTube: 2건 로컬 메타데이터 기록 성공 (video 파일 없어 실제 업로드는 미완)
  - ❌ Podcast RSS: 2건 모두 실패 — "No publisher registered for channel: podcast-rss" / voice 파일 없음
  - ✅ Newsletter EN: 1 broadcast 발송 성공 (id=a87dd131-4a24-437f-8907-be40ef6d5f39)
  - ❌ Newsletter ES: 실패 — "The audience you are sending has no contacts" (기존 지속 이슈)
  - ⏭ ES 로케일 variants: 2건 모두 skipped (approved variant 없음)
- 기존 이슈 지속:
  - podcast-rss publisher 미등록 — voice 파일 생성 파이프라인(1단계) 미완료 시 항상 실패
  - newsletter es 오디언스 연락처 없음 경고 지속

### 2026-04-09 — vibehub-media-publish 자동 실행 결과
- 상태: success (minor warning)
- 발행 브리프 (1건):
  1. `ai-is-changing-how-small-online-sellers-decide-what-to-make-live-a36`
     - 제목: "AI is changing how small online sellers decide what to make"
     - published_at: 2026-04-09T03:08:05Z
- 채널별 결과:
  - ✅ Threads: 발행 성공 → https://www.threads.com/@vibehub/post/18317663641283084 (크로스 프로모 포함)
  - ✅ YouTube (longform): 업로드 성공 → https://www.youtube.com/watch?v=aP0uBcKy5gc (unlisted, 158.9 MB)
  - ✅ YouTube (Shorts ES): 업로드 성공 → https://www.youtube.com/watch?v=jM7ke0tBVg8 (unlisted, 33.8 MB)
  - ✅ Podcast RSS (EN): 에피소드 업로드 및 feed 갱신 완료 (총 6 에피소드), WebSub 핑 전송됨
  - ✅ Newsletter EN: broadcast 발송 성공 (id=2222be44-7b64-4c50-be22-664654de9b8a)
  - ❌ Newsletter ES: "The audience has no contacts" — 지속 이슈, 크리티컬 아님
  - ⚠️ YouTube 썸네일: 업로드 실패 (파일 없음) — longform & shorts 모두
  - ⏭ ES 로케일 longform 변환: skipped (approved variant 없음)
- 비고:
  - podcast-rss publisher 이번엔 정상 동작 (longform-voice.wav 파일 존재)
  - YouTube 썸네일 파일 생성 파이프라인 미완료 상태 지속
  - Newsletter ES 오디언스 연락처 없음 경고 지속 (기존 이슈)

### 2026-04-13 — vibehub-media-publish 자동 실행 결과
- 상태: success (recurring warnings)
- 발행 브리프 (4건):
  1. `entropy-preserving-reinforcement-learning-live-62c` — "Entropy-Preserving Reinforcement Learning"
  2. `create-edit-and-share-videos-at-no-cost-in-google-vids-live-ffe` — "Create, edit and share videos at no cost in Google Vids"
  3. `codex-now-offers-more-flexible-pricing-for-teams-live-9bd` — "Codex now offers more flexible pricing for teams"
  4. `announcing-the-openai-safety-fellowship-live-9bd` — "Announcing the OpenAI Safety Fellowship"
- 채널별 결과:
  - ✅ Threads (EN): 4건 모두 발행 성공
    - https://www.threads.com/@vibehub/post/18002788637872201
    - https://www.threads.com/@vibehub/post/18122412910616053
    - https://www.threads.com/@vibehub/post/18073479854242595
    - https://www.threads.com/@vibehub/post/18087157054990239
  - ✅ Threads (ES): 3건 발행 성공 (1건 approved variant 없어 skip)
  - ⚠️ Threads 크로스프로모 (1건): 실패 — "The requested resource does not exist" (OAuthException code 24) — brief: entropy-preserving-reinforcement-learning-live-62c / media ID 18074703914322558 불존재
  - ✅ YouTube: 4건 로컬 메타데이터 기록 성공 (video 파일 없어 실제 업로드 미완)
  - ❌ Podcast RSS: 4건 모두 실패 — voice 파일 없음 / "No publisher registered for channel: podcast-rss"
  - ✅ Newsletter EN: 1 broadcast 발송 성공 (id=7304d140-8ea7-4ffe-bc9c-73da4d8a7c1b, subject="AI Brief: Entropy-Preserving Reinforcement Learning + 3 more")
  - ❌ Newsletter ES: 실패 — "The audience has no contacts" (기존 지속 이슈)
- 기존 이슈 지속:
  - podcast-rss publisher 미등록 / voice 파일 없음 — 1단계 파이프라인 미완료 시 항상 발생
  - Newsletter ES 오디언스 연락처 없음 경고 지속
  - YouTube 실제 업로드 미완 (video 파일 미생성)

### 2026-04-14 — vibehub-media-publish 자동 실행 결과
- 상태: success (recurring warnings)
- 발행 브리프 (1건):
  1. `desalination-plants-in-the-middle-east-are-increasingly-vuln-live-a36`
     - 제목: "Desalination plants in the Middle East are increasingly vulnerable"
     - published_at: 2026-04-14T10:11:03Z
- 채널별 결과:
  - ✅ Threads (EN): 발행 성공 → https://www.threads.com/@vibehub/post/18111463897640297
  - ⚠️ Threads 크로스프로모: 실패 — "The requested resource does not exist" (OAuthException code 24, error_subcode 4279009) — media ID 18074919119322558 불존재 (기존 재발 이슈)
  - ✅ YouTube: 로컬 메타데이터 기록 성공 (video 파일 없어 실제 업로드 미완) — youtube-upload-guide.txt 저장됨
  - ❌ Podcast RSS: 실패 — voice 파일 없음 (longform-voice.wav / shorts-voice.wav 미생성) / "No publisher registered for channel: podcast-rss"
  - ✅ Newsletter EN: broadcast 발송 성공 (id=51109001-f114-4f78-a7dc-4d09b8d8e392, subject="AI Brief: Desalination plants in the Middle East are increa…")
  - ❌ Newsletter ES: 실패 — "The audience has no contacts" (기존 지속 이슈)
  - ⏭ ES 로케일 variants: skipped (approved variant 없음)
- 기존 이슈 지속:
  - podcast-rss: voice 파일 미생성 + publisher 미등록 — 1단계 파이프라인 미완료 시 항상 발생
  - Threads 크로스프로모: OAuthException 미디어 ID 불존재 오류 반복 발생
  - Newsletter ES 오디언스 연락처 없음 경고 지속
  - YouTube 실제 업로드 미완 (video 파일 미생성)
