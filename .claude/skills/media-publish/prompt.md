# Media Publish — Brief → Shorts/Longform 영상 + 채널 발행

Brief slug를 받아서 전체 미디어 파이프라인을 실행한다.

## E2E 파이프라인

```
Brief → Gemini 스크립트 생성
  → MimikaStudio TTS (woman-es 클론)
    → Whisper word-level 자막 (JSON)
      → Pexels 배경 이미지 수집
        → Remotion BriefShort V3 / BriefLongform 렌더
          → ffmpeg 합성 (음성 + BGM + loudnorm)
            → publish:channels (Threads + YouTube + Podcast)
```

## 인자

- `<slug>`: Brief slug (필수)
- `--skip-threads`: Threads 재발행 방지
- `--force`: output 폴더에 영상이 있어도 다시 생성

## 도구 경로

| 도구 | 경로 |
|------|------|
| ffmpeg-full | `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` |
| faster-whisper | `~/MimikaStudio/venv/bin/python` |
| MimikaStudio TTS | `http://localhost:7693/api/health` |
| BGM 라이브러리 | `assets/bgm/*.mp3` (10곡) |

## 검증 상태

| 항목 | 상태 |
|------|------|
| Shorts (9:16, 50-58초) | ✅ 검증 완료 |
| Longform (16:9, ~2분) | ✅ 검증 완료 |
| Remotion BriefShort V3 | ✅ 검증 완료 |
| Remotion BriefLongform | ✅ 검증 완료 |
| Threads 발행 | ✅ 검증 완료 |
| YouTube API 업로드 | ✅ 검증 완료 |
| Podcast RSS (Spotify) | ✅ 검증 완료 |

## 제약사항

- 일일 처리 상한: 최대 2건 (1건당 ~50분)
- 썸네일: 수동 (Gemini AI Studio 웹)
- YouTube 공개 전환: 수동 (unlisted로 업로드 후 확인)
