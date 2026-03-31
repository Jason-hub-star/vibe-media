# /learn — 교정 사항을 규칙으로 저장

직전 대화에서 사용자가 교정한 내용을 feedback memory로 자동 저장한다.
"아니 그거 말고", "하지마", "그렇게 하지 말고" 등 교정 후 `/learn` 실행.

## 프로세스

1. 직전 사용자 메시지 2~3개를 분석하여 **무엇을 교정했는지** 파악
2. 교정 내용을 feedback memory 형식으로 정리:
   - **규칙**: 앞으로 어떻게 해야 하는지 (한 문장)
   - **Why**: 왜 이 교정이 나왔는지
   - **How to apply**: 어떤 상황에서 이 규칙이 적용되는지
3. `~/.claude/projects/-Users-family-jason-vibehub-media/memory/` 에 `feedback_<topic>.md` 파일로 저장
4. MEMORY.md 인덱스에 추가
5. 저장 결과를 사용자에게 한 줄로 확인

## 저장 형식

```markdown
---
name: feedback_<topic>
description: <한 줄 설명>
type: feedback
---

<규칙 한 문장>

**Why:** <교정 이유>
**How to apply:** <적용 조건>
```

## 규칙

- 이미 같은 내용의 memory가 있으면 기존 파일을 업데이트 (중복 금지)
- 코드 패턴이나 파일 경로 같은 휘발성 정보는 저장하지 않음 — 행동 원칙만
- 저장 후 "✅ 학습 완료: <규칙 한 줄>" 로 확인
