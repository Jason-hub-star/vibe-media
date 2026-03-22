# VibeHub 일일 파이프라인 자동 실행

## 목적
VibeHub Media Hub의 일일 콘텐츠 파이프라인을 실행하고, 결과를 Telegram으로 보고한다.
이 프롬프트는 Claude 앱의 스케줄러에서 매일 자동 실행된다.

---

## 1. 사전 환경 확인

### 1-1. Node 런타임
```bash
node --version   # v20+ 필요
npm --version
```
실패 시 즉시 중단하고 "Node 런타임 없음"을 Telegram으로 보고한다.

### 1-2. 작업 디렉토리
프로젝트 루트: `/Users/family/jason/vibehub-media`
모든 npm 명령은 이 루트에서 실행한다. (`apps/backend` 내부가 아님)

### 1-3. 환경변수 확인

> ⚠️ `run-daily-pipeline.ts`는 `dotenv`를 import하지 않는다.
> `.env`를 **파이프라인 실행 전 쉘에서 직접 로드**해야 한다. (섹션 2-1 참고)

확인 명령:
```bash
cd /Users/family/jason/vibehub-media
set -a && source .env && set +a 2>/dev/null || true
echo "SUPABASE_DB_URL: ${SUPABASE_DB_URL:+set}"
echo "TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:+set}"
echo "TELEGRAM_REPORT_CHAT_ID: ${TELEGRAM_REPORT_CHAT_ID:+set}"
```

| 변수명 | 필수 여부 | 없을 때 동작 |
|---|---|---|
| `SUPABASE_DB_URL` | 필수 | sync 단계 연결 실패 |
| `TELEGRAM_BOT_TOKEN` | 선택 | Telegram 보고 조용히 스킵 |
| `TELEGRAM_REPORT_CHAT_ID` | 선택 | Telegram 보고 조용히 스킵 |

`SUPABASE_DB_URL`이 없으면 즉시 중단.
Telegram 키가 없으면 파이프라인은 실행되지만 보고가 생략되므로 Claude가 대신 결과를 요약한다.

---

## 2. 파이프라인 실행

### 2-1. 통합 실행 (기본)

`.env` 로드 후 실행:
```bash
cd /Users/family/jason/vibehub-media
set -a && source .env && set +a
mkdir -p logs
npm run pipeline:daily 2>&1 | tee "logs/pipeline-$(date +%Y%m%d-%H%M%S).log"
echo "EXIT:${PIPESTATUS[0]}"
```

이 명령은 `apps/backend/src/workers/run-daily-pipeline.ts`를 실행하며 3단계를 순차 수행한다:

| 순서 | 단계 | npm script | 워커 파일 | stdout 파싱 패턴 | timeout |
|---|---|---|---|---|---|
| 1 | Source Fetch | `pipeline:live-fetch` | `run-live-source-fetch.ts` | `items fetched: N` | 120초 |
| 2 | Ingest | `pipeline:live-ingest` | `run-live-ingest-spine.ts` | `items stored: N` | 120초 |
| 3 | Supabase Sync | `pipeline:supabase-sync` | `run-supabase-live-ingest.ts` | `items synced: N` | 120초 |

동작 방식:
- 에러 발생 시 즉시 중단, 나머지 단계는 `idle`로 마킹
- 완료 후 `sendPipelineReport()`로 Telegram 자동 전송 (plain text 포맷, parse_mode 미설정)
- exit code: 0(성공) / 1(에러)

### 2-2. 개별 실행 (pipeline:daily 실패 시 폴백)
```bash
cd /Users/family/jason/vibehub-media
set -a && source .env && set +a
npm run pipeline:live-fetch 2>&1
npm run pipeline:live-ingest 2>&1
npm run pipeline:supabase-sync 2>&1
```

### 2-3. 전체 npm scripts 참고
```
pipeline:daily           — fetch→ingest→sync 통합 + Telegram 보고
pipeline:live-fetch      — Source Fetch만
pipeline:live-ingest     — Ingest만
pipeline:supabase-sync   — Supabase Sync만
pipeline:supabase-cleanup — 오래된 레코드 정리 (SUPABASE_CLEANUP_COMMIT=1 필요)
pipeline:supabase-migrate — DB 마이그레이션
pipeline:brief-discover  — Brief+Discover 사이클
pipeline:watch-folder    — 영상 폴더 감시 워커

review:decision          — 리뷰 판정 실행
publish:action           — 퍼블리시 액션 실행

trial:classifier         — 분류기 shadow trial
trial:brief-draft        — Brief 초안 shadow trial
trial:discover-draft     — Discover 초안 shadow trial
trial:critic             — 품질 평가 shadow trial
```

---

## 3. 결과 검증

### 3-1. 로그 확인
```bash
ls -lt /Users/family/jason/vibehub-media/logs/pipeline-*.log | head -1
```
최신 로그 파일을 읽어 각 단계의 처리 건수와 소요시간을 확인한다.

> ⚠️ 로그 파일은 `scripts/daily-pipeline.sh`의 `tee`를 통해서만 생성된다.
> `npm run pipeline:daily`를 직접 실행하면 stdout만 출력되고 로그 파일은 생성되지 않는다.
> 섹션 2-1의 명령처럼 `tee`를 포함해 실행할 것.

### 3-2. 성공 기준
- exit code 0
- 각 단계 status가 `done`
- `items fetched/stored/synced` 값이 합리적 (전날 대비 급감하지 않음)

### 3-3. 건수 0 주의
모든 단계 건수가 0이면 두 가지 가능성:
1. 실제로 새 콘텐츠가 없음 (정상)
2. stdout 포맷이 변경되어 `itemPattern` 파싱 실패 (확인 필요)

로그에서 실제 `items fetched:` 패턴이 존재하는지 직접 확인한다.

### 3-4. 현재 소스 현황
`live-source-registry.ts` 기준:
- **enabled (3개)**: `openai-news-rss`, `google-ai-blog-rss`, `github-releases-openai-node`
- **disabled (2개)**: `openai-api-changelog`, `anthropic-research`

소스가 15개 이상으로 늘어나면 120초 timeout 초과 위험이 있다.

---

## 4. 이상 감지 시 대응

### 4-1. Source Fetch 실패
1. 로그에서 에러 메시지 확인
2. `apps/backend/src/shared/live-source-registry.ts`에서 실패 소스 특정
3. 특정 소스만 실패 → 일시적 네트워크 문제, 해당 단계만 재실행
4. 전체 실패 → Node/npm 환경 문제 또는 의존성 깨짐

### 4-2. Ingest 실패
1. fetch 결과가 정상인지 먼저 확인
2. `apps/backend/src/shared/live-ingest-snapshot.ts` — 로컬 스냅샷 디렉토리 접근 가능 여부 확인

### 4-3. Supabase Sync 실패
1. `SUPABASE_DB_URL`이 쉘 환경에 export되어 있는지 확인 (dotenv 미로드 주의)
2. `apps/backend/src/shared/supabase-ingest-sync.ts`에서 에러 위치 특정
3. DB 스키마 참조: `docs/ref/SCHEMA.md`

### 4-4. Telegram 전송 실패
- 파이프라인 자체 실패가 아님 (데이터는 정상 처리됨)
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_REPORT_CHAT_ID` 쉘 환경 노출 여부 확인
- `telegram-report.ts`는 plain text 전송 (MarkdownV2/HTML 미사용)
- Telegram API 일시 장애 가능성도 있음

---

## 5. 분류 + 초안 단계 (선택)

현재 `pipeline:daily`는 fetch→ingest→sync만 수행한다.
분류/초안은 포함되지 않으며, 필요 시 파이프라인 완료 후 별도로 실행:

```bash
cd /Users/family/jason/vibehub-media
set -a && source .env && set +a

npm run trial:classifier 2>&1
npm run trial:brief-draft 2>&1
npm run trial:discover-draft 2>&1
npm run trial:critic 2>&1
```

이 단계들은 shadow trial 모드이며, `docs/ref/ORCHESTRATION-EVALUATION.md` 기준을 충족하면 daily pipeline에 통합된다.

---

## 6. Telegram Orchestrator 연동

### 6-1. 개요
`/Users/family/jason/vibehub-media/telegram-orchestrator`에 별도 Telegram 봇 라우터가 있다.
이 라우터는 메시지를 받아 local(Ollama) / Claude / Codex로 라우팅하며, 모델 상태를 SQLite로 관리한다.

### 6-2. 파이프라인과의 관계
- `telegram-report.ts`는 파이프라인 결과를 **Telegram API에 직접** 전송 (라우터 경유 없음)
- 포맷: plain text (MarkdownV2/HTML 미사용, `parse_mode` 파라미터 없음)
- Telegram Orchestrator의 모델 상태에는 VibeHub 파이프라인 스테이지 포인터가 있음:
  - `classifier` → 분류기 모델
  - `brief_draft` → Brief 초안 모델
  - `discover_draft` → Discover 초안 모델
  - `critic` → 품질 평가 모델

### 6-3. 라우터 실행
```bash
cd /Users/family/jason/vibehub-media/telegram-orchestrator
./bin/start-router.sh           # 일반 실행 (.env 자동 로드)
./bin/start-router-awake.sh     # Mac 슬립 방지 + 실행
```

`start-router.sh`는 `set -a && source .env && set +a` 후 `node router/telegram-bot.mjs`를 실행한다.

### 6-4. 환경변수 (telegram-orchestrator/.env)
| 변수명 | 기본값 | 용도 |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | (필수) | 봇 토큰 |
| `TELEGRAM_ALLOWED_CHAT_IDS` | 비어있으면 전체 허용 | 허용 채팅방 제한 |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | 로컬 Ollama 주소 |
| `OLLAMA_MODEL` | `qwen3:4b` | 기본 라우터/채팅 모델 |
| `ROUTER_WORKDIR` | `/Users/family/jason` | Claude/Codex 작업 디렉토리 |
| `CLAUDE_ENABLED` | `1` | Claude 라우트 활성화 |
| `CODEX_ENABLED` | `1` | Codex 라우트 활성화 |

> ⚠️ vibehub-media와 telegram-orchestrator가 같은 봇 토큰을 공유할 수 있다.
> 다른 봇으로 운영하려면 각각 별도 `TELEGRAM_BOT_TOKEN` 필요.

### 6-5. 모델 관리 명령 (Telegram에서)
```
/status                           — 현재 활성 모델, 섀도, 최근 롤백 상태
/models                           — 등록된 모델 전체 목록
/model-eval <model>               — eval suite 실행 + baseline drift 기록
/model-shadow <model>             — eval 통과 모델을 100건 shadow 관찰
/model-activate <model> [targets] — 대상: chat,router,search,memory 또는 classifier,brief-draft 등
/model-rollback [targets]         — 이전 안정 스냅샷으로 복원
/fact <message>                   — 웹 검색 강제 후 출처 포함 응답
/auto <message>                   — Ollama 라우터가 자동 경로 결정
```

자동 롤백 조건 (runtime role 활성화 시):
- p95 latency가 baseline 대비 1.5배 초과
- remote delegation rate가 +15% 초과
- search rate가 +20% 초과
- memory write rate가 +20% 초과

---

## 7. 참고 파일 인덱스

### 파이프라인 실행
| 파일 | 역할 |
|---|---|
| `apps/backend/src/workers/run-daily-pipeline.ts` | 일일 통합 워커 (dotenv 없음 — 쉘 주입 필요) |
| `apps/backend/src/workers/run-live-source-fetch.ts` | Fetch 워커 |
| `apps/backend/src/workers/run-live-ingest-spine.ts` | Ingest 워커 |
| `apps/backend/src/workers/run-supabase-live-ingest.ts` | Sync 워커 |
| `scripts/daily-pipeline.sh` | 쉘 래퍼 (로그 tee 포함) |

### 파이프라인 모듈
| 파일 | 역할 |
|---|---|
| `apps/backend/src/shared/live-source-fetch.ts` | 소스별 fetch 로직 |
| `apps/backend/src/shared/live-source-parse.ts` | HTML/RSS 파싱 |
| `apps/backend/src/shared/live-source-registry.ts` | 소스 목록 (현재 3 enabled / 2 disabled) |
| `apps/backend/src/shared/live-ingest-snapshot.ts` | 로컬 스냅샷 저장 |
| `apps/backend/src/shared/supabase-ingest-sync.ts` | Supabase 동기화 |
| `apps/backend/src/shared/supabase-editorial-sync.ts` | Editorial 동기화 |
| `apps/backend/src/shared/telegram-report.ts` | Telegram 보고 (plain text, parse_mode 없음) |

### 분류 + 초안
| 파일 | 역할 |
|---|---|
| `apps/backend/src/shared/classifier-shadow-trial.ts` | 아이템 분류기 |
| `apps/backend/src/shared/brief-draft-shadow-trial.ts` | Brief 초안 |
| `apps/backend/src/shared/discover-draft-shadow-trial.ts` | Discover 초안 |
| `apps/backend/src/shared/critic-shadow-trial.ts` | 품질 평가 |

### Telegram Orchestrator
| 파일 | 역할 |
|---|---|
| `telegram-orchestrator/router/telegram-bot.mjs` | 메인 라우터 (메시지 수신/라우팅/응답) |
| `telegram-orchestrator/router/model-state.mjs` | 모델 상태 관리 (SQLite) |
| `telegram-orchestrator/router/eval-cases.mjs` | 평가 케이스 |
| `telegram-orchestrator/bin/run-claude.sh` | Claude CLI 래퍼 |
| `telegram-orchestrator/bin/start-router.sh` | 라우터 시작 (.env 자동 로드) |
| `telegram-orchestrator/state/orchestrator.sqlite` | 상태 DB |

### 정책 문서
| 문서 | 역할 |
|---|---|
| `docs/ref/PIPELINE-OPERATING-MODEL.md` | 파이프라인 운영 모델 |
| `docs/ref/SOURCE-CATALOG.md` | 현재 소스 목록 |
| `docs/ref/SOURCE-TIER-POLICY.md` | 소스 등급 정책 |
| `docs/ref/SOURCE-EXPANSION-STRATEGY.md` | 소스 확장 전략 |
| `docs/ref/SCHEMA.md` | DB 스키마 |
| `docs/ref/REVIEW-POLICY.md` | 리뷰 정책 |
| `docs/ref/AUTO-PUBLISH-RULES.md` | 자동 퍼블리시 규칙 |
| `docs/ref/ORCHESTRATION-EVALUATION.md` | 오케스트레이션 평가 기준 |
| `docs/ref/ROUTE-SPECS.md` | API 라우트 스펙 |

---

## 8. 알려진 한계 + 주의사항

| # | 항목 | 내용 |
|---|---|---|
| 1 | dotenv 미로드 | `run-daily-pipeline.ts`에 `dotenv` import 없음. 반드시 `set -a && source .env && set +a` 선행 실행 필요 |
| 2 | timeout 120초 고정 | 소스 수 증가 시 fetch 단계 타임아웃 위험. 소스 15개 이상이면 주의 |
| 3 | itemPattern 파싱 취약 | 워커 stdout 포맷 변경 시 건수가 조용히 0으로 기록됨 |
| 4 | classify 미포함 | `pipeline:daily`는 fetch→ingest→sync만. 분류/초안은 별도 실행 |
| 5 | 로그 파일 미생성 | `npm run pipeline:daily` 단독 실행 시 로그 파일 없음. `tee` 포함 명령 필요 |
| 6 | Telegram plain text | `telegram-report.ts`는 plain text 전송. MarkdownV2/HTML 특수문자 이스케이프 불필요 |
| 7 | 봇 토큰 공유 가능 | vibehub-media와 telegram-orchestrator가 동일 봇 토큰 사용 가능. 다른 봇 운영 시 각각 별도 토큰 필요 |
| 8 | esbuild 플랫폼 불일치 | macOS에서 설치한 node_modules를 Linux 환경(Claude 앱)에서 실행 시 `@esbuild/linux-arm64` 없음 에러 발생. `npm install`을 한 번 실행하면 해결. 이후 재발 없음 |
