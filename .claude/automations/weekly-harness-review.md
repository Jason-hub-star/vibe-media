# VibeHub 주간 하네스 후보 검토

## 목적
harness_pattern으로 분류되어 Radar/Harness Patterns/에 export된 discover 아이템을 검토하고,
실제 하네스로 승격할 가치가 있는지 판단한다. 주 1회 실행.

---

## 1. 현재 하네스 후보 수집

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a

HARNESS_DIR="/Users/family/jason/jasonob/Radar/Harness Patterns"
ls "$HARNESS_DIR"/*.md 2>/dev/null | grep -v _Index.md
```

각 파일의 frontmatter를 읽어서:
- title
- primary_url
- tags
- synced_at

---

## 2. 하네스 적격성 판단

각 후보를 아래 기준으로 평가한다:

| 기준 | 통과 조건 |
|------|-----------|
| 구체적 워크플로 | 단계별 절차가 있는가 (1→2→3) |
| 실행 가능성 | 코드/설정 예시가 있는가 |
| 범용성 | 2개 이상 프로젝트에 적용 가능한가 |
| 측정 가능성 | keep/discard를 판단할 지표가 있는가 |

3개 이상 통과 → **candidate 하네스로 승격**
2개 → **보류 (다음 주 재검토)**
1개 이하 → **아카이브**

---

## 3. Candidate 하네스 생성

승격 판단된 아이템에 대해:

1. 원본 URL을 WebFetch로 읽어서 상세 패턴 추출
2. 아래 형식으로 `/Users/family/jason/jasonob/harnesses/{slug}.md` 생성

```yaml
---
name: {제목}
tags: [{관련 태그}]
trigger: "{어떤 상황에서 쓰나}"
version: 0
wins: 0
losses: 0
tested_on: []
source: "{원본 URL}"
---
```

3. REGISTRY.md에 candidate 상태로 추가

---

## 🔖 운영자 승인 대기 항목

(아래 항목은 자동 실행되지 않았습니다. 운영자가 확인 후 결정합니다.)

[PENDING-하네스승격]
- 신규 candidate 하네스: 실제 테스트 및 프로젝트 적용 승인
→ 승인 시: "jasonob/harnesses/에서 테스트 시작" 또는 "폐기"

[PENDING-하네스은퇴]
- 패배율 높은 하네스: 재훈련 또는 은퇴 결정
→ 승인 시: "은퇴 처리 (REGISTRY.md 업데이트)" 또는 "재테스트 집중"

---

## 4. 기존 하네스 성적표 점검

```bash
cat /Users/family/jason/jasonob/harnesses/REGISTRY.md
```

- losses >= 3 && wins == 0 → **retired 후보 플래그**
- 마지막 테스트가 4주 이상 전 → **재테스트 필요 플래그**

---

## 5. Telegram 보고

candidate가 1건 이상일 때만 전송:

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a

# 결과 변수 사용
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_REPORT_CHAT_ID" ] && [ "$CANDIDATE_COUNT" -gt 0 ]; then
  MSG="🔧 주간 하네스 리뷰 완료

검토: ${REVIEWED_COUNT}건
승격: ${CANDIDATE_COUNT}건 → jasonob/harnesses/
보류: ${DEFERRED_COUNT}건
아카이브: ${ARCHIVED_COUNT}건

레지스트리: ${ACTIVE_COUNT} active / ${RETIRED_COUNT} retired"

  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_REPORT_CHAT_ID}" \
    --data-urlencode "text=${MSG}" \
    > /dev/null
fi
```

---

## 6. 성공 검증

```bash
# 새 candidate 파일 존재 확인
for SLUG in ${NEW_CANDIDATES}; do
  if [ -f "/Users/family/jason/jasonob/harnesses/${SLUG}.md" ]; then
    echo "created: ${SLUG}"
  else
    echo "missing: ${SLUG}"
  fi
done

# REGISTRY.md 업데이트 확인
grep -c "candidate" /Users/family/jason/jasonob/harnesses/REGISTRY.md
```

---

## 실패 처리

- Harness Patterns 폴더 비어있음 → "후보 0건, 다음 주 재검토" 보고 후 종료
- WebFetch 실패 → frontmatter 정보만으로 최소 하네스 생성
- REGISTRY.md 쓰기 실패 → Telegram으로 에러 전송
