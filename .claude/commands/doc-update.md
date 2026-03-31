# /doc-update — 문서 자동 갱신

코드 변경 후 "문서업데이트"라고 하면 이 프로세스를 실행한다.
CLAUDE.md의 Doc Update Principle(정본 1곳 원칙)을 따른다.

## 프로세스

### 1. 변경 범위 파악
```bash
git diff --name-only HEAD
git diff --name-only --cached
git status --porcelain
```

### 2. 영향 문서 판별 (자동)

| 변경 영역 | 필수 갱신 | 조건부 갱신 |
|-----------|----------|-----------|
| **어떤 코드든** | `PROJECT-STATUS.md` (상태 한 줄) | — |
| route/page | `ROUTE-SPECS.md` | `PRD.md` (목적 변경 시) |
| DB/migration | `SCHEMA.md` | `PIPELINE-OPERATING-MODEL.md` |
| worker/pipeline | `PIPELINE-OPERATING-MODEL.md` | `AGENT-OPERATING-MODEL.md` |
| publish/channel | `CHANNEL-PUBLISH-PIPELINE.md` | — |
| automation/.claude | `automations/README.md` | `CLAUDE.md` |
| design-token/CSS | — | `ASSET-GUIDE.md` |
| 영상/TTS/미디어 | `VIDEO-PIPELINE.md` | — |
| 경계 결정 변경 | `DECISION-LOG.md` | → resolved 시 archive 이동 |

### 3. 실제 수정 실행

각 필수 문서에 대해:
1. 해당 파일을 읽는다
2. 변경 내용을 반영하는 최소 수정을 한다
3. **정본 1곳 원칙**: 같은 사실을 여러 문서에 반복하지 않는다. 상세는 정본에, 나머지는 "done" 한 줄 + 링크

### 4. DECISION-LOG 관리

- 새 결정이면 `Pending`에 추가
- 구현 완료된 결정이 `Pending`에 남아있으면 → `docs/archive/decisions-resolved.md`로 이동
- DECISION-LOG.md에는 pending 항목만 유지

### 5. 검증 보고

```
## Doc Update Report

변경 파일: N개
갱신 문서: M개
- PROJECT-STATUS.md: ✅ (상태 반영)
- CHANNEL-PUBLISH-PIPELINE.md: ✅ (섹션 X 수정)
- DECISION-LOG.md: — (결정 변경 없음)
```

## 규칙

- `docs/status/*`는 구현과 충돌하면 구현을 먼저 확인하고 맞춘다
- PROJECT-STATUS.md는 거의 항상 갱신 대상이다
- trivial 변경(주석, 오탈자, 테스트만)이면 "문서 갱신 불필요"로 종료
- EXECUTION-CHECKLIST는 PROJECT-STATUS.md에 통합됨 — 별도 수정 불필요
- 이 커맨드는 `/doc-sync`(점검만)와 다르게 **실제 수정까지 실행**한다
