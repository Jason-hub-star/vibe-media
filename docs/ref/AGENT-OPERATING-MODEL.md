# Agent Operating Model

## Purpose
- VibeHub는 단일 에이전트가 아니라 역할 분리형 에이전트 팀으로 운영한다.
- 사람은 전수 검수자가 아니라 예외 처리와 규칙 설계 담당자로 올라간다.
- 기본 운영 원칙은 `human-on-exception`이다.
- LLM 역할 분담은 `docs/ref/LLM-ORCHESTRATION-MAP.md`를 따른다.

## Agent Team
### `collector`
- 입력: `sources`, source tier, 이전 run history
- 출력: 원시 수집 결과, run log, fetch 실패 이유
- handoff: 성공 시 `parser`, 실패 시 `watchdog`
- 실패 처리: timeout, anti-bot, rate-limit, unreachable 기록

### `parser`
- 입력: raw html, api payload, release text, pdf, metadata
- 출력: normalized markdown/text, extracted metadata, candidate links
- handoff: 성공 시 `classifier`, 실패 시 `watchdog`
- 실패 처리: parse-error, malformed document, empty-content 기록

### `classifier`
- 입력: parsed content, source tier, tags, dedupe key
- 출력: `target_surface`, category, confidence, policy flags, duplicate 판단
- 기본 active: 로컬 LLM
- 초기 shadow: Claude 비교
- handoff:
  - `brief` 또는 `both`는 `draft-writer`
  - `discover`는 `draft-writer`
  - `archive` / `discard`는 종료
- 실패 처리: confidence 부족, duplicate ambiguity는 `watchdog`

### `draft-writer`
- 입력: parsed content, classification output
- 출력:
  - brief: title, summary, body, source list
  - discover: title, summary, category, action links
- `brief`와 `discover`는 모두 초기 shadow 비교 대상이다.
- handoff: `critic`
- 실패 처리: low coverage, broken output, missing action links는 `watchdog`

### `critic`
- 입력: draft, source data, classification, policy flags
- 출력: pass/fail, confidence score, exception reason, correction notes
- 유력 후보는 Claude지만, shadow 데이터 없이 고정하지 않는다.
- 검사 항목:
  - 출처 수
  - 중복 여부
  - action link 유효성
  - category 적합성
  - 정책/노출 위험
- handoff:
  - 통과 시 `publisher`
  - 실패 시 `watchdog`

### `publisher`
- 입력: critic pass 결과, target surface, publish rules
- 출력: scheduled/private publish queue 등록, publish metadata
- 기본 동작:
  - 즉시 공개가 아니라 `scheduled/private queue`까지 자동
  - publish-ready면 queue에 넣고 종료
- publish 결정의 직접 소유자는 LLM이 아니라 규칙 엔진이다.
- handoff:
  - queue 등록 성공 시 완료
  - policy ambiguity나 uploader failure는 `watchdog`

### `watchdog`
- 입력: 모든 실패/예외/불확실 상태
- 출력: exception queue, retry decision, manual review flag
- 책임:
  - retry 가능 여부 판정
  - `manual-review-required` / `blocked` 승격
  - 사람 검수 큐 전달

## Program Files
- 구현 코드보다 상위 운영 규칙은 program-style markdown으로 관리한다.
- 최소 문서 세트:
  - `brief.program.md`
  - `discover.program.md`
  - `publish.program.md`
  - `source.policy.md`
- 각 문서는 아래를 포함한다:
  - 목표
  - 성공 조건
  - 실패 조건
  - 허용 surface
  - escalation 조건
  - discard 조건

## Human Role
- 사람은 아래만 맡는다.
  - 예외 처리
  - 정책 기준 수정
  - 샘플링 품질 점검
  - 최종 publish rule 조정
- 사람은 기본 흐름의 모든 draft를 보지 않는다.

## Default Operating Rule
- `Brief`와 `Discover`는 같은 ingest spine을 공유한다.
- 브라우저 자동화는 `render-required`까지만 자동 대상이다.
- 로그인/강한 차단 source는 자동 루프 밖에 둔다.
- `router/search/memory`는 현재 구조상 로컬 우선으로 둔다.
