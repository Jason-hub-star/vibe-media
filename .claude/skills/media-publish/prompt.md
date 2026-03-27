# Media Publish — Brief → 토킹 아바타 영상 + YouTube 업로드 준비

Brief slug를 받아서 전체 미디어 파이프라인을 실행한다.

## 검증된 E2E 파이프라인 (2026-03-27)

```
Brief → NotebookLM 비디오 생성 (nlm)
  → 다운로드 (Claude in Chrome 또는 수동)
    → Whisper STT 자막 (faster-whisper)
      → 화자 감지 → 아바타 자동 선택 (남/녀)
        → Talking Head 아바타 렌더
          → overlay-avatar.sh (아바타 + 자막 합성)
            → Remotion 인트로/아웃트로
              → compose-final.sh (최종 합성)
```

## 인자

- `<slug>`: Brief slug (필수)
- `--skip-nlm`: NotebookLM 생성 건너뛰기
- `--skip-threads`: Threads 발행 건너뛰기

## Steps

### 1. NotebookLM 비디오 생성

```bash
nlm audio create <notebook-id> -f brief -l short --language en -y
nlm video create <notebook-id> -f brief -s classic --language en -y
nlm studio status <notebook-id>  # 완료 대기
```

다운로드: Claude in Chrome 또는 수동 → `output/{slug}/video.mp4`

### 2. Whisper STT 자막

```bash
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y \
  -i output/{slug}/video.mp4 -vn -ar 16000 -ac 1 -c:a pcm_s16le \
  output/{slug}/audio-for-stt.wav
```

```bash
~/MimikaStudio/venv/bin/python -c "
from faster_whisper import WhisperModel
model = WhisperModel('base', device='cpu', compute_type='int8')
segments, info = model.transcribe('output/{slug}/audio-for-stt.wav', language='en', word_timestamps=True)
# → output/{slug}/subtitles-en.srt
"
```

### 3. 아바타 렌더 (화자 자동 감지)

```bash
~/talking-head-anime-3-demo/venv/bin/python \
  tools/talking-head-render.py \
  output/{slug}/audio-for-stt.wav \
  output/{slug} \
  --fps 24 --model separable_float
```

⚠️ 이 스크립트가 자동으로:
1. 화자 감지 (male_solo / female_solo / dual)
2. 해당 아바타 렌더
3. `avatar-meta.json` + `avatar-*-alpha.mov` 생성

### 4. 아바타 overlay + 자막 burn-in

```bash
bash tools/overlay-avatar.sh {slug}
# → output/{slug}/final.mp4
```

⚠️ `overlay-avatar.sh`를 직접 실행할 것 — ffmpeg 명령을 자체 생성하지 마라.

### 5. Remotion 인트로/아웃트로 + 최종 합성

```bash
npx remotion render packages/media-engine/src/remotion/index.tsx BrandIntro \
  output/{slug}/intro.mp4 --props='{"title":"<brief-title>"}'

npx remotion render packages/media-engine/src/remotion/index.tsx BrandOutro \
  output/{slug}/outro.mp4

bash tools/compose-final.sh {slug}
# → output/{slug}/complete.mp4
```

⚠️ `compose-final.sh`를 직접 실행할 것 — ffmpeg 명령을 자체 생성하지 마라.

### 6. YouTube 가이드 + Threads 발행

```bash
npm run publish:channels {slug}
# → output/{slug}/youtube-upload-guide.txt + Threads 발행
```

### 7. YouTube 업로드 (수동)

```
📁 output/{slug}/
  ✅ complete.mp4           — YouTube 업로드용 최종 영상
  ✅ subtitles-en.srt       — 자막 파일
  ✅ youtube-upload-guide.txt — 복붙 가이드
```

## 도구 경로

| 도구 | 경로 |
|------|------|
| ffmpeg-full | `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` |
| faster-whisper | `~/MimikaStudio/venv/bin/python` |
| talking-head-anime-3 | `~/talking-head-anime-3-demo/venv/bin/python` |
| nlm CLI | `nlm` (uv tool) |
| 아바타 렌더 | `tools/talking-head-render.py` |
| 아바타 overlay | `tools/overlay-avatar.sh` |
| 최종 합성 | `tools/compose-final.sh` |
| 화자 감지 | `tools/detect-speakers.py` |

## 아바타 규칙 (수정 금지)

### 공용 아바타
- 여자: `assets/brand/vh-avatar.png`
- 남자: `assets/brand/vh-avatar-male.png`

### 필수 조건
- **전신 이미지만 사용** — 클로즈업은 입 변형 안 됨
- 투명 배경 PNG (RGBA)
- **512x512 투명 패딩 필수** — `img.resize((512, 512))` 강제 리사이즈 금지

### 화자별 아바타 선택 (자동)
| 모드 | 조건 | 아바타 |
|------|------|--------|
| `male_solo` | 남자 > 80% | 남자만 (우하단) |
| `female_solo` | 여자 > 80% | 여자만 (우하단) |
| `dual` | 둘 다 20%+ | ⚠️ 실험적 — 남(좌하단) + 여(우하단) |

## ffmpeg 합성 규칙 (수정 금지)

- 아바타 overlay: `scale=600:-1` / `crf 20` / `Alignment=2` / `FontSize=20`
  · 남자 solo: `overlay=W-460:H-330` (팔 안 잘림)
  · 여자 solo: `overlay=W-420:H-330`
  · 듀얼: 남(좌 `-180:H-330`) + 여(우 `W-420:H-330`)
- 이 값들은 시행착오 끝에 확정됨 — 임의로 바꾸지 말 것

## Remotion + compose 규칙

- 인트로→본편: xfade 크로스페이드 (1초)
- 본편→아웃트로: silencedetect 자동 감지 → fade-out/fade-in (0.5초, 워터마크 0%)
- 설정 오버라이드: `FADE_DUR=0.5 INTRO_XFADE_DUR=1 bash tools/compose-final.sh {slug}`

## 검증 상태

| 항목 | 상태 |
|------|------|
| 여자 1인 아바타 (female_solo) | ✅ 검증 완료 |
| 남자 1인 아바타 (male_solo) | ✅ 검증 완료 |
| 화자 감지 자동 선택 | ✅ 검증 완료 |
| overlay-avatar.sh (1인) | ✅ 검증 완료 |
| compose-final.sh | ✅ 검증 완료 |
| Remotion 인트로/아웃트로 | ✅ 검증 완료 |
| **듀얼 아바타 (2인 동시)** | ⚠️ 실험적 — 코드 작성됨, 미검증 |

## 제약사항

- NotebookLM 다운로드: Claude in Chrome 확장 필요 (Python 직접 다운로드 불가)
- talking-head-anime-3: MPS ~10fps, 2분 영상 ~5분
- 아바타 최대 크기: 500px (512 렌더 → 원본 한계)
- 썸네일: 수동 (Gemini AI Studio 웹)
- NotebookLM 화자 선택 불가 — 랜덤 배정
