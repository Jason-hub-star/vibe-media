# 3티어 모델 전략 롤아웃 체크리스트

> 목표: Opus=플랜/깊은 추론, Sonnet=구현(기본), Haiku=서치/문서 읽기 로 모델 티어를 분리해
> 비용과 품질을 동시에 최적화한다.

## 배경

- 현재 `~/.claude/settings.json`은 모델 지정이 없어 기본값(Opus 4.6 1M)이 모든 작업에 쓰이는 중.
- 일반 grep/Read/문서 동기화까지 Opus가 돌아 토큰 낭비가 큼.
- 영상 `everything-claude-code` 권고(단일 Sonnet)보다 한 단계 정교한 3티어로 가기로 결정.

## Opus 화이트리스트 (Opus만 쓰는 경우)

1. `Plan` 서브에이전트 호출 — 아키텍처/트레이드오프 플랜 작성
2. `codex:codex-rescue` 서브에이전트 호출 — 막혔을 때 2차 진단·구현
3. 사용자가 수동 `/model opus`로 전환한 메인 세션 (큰 아키텍처 논의)

그 외는 전부 Sonnet(메인) + Haiku(서브) 기본값.

## 체크리스트

### Pre-flight
- [ ] 현재 `~/.claude/settings.json` 백업 (`settings.json.bak`)
- [ ] 현재 `big-task` SKILL.md 구조 확인 (Phase 0 플랜 단계 위치)
- [ ] 현재 세션에서 기본 모델이 무엇인지 기록

### Step 1 — 글로벌 `settings.json` 수정
- [ ] top-level `"model": "sonnet"` 추가 (메인 세션 기본값)
- [ ] `"env"` 섹션 추가
  - [ ] `MAX_THINKING_TOKENS`: `"10000"` (thinking 토큰 절감)
- [ ] JSON 유효성 `node -e "JSON.parse(require('fs').readFileSync('...'))"` 로 확인

> Note: 서브에이전트 기본 모델을 env 변수로 전역 지정하는 canonical 방법이 검증되지 않아
> 이번 롤아웃에서는 **per-call `model` 파라미터 오버라이드**로만 티어를 구현한다.
> (big-task 스킬이 Explore는 haiku, Plan은 opus로 명시 호출)

### Step 2 — `big-task` 스킬에 모델 티어 규칙 추가
- [ ] Phase 0 앞부분에 "Model Tier 전략" 섹션 신설
- [ ] Explore 호출은 `model: "haiku"` 로 명시
- [ ] Plan 작성 단계는 `Plan` 서브에이전트 + `model: "opus"` 로 명시
- [ ] 구현(Phase 1~N)은 메인 세션(sonnet) 유지
- [ ] 플랜 길이 제약 추가: `plan length ≤ 40 lines, bullet form, no risk inventory unless asked`

### Step 3 — codex-rescue 호출 규칙 메모
- [ ] `big-task` Phase Final 근처에 "막힐 경우 codex-rescue를 `model: "opus"` 로 호출" 한 줄 추가

### Verification
- [ ] `settings.json` 파싱 OK
- [ ] `big-task` SKILL.md diff 육안 확인
- [ ] 체크리스트 문서 자체가 `.claude/plans/`에 남아있는지 확인
- [ ] (수동) 다음 신규 세션에서 `/model` 출력으로 sonnet 기본값 확인

### Rollback
- `cp ~/.claude/settings.json.bak ~/.claude/settings.json`
- `git checkout .claude/skills/big-task/SKILL.md`

## 비적용 항목 (이번 롤아웃 제외)

- vercel-plugin 비활성화 — 별도 작업으로 분리
- CLAUDE.md Tier 3 다이어트 — 별도 작업으로 분리
- MCP 서버 위생 — 별도 작업으로 분리
- everything-claude-code 저장소 선별 이식 — 별도 작업으로 분리

## Next Actions (실행 순서 + 트리거)

### 🔴 즉시 (다음 신규 세션 첫 5분)
1. **메인 세션 모델 확인** — 새 Claude Code 세션을 열고 `/model` 입력 → sonnet 표시 확인
   - 만약 여전히 Opus면 `~/.claude/settings.json`의 `"model"` 필드 위치/철자 재점검
2. **thinking 축소 체감 베이스라인** — 평소처럼 작은 작업 1개 해보고 "답변 속도가 체감 더 빨라졌는지" 메모

### 🟠 이번 주 (우선순위 높음, 신규 세션에서 바로 이어서)
3. **vercel-plugin 프로젝트별 비활성화 롤아웃** — Opus Plan이 이미 산출한 M1~M3 그대로 실행
   - 트리거: 새 세션에서 vercel-plugin이 또 vercel.md 지식그래프를 주입하는게 확인되면
   - 산출물 참조: 이 대화의 Test 2 Plan 결과 (또는 다시 `Plan` 서브에이전트에 `model: "opus"`로 재호출)
   - 예상 효과: 세션당 ~3만 토큰 회수

### 🟡 1주일 후 (결정 확정/롤백 평가)
4. **3티어 전략 pending → resolved 또는 롤백 결정**
   - 평가 지표 4개:
     - [ ] 일일 토큰 비용 변화 (청구서)
     - [ ] Plan/opus가 ≤40 lines 제약을 계속 지키는지 (부풀림 재발 여부)
     - [ ] sonnet이 막혀 수동 `/model opus` 전환한 횟수 (잦으면 재조정)
     - [ ] `MAX_THINKING_TOKENS=10000` 축소로 복잡한 디버깅 품질 저하 체감 여부
   - 판정 규칙:
     - 토큰 비용 30%+ 감소 AND 품질 체감 유지 → `resolved` 전환
     - 품질 저하 명확 → 롤백 후 `MAX_THINKING_TOKENS`만 20000으로 재도전
     - sonnet 수동 전환이 일주일에 5회 넘음 → 메인을 opus로 되돌리고 서브만 haiku 유지
5. **DECISION-LOG 이동** — pending → `docs/archive/decisions-resolved.md` (resolved 시)

### 🟢 여유 생기면 (우선순위 중)
6. **CLAUDE.md Tier 3 다이어트** — Reference 섹션 25+ 항목을 `docs/ref/INDEX.md`로 압축
   - 트리거: 이번 3티어 결정이 resolved된 후
   - 예상 효과: 매 세션 always-load 토큰 10~15% 추가 감소
7. **MCP 서버 프로젝트별 위생** — VibeHub 루트에선 Notion/Slack MCP 비활성, 필요 시점에만 on
   - 트리거: 다음에 MCP 도구 호출이 실제로 필요한 순간
8. **`everything-claude-code` 선별 이식** — Strategy Compact / Instinct / Agent Shield 3종만
   - 트리거: 3티어 전략이 안정화된 후 (2주차 이후)
   - 1회성: `npx ecc agent-shield scan --opus` 보안 스캔은 지금도 가능

### ⚪ 여유 많이 생기면 (선택)
9. **서브에이전트 기본 모델 자동화** — big-task 밖에서도 Explore가 자동 haiku로 돌게
   - 방법: `feedback` 메모리에 "Explore/Plan 호출 시 항상 `model` 명시" 규칙 박기
   - 또는: 실제로 작동하는 서브에이전트 전역 env 변수 이름을 문서에서 확인한 후 `~/.claude/settings.json` 에 추가

## 진행 상태 추적

| 번호 | 항목 | 상태 | 날짜 |
|------|------|------|------|
| 0 | 이 롤아웃 자체 구현 | ✅ 완료 | 2026-04-10 |
| 1 | 메인 세션 `/model` 확인 | ✅ 완료 — claude-sonnet-4-6 확인 | 2026-04-10 |
| 2 | thinking 축소 베이스라인 | ✅ 완료 — MAX_THINKING_TOKENS=10000 적용됨 | 2026-04-10 |
| 3 | vercel-plugin 비활성 롤아웃 | ✅ 완료 — .claude/settings.json enabledPlugins false | 2026-04-10 |
| 4 | 3티어 pending 평가 | ⏳ 대기 (2026-04-17) | — |
| 5 | DECISION-LOG resolved 이동 | ⏳ 조건부 | — |
| 6 | CLAUDE.md Tier 3 다이어트 | ✅ 완료 — 207→157줄, INDEX.md 생성 | 2026-04-10 |
| 7 | MCP 서버 프로젝트별 위생 | ✅ 완료 — vercel-plugin MCP 제거, 나머지 deferred라 안전 | 2026-04-10 |
| 8 | everything-claude-code 선별 이식 | ✅ CLAUDE_CODE_SUBAGENT_MODEL=haiku 적용 (Agent Shield npm 패키지 미확인) | 2026-04-10 |
| 9 | 서브에이전트 기본 모델 자동화 | ✅ 완료 — CLAUDE_CODE_SUBAGENT_MODEL=haiku 전역 설정 | 2026-04-10 |
| 10 | 로컬 LLM 파이프라인 스테이지 교체 | ✅ 완료 — mistral-small3.1(미설치) 전체 제거, 4개 trial 스테이지 로컬 모델 배정 완료 | 2026-04-14 |
| 11 | 26B retire + critic/brief_draft → chat-g4 | ✅ 완료 — gemma4:26b-a4b-it-q4_K_M retired, critic/brief_draft stage pointer를 vibehub-chat-g4(id=4, 7.5B)로 전환 | 2026-04-15 |

## 로컬 LLM 스테이지 배정 (2026-04-14 완료)

| 스테이지 | 이전 모델 | 신규 로컬 모델 | 비고 |
|---------|----------|--------------|------|
| classifier | mistral-small3.1 ❌ | `vibehub-classifier-g4` | Gemma4 4B + JSON classifier 시스템 프롬프트. Modelfile 신규 생성. trial:all 통과 |
| critic | mistral-small3.1 ❌ → ~~gemma4:26b-a4b-it-q4_K_M~~ ❌ | `vibehub-chat-g4` | 26B는 2026-04-15 retire (하드웨어 서빙 불안정). chat-g4(Gemma4 7.5B, 5GB Q4_K_M)로 대체. role_capabilities에 critic 추가 |
| brief_draft | mistral-small3.1 ❌ → ~~gemma4:26b-a4b-it-q4_K_M~~ ❌ | `vibehub-chat-g4` | critic과 동일 — 26B retire 후 chat-g4 재사용. 고품질 요구 시 Claude shadow 유지 |
| discover_draft | mistral-small3.1 ❌ | `vibehub-discover-draft-g4` | Gemma4 4B + JSON discover-draft evaluator 시스템 프롬프트. Modelfile 신규 생성 (gemma4-unsloth-e4b raw base는 JSON 미보장으로 교체) |

**2026-04-15 26B Retire 경위:**
- `ollama show vibehub-chat-g4` 확인 결과: architecture=gemma4, parameters=7.5B, Q4_K_M, 5GB (SQLite의 "26B MoE" note는 오기였음 → 정정)
- `ollama list` 확인: vibehub-*-g4 6개 태그 모두 5GB (7.5B Gemma4 동일 베이스), `gemma4:26b-a4b-it-q4_K_M`만 17GB
- 2026-04-14 translate:variant 실험에서 26B가 Brief 1 JSON 파싱 실패 + Brief 2 15분+ 무응답 + Ollama 메모리 압박으로 eviction
- critic/brief_draft stage pointer를 id=9(26B)에서 id=4(chat-g4)로 전환. SQLite `stable_activation_snapshot_json` 동기 갱신
- 26B 태그는 Ollama에 보존 (17GB) — 수동 eval/shadow에는 재사용 가능, orchestrator auto-activation만 제외

**미적용 (다음 실험 대상):**
- `translate:variant --locale=es` → **❌ 실험 실패 (2026-04-14), Gemini Flash 유지 결정**
  - gemma4:26b-a4b-it-q4_K_M 3건 실험 결과: Brief 1 — JSON 파싱 실패 (5분+ 후 빈 응답), Brief 2 — 15분+ 무응답
  - Ollama 메모리 압박으로 gemma4:26b가 gemma4-unsloth-e4b로 교체됨 (모델 eviction)
  - ~~qwen2.5vl:7b~~ vision 모델 — 텍스트 번역 부적합, qwen2.5:7b 미설치
  - **결론: 현재 하드웨어/설치 모델로는 로컬 번역 불가. translate:variant는 Gemini Flash 유지.**
- OG 이미지 VLM fallback: qwen2.5vl:7b/granite3.2-vision:2b 연결 구조 별도 작업

**검증:**
- `vibehub-classifier-g4` Ollama 등록 + API 스모크 테스트 통과 (category:api, confidence:1.0, 26,798ms)
- `vibehub-discover-draft-g4` Ollama 등록 완료 (JSON schema 강제, temp 0.1)
- `npm run trial:all` → overall status: baseline-pass, exit code 0 (2회 확인)
- `npm run test:unit` → classifier/critic/brief-draft/discover-draft 전부 ✅. 실패 3개는 기존 버그 (script-generator/watch-folder/qwen3-client), 우리 변경과 무관
- orchestrator.sqlite: mistral-small3.1 retired, 신규 4개 모델 등록 (ID 8~11), stage 포인터 + stable_activation_snapshot 모두 업데이트
- Opus 리뷰 지적 6개 항목 전부 해소
