---
name: doc-framework
description: 프로젝트 독립적 문서 관리 프레임워크 — 정본 1곳 원칙, change-class 기반 자동 갱신, 상태 자동 정리를 다른 프로젝트에 이식할 때 사용
user_invocable: true
---

# Doc Management Framework — 범용 이식 스킬

프로젝트의 언어, 프레임워크, 도메인에 관계없이 적용 가능한 문서 관리 체계.
새 프로젝트에 이 프레임워크를 도입하거나, 기존 프로젝트의 문서 체계를 점검할 때 사용한다.

## 핵심 원칙

### 1. 정본 1곳 원칙 (Single Source of Truth)
- 하나의 사실은 하나의 문서에만 기록한다
- 나머지 문서는 링크로 참조하거나 "done" 한 줄만
- 구현과 문서가 충돌하면 **구현을 먼저 확인**하고 문서를 맞춘다

### 2. 문서 계층 (Loading Order)
| Tier | 역할 | 예시 | 읽는 시점 |
|------|------|------|----------|
| **Tier 1: Always** | 진입점 + 현재 상태 | CLAUDE.md, PROJECT-STATUS, ARCHITECTURE | 매 세션 |
| **Tier 2: On-Demand** | 해당 영역 작업 시 | SCHEMA, ROUTE-SPECS, PIPELINE-MODEL | 관련 작업 시 |
| **Tier 3: Reference** | 필요 시 검색 | DECISION-LOG, POLICY, EVALUATION | 판단 필요 시 |

### 3. Change Class → 영향 문서 매핑
코드 변경을 분류하고, 각 class에 필수/조건부 갱신 문서를 매핑한다.

## 이식 프로세스

### Step 1: 문서 구조 생성

프로젝트 루트에 아래 구조를 만든다:

```
docs/
├── status/
│   ├── PROJECT-STATUS.md    ← 현재 상태 (Tier 1)
│   └── DECISION-LOG.md      ← 경계 결정 기록
├── ref/
│   ├── ARCHITECTURE.md      ← 시스템 구조 (Tier 1)
│   ├── SCHEMA.md            ← 데이터 모델
│   └── (도메인별 ref 문서)
└── archive/
    └── decisions-resolved.md ← 해결된 결정 보관
```

### Step 2: PROJECT-STATUS.md 템플릿

```markdown
# [프로젝트명] Project Status

## Current Phase
- 현재 단계 설명

## Active Tracks
- 기능A: done (YYYY-MM-DD) — 한 줄 설명
- 기능B: in progress
- 기능C: planned

## Execution Checklist
### P0 — Immediate
- [ ] 항목

### P1 — Core
- [ ] 항목

### P2 — Enhancement
- [ ] 항목
```

**규칙**:
- done 항목은 **반드시 날짜 포함**: `- 항목: done (YYYY-MM-DD)`
- 14일 이상 된 done 항목은 자동 정리 대상
- in progress 항목은 현재 작업만

### Step 3: DECISION-LOG.md 템플릿

```markdown
# Decision Log

## Pending
### DEC-001: [결정 제목]
- **Context**: 왜 이 결정이 필요한가
- **Options**: A vs B vs C
- **Decision**: 선택한 옵션
- **Rationale**: 선택 이유
- **Date**: YYYY-MM-DD

## (해결된 결정은 docs/archive/decisions-resolved.md로 이동)
```

### Step 4: Change Class 매핑 테이블 작성

프로젝트에 맞게 아래 테이블을 커스터마이즈한다:

```markdown
| 변경 영역 | 필수 갱신 | 조건부 갱신 |
|-----------|----------|-----------|
| 어떤 코드든 | PROJECT-STATUS.md | — |
| UI/화면 | ROUTE-SPECS.md | PRD.md |
| DB/모델 | SCHEMA.md | ARCHITECTURE.md |
| 로직/워커 | ARCHITECTURE.md | — |
| 설정/배포 | — | ARCHITECTURE.md |
| 경계 결정 | DECISION-LOG.md | → resolved 시 archive |
```

**로봇/Unity/ROS 예시**:

| 변경 영역 | 필수 갱신 | 조건부 갱신 |
|-----------|----------|-----------|
| 어떤 코드든 | PROJECT-STATUS.md | — |
| ROS node/topic | NODE-TOPOLOGY.md | ARCHITECTURE.md |
| Unity scene/prefab | SCENE-SPECS.md | ASSET-GUIDE.md |
| C# MonoBehaviour | ARCHITECTURE.md | — |
| URDF/모델 | ROBOT-MODEL.md | SCHEMA.md |
| launch file | LAUNCH-SPECS.md | NODE-TOPOLOGY.md |
| 메시지 타입(.msg/.srv) | MESSAGE-CATALOG.md | NODE-TOPOLOGY.md |
| 시뮬레이션 설정 | SIM-CONFIG.md | — |
| 하드웨어 인터페이스 | HW-INTERFACE.md | SAFETY-CONSTRAINTS.md |
| 경계 결정 | DECISION-LOG.md | → resolved 시 archive |

### Step 5: /doc-update 커맨드 생성

`.claude/commands/doc-update.md`에 아래 프로세스를 등록한다:

```markdown
# /doc-update

## 프로세스
1. `git diff --name-only` 로 변경 파일 수집
2. Change Class 매핑 테이블로 영향 문서 판별
3. 필수 문서를 실제 수정 (최소 변경, 정본 1곳)
4. DECISION-LOG: pending → resolved 시 archive 이동
5. PROJECT-STATUS: done 항목에 날짜 포함 확인
6. 검증 보고 출력
```

### Step 6: /doc-sync 스킬 생성 (점검 전용)

`/doc-update`가 실제 수정이라면, `/doc-sync`는 **점검만** 한다:
- 변경 파일 → change class 분류
- 필수 문서 누락 여부 체크
- `✅ all docs updated` 또는 `⚠️ N doc(s) need update` 판정

### Step 7: 상태 자동 정리 스크립트

`tools/prune-status.sh`:
```bash
#!/bin/bash
# done (YYYY-MM-DD) 형식의 항목 중 14일 이상 된 것을 제거
FILE="docs/status/PROJECT-STATUS.md"
DAYS=14
TODAY=$(date +%s)

# --dry-run 지원
DRY_RUN=false
[[ "$1" == "--dry-run" ]] && DRY_RUN=true

while IFS= read -r line; do
  if echo "$line" | grep -qE 'done \(([0-9]{4}-[0-9]{2}-[0-9]{2})\)'; then
    date_str=$(echo "$line" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    item_ts=$(date -j -f "%Y-%m-%d" "$date_str" +%s 2>/dev/null || date -d "$date_str" +%s 2>/dev/null)
    diff_days=$(( (TODAY - item_ts) / 86400 ))
    if [ "$diff_days" -gt "$DAYS" ]; then
      echo "PRUNE ($diff_days days): $line"
      $DRY_RUN || sed -i '' "/$(echo "$line" | sed 's/[[\.*^$()+?{|]/\\&/g')/d" "$FILE"
    fi
  fi
done < "$FILE"
```

## 서브에이전트 모델 배분

| 작업 | 모델 | 이유 |
|------|------|------|
| 상태 한 줄 추가 | `haiku` | 단순 삽입 |
| 섹션 수정 | `sonnet` | 맥락 파악 필요 |
| drift 감지 | `sonnet` | change class 분류 |
| 아키텍처 결정 | `opus` | 근거/영향 분석 (예외) |

## 규칙

- trivial 변경(주석, 오탈자, 테스트만)이면 "문서 갱신 불필요"로 종료
- 구현과 문서가 충돌하면 구현 우선 → status 문서부터 맞춤
- 같은 사실을 여러 문서에 반복하지 않음
- DECISION-LOG에는 pending만 유지, resolved는 archive로
- done 항목에 날짜 없으면 영구 잔류 → 반드시 날짜 포함

## 이 스킬의 사용법

```
/doc-framework
```

실행하면:
1. 현재 프로젝트에 문서 구조가 있는지 확인
2. 없으면 Step 1~7 순서로 scaffolding 제안
3. 있으면 현재 체계의 건강성 점검 (누락 문서, 오래된 상태, pending 결정)
