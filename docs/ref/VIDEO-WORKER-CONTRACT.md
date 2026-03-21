# Video Worker Contract

## Goal
- 게임 녹화 원본이 watch folder에 들어오면 자동 분석을 시작하고, `CapCut` handoff와 부모 검수까지 이어지는 최소 계약을 고정한다.
- 이 문서는 실제 워커 구현보다 먼저 입력, 출력, 상태 전이, 안전 게이트를 고정하는 SSOT다.

## Trigger
- 새 원본 파일이 watch folder에 들어오면 `video_jobs`에 새 row를 만든다.
- 최초 상태는 `raw_received`다.

## Required Steps
1. `watch-folder intake`
   - 입력: 원본 비디오 파일, 세션 id, 기본 메타데이터
   - 출력: `video_job`, 원본 파일 참조, 작업 시작 시각
2. `analysis bundle`
   - Whisper: 자막 초안 생성
   - PySceneDetect: 장면 분리
   - Auto-Editor: 무음/늘어짐 컷
   - FFmpeg: 프록시와 highlight 후보 출력
3. `draft outputs`
   - full draft preview
   - highlight 후보 3~5개
   - transcript draft
   - risk flags
4. `CapCut handoff`
   - 워커는 CapCut에서 바로 편집하지 않는다.
   - 대신 `capcut_pending`으로 넘기고, 편집자가 열 수 있는 출력 묶음을 남긴다.
5. `parent review`
   - `capcut_done` 이후에는 무조건 `parent_review`를 거친다.
6. `private upload ready`
   - 부모 검수 통과 후에만 `upload_ready` 또는 `uploaded_private`로 넘어간다.

## Required Outputs
- `transcript_state`
- `highlight_count`
- `risky_segment_count`
- `exception_reason`
- `next_action`
- preview clip 또는 draft file reference

## Queue Routing
- `video_jobs.status = upload_ready | uploaded_private`
  - `publish queue`로 들어간다.
- `video_jobs.status = blocked`
  - `exceptions`로 들어간다.
- `video_jobs.status = parent_review`
  - publish queue에 들어가지 않는다.
  - 사람이 보는 별도 검수 게이트로 남는다.

## Safety Rules
- 미성년자 영상은 `human-on-exception` 일반 규칙보다 강한 보호를 적용한다.
- 부모 검수 전에는 어떤 경우에도 공개 큐로 보내지 않는다.
- 개인정보, 친구 음성, 학교/실명, 채팅 노출이 있으면 `blocked` 또는 `parent_review`로 남긴다.

## Implementation Boundary
- 워커는 자동 분석과 상태 전이까지 담당한다.
- `CapCut`은 사람 편집자가 맡는다.
- 최종 공개 승인과 타이밍은 부모 검수와 publish 정책이 맡는다.
