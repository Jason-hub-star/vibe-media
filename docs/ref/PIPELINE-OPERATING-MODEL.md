# Pipeline Operating Model

## Core Pipeline
VibeHub Media의 운영 핵심은 아래 순서를 따른다.

1. `수집`
2. `가공`
3. `초안`
4. `검수`
5. `배포`

이 파이프라인은 고정 시간마다 각 단계를 따로 돌리는 방식보다, 한 단계가 끝나면 다음 단계로 즉시 넘기는 event-driven 흐름을 기본값으로 둔다.

## Step Definitions
### 1) 수집
- source를 기준으로 새 항목을 가져온다.
- v1 source catalog와 collector/parser 채택은 아래 문서를 source of truth로 둔다.
  - `docs/ref/INGEST-STACK-DECISION.md`
  - `docs/ref/SOURCE-CATALOG.md`
- source tier:
  - `auto-safe`
  - `render-required`
  - `manual-review-required`
  - `blocked`
- source 예시:
  - 공식 블로그
  - GitHub repo / release
  - 이벤트 페이지
  - 공모전 안내문
  - PDF 자료
- source tier 상세 정책은 `docs/ref/SOURCE-TIER-POLICY.md`를 따른다.

### 2) 가공
- HTML/PDF/문서를 읽기 쉬운 중간 표현으로 변환한다.
- 작업 예시:
  - 본문 추출
  - markdown 정리
  - 메타데이터 추출
  - 중복 키 생성
  - 일정 / 링크 / CTA 분리

### 3) 초안
- 가공된 항목을 `brief`, `discover`, `both`, `archive`, `discard` 중 어디로 보낼지 분류한다.
- `brief`로 가는 항목은 제목/요약/본문 초안을 만든다.
- `discover`로 가는 항목은 category, summary, action links를 만든다.
- `critic`이 통과시키기 전에는 publish 단계로 넘어가지 않는다.
- `brief`와 `discover` 초안은 초기에는 로컬과 Claude를 shadow 비교한다.

### 4) 검수
- admin에서 사람이 최종 판단한다.
- 검수 화면은 최소 3면을 함께 보여야 한다.
  - source 원문
  - 구조화된 중간 데이터
  - 실제 공개 미리보기
- 사람 검수는 `REVIEW-POLICY.md`의 예외 조건에만 들어간다.
- 예외: 미성년자 영상은 `parent review` 단계를 항상 거친다.

### 5) 배포
- 검수 승인 후 private upload, scheduled publish, 즉시 publish 같은 정책을 적용한다.
- 완전 자동 공개는 기본값이 아니다.
- 기본 자동화 목표는 `scheduled/private publish queue`까지다.

## Surface Routing
- `brief`: 해설형 공개 콘텐츠
- `discover`: 즉시 방문/다운로드/지원 가치가 있는 공개 큐레이션
- `both`: 중요한 발표나 툴처럼 둘 다 필요한 경우
- `archive`: 보관만 하고 노출하지 않음
- `discard`: 중복, 저가치, 정책 보류

## Sidecar Lanes
- `showcase`와 Obsidian export는 `brief/discover` 자동 분류 본선과 분리된 sidecar lane이다.
- sidecar lane은 본선 산출물을 읽어 추가 노출 또는 외부 저장만 수행한다.
- 현재 discover sidecar export는 `supabase sync` 직후 실행된다.
  - 입력: `discover_items` + `discover_actions`
  - 출력: Obsidian vault markdown note + Telegram export summary
- export 기본 범위는 `open_source`, `skill`, `plugin`이며, `harness`는 독립 category가 아니라 tag로 유지한다.
- GitHub release 성격 항목은 `GitHub Releases`, repo 성격 항목은 `Repositories` 폴더로 저장한다.
- sidecar failure는 본선 ingest/sync 데이터 의미를 바꾸지 않으며, 실패 내역은 별도 보고에서 다룬다.

## Admin Modules
- `Sources`
- `Runs`
- `Inbox`
- `Classification`
- `Brief Review`
- `Discover Registry`
- `Video Jobs`
- `Publish Queue`
- `Failures`
- `Exceptions`
- `Policies`
- `Programs`

## Status Model
### Run Status
- `queued`
- `fetching`
- `parsed`
- `classified`
- `drafted`
- `review`
- `approved`
- `scheduled`
- `published`
- `failed`

## Agent Handoff
- `collector` -> `parser`
- `parser` -> `classifier`
- `classifier` -> `draft-writer`
- `draft-writer` -> `critic`
- `critic`
  - pass -> `publisher`
  - fail -> `watchdog`
- `publisher`
  - queue success -> complete
  - queue failure -> `watchdog`

### Discover Status
- `tracked`
- `watching`
- `featured`

## Tool Positioning
- 웹 수집: crawler / browser renderer
- 문서 가공: html/pdf parser
- 초안: local LLM 또는 상위 모델
- 검수: VibeHub admin
- 배포: uploader / scheduler
- 현재 오케스트레이션 기본 후보는 하이브리드다.
- `router/search/memory`는 로컬 우선으로 둔다.

## Operating Principle
- 자동 수집 가능한 source를 우선한다.
- 렌더링이 필요한 source는 예외적으로 관리한다.
- 강한 차단이나 권한 제한이 있는 source는 `manual-review-required` 또는 `blocked`로 둔다.
- admin은 단순 설정 화면이 아니라, 실제 편집과 공개 결정을 내리는 운영 콘솔이다.
- 브라우저 자동화는 `render-required`까지만 자동 대상이다.
