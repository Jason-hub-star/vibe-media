# Video Pipeline

## Goal
- 게임 녹화 원본을 내부 `video_jobs` 파이프라인으로 흘려 보내고, 자동 초벌 편집 뒤 `CapCut` 후보정을 거쳐 부모 검수 후 `private upload`까지 밀어 올린다.
- 이 흐름은 공개 비디오 피드가 아니라 운영자 전용 내부 워크플로다.

## Core Flow
1. `raw capture`
   - OBS 또는 동등한 녹화 도구가 원본 파일을 watch folder로 보낸다.
2. `auto analysis`
   - Whisper: 자막 초안
   - PySceneDetect: 장면 구분
   - Auto-Editor: 무음/늘어짐 컷
   - FFmpeg: 프록시, highlight 후보, 미리보기 출력
3. `CapCut finishing`
   - 컷 템포
   - 자막 미감
   - punch-in / emphasis
   - BGM / effects
   - 쇼츠 리프레이밍
4. `parent review`
   - 미성년자 보호
   - 실명/학교/친구 음성/채팅 노출 점검
   - 제목/썸네일 안전성
   - 공개 범위 최종 승인
5. `private upload`
   - 기본값은 private
   - 승인 후에만 예약 또는 공개

## Status Model
- `raw_received`
- `analysis_running`
- `auto_cut_done`
- `highlight_candidates_ready`
- `capcut_pending`
- `capcut_in_progress`
- `capcut_done`
- `parent_review`
- `upload_ready`
- `uploaded_private`
- `published`
- `blocked`

## Required Admin Surfaces
- `/admin/video-jobs`
  - 원본 세션, 자동 분석 상태, CapCut handoff, 부모 검수 상태를 한 번에 본다.
- `/admin/publish`
  - private upload 뒤 publish queue를 관리한다.
- `/admin/exceptions`
  - blocked 또는 위험 플래그가 있는 영상을 모은다.

## Required Metadata
- `source_session`
- `kind`
- `status`
- `asset_link_state`
- `transcript_state`
- `highlight_count`
- `risky_segment_count`
- `exception_reason`
- `next_action`

## Queue Routing
- `upload_ready`와 `uploaded_private`는 `publish queue` 후보가 된다.
- `blocked`는 `exceptions`로 바로 들어간다.
- `parent_review`는 부모 승인 전까지 publish queue에 진입하지 않는다.
- 실제 watch-folder intake와 분석 출력 계약은 `docs/ref/VIDEO-WORKER-CONTRACT.md`를 따른다.

## Automation Boundary
- 자동화가 만드는 것
  - 초벌 컷
  - 자막 초안
  - 하이라이트 후보
  - 제목/설명 초안
- `CapCut`이 맡는 것
  - 시청 감각이 느껴지는 최종 리듬과 마감
- 부모가 맡는 것
  - 공개 승인

## Safety Rule
- 미성년자 영상은 `human-on-exception`보다 더 강한 보호를 적용한다.
- 최종 공개 전 부모 검수는 항상 남긴다.
