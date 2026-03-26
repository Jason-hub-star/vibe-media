# Media Publish — Brief → 토킹 아바타 영상 + YouTube 업로드 준비

Brief slug를 받아서 전체 미디어 파이프라인을 실행한다.

## 검증된 성공 패턴 (2026-03-27)

```
Brief → NotebookLM 비디오 생성 (nlm)
  → 수동 다운로드 (NotebookLM 웹)
    → Whisper STT 자막 생성 (faster-whisper)
      → Talking Head 아바타 렌더 (talking-head-anime-3)
        → ffmpeg 합성 (NLM 비디오 + 아바타 PIP + 자막)
          → YouTube 업로드 가이드 TXT
```

## 인자

- `<slug>`: Brief slug (필수)
- `--skip-nlm`: NotebookLM 생성 건너뛰기 (이미 다운로드한 경우)
- `--avatar <path>`: 아바타 이미지 (기본: output/{slug}/avartar.png)
- `--style <style>`: NLM 비디오 스타일 (classic, whiteboard, kawaii, anime 등) 기본: classic

## Steps

### 1. NotebookLM 오디오/비디오 생성 (--skip-nlm이 아닐 때)

```bash
# 노트북 확인 또는 생성
nlm notebook list
nlm audio create <notebook-id> -f brief -l short --language en -y
nlm video create <notebook-id> -f brief -s classic --language en -y

# 완료 대기 (30초 간격 폴링)
nlm studio status <notebook-id>
```

⚠️ 완료 후 **NotebookLM 웹에서 수동 다운로드** 필요:
- 비디오 → `output/{slug}/video.mp4`
- 오디오 → `output/{slug}/audio.m4a` (선택)

### 2. Whisper STT 자막 생성

```bash
# 비디오에서 오디오 추출
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y \
  -i output/{slug}/video.mp4 \
  -vn -ar 16000 -ac 1 -c:a pcm_s16le \
  output/{slug}/audio-for-stt.wav
```

```python
# faster-whisper (MimikaStudio venv 활용)
/Users/family/MimikaStudio/venv/bin/python << 'EOF'
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("output/{slug}/audio-for-stt.wav", language="en", word_timestamps=True)
# SRT 생성 → output/{slug}/subtitles-en.srt
EOF
```

### 3. Talking Head 아바타 렌더

**확정 설정:**
- 모델: `separable_float` (MPS 6.5fps, 2분 영상 ~5분)
- FPS: `24`
- 이미지: `512x512` 강제 리사이즈 또는 투명 패딩 (전신 이미지 필수)
- ⚠️ **전신 이미지에서만 입이 잘 움직임** — 클로즈업은 변화 미미

```bash
/Users/family/talking-head-anime-3-demo/venv/bin/python \
  tools/talking-head-render.py \
  output/{slug}/avartar.png \
  output/{slug}/audio-full.wav \
  output/{slug}/avatar.mp4 \
  --fps 24 --model separable_float
```

**포즈 파라미터 (최적값):**
| 인덱스 | 파라미터 | 공식 |
|--------|---------|------|
| 26 | mouth_aaa | `vol * 0.8` |
| 27 | mouth_iii | `vol * 0.3 * cos(t*4)` |
| 30 | mouth_ooo | `vol * 0.4 * sin(t*5)` |
| 16,17 | eye_surprised | `vol * 0.2` |
| 12,13 | eye_wink (깜빡임) | 4초 주기, 3.8~4.0s 구간 |
| 38 | head_x | `sin(t*0.5) * 0.1` |
| 39 | head_y | `sin(t*0.3) * 0.06` |
| 44 | breathing | `sin(t*0.8) * 0.3` |

### 4. ffmpeg 최종 합성

**확정 레이아웃:**
- 아바타: 500px, 위치 `W-350:H-275` (우하단, NotebookLM 워터마크 가림)
- 자막: 하단 중앙 (Alignment=2)
- 자막 하드코딩: `ffmpeg-full` 필요 (`/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`)

```bash
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y \
  -i output/{slug}/video.mp4 \
  -i output/{slug}/avatar-alpha.mov \
  -filter_complex " \
    [1:v]scale=500:-1[avatar]; \
    [0:v][avatar]overlay=W-350:H-275:shortest=1[vid]; \
    [vid]subtitles=output/{slug}/subtitles-en.srt:force_style='FontSize=20,FontName=Arial,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=20,Alignment=2'[out]" \
  -map "[out]" -map 0:a \
  -c:v libx264 -crf 20 -preset fast -c:a copy -shortest \
  output/{slug}/final.mp4
```

### 5. YouTube 업로드 가이드 생성

```bash
npm run publish:channels <slug>
# → output/{slug}/youtube-upload-guide.txt 자동 생성
# → Threads 자동 발행 (PUBLISH_CHANNELS에 threads 포함 시)
```

### 6. 수동 업로드 안내

```
📁 output/{slug}/
  ✅ final.mp4              — YouTube에 업로드할 최종 영상
  ✅ subtitles-en.srt       — YouTube 자막 파일
  ✅ youtube-upload-guide.txt — 제목/설명/태그 복붙 가이드
  ✅ avatar-alpha.mov       — 아바타 영상 (알파 포함)
  ✅ video.mp4              — NLM 원본 비디오

🚀 YouTube Studio에서:
  1. final.mp4 업로드
  2. guide.txt 보면서 제목/설명/태그 복붙
  3. subtitles-en.srt 자막 업로드
  4. Unlisted → 확인 후 Public
```

## 도구 경로

| 도구 | 경로 |
|------|------|
| ffmpeg-full | `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` |
| faster-whisper | `/Users/family/MimikaStudio/venv/bin/python` |
| talking-head-anime-3 | `/Users/family/talking-head-anime-3-demo/venv/bin/python` |
| nlm CLI | `nlm` (uv tool) |
| 렌더 스크립트 | `tools/talking-head-render.py` |

## 아바타 규칙

- **전신 이미지만 사용** (클로즈업은 입 변형 안 됨)
- 투명 배경 PNG (RGBA)
- 원본 비율 유지: 512x512에 투명 패딩 또는 강제 리사이즈
- 입 다문 표정이 입 벌린 표정보다 변화 폭이 더 클 수 있지만, 전신이면 벌린 표정도 OK
- 현재 확정 아바타: `output/{slug}/avartar.png` (VH TECH 전신)

## 제약사항

- NotebookLM 미디어 다운로드는 수동 (Google CDN 인증 제한)
- talking-head-anime-3는 Apple Silicon MPS에서 ~10fps (2분 영상 ~5분)
- 썸네일은 수동 (Gemini AI Studio 웹에서 생성)
