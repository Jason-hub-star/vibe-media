# Channel Publish Pipeline v2

## Goal
- critic 통과 후 published brief를 **Threads, Ghost/블로그, 티스토리, YouTube, X/Twitter, Instagram Reels, LinkedIn, Podcast RSS** 등 외부 채널로 자동/반자동 배포한다.
- 오디오는 **NotebookLM 2인 대화 팟캐스트**(주 경로) 또는 **Qwen3-TTS 1인 나레이션**(백업 경로)으로 생성한다.
- YouTube 영상은 **YouTube Data API v3로 자동 업로드**(unlisted) 후 운영자가 공개 전환한다. 환경변수 미설정 시 로컬 메타 저장 fallback.
- `publish:channels`가 `shorts.mp4` / `longform.mp4`를 자동 감지하여 각각 업로드한다. Shorts는 `#Shorts` 태그 자동 추가.
- 모든 채널은 **크로스 프로모션 링크**로 서로를 연결해 트래픽을 순환시킨다.

## v1 → v2 변경 사유

| 항목 | v1 (기존) | v2 (현재) | 변경 근거 |
|------|----------|----------|----------|
| TTS 엔진 | MimikaStudio (P1) | NotebookLM 2인 대화 (주) + Qwen3-TTS (백업) | MimikaStudio: alpha 단계, 단독 개발자, macOS only, API 스키마 비공개, 라이선스 혼란 (README BSL-1.1 vs LICENSE GPLv3). 실현성 5/10 |
| YouTube 업로드 | Data API v3 자동 → v1 폐기 | Data API v3 비공개 자동 업로드 + 운영자 공개 전환 (fallback: 로컬 저장) | OAuth 미검증 → private 업로드로 우회. `youtube:setup` CLI로 토큰 1회 발급 |
| Threads | 미포함 | 최우선 텍스트 채널 (P1) | 공식 무료 API, 250건/일, 텍스트+이미지+비디오+캐러셀. 실현성 9/10 |
| 크로스 프로모션 | 미포함 | 2-pass 발행 + YouTube 비동기 3rd pass | 채널 간 트래픽 순환 없으면 각 채널이 고립된 섬 |
| 피드백 루프 | 미포함 | YouTube Analytics 기반 자기개선 | 발행 후 성과 데이터가 파이프라인에 돌아오지 않으면 품질 개선 불가 |
| 팟캐스트 배포 | Supabase Storage + RSS 셀프호스팅 | Spotify 직접 업로드 → 자동 RSS → Apple/YouTube | 셀프호스팅은 과도한 엔지니어링. Spotify 무료 호스팅이 비용 0 + 코드 0 |
| Remotion 라이선스 | Company License 필요 (리스크) | 개인 무료 확정 | 개인(individual)은 무조건 무료, 상업적 포함. 유료는 영리법인 4명+ |
| Threads 크로스 프로모션 | (미설계) | 자체 답글(reply_to_id)로 링크 추가 | Threads API에 수정 엔드포인트 없음, 답글은 250건 제한 미포함 |

---

## Architecture Overview

```
┌──────────────────── VibeHub 내부 (Mac Apple Silicon) ────────────────────┐
│                                                                          │
│  [기존 파이프라인]                                                        │
│  수집 → 가공 → 초안 → critic → publisher → publish:auto → published      │
│                                                              ↓           │
│  [Channel Renderer Layer]                                                │
│  publish-dispatcher (2-pass)                                             │
│    ├─ TEXT     brief → Threads 요약 / Ghost 전문 / 티스토리 전문         │
│    ├─ AUDIO    brief → NotebookLM 2인 대화 → .mp3                       │
│    │           (fallback: Qwen3-TTS 1인 나레이션)                        │
│    ├─ VIDEO    mp3 + 이미지 → Remotion renderMedia → .mp4               │
│    └─ PROMO    Pass 2: 수집된 URL로 크로스 프로모션 주입                  │
│                                                              ↓           │
│  [Channel Uploader Layer]                                                │
│    ├─ Threads:    공식 Publishing API (OAuth 2.0)                        │
│    ├─ Ghost:      Admin API (REST)                                       │
│    ├─ 티스토리:   Playwright 브라우저 자동화 (보조)                       │
│    ├─ YouTube:    Data API v3 비공개 자동 업로드 (또는 로컬 fallback)    │
│    ├─ X/Twitter:  API v2 Free (스레드 + shorts.mp4)                     │
│    ├─ Instagram:  Graph API Reels (shorts.mp4)                           │
│    ├─ LinkedIn:   Community Mgmt API (텍스트 포스트)                     │
│    └─ Podcast:    자체 RSS XML 생성 → Spotify 자동 배포                  │
│                                                                          │
│  [반자동 채널] (운영자 확인 필요)                                         │
│    ├─ YouTube:  API 비공개 업로드 → 운영자 공개 전환 (1클릭)             │
│    └─ Spotify:  /output/podcast/ mp3 → Spotify for Creators 업로드       │
│                 Spotify 자동 RSS → Apple Podcasts / YouTube 연동          │
│                                                                          │
│  [Feedback Loop] (비동기)                                                │
│    ├─ YouTube Analytics API → 성과 수집                                  │
│    ├─ GA4 Data API → 블로그/티스토리 트래픽                              │
│    └─ insight-generator → 프롬프트/템플릿 파라미터 조정                   │
│                                                                          │
│  산출물(mp4/mp3/text)만 외부로 나감                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

## 기존 파이프라인과의 연결

```
npm run pipeline:daily        ← 수집→가공→초안→critic
npm run publish:auto          ← approved → scheduled → published
npm run publish:channels      ← published brief → 채널별 렌더+배포 (YouTube API 자동 업로드 포함)
npm run publish:link-youtube  ← YouTube 수동 업로드 시 video_id 또는 URL 등록 → Pass 3 (API 모드에서는 자동)
npm run youtube:setup         ← YouTube OAuth2 토큰 발급 + .env.local 저장 (1회)
```

`publish:channels`는 `publish:auto`가 `published` 상태로 전환한 brief를 입력으로 받는다. YouTube API 환경변수(`YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN`)가 설정되면 비공개(private)로 자동 업로드 + brief 자동 링크 연결까지 수행한다. 미설정 시 기존 로컬 메타 모드로 fallback.

---

## 채널 실현성 평가 요약

리서치 기반 실현성 점수 (2026-03-26 조사).

| 채널 | 방식 | 실현성 | 일일 제한 | 핵심 리스크 |
|------|------|--------|----------|------------|
| **Threads** | 공식 Publishing API | **9/10** | 250건/일 | Meta 앱 리뷰 승인 |
| **Ghost/WP** | 공식 REST API | **8/10** | 없음 (셀프호스팅) | 서버 운영 |
| **팟캐스트** | NotebookLM + RSS | **7/10** | NotebookLM 비공식 | Google 내부 API 변경 시 깨짐 |
| **Remotion 영상** | CLI spawn | **7.5/10** | CPU 바운드 | 개인 무료 확정, 템플릿 품질 의존 |
| **YouTube** | Data API v3 비공개 자동 업로드 (fallback: 수동) | **9/10** | 10,000 유닛/일 (~6건) | OAuth 토큰 만료, AI 콘텐츠 정책 |
| **티스토리** | Playwright 자동화 | **5/10** | ~5건/일 | API 종료, UI 변경, AI 감지 |
| **Newsletter** | Resend Broadcasts API | **9/10** | 무료 3,000건/월 | 무료 티어 제한, CAN-SPAM 준수 |
| **X/Twitter** | API v2 Free 티어 | **8/10** | 1,500 트윗/월 | Free 제한, OAuth 1.0a 서명 |
| **Instagram Reels** | Graph API Container | **6/10** | 25건/일 | Meta App Review, 공개 비디오 URL 필요 |
| **LinkedIn** | Community Mgmt API | **6/10** | 없음 | API 신청 필요, 토큰 60일 만료 |
| **Podcast RSS** | 자체 RSS XML 생성 | **9/10** | 없음 | Spotify 1회 등록만 |

### 폐기된 경로

| 경로 | 폐기 사유 |
|------|----------|
| MimikaStudio TTS | Alpha, 단독 개발자(bus factor=1), macOS only, Docker 불가, API 스키마 비공개, 라이선스 불일치 |
| YouTube Data API 공개(public) 자동 업로드 | OAuth 미검증 시 private 잠금 → 비공개 업로드 + 운영자 공개 전환으로 우회 (현재 채택) |
| Claude Cowork 마우스 조작 업로드 | 매 스텝 스크린샷+비전 분석 → 느리고 불안정 (3/10), OS 파일 다이얼로그 취약 |

---

## Layer 1: 오디오 생성

### 주 경로 — NotebookLM 2인 대화 팟캐스트

| 항목 | 내용 |
|------|------|
| 도구 | [notebooklm-mcp-cli](https://github.com/jacob-bd/notebooklm-mcp-cli) |
| GitHub | 3,000+ stars, 406 커밋, 활발 유지 |
| 방식 | Playwright 브라우저 자동화 (비공식 내부 API) |
| MCP 연동 | `nlm setup add claude-code` → Claude Code에서 35개 도구 직접 사용 |
| 출력 | 2인 AI 호스트 대화형 MP3 |
| 스타일 | Deep Dive / Brief / Critique / Debate 선택 |
| 입력 제한 | 100,000 토큰 |

```bash
# 셋업
pip install notebooklm-mcp-cli
nlm login                          # 브라우저로 Google 인증
nlm setup add claude-code          # Claude Code MCP 자동 등록

# 팟캐스트 생성 흐름
nlm notebook create "Brief: OpenAI o3"
nlm source add <notebook-id> --text "$(cat brief-body.md)"
nlm audio create <notebook-id> --confirm
nlm download audio <notebook-id> -o ./output/podcast/
```

**장점**: 1인 나레이션보다 2인 대화가 청취 몰입도 훨씬 높음. brief 원문을 자동으로 대화체로 재구성.

**검증 완료 (2026-03-26)**:
- `nlm login` → `nlm notebook create` → `nlm source add --text` → `nlm audio create` → `nlm download audio` 전체 흐름 성공
- 출력: M4A 32MB, AAC 44.1kHz 스테레오 257kbps, **17분 15초** 2인 대화
- 원본 볼륨 -28.0 dB (작음) → `ffmpeg loudnorm -16 LUFS` 정규화 필수 → -19.4 dB로 개선 확인
- 생성 소요: ~5분 (in_progress → completed)
- Python 3.12 필요 (pyenv local 3.12.13 설정 완료)

**오디오 후처리 (자동, 파이프라인 코드에 포함)**:
```bash
ffmpeg -i {raw} -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 44100 -b:a 192k {normalized} -y
```

**리스크**: 비공식 자동화 → Google 내부 API 변경 시 깨짐. 전용 Google 계정 사용 권장.

### 백업 경로 — Qwen3-TTS 1인 나레이션

NotebookLM 장애 시 fallback.

| 항목 | 내용 |
|------|------|
| 엔진 | Qwen3-TTS (Alibaba) |
| 한국어 품질 | WER 1.741 (오픈소스 최상위, 10개 언어 중 최저 에러율) |
| 모델 크기 | 0.6B / 1.7B (8bit 양자화 지원) |
| 배포 | FastAPI 직접 서버 (Linux/Docker 가능) |
| 대안 | Chatterbox TTS Server (23개 언어, OpenAI-compatible API) |

MimikaStudio를 거치지 않고 Qwen3-TTS를 직접 Python 서버로 운용하면 macOS 종속 제거 + Docker 배포 가능.

---

## Layer 2: 섹션별 이미지 생성 (Gemini)

### 목적

brief 본문을 섹션으로 파싱한 뒤, 각 섹션에 맞는 이미지를 AI로 생성한다. Remotion 영상에서 오디오 진행에 따라 **섹션별 이미지가 전환**되는 비주얼을 제공한다.

### 비용 분석 (2026-03-26 조사)

| 서비스 | 장당 가격 | 월 450장 (15/일) | 비고 |
|--------|----------|-----------------|------|
| **Gemini 2.5 Flash (무료 티어)** | **$0** | **$0** | 하루 500건 무료, 15장이면 3%만 사용 |
| Kie.ai Nano Banana (현재 스택) | $0.02 | $9 | `kie-client.ts` 이미 구현됨 |
| GPT Image 1 Mini | $0.005 | $2.25 | |
| Flux 2 Klein | $0.014 | $6.30 | |

**채택: Gemini 2.5 Flash 무료 티어** — 비용 $0, `gemini-client.ts`에 이미지 모드 추가만 필요. Kie.ai는 fallback으로 유지.

### 기존 인프라 활용

| 모듈 | 역할 | 상태 |
|------|------|------|
| `gemini-client.ts` | Gemini API 래퍼 (현재 텍스트 전용) | ✅ 있음, 이미지 모드 추가 필요 |
| `brief-parser.ts` | brief → 섹션 분리, `imageSlot` 자동 할당 | ✅ 있음 |
| `normalize.ts` | WebP 변환 + 리사이즈 (2048/640) | ✅ 있음 |
| `kie-client.ts` + `kie-provider.ts` | Kie.ai 이미지 생성 | ✅ 있음 (fallback) |
| `registry.ts` | Provider 팩토리 (`USE_MOCK` 전환) | ✅ 있음 |

### 구현 설계

```typescript
// gemini-image.ts — Gemini 이미지 생성 모드 추가
interface GeminiImageOptions {
  prompt: string;           // 섹션 headline + body 요약
  aspectRatio?: '16:9' | '9:16' | '1:1';
  apiKey?: string;
}

interface GeminiImageResult {
  imageBase64: string;      // base64 PNG/JPEG
  mimeType: string;
}

// Gemini 2.5 Flash의 이미지 생성 모드 사용
// 무료 티어: 500 requests/day, 카드 등록 불필요
```

### 파이프라인 흐름

```
brief 본문
  │
  ├─ brief-parser.ts → sections[] (headline, body, imageSlot)
  │
  ├─ 섹션별 이미지 프롬프트 생성
  │   "Generate an editorial illustration for a tech brief section
  │    about: {section.headline}. Context: {section.body의 첫 2문장}"
  │
  ├─ gemini-image.ts → 섹션별 이미지 생성 (16:9)
  │   (fallback: kie-provider.ts)
  │
  ├─ normalize.ts → WebP 1920x1080 리사이즈
  │
  └─ 출력: sections[].imageUrl (로컬 경로)
       → Remotion inputProps로 전달
```

### Remotion에서 사용

```typescript
// BriefPodcast.tsx에서
interface BriefPodcastProps {
  narrationAudio: string;        // NotebookLM MP3
  sections: {
    headline: string;
    imageUrl: string;            // Gemini 생성 이미지
    startFrame: number;          // Whisper 타이밍 기반
    endFrame: number;
  }[];
  subtitlesSrt: string;          // Whisper SRT
}

// 오디오 진행에 따라 섹션 이미지가 전환
// 각 섹션에서: 이미지 페이드인 → headline 오버레이 → 자막 표시
```

### 이미지 생성 전략

| 전략 | 설명 | 사용 시점 |
|------|------|----------|
| **기본** | 커버 이미지 1장 + 자막 + 파형 | 이미지 생성 없이도 영상 성립 |
| **섹션별** | brief 섹션마다 Gemini 이미지 1장 | brief 3~5섹션 → 3~5장 생성 |
| **하이브리드** | 커버(RSS 수집) + 나머지 섹션만 생성 | 커버는 원본 사용, 나머지만 AI |

기본 전략으로도 영상이 성립하므로, 이미지 생성은 **opt-in 플래그**로 제어한다:

```bash
npm run publish:channels <brief-id>              # 기본: 커버만
npm run publish:channels <brief-id> --with-images # 섹션별 이미지 생성
```

---

## Layer 3: Remotion 영상 합성

### 현재 상태

- Remotion v4.0.438 (2026-03-19), 성숙하고 활발한 릴리스
- media-engine에 `render-spawn.ts` 이미 존재 (크로스플랫폼 CLI spawn)
- Media Parser 2026-02-01 deprecated → 신규 구현은 **Mediabunny** 기준
- 개인(individual) 무료 확정 (영리법인 4명+ 시 유료 전환)

### 오디오-영상 동기화

```
NotebookLM M4A → ffmpeg loudnorm → Whisper STT → 영어 SRT → Gemini 번역 → 스페인어 SRT → Remotion Audiogram ×2
```

### Audiogram 전략 (리서치 검증됨, 2026-03-26)

실제 자동화 팟캐스트 채널은 대부분 **Tier 2 (웨이브폼 + 자막 + 커버 1장)**으로 운영된다. 섹션별 이미지 50장은 비현실적 (비용 $2/편 + 렌더 시간 병목 + 품질 관리 불가). Remotion 공식 Audiogram 템플릿을 기반으로 한다.

| 기능 | 구현 방법 |
|------|----------|
| 오디오 길이 → 프레임 수 | `getAudioData()` → `durationInFrames` 자동 계산 |
| 자막 동기화 | Whisper → SRT → `remotion-subtitles` |
| 웨이브폼 | Remotion `visualizeAudio()` |
| 커버 이미지 | brief `cover_image_url` (이미 존재, 생성 불필요) |
| 브랜드 배경 | 고정 템플릿 (1회 제작) |

### 다국어 영상 (영어 + 스페인어)

같은 MP3에서 자막만 번역하면 영상 2개가 비용 $0으로 생성된다.

```
NotebookLM M4A (영어 2인 대화, 1회 생성)
    ├→ Whisper STT → subtitles-en.srt
    │   └→ Remotion Audiogram → video-en-16x9.mp4
    └→ Gemini 번역 → subtitles-es.srt
        └→ Remotion Audiogram → video-es-16x9.mp4
```

| 언어 | 이유 |
|------|------|
| 영어 | YouTube 최대 시청자, AI 뉴스 메인 |
| 스페인어 | YouTube 2위 언어 (5억명+), AI 자막 채널 블루오션 |

향후 성과 데이터 기반으로 언어 추가 (한국어, 포르투갈어 등) 결정.

### 영상 유형

| Composition | 해상도 | 용도 |
|-------------|--------|------|
| `BriefAudiogram` | 1920×1080 (16:9) | YouTube 일반 (웨이브폼 + 자막 + 커버) |
| `BriefShort` | 1080×1920 (9:16) | YouTube Shorts / Threads 비디오 |

### BriefShort V2 — Shorts 렌더 상세 (2026-03-29 검증 완료)

**파이프라인:**
```
Brief (Supabase)
  → Gemini 60초 스크립트 (120-140단어)
    → MimikaStudio Qwen3-TTS 클론 (owner-jason, WAV)
      → Whisper word-level 자막 (JSON)
        → Pexels 배경 이미지 4장 (portrait)
          → Remotion BriefShort V2 (1080×1920, 30fps)
            → ffmpeg 합성 (loudnorm -16 LUFS)
```

**Composition 구조 (BriefShort.tsx):**

| 레이어 | 컴포넌트 | 설명 |
|--------|----------|------|
| L1 | `SceneBackground` | 씬별 배경 이미지 + Ken Burns (zoom-in/out, pan-left/right) + 페이드 전환 |
| L2 | `ProgressBar` | 상단 프로그레스 바 (오렌지→금색 그라데이션) |
| L3 | `BrandWatermark` | VIBEHUB 상시 워터마크 |
| L4 | `TitleCard` | 첫 3초 타이틀 카드 (spring 등장 + 페이드아웃) |
| L5 | `WordByWordCaptions` | 워드바이워드 하이라이트 (spring 바운스 + 금색 active + 배경박스) |
| L6 | `CtaEnding` | 마지막 4초 CTA 버튼 (pulse 효과 + 서브텍스트) |

**Props 구조:**
```typescript
interface BriefShortProps {
  scenes: ShortScene[];   // 배경 4개 씬 (backgroundSrc, startFrame, endFrame, kenBurns)
  words: ShortWord[];     // Whisper 워드별 타임스탬프 (text, startFrame, endFrame)
  title: string;
  ctaText?: string;       // 기본: "Follow VibeHub"
}
```

**TTS 엔진:** MimikaStudio (localhost:7693)
- REST API: `POST /api/qwen3/generate` (mode: "clone", voice_name: "owner-jason")
- 로컬 전용, 비용 $0, 23개 언어 지원
- 이전 "폐기" 판단 → Shorts 보조 경로로 재채택 (DECISION-LOG 참조)

**알려진 제약 + 해결:**

| 제약 | 해결 |
|------|------|
| Remotion public-dir CORS 404 | 배경 이미지를 base64 data URI로 props에 인라인 |
| Remotion 무음 오디오 트랙 | ffmpeg `-map 0:v -map 1:a`로 명시 분리 |
| Sequence 내 프레임 계산 | useCurrentFrame()은 이미 로컬 → startFrame 빼지 않음 |

**출력:** `output/<slug>/shorts.mp4` (1080×1920, 50-58초, AAC 192k, loudnorm -16 LUFS)

### 섹션별 이미지 (P3a → 후순위)

섹션별 AI 이미지 생성은 YouTube retention 데이터를 보고 추가 여부를 결정한다. "이미지 있는 영상이 retention 높은가?"를 확인 후 opt-in.

### 자기개선: AI가 영상을 보지 않는다

| 방식 | 토큰 소모 | 사용 여부 |
|------|----------|:---------:|
| AI가 17분 영상을 시청 | ~100만 토큰 | ❌ 비현실적 |
| **YouTube Analytics API 숫자만 읽기** | **~0 토큰** | ✅ |

retention curve(초 단위 이탈 데이터)를 숫자로 받아서 판단:
- 30초에서 급락 → "인트로 단축"
- 끝까지 유지 → "이 구조 고정"

### 렌더 성능

- Apple Silicon Mac: 1분짜리 1080p 영상 기준 1~3분 렌더
- `--concurrency` 플래그로 전체 CPU 코어 활용
- `npx remotion benchmark`로 최적 concurrency 탐색

### 로컬 출력 구조

```
output/2026-03-25-openai-o3/
  audio.m4a                  ← NotebookLM 원본
  audio-normalized.m4a       ← loudnorm -16 LUFS 후처리
  subtitles-en.srt           ← Whisper STT
  subtitles-es.srt           ← Gemini 번역
  video-en-16x9.mp4          ← 영어 Audiogram
  video-es-16x9.mp4          ← 스페인어 Audiogram
  video-en-9x16.mp4          ← 영어 Shorts (선택)
  thumbnail-en.jpg           ← 영어 썸네일 (Gemini 생성)
  thumbnail-es.jpg           ← 스페인어 썸네일
  metadata.json              ← 양쪽 제목/설명/태그/크로스 프로모션
```

`metadata.json`에는 크로스 프로모션 링크가 포함된 YouTube 설명란 텍스트가 들어가므로, 운영자는 **복사-붙여넣기만** 하면 된다.

---

## Layer 3: 채널별 업로더

### 3-1. Threads (최우선 텍스트 채널)

| 항목 | 내용 |
|------|------|
| API | Meta Threads Publishing API (공식, 무료) |
| 인증 | OAuth 2.0 (`threads_basic` + `threads_content_publish`) |
| 일일 제한 | 250 posts/24h (rolling window) |
| 텍스트 제한 | 500자 (UTF-8) |
| 미디어 | 텍스트, 이미지, 비디오 (MOV/MP4, ≤5분, ≤1GB), 캐러셀 (2~20개), GIF, Poll |

```typescript
// threads-publisher.ts
interface ThreadsPublishRequest {
  text: string;              // brief 요약 (≤500자)
  imageUrl?: string;         // brief cover image
  videoUrl?: string;         // Remotion Short (선택)
  replyToId?: string;        // 크로스 프로모션 답글용
}

// 발행 프로세스:
// 텍스트 전용: POST /{user-id}/threads?auto_publish_text=... (1단계)
// 미디어 포함: POST /{user-id}/threads → POST /{user-id}/threads_publish (2단계)
```

### 3-2. Ghost / WordPress (장문 블로그)

```typescript
// ghost-publisher.ts
interface BlogPublishRequest {
  title: string;
  content: string;           // HTML body + 오디오 embed + 크로스 프로모션 footer
  tags: string[];
  coverImage?: string;
  status: 'draft' | 'published';
}

// Ghost: Admin API POST /ghost/api/admin/posts/
// WordPress: REST API POST /wp-json/wp/v2/posts
```

### 3-3. 티스토리 (한국 SEO 보조 채널)

Open API 2024년 2월 완전 종료. Playwright 브라우저 자동화로 대체.

```typescript
// tistory-publisher.ts
interface TistoryPublishRequest {
  title: string;
  content: string;           // HTML body
  category: string;
  tags: string[];
  coverImage?: string;
  visibility: 'private' | 'public';
}

// Playwright 흐름:
// 1. 저장된 세션으로 로그인 → 만료 시 카카오 재로그인
// 2. 글쓰기 → 제목/본문/카테고리/태그/커버이미지 → 발행
// 3. 발행된 URL 반환
```

**운영 제한**: 하루 ~5건, AI 감지 위험 → 2~3건 이내 권장. 반드시 인간 편집 레이어 통과 후 발행.

### 3-4. 팟캐스트 (Spotify 직접 업로드)

RSS 셀프호스팅은 소규모 운영에 과도한 엔지니어링이다 (Supabase egress 5GB/월 무료 → 50MB 에피소드 100회 다운로드로 소진). 대신 Spotify for Creators에 직접 업로드한다.

```
흐름:
1. NotebookLM → mp3 생성 (또는 Qwen3-TTS fallback)
2. mp3 + 에피소드 메타데이터 → /output/podcast/ 에 로컬 저장
3. 운영자가 Spotify for Creators에 직접 업로드 (주 1~2회)
4. Spotify가 RSS 자동 생성 → Apple Podcasts / YouTube에 제출 (1회 설정)
```

```typescript
// spotify-metadata.ts — 업로드용 메타데이터 생성 (업로드 자체는 수동)
interface PodcastEpisodeMeta {
  title: string;
  description: string;       // brief 요약 + 크로스 프로모션 링크
  audioPath: string;         // 로컬 mp3 경로
  durationMs: number;
  coverImagePath: string;    // brief cover image
}
```

**Spotify 요구사항**: 커버아트 1400×1400~3000×3000 JPG/PNG, 에피소드 ≤200MB, title/description 필수.

**초기 설정 (1회)**: Spotify RSS → Apple Podcasts 제출 (심사 3~5영업일) → YouTube Studio 연결 (오디오→영상 자동 변환).

### 3-5. YouTube (API 자동 업로드 또는 수동 fallback)

YouTube Data API v3 환경변수가 설정되면 **비공개(private)로 자동 업로드** + brief 자동 링크 연결까지 수행한다. 미설정 시 기존 로컬 메타 모드로 fallback.

#### Mode A: API 자동 (권장)

```
사전 설정 (1회):
  npm run youtube:setup -- /path/to/client_secret.json
  → OAuth2 refresh token 발급 + .env.local 자동 저장

publish:channels 실행 시 자동 처리:
  ✅ mp4 → YouTube Data API v3 resumable upload (privacyStatus: "private")
  ✅ 썸네일 업로드 (있으면)
  ✅ brief_posts.youtube_* 자동 갱신 + cache 리셋
  ✅ channel_publish_results 감사 기록
  ✅ Threads Pass 3 크로스프로모 주입

운영자 책임:
  ✅ YouTube Studio에서 내용 확인 후 "공개" 전환 (1클릭)
```

환경변수: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`
할당량: 업로드 1건 = 1,600 유닛 (일일 10,000 기본, ~6건/일)

#### Mode B: 로컬 저장 fallback (API 미설정 시)

```
media-engine 책임:
  ✅ metadata.json (제목/설명/태그) + youtube-upload-guide.txt 로컬 생성

운영자 책임:
  ✅ YouTube Studio에서 직접 업로드
  ✅ 업로드 후 URL 등록 (아래 중 택 1)
```

- Telegram 기본: YouTube URL만 단독 전송
- Telegram override: `/vh-youtube <brief-id> <youtube-url>`
- CLI fallback: `npm run publish:link-youtube -- <video-id-or-url>`
- CLI 명시 연결: `npm run publish:link-youtube -- <brief-id> <video-id-or-url>`

등록이 끝나면 `brief_posts.youtube_url / youtube_video_id / youtube_linked_at`가 채워지고, Pass 3으로 Threads에 YouTube 링크가 다시 주입된다.

### 3-6. Newsletter (Resend Broadcasts)

published brief를 구독자에게 이메일로 발송하는 채널. EN+ES dual-locale 지원.

| 항목 | 내용 |
|------|------|
| API | Resend Broadcasts API (공식, 무료 3,000건/월) |
| 인증 | API Key (`RESEND_API_KEY`) |
| 일일 제한 | 무료 티어 100건/일, Pro 무제한 |
| 템플릿 | inline-CSS HTML (Gmail/Outlook 호환) |
| Locale | EN (기본) + ES (별도 Broadcast, variant 본문 사용) |

```
흐름:
1. publish:auto → published brief 확정
2. newsletter:send → 최신 published brief 수집
3. locale별 HTML 생성 (inline-CSS 템플릿 + brief 카드)
4. Resend Broadcasts API → EN Audience / ES Audience 각각 발송
5. 발송 결과 DB 저장 + Telegram 보고
```

```typescript
// newsletter-publisher.ts
interface NewsletterPublishRequest {
  subject: string;           // brief 제목
  htmlBody: string;          // inline-CSS HTML 본문
  audienceId: string;        // Resend Audience ID (EN or ES)
  locale: 'en' | 'es';
}

// Resend Broadcasts API:
// POST /broadcasts — Broadcast 생성
// POST /broadcasts/{id}/send — 발송
```

**구독자 등록**: 홈페이지 Newsletter CTA → Resend Contacts API (`POST /contacts`) → Audience 자동 분류 (locale 기반).

**운영 제한**: 무료 티어 3,000건/월. 초과 시 Pro 플랜 ($20/월, 50,000건). CAN-SPAM 준수 필수 (unsubscribe 링크 + 물리 주소 footer).

---

## Layer 4: 크로스 프로모션

### 트래픽 순환 설계

각 채널의 강점으로 다른 채널을 끌어당기는 구조.

```
Threads (발견) ──"전문 읽기"──► Ghost/Blog (체류)
     ▲                              │
     │                        "팟캐스트로 듣기"
  "의견 나누기"                      │
     │                              ▼
     └──────────────── 팟캐스트 (습관) ──"영상으로 보기"──► YouTube (몰입)
                                                              │
                                                        "원문+Threads"
                                                              │
                                                              ▼
                                                      티스토리 (SEO) ──"Threads에서 토론"──► Threads
```

| 채널 | 역할 | 끌어오는 트래픽 |
|------|------|---------------|
| **Threads** | 발견 + 토론 허브 | 짧은 요약으로 관심 유발 → 블로그/팟캐스트 유도 |
| **Ghost/Blog** | 깊은 체류 | 전문 + 오디오 embed + 영상 embed = 원스톱 |
| **팟캐스트** | 습관 형성 | 출퇴근 청취 → "더 보기" 링크로 블로그/Threads |
| **YouTube** | 몰입 + 알고리즘 | 추천 알고리즘 → 설명란 링크로 생태계 유입 |
| **티스토리** | 한국 SEO | 네이버/다음 검색 유입 → Threads/블로그로 전환 |

### 채널별 프로모션 삽입 규칙

| 발행 채널 | 삽입 내용 |
|----------|----------|
| **Threads** | `🎙️ 팟캐스트로 듣기: {podcast_url}` · `📖 전문 읽기: {blog_url}` · `▶️ 영상으로 보기: {youtube_url}` |
| **Ghost/Blog** | 상단: 팟캐스트 `<audio>` embed · 하단: Threads 댓글 CTA + YouTube embed + 티스토리 미러 |
| **티스토리** | 하단: `원문: {blog_url}` · `팟캐스트: {podcast_url}` · `Threads에서 의견 나누기: {threads_url}` |
| **팟캐스트** | 에피소드 설명: `📖 원문: {blog_url}` · `💬 Threads: {threads_url}` · `▶️ YouTube: {youtube_url}` |
| **YouTube** | 설명란: `📖 원문: {blog_url}` · `🎙️ 팟캐스트: {podcast_url}` · `💬 Threads: {threads_url}` + 고정 댓글 |

### 2-pass + 비동기 3rd pass 발행 프로세스

```
publish:channels <brief-id>
  │
  ├─ 1. brief 로드 + 커버이미지 준비
  │
  ├─ 2. Pass 1: 병렬 발행 (프로모션 링크 없이)
  │     ├─ Threads API      → threads_url ✓
  │     ├─ Ghost API        → blog_url ✓
  │     ├─ 티스토리 Playwright → tistory_url ✓
  │     ├─ NotebookLM MCP   → MP3 → Supabase → podcast_url ✓
  │     └─ Remotion render  → mp4 → /output/youtube-ready/ (URL 없음)
  │
  ├─ 3. channel_results 저장 (Supabase)
  │     └─ YouTube는 이 시점에 file:// metadata 결과만 저장됨
  │
  ├─ 4. Pass 2: 크로스 프로모션 주입 (수집된 URL로)
  │     ├─ Threads  → reply_to_id 답글로 링크 추가 (편집 API 없음)
  │     ├─ Ghost    → API PATCH 하단 프로모션 블록
  │     ├─ 팟캐스트  → 에피소드 설명 업데이트
  │     └─ 티스토리  → Playwright 편집
  │
  ├─ 5. cross_promo_synced = true
  │
  └─ 6. (비동기) 운영자 YouTube 업로드 후
        → Telegram에 YouTube URL만 전송
          또는 /vh-youtube <brief-id> <youtube-url>
          또는 publish:link-youtube -- <video-id-or-url>
        → brief_posts.youtube_* canonical 필드 갱신
        → channel_publish_results에 public YouTube URL 기록
        → Pass 3: youtube_url을 기존 채널에 추가
```

### brief → 채널별 콘텐츠 변환 규칙

| 채널 | 입력 | 변환 | 출력 |
|------|------|------|------|
| **Threads** | title + summary + coverImage | 500자 이내 요약 + 이미지 | 텍스트+이미지 포스트 |
| **Ghost/Blog** | 전체 brief HTML | 본문 + 오디오 embed + 프로모션 footer | 블로그 글 |
| **티스토리** | 전체 brief HTML | 본문 + 커버이미지 + 프로모션 footer | 블로그 글 |
| **팟캐스트** | brief 본문 | NotebookLM 2인 대화 | MP3 에피소드 |
| **YouTube** | brief + 팟캐스트 MP3 | Remotion 영상화 | mp4 (수동 업로드) |

---

## Layer 5: 품질 자기개선 루프

### 채널별 지표 수집 가능성

| 채널 | 지표 수집 | API | 수집 가능 지표 |
|------|----------|-----|---------------|
| **YouTube** | ✅ 완전 | YouTube Analytics API | views, CTR, retention, watch time, engagement |
| **Ghost/Blog** | ⚠️ GA4 연동 | GA4 Data API | pageviews, bounce rate, session duration |
| **티스토리** | ⚠️ GA4 우회 | GA4 Data API | pageviews (GA4 설치 시) |
| **Threads** | ⚠️ 제한적 | Threads Insights API | likes, replies, reposts (follower > 100 필요) |
| **팟캐스트** | ❌ 없음 | 없음 | Spotify/Apple 대시보드 수동 확인만 |

### 피드백 루프 구조

```
발행 → 채널별 URL + video_id 기록
                ↓
analytics-collector (cron, 주 1회)
  ├─ YouTube Analytics API → views, CTR, retention per video
  ├─ GA4 Data API → pageviews per blog/tistory post
  └─ Threads Insights → engagement per post
                ↓
Supabase brief_posts.channel_metrics (jsonb)
                ↓
insight-generator (주 1회)
  ├─ "상위 20% brief" 특성 분석 (길이, 톤, 구조, 토픽)
  ├─ "retention 높은 영상" 템플릿 변수 분석
  └─ 주간 리포트 생성 + Telegram 발송
                ↓
parameter-adjuster (수동 승인)
  ├─ brief draft 프롬프트에 few-shot 예시 교체
  ├─ Remotion 템플릿 변수 조정 (컬러, 인트로 길이, 폰트)
  └─ TTS 엔진/음성 프리셋 교체
                ↓
다음 배치에 반영
```

**핵심 원칙**: "완전 자율"이 아니라 **"자동 제안 + 운영자 승인"** 모델.

### 자기개선 가능 항목

| 항목 | 방법 | 실현성 |
|------|------|--------|
| Brief 텍스트 품질 | engagement 높은 brief 특성 → 프롬프트 few-shot 교체 | 8/10 |
| 영상 템플릿 | YouTube retention curve → 템플릿 변수 (색상, 전환, 인트로) 조정 | 7/10 |
| 썸네일 | YouTube Test & Compare 네이티브 A/B (3개 변형) | 7/10 |
| TTS 음성 | NISQA/TTSDS2 자동 품질 점수 + retention 교차 검증 | 6/10 |
| 발행 시간 | 채널별 engagement peak 시간 분석 → 스케줄 최적화 | 8/10 |

---

## Layer 6: Publish Dispatcher

### 오케스트레이션

```typescript
// publish-dispatcher.ts
type ChannelName = 'threads' | 'ghost' | 'tistory' | 'podcast' | 'youtube';

interface PublishTarget {
  channel: ChannelName;
  enabled: boolean;
  config: ChannelConfig;
}

interface PublishResult {
  channel: ChannelName;
  success: boolean;
  publishedUrl?: string;
  error?: string;
  timestamp: Date;
  canUpdate: boolean;        // Pass 2 업데이트 가능 여부
}

interface CrossPromoBlock {
  threads?: string;
  blog?: string;
  tistory?: string;
  podcast?: string;
  youtube?: string;          // 운영자 수동 등록 후 채워짐
}

interface BriefChannelMeta {
  channelResults: PublishResult[];
  crossPromo: CrossPromoBlock;
  crossPromoSynced: boolean;   // Pass 2 완료
  youtubeVideoId?: string;     // public YouTube 연결 후 채워짐
  youtubeUrl?: string;         // public YouTube 연결 후 채워짐
  youtubeLinkedAt?: string;    // Pass 3 완료 시각
  channelMetrics?: object;     // analytics-collector가 채움
}
```

### 프로모션 텍스트 생성

```typescript
// promo-templates.ts

// Threads: 500자 이내 요약 + 크로스 링크
function threadsPost(brief, promo): string;

// Ghost/Blog: 하단 프로모션 HTML 블록
function blogPromoFooter(promo): string;

// YouTube: 설명란 텍스트 (metadata.json에 포함)
function youtubeDescription(brief, promo): string;

// 팟캐스트: 에피소드 설명 텍스트
function podcastEpisodeNote(brief, promo): string;

// 티스토리: 하단 프로모션 HTML
function tistoryPromoFooter(promo): string;
```

### 실패 처리

- 채널별 업로드 실패는 다른 채널에 영향을 주지 않는다 (`Promise.allSettled`)
- 실패한 채널은 `channel_results`에 error 기록
- 반복 실패 시 watchdog 에스컬레이션 (기존 `AGENT-OPERATING-MODEL.md` 정책 준수)
- 티스토리 세션 만료, NotebookLM 장애 등은 retryable 실패로 분류
- NotebookLM 장애 시 Qwen3-TTS fallback 자동 전환

---

## 파일 구조

```
packages/media-engine/src/
  tts/
    notebooklm-bridge.ts        ← NotebookLM MCP CLI 래퍼 (주 경로)
    qwen3-client.ts             ← Qwen3-TTS FastAPI 클라이언트 (백업 경로)
    tts-types.ts                ← TtsRequest, TtsResult, VoicePreset 타입
  image/
    gemini-image.ts             ← Gemini 2.5 Flash 이미지 생성 (무료 티어, $0)
    section-image-pipeline.ts   ← brief sections → 섹션별 이미지 프롬프트 → 생성 → 정규화
  publish/
    channel-types.ts            ← PublishTarget, PublishResult, CrossPromoBlock, BriefChannelMeta
    promo-templates.ts          ← 채널별 프로모션 텍스트 생성기
    cross-promo-sync.ts         ← Pass 2 + Pass 3 크로스 프로모션 업데이트
    threads-publisher.ts        ← Threads 공식 Publishing API
    ghost-publisher.ts          ← Ghost Admin API / WordPress REST API
    tistory-publisher.ts        ← Playwright 브라우저 자동화 (보조)
    spotify-metadata.ts         ← mp3 + 에피소드 메타데이터 생성 (업로드는 Spotify에 수동)
    youtube-local.ts            ← 로컬 파일 생성 + metadata.json (업로드는 수동)
    publish-dispatcher.ts       ← 2-pass 오케스트레이션 + YouTube 비동기 3rd pass
  feedback/
    analytics-collector.ts      ← YouTube Analytics + GA4 수집 cron
    insight-generator.ts        ← 주간 성과 분석 + 리포트
  (기존 16개 모듈 유지)

apps/backend/
  scripts/
    publish-channels.ts         ← CLI: npm run publish:channels <brief-id>
    link-youtube.ts             ← CLI: npm run publish:link-youtube -- [brief-id] <video-id>

tools/
  remotion/
    src/
      BriefPodcast.tsx          ← 팟캐스트 영상 Composition (16:9)
      BriefShort.tsx            ← Shorts Composition (9:16, 60초)
```

---

## 환경변수

```bash
# Threads API (Meta)
THREADS_USER_ID=...
THREADS_ACCESS_TOKEN=...

# Ghost Blog
GHOST_API_URL=https://myblog.ghost.io
GHOST_ADMIN_API_KEY=...

# 티스토리 (Playwright)
TISTORY_BLOG_URL=https://myblog.tistory.com
TISTORY_SESSION_PATH=./state/tistory-session.json

# 팟캐스트
PODCAST_TITLE=VibeHub AI Brief
PODCAST_FEED_PATH=./state/podcast-feed.xml

# NotebookLM (nlm CLI가 브라우저 쿠키로 인증, 별도 env 불필요)

# Qwen3-TTS (백업)
QWEN3_TTS_URL=http://localhost:8001

# YouTube Analytics (피드백 루프)
YOUTUBE_ANALYTICS_CLIENT_ID=...
YOUTUBE_ANALYTICS_CLIENT_SECRET=...
YOUTUBE_ANALYTICS_REFRESH_TOKEN=...

# GA4 (피드백 루프)
GA4_PROPERTY_ID=...
GA4_CREDENTIALS_PATH=./state/ga4-service-account.json

# Newsletter (Resend)
RESEND_API_KEY=re_...
RESEND_AUDIENCE_EN=...              # EN Audience ID
RESEND_AUDIENCE_ES=...              # ES Audience ID

# 로컬 출력
YOUTUBE_OUTPUT_DIR=./output/youtube-ready
```

---

## 의존성

| 패키지 | 용도 | 설치 |
|--------|------|------|
| `playwright` | 티스토리 자동화 | `npm install playwright` |
| ~~podcast~~ | ~~RSS feed 생성~~ | 삭제 — Spotify 직접 업로드로 대체 |
| `@remotion/cli` | 영상 렌더링 | 기존 설치됨 |
| `@remotion/media-utils` | 오디오 길이 계산 | `npm install @remotion/media-utils` |
| `remotion-subtitles` | SRT → 애니메이션 자막 | `npm install remotion-subtitles` |
| `googleapis` | YouTube Analytics + GA4 | `npm install googleapis` |
| `resend` | Newsletter Broadcasts API | `npm install resend` |
| `notebooklm-mcp-cli` | NotebookLM CLI/MCP | `pip install notebooklm-mcp-cli` |

---

## 구현 우선순위

| Phase | 내용 | 실현성 | 산출물 |
|-------|------|--------|--------|
| **P1** | Threads API 연동 (`threads-publisher.ts`) | 9/10 | brief → Threads 자동 발행. Instagram 계정 생성 후 Meta Developer 앱 진행 |
| **P2** | NotebookLM MCP → 팟캐스트 MP3 생성 | 7/10 | brief → 2인 대화 MP3 |
| **P3a** | Whisper STT + Gemini 번역 (영어→스페인어 SRT) | 9/10 | 로컬 Whisper 무료 + Gemini 번역 무료 |
| **P3b** | Remotion BriefAudiogram × 2언어 + 로컬 저장 | 7.5/10 | 웨이브폼+자막+커버 → mp4 (en/es) |
| **P3c** | 썸네일 생성 (Gemini, 영어+스페인어 각 1장) | 9/10 | 무료 $0 |
| **P3d** | 섹션별 AI 이미지 (후순위) | — | YouTube retention 데이터 보고 결정 |
| **P4** | Ghost/WP API 연동 | 8/10 | brief 전문 블로그 자동 발행 |
| **P5** | 팟캐스트 메타데이터 생성 + Spotify 업로드 가이드 | 8/10 | mp3 + metadata → 수동 업로드 |
| **P6** | 크로스 프로모션 (2-pass + 3rd pass) | — | 모든 채널 상호 링크 |
| **P7** | 티스토리 Playwright (보조) | 5/10 | 한국 SEO 커버리지 |
| **P8** | YouTube Analytics + GA4 피드백 수집기 | 8/10 | 성과 데이터 Supabase 저장 |
| **P9** | insight-generator 주간 리포트 | 7/10 | 자동 제안 + 운영자 승인 루프 |

---

## Supabase 스키마 확장 (검증 후 적용)

```sql
-- brief_posts 채널 발행 메타데이터
ALTER TABLE brief_posts ADD COLUMN IF NOT EXISTS channel_results jsonb DEFAULT '[]';
ALTER TABLE brief_posts ADD COLUMN IF NOT EXISTS cross_promo jsonb DEFAULT '{}';
ALTER TABLE brief_posts ADD COLUMN IF NOT EXISTS cross_promo_synced boolean DEFAULT false;
ALTER TABLE brief_posts ADD COLUMN IF NOT EXISTS youtube_video_id text;
ALTER TABLE brief_posts ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE brief_posts ADD COLUMN IF NOT EXISTS youtube_linked_at timestamptz;
ALTER TABLE brief_posts ADD COLUMN IF NOT EXISTS channel_metrics jsonb DEFAULT '{}';
```

---

## 완성 기준점

| 레벨 | 정의 | 측정 기준 |
|------|------|----------|
| **MVP** | brief → Threads 자동 발행 + 팟캐스트 MP3 생성 | Threads API 호출 성공 + NotebookLM MP3 다운로드 |
| **v1.0** | 전 채널 발행 + 크로스 프로모션 | 5개 채널 모두 결과 기록 + Pass 2 완료 |
| **v1.5** | YouTube 완성품 + 수동 업로드 루프 | mp4 + metadata.json 생성 + video_id 등록 → Pass 3 |
| **v2.0** | 피드백 루프 가동 | Analytics 수집 → 주간 insight → 운영자 승인 → 파라미터 반영 |

---

## 리스크 & 대응

| 리스크 | 영향도 | 대응 |
|--------|--------|------|
| NotebookLM 비공식 API 변경 | 높음 | Qwen3-TTS fallback 자동 전환, `nlm doctor` 정기 점검 |
| Threads API 정책 변경 | 낮음 | 공식 API이므로 사전 공지 예상, 마이그레이션 여유 있음 |
| 티스토리 UI 변경 | 중간 | role/data-testid 기반 선택자, 보조 채널이므로 영향 제한적 |
| 티스토리 하루 5건 제한 | 낮음 | 2~3건 이내 운영, 초과 시 다음날 이월 |
| ~~Remotion Company License~~ | ~~중간~~ | **해소됨** — 개인(individual) 무조건 무료. 영리법인 4명+ 시 유료 전환 |
| YouTube 수동 업로드 번거로움 | 낮음 | metadata.json으로 복사-붙여넣기 최소화 |
| GA4/Analytics 인증 | 낮음 | read-only 스코프, 앱 인증 불필요 |
| NotebookLM Google 계정 리스크 | 중간 | 별도 서비스 계정 사용, 대량 생성 자제 |

---

## 쿼터 & 일일 운영 제한 요약

| 채널 | 일일 제한 | 대응 전략 |
|------|----------|-----------|
| Threads | 250건/일 | 충분, 제한 걱정 없음 |
| Ghost/WordPress | 없음 (셀프호스팅) | 제한 없음 |
| 티스토리 | ~5건/일 (비공식) | 2~3건 이내 권장 |
| YouTube | 수동 업로드 | 운영자 판단 |
| 팟캐스트 RSS | 없음 | 제한 없음 |
| Newsletter (Resend) | 무료 3,000건/월 (100건/일) | Pro 플랜 $20/월로 확장 |

---

## 참고 문서

### 내부
- `docs/ref/PIPELINE-OPERATING-MODEL.md` — 수집→가공→초안→검수→배포 흐름
- `docs/ref/AGENT-OPERATING-MODEL.md` — publisher/watchdog 에이전트 역할
- `docs/ref/AUTO-PUBLISH-RULES.md` — approved → scheduled → published 전환 규칙
- `docs/ref/VIDEO-PIPELINE.md` — video_jobs 파이프라인 (Remotion 연동 참고)
- `packages/media-engine/CLAUDE.md` — media-engine 구조

### 외부 — 채널 API
- [Threads Publishing API](https://developers.facebook.com/docs/threads/posts/) — Meta 공식
- [Threads API Changelog](https://developers.facebook.com/docs/threads/changelog/) — 2025.7 대규모 확장
- [Ghost Admin API](https://ghost.org/docs/admin-api/) — 공식
- [WordPress REST API](https://developer.wordpress.org/rest-api/) — 공식
- [티스토리 Open API 종료 안내](https://tistory.github.io/document-tistory-apis/)
- [YouTube Analytics API](https://developers.google.com/youtube/analytics) — 공식
- [GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1) — 공식

### 외부 — 오디오/영상
- [notebooklm-mcp-cli](https://github.com/jacob-bd/notebooklm-mcp-cli) — NotebookLM MCP 자동화
- [Google Podcast API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/podcast-api) — 공식 (Enterprise 화이트리스트)
- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) — 한국어 WER 1.741
- [Chatterbox TTS Server](https://github.com/devnen/Chatterbox-TTS-Server) — OpenAI-compatible
- [Remotion 공식 문서](https://www.remotion.dev/docs/) — v4.0.438
- [Remotion & Mediabunny](https://www.remotion.dev/docs/mediabunny/) — Media Parser 후계
- [remotion-subtitles](https://github.com/ahgsql/remotion-subtitles) — SRT 자막 라이브러리
- [podcast npm](https://www.npmjs.com/package/podcast) — RSS 생성
- [Playwright 공식](https://playwright.dev/)

### 외부 — 리서치 근거
- [MimikaStudio 폐기 근거](https://github.com/BoltzmannEntropy/MimikaStudio) — Alpha, 단독 개발자, 라이선스 혼란
- [YouTube OAuth 검증 지연](https://discuss.google.dev/t/oauth-data-access-verification-stuck-under-review-for-6-months/339927) — 2~6개월
- [YouTube AI 콘텐츠 단속](https://flocker.tv/posts/youtube-inauthentic-content-ai-enforcement/) — 2026.1 대량 삭제
- [Qwen3-TTS 벤치마크](https://arxiv.org/html/2601.15621v1) — 한국어 WER 1.741
