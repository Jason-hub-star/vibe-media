현재 working tree의 모든 변경사항에 대해 자기 리뷰를 수행하세요.

## 수행 순서

### 1. 변경 범위 파악
- `git diff --stat`과 `git diff --cached --stat`으로 변경 파일, 추가/삭제 라인 수 집계
- untracked 파일 목록 (`git status --porcelain`)
- 변경 규모를 S/M/L/XL로 분류 (S: ~50줄, M: ~200줄, L: ~500줄, XL: 500줄+)

### 2. 타입 안전성
- `apps/web`: `npx next typegen && npx tsc --noEmit` 실행
- `apps/backend`: `npx tsc --noEmit -p apps/backend/tsconfig.json` 실행
- 에러가 있으면 각각 리스트업 (pre-existing vs 신규 구분)

### 3. 300줄 규칙 점검
- 변경된 TSX/TS 파일 중 300줄 초과인 파일 검출
- 400줄 초과면 경고 표시

### 4. 보안 체크
- 변경/추가된 파일에서 다음 패턴 검색:
  - 하드코딩된 API key, token, password, secret
  - `.env.local`, `.env` 파일이 커밋 대상에 포함되었는지
  - `dangerouslySetInnerHTML`, `eval(`, SQL 인젝션 가능 패턴

### 5. 미사용 코드
- 새로 추가된 import 중 실제 사용되지 않는 것 검출
- 새로 추가된 export 중 다른 파일에서 참조되지 않는 것 확인

### 6. 문서 정합성
- 먼저 `/doc-sync` 기준으로 change class를 분류한다
- `/doc-sync` 결과에서 `missing` 문서를 그대로 문서 정합성 이슈로 가져온다
- route/surface 변경이면 `docs/ref/ROUTE-SPECS.md`와 `docs/status/PROJECT-STATUS.md`를 우선 확인한다
- schema/migration 변경이면 `docs/ref/SCHEMA.md`와 `docs/status/PROJECT-STATUS.md`를 우선 확인한다
- pipeline/agent flow 변경이면 `docs/ref/PIPELINE-OPERATING-MODEL.md`, `docs/ref/AGENT-OPERATING-MODEL.md`를 확인한다
- automation/prompt 변경이면 `.claude/automations/README.md`, `docs/ref/AUTO-PUBLISH-RULES.md`, `docs/ref/REVIEW-POLICY.md`, `CLAUDE.md` 필요 여부를 확인한다
- sidecar/channel 변경이면 `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`, `docs/ref/PIPELINE-OPERATING-MODEL.md` 필요 여부를 확인한다
- 설계 경계가 바뀌었다면 `docs/status/DECISION-LOG.md`가 빠지지 않았는지 본다
- `.claude/automations/**`가 바뀌었으면 `npm run automation:check` 결과도 함께 적는다

### 7. 테스트 실행
- `npm run test` (unit tests)
- 실패한 테스트가 있으면 pre-existing인지 신규인지 구분

### 8. CSS 토큰 준수 점검
- 변경된 CSS 파일에 대해 `bash tools/token-lint.sh` 실행
- 위반 0건이면 PASS, 1건 이상이면 목록 출력

### 9. 모바일 반응형 점검
- public layout, shared component, CSS 파일이 바뀌었으면 `ui-audit public --mobile` 기준으로 모바일 overflow를 확인
- 최소 확인:
  - `document.documentElement.scrollWidth === document.documentElement.clientWidth`
  - 햄버거 메뉴 open 상태에서도 좌우 스크롤이 생기지 않는지
  - footer/header/shared shell이 mobile media query로 실제 접히는지
- 공용 CSS 이슈면 `100vw`, media query 순서, shared grid/footer/nav부터 본다

### 10. 코드 품질 스팟체크
- 변경된 파일을 실제로 읽고 다음을 확인:
  - 에러 핸들링 누락 (try/catch 없는 async, unchecked null)
  - 하드코딩된 매직 넘버/스트링
  - 중복 코드 (같은 로직이 2곳 이상)
  - 불필요한 console.log
  - React key 누락, useEffect dependency 문제

## 출력 포맷

```
## Self-Review Report

**변경 규모**: M (약 200줄, 15파일)

| 항목 | 결과 | 비고 |
|------|------|------|
| Typecheck (web) | ✅ PASS | |
| Typecheck (backend) | ✅ PASS | |
| 300줄 규칙 | ⚠️ 1건 | pipeline.css 418줄 (CSS, 허용) |
| 보안 체크 | ✅ PASS | |
| 미사용 코드 | ✅ PASS | |
| 문서 정합성 | ✅ PASS/⚠️ | `/doc-sync` 기준 |
| Unit tests | ✅ 33/34 | 1건 pre-existing |
| CSS 토큰 준수 | ✅/⚠️ | N건 |
| 모바일 반응형 | ✅/⚠️ | ui-audit public --mobile |
| 코드 품질 | ⚠️ 2건 | 아래 참조 |

### Doc Sync Summary
- change classes: ...
- missing docs: ...
- companion checks: ...

### 발견 사항
1. [severity] 파일:줄 — 설명
2. ...

### 추천 조치
- [ ] 조치 1
- [ ] 조치 2
```

## 규칙
- pre-existing 이슈는 발견 사항에 포함하되 [pre-existing] 태그를 붙임
- 추천 조치는 반드시 해야 하는 것(MUST)과 권장(SHOULD)을 구분
- 리뷰는 사실 기반으로만 — 추측하지 않고 실제 코드를 읽고 판단
- `/doc-sync` 결과를 추상적으로 요약하지 말고, 실제 missing 문서명을 적는다
- 문서 정합성 항목은 단순 route/schema만이 아니라 automation, lane, channel 변경도 포함한다
