# VibeHub 주간 Self-Critique 루프

## 목적

발행된 브리프를 Claude가 직접 비평해 파이프라인 프롬프트·정책 문서를 스스로 개선한다.
외부 engagement 신호 없이 **콘텐츠 품질 자체**를 기준으로 삼는다.

---

## 실행 주기

매주 월요일 오전 9시 (`vibehub-weekly-self-critique` Scheduled Task)

---

## 1. 최근 발행 브리프 수집

```js
// Supabase에서 지난 7일 발행 브리프 전체 조회
SELECT slug, title, summary, body, last_editor_note, published_at
FROM brief_posts
WHERE status = 'published'
  AND published_at >= NOW() - INTERVAL '7 days'
ORDER BY published_at DESC;
```

브리프가 0건이면 "발행 없음" 보고 후 종료.
브리프가 10건 초과면 최신 10건만 처리.

---

## 2. 브리프별 비평 (Claude 자기 평가)

각 브리프에 대해 아래 5개 항목을 1–5점으로 평가하고 한 줄 이유를 적는다.

| 항목 | 평가 기준 |
|------|-----------|
| **제목 명확성** | 독자가 내용을 바로 파악할 수 있는가 |
| **제목 흡입력** | 읽고 싶은 호기심을 유발하는가 |
| **요약 밀도** | 핵심 정보가 빠짐없이 담겼는가 (과잉/부족 모두 감점) |
| **본문 깊이** | 원문 대비 독자적 가치를 추가했는가 |
| **톤 일관성** | VibeHub 전문 미디어 톤을 유지했는가 |

평가 후 **전체 브리프를 가로질러** 반복 패턴을 찾는다:
- 같은 소스에서 유사 주제가 2건 이상인가?
- 제목 구조가 반복되는가? ("X가 Y를 발표" 형태 과다 등)
- 특정 점수 항목이 전체적으로 낮은가?

---

## 3. 개선 제안 생성

비평 결과를 바탕으로 아래 문서 중 수정이 필요한 것을 찾아 **구체적인 diff**를 생성한다.

### 수정 가능한 대상

| 문서 | 수정 조건 |
|------|-----------|
| `docs/ref/REVIEW-POLICY.md` | 검수 기준이 놓친 패턴 발견 시 |
| `docs/ref/AUTO-PUBLISH-RULES.md` | 자동 승인 통과했지만 품질 낮은 건 반복 시 |
| `.claude/automations/daily-editorial-review.md` | 리뷰 프롬프트 보완 필요 시 |
| `docs/ref/SOURCE-CATALOG.md` | 특정 소스 품질이 지속적으로 낮을 때 |

### diff 형식

```
## 제안 #1: [파일명] — [한 줄 요약]

**근거:** [비평에서 발견한 패턴]

**현재:**
> [현재 텍스트 발췌]

**제안:**
> [수정 제안 텍스트]
```

---

## 4. 결과 저장

```bash
# 비평 결과를 날짜별 로그로 저장
docs/status/SELF-CRITIQUE-LOG.md
```

형식:
```markdown
## YYYY-MM-DD 비평 결과

### 처리 브리프: N건
### 평균 점수: X.X / 5.0

### 브리프별 요약
| slug | 제목명확성 | 흡입력 | 요약밀도 | 본문깊이 | 톤 | 평균 |
|------|-----------|--------|----------|----------|-----|------|
| ... |

### 발견된 패턴
- [패턴 1]
- [패턴 2]

### 개선 제안
[§3에서 생성한 diff들]

### 적용 여부
- [ ] 제안 #1 (운영자 승인 대기)
- [ ] 제안 #2 (운영자 승인 대기)
```

---

## 5. 운영자 알림 (선택)

TELEGRAM_BOT_TOKEN이 설정된 경우 요약 메시지를 발송한다:

```
📊 VibeHub 주간 자기비평 완료
- 분석: N건 브리프
- 평균 품질: X.X/5.0
- 개선 제안: N건
→ docs/status/SELF-CRITIQUE-LOG.md 확인
```

---

## 6. 제안 적용 규칙

### 자동 적용 가능 (운영자 승인 불필요)
- `SELF-CRITIQUE-LOG.md` 업데이트
- `PROJECT-STATUS.md` 업데이트

### 운영자 승인 필요
- REVIEW-POLICY, AUTO-PUBLISH-RULES 수정
- editorial-review 프롬프트 수정
- SOURCE-CATALOG maxItems 조정

> 운영자가 "적용해줘"라고 하면 해당 제안의 `[ ]`를 `[x]`로 바꾸고 실제 파일을 수정 후 커밋한다.

---

## 7. 종료 조건

- 브리프 0건 → "이번 주 발행 없음" 기록 후 종료
- 모든 점수 4.5 이상 → "개선 제안 없음" 기록 후 종료
- 오류 발생 → 오류 내용을 SELF-CRITIQUE-LOG.md에 기록 후 종료 (파이프라인 중단 금지)
