# VibeHub 일일 드리프트 가드

## 목적

VibeHub의 daily pipeline과 오케스트레이션 상태를 점검해 회귀를 조기에 발견한다.
이 프롬프트는 `daily-pipeline.md` 실행 이후 스케줄러에서 자동 실행된다.

---

## 1. 확인 대상

- 최신 `logs/pipeline-*.log`
- `docs/status/PROJECT-STATUS.md`
- `docs/status/ORCHESTRATION-TRIAL-LOG.md`
- `telegram-orchestrator/README.md`
- 필요 시 `telegram-orchestrator/router/model-state.mjs`

중요:
- 추측하지 말고 실제 로그와 파일 기준으로 판단한다.
- 실패를 숨기지 말고, 정상/이상 여부를 분리해서 보고한다.

---

## 2. 실행 순서

### 2-1. 루트 확인
```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
```

### 2-2. 최신 파이프라인 로그 확인
```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
LATEST_LOG="$(ls -t "$ROOT_DIR"/logs/pipeline-*.log 2>/dev/null | head -1)"
echo "$LATEST_LOG"
[ -n "$LATEST_LOG" ] && tail -n 120 "$LATEST_LOG"
```

확인 항목:
- exit code 흔적
- `items fetched:`
- `items stored:`
- `items synced:`
- timeout, parse, Supabase, Telegram 관련 에러

### 2-3. 최소 회귀 체크
먼저 fixture-backed stage baseline을 확인한다:
```bash
cd "$ROOT_DIR"
npm run trial:all
```

자동화 문서와 실제 스크립트/파일 참조가 맞는지도 함께 확인한다:
```bash
cd "$ROOT_DIR"
npm run automation:check
```

해석 규칙:
- exit 0: baseline-pass
- exit 1: baseline-warning
- exit 2: rollback-risk

중요:
- `trial:all`은 fixture 기반 baseline 검증이다.
- live pipeline output이나 실제 orchestrator runtime drift를 직접 측정하는 신호로 쓰지 않는다.
- 실제 드리프트 판정은 최신 pipeline log, 테스트 결과, orchestrator state를 함께 봐야 한다.

가능하면 아래를 실행한다:
```bash
cd "$ROOT_DIR"
npm run test:unit
```

시간이 허용되면 추가:
```bash
cd "$ROOT_DIR"
npx playwright test apps/web/tests/e2e/pipeline-to-ui.spec.ts
```

테스트 실패 시:
- pre-existing인지
- 오늘 변경 또는 오늘 파이프라인 결과와 연결된 회귀인지
를 구분한다.

### 2-4. 오케스트레이션 드리프트 가드 확인
다음 파일에서 기준을 확인한다:
- `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
- `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`
- `telegram-orchestrator/router/model-state.mjs`

특히 아래 자동 롤백 조건이 실제 코드와 맞게 유지되는지 본다:
- p95 latency 급증
- remote delegation drift 급증
- search rate 급증
- memory write rate 급증

### 2-5. 결과 기록
아래 중 하나만 수행한다:
- 이상 없음: 짧은 운영 요약만 남긴다.
- 경미한 이상: `docs/status/DECISION-LOG.md` 또는 `docs/status/ORCHESTRATION-TRIAL-LOG.md`에 근거를 덧붙인다.
- 명확한 회귀: 원인, 영향, 임시 완화책, 다음 액션을 정리한다.

---

## 3. 이상 판정 기준

### 정상
- 최신 로그가 존재한다.
- fetch / ingest / sync가 모두 완료되었다.
- item count가 비정상적으로 급감하지 않았다.
- 테스트가 새로 깨지지 않았다.

### 경고
- 전체 성공이지만 item count가 급감했다.
- stdout 포맷이 바뀌어 count 파싱이 0으로 떨어진 흔적이 있다.
- Telegram 보고만 실패했다.
- automation 문서가 실제 스크립트 또는 파일 참조와 어긋난다.

### 실패
- 단계 중 하나라도 `error`
- snapshot 또는 sync 결과 불일치
- UI E2E 회귀
- rollback 기준을 넘는 드리프트가 반복

---

## 4. 보고 형식

아래 형식으로 짧게 보고한다.

```md
## Daily Drift Guard

- pipeline: success | warning | failed
- counts: fetched X / stored Y / synced Z
- tests: pass | warning | failed
- shadow trials: baseline-pass | baseline-warning | rollback-risk
- orchestration drift: none | warning | rollback-risk
- key finding: ...
- next action: ...
```

---

## 🔖 운영자 승인 대기 항목

(아래 항목은 자동 실행되지 않았습니다. 운영자가 확인 후 결정합니다.)

[PENDING-회귀복구]
- 감지된 회귀: 원인 분석 후 해당 구간 롤백 또는 수정 필요 여부 확인
→ 승인 시: "git revert" 또는 "git reset" 또는 "hotfix 커밋"

[PENDING-드리프트대응]
- orchestration drift 경고: 자동 롤백 조건 충족 여부 확인 후 모델 상태 롤백 결정
→ 승인 시: "/model-rollback" 또는 "모니터링 계속"

---

## 5. Telegram 보고

섹션 4의 보고 형식을 작성한 직후 아래 curl로 전송한다.
**경고/실패 상태일 때는 반드시 전송한다. 정상일 때도 전송한다.**

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a

# TEXT에 섹션 4 보고 내용을 담는다
# 예시:
# TEXT="[VibeHub] Drift Guard\n- pipeline: success\n- counts: fetched 12 / stored 10 / synced 10\n- tests: pass\n- shadow trials: baseline-pass\n- orchestration drift: none\n- next action: 없음"

if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_REPORT_CHAT_ID" ]; then
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_REPORT_CHAT_ID}" \
    --data-urlencode "text=${TEXT}" \
    > /dev/null
else
  echo "Telegram 키 없음 — 보고 생략"
fi
```

전송 실패는 무시하고 자동화를 정상 종료한다.

---

## 6. 행동 원칙

- 사람이 확인해야 하는 예외만 올린다.
- 증거 없이 source/tool 교체 결론을 내리지 않는다.
- 동일한 이상이 2회 이상 반복되면 "일시 장애"로 넘기지 말고 원인 후보를 구체화한다.
