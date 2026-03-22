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
- route가 변경/추가된 경우 `docs/ref/ROUTE-SPECS.md` 동기화 여부
- 스키마 변경이 있으면 `docs/ref/SCHEMA.md` 동기화 여부
- `docs/status/PROJECT-STATUS.md` 업데이트 필요 여부 판단

### 7. 테스트 실행
- `npm run test` (unit tests)
- 실패한 테스트가 있으면 pre-existing인지 신규인지 구분

### 8. 코드 품질 스팟체크
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
| 문서 정합성 | ✅ PASS | |
| Unit tests | ✅ 33/34 | 1건 pre-existing |
| 코드 품질 | ⚠️ 2건 | 아래 참조 |

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
