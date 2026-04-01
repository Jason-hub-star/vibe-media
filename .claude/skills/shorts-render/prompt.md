# Shorts + Longform Render — Brief → YouTube 영상 자동 생성

Brief slug를 받아서 Shorts(9:16) + Longform(16:9) 풀 파이프라인을 실행한다.
같은 엔진(BriefShort V3)을 해상도만 바꿔서 공유한다.

## 검증된 E2E 파이프라인 (2026-04-01, V3 Production Final)

```
Brief (Supabase)
  → Gemini 스크립트 (Shorts: 80-100단어, Longform: 300-350단어)
    → MimikaStudio **Chatterbox** 엔진 (jisun 클론 — 기본)
      → 2문장 청크 분할 → 각각 TTS
        → hallucination 감지 (duration > 단어수×1.2초) → 10초 쿨다운 후 재시도
        → too-short 감지 (duration < 단어수×0.2초) → 5초 쿨다운 후 재시도
        → ffmpeg concat
        → whisper-cpp --output-json-full (GGML_METAL_DISABLE=1) 워드 타임스탬프
          → 구두점 토큰 이전 단어에 병합
            → 프레임 균등 분배 씬 분할 (4/8씬)
              → Pexels 비디오 배경 (중복 제거)
                → Remotion BriefShort V3 렌더
                  → 타이틀 카드(2.5초) → 자막 → CTA 아웃트로(2.5초) 순서 분리
                    → ffmpeg 합성 (음성 + BGM + loudnorm + 동적 fadeOut)
```

## CLI 명령

```bash
# 프로젝트 루트에서 실행
npx tsx apps/backend/src/workers/run-shorts-render.ts <slug> [옵션]

# 또는 npm run (cwd가 apps/backend이므로 모델 경로 주의)
npm run video:render -w @vibehub/backend -- <slug> [옵션]
```

## 인자

| 인자 | 설명 | 기본값 |
|------|------|--------|
| `<slug>` | Brief slug (필수) | - |
| `--shorts-only` | Shorts만 생성 | 둘 다 |
| `--longform-only` | Longform만 생성 | 둘 다 |
| `--dry-run` | 스크립트만 생성, 렌더 스킵 | false |
| `--force` | 기존 mp4 있어도 재생성 | false (skip) |
| `--locale=en` | 영어 파이프라인 | **es** (스페인어) |

## 사전 조건

| 항목 | 확인 방법 |
|------|-----------|
| MimikaStudio | `curl http://localhost:7693/api/health` → `{"status":"ok"}` |
| Chatterbox 모델 | `~/.cache/huggingface/hub/models--mlx-community--chatterbox-fp16` 존재 |
| ffmpeg | `which ffmpeg` |
| whisper-cpp | `/opt/homebrew/Cellar/whisper-cpp/1.8.4/bin/whisper-cli --help` |
| whisper 모델 | `ls models/ggml-base.bin` (프로젝트 루트) |
| BGM | `ls assets/bgm/*.mp3` → 10곡 |
| env | `.env.local`에 `GEMINI_API_KEY`, `PEXELS_API_KEY`, `SUPABASE_*` |

MimikaStudio 시작: `/Users/family/MimikaStudio/bin/mimikactl backend start`
Chatterbox 모델 다운: `MimikaStudio venv → snapshot_download('mlx-community/chatterbox-fp16')`

## 핵심 성공 패턴 (실패→해결 경험 기반)

### TTS 엔진: Chatterbox (Qwen3 아님!)

| 시도 | 결과 | 결론 |
|------|------|------|
| Qwen3 1.7B | OOM/타임아웃 | ❌ 사용 금지 |
| Qwen3 0.6B 전체 텍스트 | 163초 hallucinate | ❌ |
| Qwen3 0.6B 1문장 청크 | 6/12에서 서버 크래시 | ❌ |
| **Chatterbox 2문장 청크** | **12/12 성공, 크래시 0** | ✅ 최종 |

- **엔진:** `engine: "chatterbox"` (기본값)
- **API:** `POST /api/chatterbox/generate` → JSON `{ audio_url }` → 별도 GET 다운로드
- **음성:** `voice_name: "jisun"` (기본값 — `/Users/family/MimikaStudio/data/user_voices/cloners/jisun.wav`)
  - 보이스 추가 방법: `ffmpeg -i <input.mp3> -ss 2 -t 10 -ar 24000 -ac 1 -c:a pcm_s16le <name>.wav`
  - 3파일 필요: `<name>.wav` + `<name>.txt` (빈 파일 가능) + `<name>.meta.json`
- **청크:** 2문장 단위 분할 (`splitIntoChunks(text, 2)`)
- **hallucination 가드:** 각 청크 duration > `단어수 × 1.2초` → **10초 쿨다운** 후 재시도
- **too-short 가드:** 각 청크 duration < `단어수 × 0.2초` → **5초 쿨다운** 후 재시도
- **서버 크래시 대응:** 3회 retry + `mimikactl backend start` 자동 재시작
- **청크 간 딜레이:** 3초 (서버 안정화)

### 스크립트: 80-100 words (STRICT)

- Chatterbox가 느리게 읽어서 **120+ words → 90초 초과**
- **80-100 words가 35-50초 Shorts에 최적**
- Gemini 프롬프트에 `(STRICT — Chatterbox TTS reads slowly)` 명시

### Whisper: whisper-cpp (Python 아님!)

- 바이너리: `/opt/homebrew/Cellar/whisper-cpp/1.8.4/bin/whisper-cli`
- `--output-json-full` → token별 `offsets.from/to` (밀리초)
- 모델: `models/ggml-base.bin` (`findModelPath()` 자동 탐색 — cwd 무관)
- **구두점 토큰 병합:** `,` `.` `!` 등은 이전 단어에 합침 (자막 깜빡임 방지)
- **⚠️ Metal GPU 오염:** MimikaStudio TTS 후 동일 tsx 프로세스에서 whisper-cli 실행 시
  `ggml_metal_library_compile_pipeline: compiling` 단계에서 exit code 3 크래시 발생
  → `spawnAsync` 옵션에 `env: { ...process.env, GGML_METAL_DISABLE: "1" }` 필수
  → CPU fallback 사용 (속도 차이 미미, 안정성 확보)

### 씬 분할: 프레임 균등 (문장 매칭 아님!)

- `totalEndFrame / sceneCount`로 균등 분배
- ~~문장 경계 매칭은 불안정하여 폐기~~
- Pexels 비디오 중복 제거: `usedIds` Set으로 같은 영상 반복 방지

### Remotion 타이밍 (겹침 방지)

```
[0초 ─── 타이틀 카드 (VIBEHUB + 제목 + 불투명 배경) ─── 2.5초]
                                    [2.5초 ─── 자막 시작 ─── 끝-2.5초]
                                                          [끝-2.5초 ─── CTA 아웃트로 ─── 끝]
```

- **타이틀 카드:** 0~2.5초, 불투명 배경 (YouTube 썸네일 겸용), VIBEHUB 브랜드 + 제목
- **자막:** 2.5초 이후부터 표시 (`TITLE_CARD_DURATION_SEC` 가드)
- **CTA:** `contentEndFrame - fps*2.5`부터, props `durationInFrames` 기반
- 기본 CTA: "Síguenos en VibeHub"

### YouTube 썸네일 전략

YouTube Shorts는 **커스텀 썸네일 업로드 불가** — YouTube가 자동 추출한 3프레임 중 선택만 가능.

**대응:** 타이틀 카드(첫 0~2.5초)를 포스터 수준으로 디자인 → YouTube가 첫 프레임에서 추출 시 브랜딩+제목이 보이도록.

타이틀 카드 구성:
- **불투명 배경** (0초: 95% → 0.5초: 60% 페이드)
- **VIBEHUB 브랜드** (상단, 오렌지, letter-spacing 8)
- **액센트 그라데이션 라인** (오렌지→금색)
- **제목** (54px, Montserrat Black, UPPERCASE)
- **"TECH BRIEFING" 태그라인** (하단, 반투명)

⚠️ 자막은 2.5초 이후 시작 → 타이틀 카드와 겹치지 않음 → 썸네일에 자막 노이즈 없음

Longform은 `thumbnailFilePath`를 `publish:channels`에 전달하면 YouTube API로 커스텀 썸네일 업로드 가능 (`youtube-api.ts`의 `uploadThumbnail()`).

### ffmpeg 합성

- BGM fadeOut: `voiceDurationSec - 3`초 시작 (동적)
- dropout_transition: 3초
- `-c:v copy` (재인코딩 없음)

## 알려진 문제 + 해결 패턴

| 문제 | 원인 | 해결 |
|------|------|------|
| TTS hallucinate (40초+) | Chatterbox가 3문장 이상에서 반복 생성 | 2문장 청크 + max duration 가드 + **10초 쿨다운** 재시도 |
| TTS garbled audio (자막 공백) | hallucination 직후 즉시 재시도 → 불안정 상태 | **10초 쿨다운** 후 재시도 (2026-04-01 수정) |
| TTS too-short (텍스트 누락) | 서버 불안정 → 일부 단어 생략 | min duration 가드 (단어수×0.2초) + **5초 쿨다운** |
| TTS 서버 크래시 | Qwen3 연속 요청 과부하 | **Chatterbox 엔진 전환** |
| MimikaStudio API가 WAV 대신 JSON | API 설계: `audio_url` 반환 | `res.json()` → `audio_url` → GET 다운로드 |
| Whisper exit code 3 크래시 | MimikaStudio TTS 후 Metal GPU 컨텍스트 오염 | `GGML_METAL_DISABLE=1` env → CPU fallback (2026-04-01 수정) |
| Whisper 모델 못 찾음 | cwd ≠ 프로젝트 루트 | `findModelPath()` 5단계 상위 탐색 |
| YouTube description 400 오류 | markdownBody 8000자+ → 5000자 한도 초과 | **4800자 하드캡** (suffix 먼저 확보, body 잘라냄) (2026-04-01 수정) |
| Podcast 에피소드 유실 | feed.xml 로컬 없으면 새로 시작, Supabase 미업로드 | 리모트 fetch fallback + 즉시 Supabase 업로드 + WebSub ping (2026-04-01 수정) |
| 자막+타이틀 겹침 | 둘 다 0초 시작 | 자막에 2.5초 딜레이 |
| CTA 안 나옴 | Composition durationInFrames ≠ 실제 | props `durationInFrames` 전달 |
| 총 TTS > 75초 | 스크립트 120+ words | **80-100 words로 제한** |
| Pexels 배경 중복 | 같은 키워드 → 같은 영상 | `usedIds` Set으로 중복 제거 |
| Gemini 503 | 일시 과부하 | retry 3회 + backoff (2s, 4s, 6s) |

## 출력물

```
output/<slug>/
├── shorts-script.txt         # 스크립트 (ES)
├── shorts-voice.wav          # TTS 음성 (Chatterbox + loudnorm)
├── shorts-voice-words.json   # word-level 타임스탬프
├── shorts-props.json         # Remotion input props
├── shorts.mp4                # 최종 Shorts (9:16, ~50초)
├── longform-script.txt
├── longform-voice.wav
├── longform-voice-words.json
├── longform-props.json
├── longform.mp4              # 최종 Longform (16:9, ~2분)
└── render-meta.json          # 메타 (BGM, duration, timestamp)
```

## 코드 모듈

| 모듈 | 경로 | 역할 |
|------|------|------|
| qwen3-client | `packages/media-engine/src/tts/qwen3-client.ts` | MimikaStudio Chatterbox/Qwen3 + 청크 + 후처리 |
| whisper-word-level | `packages/media-engine/src/stt/whisper-word-level.ts` | whisper-cpp JSON → ShortWord[] |
| script-generator | `packages/media-engine/src/video/script-generator.ts` | Gemini 스크립트 (ES/EN) |
| scene-splitter | `packages/media-engine/src/video/scene-splitter.ts` | 프레임 균등 씬 분할 |
| ffmpeg-compose | `packages/media-engine/src/video/ffmpeg-compose.ts` | 음성+BGM 합성 |
| render-brief-video | `packages/media-engine/src/video/render-brief-video.ts` | 9단계 오케스트레이션 |
| run-shorts-render | `apps/backend/src/workers/run-shorts-render.ts` | CLI worker |
| BriefShort.tsx | `packages/media-engine/src/remotion/BriefShort.tsx` | V3 Composition |
