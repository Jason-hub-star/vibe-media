# Media Publish — Brief → Shorts/Longform 영상 + 채널 발행

Brief slug를 받아서 전체 미디어 파이프라인을 실행한다.

## E2E 파이프라인

```
Brief → Gemini 스크립트 생성 (ES 기본)
  → MimikaStudio Chatterbox TTS (jisun 클론 — 기본)
    → whisper-cpp word-level 자막 (구두점 병합, GGML_METAL_DISABLE=1)
      → Pexels Video 배경 수집 (portrait/landscape)
        → Remotion BriefShort V3 / BriefLongform 렌더
          → ffmpeg 합성 (음성 + BGM + loudnorm + 동적 fadeOut)
            → publish:channels (Threads + YouTube + Podcast)
```

## 실행

```bash
# 1. 영상 생성
npx tsx apps/backend/src/workers/run-shorts-render.ts <slug> [--shorts-only] [--force]

# 2. 채널 발행
npm run publish:channels -w @vibehub/backend -- <slug>
```

## 인자

| 인자 | 설명 |
|------|------|
| `<slug>` | Brief slug (필수) |
| `--shorts-only` | Shorts만 생성 |
| `--longform-only` | Longform만 생성 |
| `--dry-run` | 스크립트만 생성 |
| `--force` | 기존 mp4 재생성 |
| `--locale=en` | 영어 (기본: es) |
| `--skip-threads` | Threads 재발행 방지 |

## 도구 경로

| 도구 | 경로 |
|------|------|
| ffmpeg | `/opt/homebrew/bin/ffmpeg` |
| whisper-cpp | `/opt/homebrew/Cellar/whisper-cpp/1.8.4/bin/whisper-cli` |
| whisper 모델 | `models/ggml-base.bin` |
| MimikaStudio | `http://localhost:7693` (재시작: `mimikactl backend start`) |
| BGM 라이브러리 | `assets/bgm/*.mp3` (10곡) |

## 핵심 성공 패턴

- TTS 엔진: **Chatterbox** (qwen3 아님 — hallucinate/크래시)
- TTS 모델: **0.6B** (1.7B는 OOM/타임아웃)
- TTS 기본 보이스: **`jisun`** (`/Users/family/MimikaStudio/data/user_voices/cloners/jisun.wav`)
  - 포맷: 24kHz 모노 PCM 10초 클립 (WAV + TXT + meta.json 3파일 필요)
  - 보이스 추가: `ffmpeg -i <input.mp3> -ss 2 -t 10 -ar 24000 -ac 1 -c:a pcm_s16le <name>.wav`
- TTS hallucination 방어:
  - 최대 duration 초과 시 파일 삭제 후 **10초 쿨다운** 후 재시도
  - 최소 duration 미달 시 (expectedWords × 0.2초) 파일 삭제 후 **5초 쿨다운**
- TTS 응답: JSON `audio_url` → 별도 GET 다운로드 (바이너리 직접 반환 아님)
- Whisper: **whisper-cpp** `--output-json-full` (Python whisper 아님)
- Whisper Metal GPU 오염: MimikaStudio TTS 후 동일 tsx 프로세스에서 whisper-cli 호출 시
  exit code 3 크래시 → **`env: { GGML_METAL_DISABLE: "1" }`** 으로 CPU fallback 강제
- 씬 분할: **프레임 균등 분배** (문장 매칭 아님)
- 구두점: 이전 단어에 **병합** (독립 토큰 금지)
- BGM fadeOut: `voiceDurationSec - 3`초 시작 (동적)
- 기본 언어: **스페인어** (Latin American)
- YouTube description: **4800자 하드캡** (YouTube 5000자 한도, suffix 먼저 확보 후 body 잘라냄)

## 검증 상태

| 항목 | 상태 |
|------|------|
| Shorts ES (9:16, ~58초) | ✅ 2026-03-31 검증 |
| Longform (16:9, ~2분) | ✅ 2026-04-01 검증 (jisun 보이스, GGML_METAL_DISABLE=1) |
| Threads 발행 | ✅ 검증 완료 |
| YouTube API 업로드 | ✅ 검증 완료 (description 4800자 캡 포함) |
| Podcast RSS (Spotify) | ✅ 검증 완료 |

## 제약사항

- 일일 처리 상한: 최대 2건 (1건당 Shorts ~3분 + Longform ~5분)
- MimikaStudio가 긴 텍스트에서 크래시 가능 → 재시작 후 재시도
- 썸네일: 수동 (Gemini AI Studio 웹)
- YouTube 공개 전환: 수동 (unlisted로 업로드 후 확인)
