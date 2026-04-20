# VibeHub 주간 Autoresearch 루프

## 목적

Karpathy `autoresearch`의 핵심 패턴인
"고정 시간 실험 -> 메트릭 비교 -> keep/discard"
를 VibeHub의 콘텐츠 파이프라인에 적용한다.

이 프롬프트는 주 2-3회 자동 실행되며, 한 번에 하나의 작은 개선만 실험한다.

---

## 1. 핵심 운영 규칙

- 한 번에 하나의 가설만 다룬다.
- 실험 시간은 짧고 고정한다.
- 결과는 기준선과 비교한다.
- 개선이 명확하지 않으면 버린다.
- 문서나 코드 수정은 keep 판단이 나온 뒤에만 한다.

---

## 2. 실험 후보 풀

아래 중 하나만 고른다.

- parser 개선
  - `Defuddle` cleanup 적용 범위 확대
  - PDF fallback 조건 조정
- source 개선
  - 새 RSS/API source 1개 추가 후보 검토
  - disabled source 재검토
- orchestration 개선
  - classifier/brief/discover/critic 평가 입력 보강
  - exception inflow 감소 규칙 점검
- reliability 개선
  - timeout 조정
  - count 파싱 안정화
  - 로그/보고 포맷 보강

---

## 3. 기준선 읽기

실험 전 아래를 읽는다.

- `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
- `docs/ref/INGEST-STACK-DECISION.md`
- `docs/status/PROJECT-STATUS.md`
- `docs/status/ORCHESTRATION-TRIAL-LOG.md`
- 최신 `logs/pipeline-*.log`

---

## 4. 실험 설계

각 실험은 아래 5가지를 반드시 가진다.

1. 가설
2. 적용 범위
3. 측정 지표
4. keep 조건
5. discard 조건

예시 지표:
- item extraction coverage
- parse 품질
- task success rate
- exception queue inflow
- p95 latency
- source omission 여부

---

## 5. 실행 방식

### 5-1. Timebox
- 조사 + 설계: 20분
- 실행 + 검증: 30분
- 정리: 10분

### 5-2. Smallest useful experiment
- 코드를 바꾸지 않고 판단 가능한 실험이면 문서/로그/fixture 기반으로 끝낸다.
- 코드 변경이 필요해도 작은 한 조각만 바꾼다.
- 대규모 리팩터링은 금지한다.

### 5-3. Keep / Discard
- keep:
  - 기준선보다 좋아졌고
  - 예외 유입이 악화되지 않았고
  - 운영 복잡도가 과도하게 늘지 않을 때
- discard:
  - 개선이 불명확하거나
  - 회귀 위험이 있거나
  - 새 런타임/운영 부담이 이득보다 클 때

---

## 6. 결과 반영

### keep인 경우만
- `docs/status/DECISION-LOG.md`에 결정 근거 기록
- 필요 시 관련 SSOT 문서 업데이트
- 다음 자동화에서 재측정할 후속 지표를 남긴다

### discard인 경우
- 폐기 이유만 짧게 남기고 끝낸다
- 같은 실험을 표현만 바꿔 반복하지 않는다

---

## 🔖 운영자 승인 대기 항목

(아래 항목은 자동 실행되지 않았습니다. 운영자가 확인 후 결정합니다.)

[PENDING-코드변경]
- keep 판정된 개선: 코드 또는 문서 반영 승인
→ 승인 시: "변경 적용 후 커밋" 또는 "다음 주 재측정"

[PENDING-폐기확정]
- discard 판정된 실험: 재시도 금지 또는 다른 접근 검토
→ 승인 시: "기록 후 종료" 또는 "대체 가설 제시"

---

## 7. 출력 형식

```md
## Weekly Autoresearch Loop

- hypothesis: ...
- baseline: ...
- experiment: ...
- result: keep | discard
- evidence: ...
- next step: ...
```

---

## 8. Telegram 보고

**keep 판정일 때만** 전송한다. discard면 전송하지 않는다.

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a

# RESULT 변수가 "keep"인 경우에만 전송
# 예시:
# TEXT="[VibeHub] Autoresearch — KEEP\n가설: Defuddle cleanup 범위 확대\n근거: extraction coverage +8%, 예외 유입 변화 없음\n다음: 1주 운영 후 재측정"

if [ "$RESULT" = "keep" ] && [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_REPORT_CHAT_ID" ]; then
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_REPORT_CHAT_ID}" \
    --data-urlencode "text=${TEXT}" \
    > /dev/null
fi
```

discard면 로그만 남기고 Telegram은 침묵한다.

---

## 9. VibeHub용 해석

- 이 루프의 목적은 "멋진 새 도구 도입"이 아니라 운영 품질의 누적 개선이다.
- `Defuddle`, `Docling`, `OpenDataLoader PDF`, `Promptfoo`, `Langfuse`, `LiteLLM`는 모두 후보일 뿐이다.
- 가장 좋은 개선은 종종 "새 도구 추가"보다 "현재 규칙을 더 잘 측정하고 더 빨리 버그를 잡는 것"이다.
