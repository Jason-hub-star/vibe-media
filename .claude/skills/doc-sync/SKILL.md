---
name: doc-sync
description: git diff 기반으로 CLAUDE.md 문서 동기화 규칙 준수 여부를 자동 점검한다. 커밋 전 누락된 문서 업데이트를 잡아준다.
user_invocable: true
---

# Doc Sync Check

코드 변경에 따라 필수 문서 동기화가 빠지지 않았는지 자동 점검한다.

## Steps

### 1. 변경 파일 수집
```bash
git diff --name-only HEAD
git diff --name-only --cached
git status --porcelain
```
위 결과를 합쳐 변경된 파일 목록을 만든다.

### 2. 트리거 조건 매칭

변경 파일 목록을 아래 규칙표와 대조한다:

| 변경 패턴 | 필수 문서 업데이트 |
|-----------|-------------------|
| `*.css`, 디자인 토큰 관련 | `docs/status/FRONTEND-HANDOFF.md` §2(토큰 표)와 §6(마일스톤), `docs/status/PROJECT-STATUS.md` |
| `app/admin/**`, `app/(public)/**` route 파일 추가/변경 | `docs/ref/ROUTE-SPECS.md`, `docs/status/PROJECT-STATUS.md`, `docs/status/EXECUTION-CHECKLIST.md` |
| `packages/design-tokens/**` | `docs/status/FRONTEND-HANDOFF.md` |
| Supabase 마이그레이션, 스키마 파일 | `docs/ref/SCHEMA.md`, `docs/status/PROJECT-STATUS.md` |
| 설계 결정이 포함된 변경 (새 패턴, 아키텍처 변경) | `docs/status/DECISION-LOG.md` |
| 기능 구현 완료 | `docs/status/PROJECT-STATUS.md`, `docs/status/EXECUTION-CHECKLIST.md` |
| 버그 수정 | `docs/status/PROJECT-STATUS.md` (Open Follow-ups에서 제거) |

### 3. 누락 점검

각 트리거된 문서가 실제로 변경 파일 목록에 포함되어 있는지 확인한다.
- 포함되어 있으면 ✅
- 누락되면 ⚠️ + 어떤 섹션을 업데이트해야 하는지 안내

### 4. 결과 보고

```
## Doc Sync Report

| 트리거 | 필수 문서 | 상태 | 안내 |
|--------|----------|------|------|
| CSS 변경 | FRONTEND-HANDOFF.md | ✅ 업데이트됨 | |
| route 추가 | ROUTE-SPECS.md | ⚠️ 누락 | 새 route `/admin/foo` 추가됨 → ROUTE-SPECS에 항목 필요 |
```

### 5. 판정
- 누락 0건: `✅ Doc sync: all required docs updated`
- 누락 1건 이상: `⚠️ Doc sync: N doc(s) need update` + 구체적 안내

## 규칙
- `docs/status/*` 파일은 코드와 상태가 충돌하면 구현을 기준으로 문서를 갱신한다
- 이 검사는 advisory — 위반이 있어도 커밋을 막지는 않지만 사용자에게 알린다
- 변경이 trivial(주석, 포맷팅)이면 문서 업데이트 불필요로 판단한다
