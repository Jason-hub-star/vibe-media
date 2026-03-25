# Channel Publish Pipeline

## Goal
- critic 통과 후 approved brief를 **티스토리, 유튜브, 블로그, 팟캐스트** 등 외부 채널로 자동 배포한다.
- 내부에서 MimikaStudio로 TTS/영상을 가공하고, **산출물(mp4/mp3/text)만** 외부에 유통한다.
- BSL-1.1 도구(MimikaStudio)는 내부 가공에만 사용되며, 외부 채널에는 산출물만 전달된다.

## Architecture Overview

```
┌──────────────────── VibeHub 내부 (Mac Apple Silicon) ────────────────────┐
│                                                                          │
│  [기존 파이프라인]                                                        │
│  수집 → 가공 → 초안 → critic → publisher → publish queue                 │
│                                                 ↓                        │
│  [Channel Renderer Layer]                                                │
│  publish-dispatcher                                                      │
│    ├─ TEXT    brief body → HTML/마크다운 가공                             │
│    ├─ AUDIO   brief → MimikaStudio :8000 TTS → .mp3                     │
│    ├─ VIDEO   나레이션.mp3 + 이미지 → Remotion renderMedia → .mp4        │
│    └─ FEED    메타데이터 → RSS XML 갱신                                  │
│                                                 ↓                        │
│  [Channel Uploader Layer]                                                │
│  channel-uploader                                                        │
│    ├─ 티스토리: Playwright 브라우저 자동화 (Open API 종료됨)               │
│    ├─ 유튜브:   YouTube Data API v3 (OAuth + resumable upload)           │
│    ├─ 블로그:   Ghost/WordPress REST API                                 │
│    └─ 팟캐스트: Supabase Storage + RSS feed XML                          │
│                                                                          │
│  산출물(mp4/mp3/text)만 외부로 나감                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

## 기존 파이프라인과의 연결

```
npm run pipeline:daily        ← 수집→가공→초안→critic
npm run publish:auto          ← approved → scheduled → published
npm run publish:channels      ← published brief → 채널별 렌더+배포 (신규)
```

`publish:channels`는 `publish:auto`가 `published` 상태로 전환한 brief를 입력으로 받는다. 기존 파이프라인의 `publisher` 에이전트 뒤에 위치하며, event-driven 흐름을 따른다.

---

## Layer 1: MimikaStudio TTS 통합

### 제품 사양

| 항목 | 내용 |
|------|------|
| 아키텍처 | FastAPI 백엔드 + MCP 서버 + Flutter UI (3-layer) |
| REST API | `localhost:8000` — 60+ endpoint, Swagger UI: `/docs` |
| MCP 서버 | `localhost:8010` — 50+ tool, Claude Code 직접 연동 |
| 헤드리스 모드 | `mimikactl up --no-flutter` — API/MCP만 구동 |
| 출력 포맷 | WAV, MP3, M4B (챕터 마커) |
| Job Queue | 내장 — 배치 TTS/음성복제/오디오북 자동 처리 |
| 라이선스 | BSL-1.1 (내부 도구 사용 — 제약 없음) |

### 지원 엔진

| 엔진 | 파라미터 | 한국어 | 특징 |
|------|---------|--------|------|
| Kokoro | 82M | 미지원 | 영어 전용, sub-200ms 저지연 |
| Qwen3-TTS | 0.6B~1.7B (8bit 포함) | 지원 | 3초 zero-shot 음성 복제, 10개 언어 |
| Chatterbox | — | 지원 | 23개 언어, 다국어 최강 |
| Supertonic-2 | ONNX | 지원 | en/ko/es/pt/fr 5개 언어 |

### 한국어 TTS 엔진 선택 기준

- 한국어 brief 나레이션 → **Qwen3-TTS** 또는 **Chatterbox** 우선
- 영어 brief 나레이션 → **Kokoro** (저지연) 또는 **Qwen3-TTS**
- 음성 복제 필요 시 → **Qwen3-TTS** (3초 레퍼런스)

### CLI 명령

```bash
# 설치
./install.sh

# 서비스 시작 (헤드리스)
./bin/mimikactl up --no-flutter

# 서비스 상태 확인
./bin/mimikactl status

# 로그 확인
./bin/mimikactl logs backend

# 모델 다운로드
./bin/mimikactl models download kokoro    # ~300MB
./bin/mimikactl models download qwen3     # ~4GB (1.7B)
```

### REST API 호출 패턴

```typescript
// mimika-client.ts
interface MimikaConfig {
  baseUrl: string;       // default: http://localhost:8000
  mcpPort: number;       // default: 8010
}

interface TtsRequest {
  text: string;
  engine: 'kokoro' | 'qwen3' | 'chatterbox' | 'supertonic';
  voicePreset: string;   // e.g. 'bf_emma', custom clone preset
  outputFormat: 'mp3' | 'wav';
  language: string;      // e.g. 'ko', 'en'
}

interface TtsResult {
  jobId: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  audioPath: string;     // 로컬 파일 경로
  durationMs: number;
}
```

### MCP 에이전트 연동

MimikaStudio MCP 서버(`:8010`)를 Claude Code에 등록하면 에이전트가 직접 TTS를 호출할 수 있다.

```
Claude Code → MimikaStudio MCP :8010
  → tts_generate(text, voice, engine)
  → voice_clone(reference_audio, name)
  → audiobook_generate_from_file(pdf_path, voice, format)
  → job_status(job_id)
```

### 음성 프리셋 관리

- MimikaStudio에 8개 번들 레퍼런스 음성 내장 (Alistair, Anastasia, Beatrice 등)
- YouTube URL에서 레퍼런스 음성 임포트 가능
- 커스텀 프리셋은 MimikaStudio Voice Prompts에서 관리
- VibeHub brief에 `voicePreset` 필드를 추가하여 brief별 음성 지정 가능

### 시스템 요구사항

| 항목 | 사양 |
|------|------|
| OS | macOS 13+ (Ventura 이상) |
| 프로세서 | Apple Silicon (M1/M2/M3/M4) — Intel 미지원 |
| RAM | 최소 8GB, 권장 16GB+ |
| 저장공간 | 모델 5~10GB |
| Python | 3.10+ |
| Flutter | 3.x (UI 사용 시) |

---

## Layer 2: Remotion 영상 합성

### 기존 자산

media-engine에 `render-spawn.ts`가 이미 존재한다. Remotion CLI 크로스플랫폼 spawn을 처리하며, 이를 확장하여 brief 영상 렌더링에 사용한다.

### 오디오-영상 동기화

Remotion 공식 문서 기준, 오디오 길이에 맞춘 영상 길이 자동 계산이 가능하다.

```typescript
// Remotion Composition
import { getAudioData } from '@remotion/media-utils';

// calculateMetadata에서 나레이션 길이로 durationInFrames 자동 결정
export const calculateMetadata = async ({ props }) => {
  const audioData = await getAudioData(props.narrationAudio);
  return {
    durationInFrames: Math.ceil(audioData.durationInSeconds * 30), // 30fps
  };
};
```

### 영상 Composition 구조

```typescript
// BriefVideo.tsx — brief를 영상으로 변환하는 Remotion Composition
interface BriefVideoProps {
  briefTitle: string;
  briefBody: string;        // 자막용
  coverImage: string;        // brief cover image
  narrationAudio: string;    // MimikaStudio 출력 .mp3
  sourceDomains: string[];   // 출처 표시
}

// <Audio> 컴포넌트로 나레이션 삽입
// visualizeAudio()로 음성 파형 기반 자막 타이밍 동기화
// 커버 이미지 + 자막 + 소스 도메인 표시
```

### 영상 유형

| Composition | 해상도 | 용도 |
|-------------|--------|------|
| `BriefVideo` | 1920×1080 (16:9) | 유튜브 일반 영상 |
| `BriefShort` | 1080×1920 (9:16) | 유튜브 Shorts |

### 렌더링 실행

```bash
# render-spawn.ts를 통해 실행
npx remotion render BriefVideo --props='{"briefTitle":"..."}' out/brief.mp4
```

### 주의사항

- Remotion Media Parser는 2026-02-01부로 deprecated → **Mediabunny** 기준으로 구현
- 렌더링은 CPU 집약적 → 배치 처리 시 동시 렌더 수 제한 필요

---

## Layer 3: 채널별 업로더

### 3-1. 티스토리

#### 현실: Open API 종료

티스토리 Open API는 **2024년 2월 완전 종료**되었다. 파일 첨부 → 글 관련 → 댓글 관련 → 기타 순으로 순차 종료됐으며, 공식 대안 API는 제공되지 않는다.

#### 대안: Playwright 브라우저 자동화

```typescript
// tistory-publisher.ts
interface TistoryConfig {
  blogUrl: string;           // e.g. https://myblog.tistory.com
  loginMethod: 'kakao';     // 티스토리는 카카오 로그인
  sessionStoragePath: string; // 세션 재사용용 쿠키 저장 경로
}

interface TistoryPublishRequest {
  title: string;
  content: string;           // HTML body
  category: string;
  tags: string[];
  coverImage?: string;       // 로컬 파일 경로
  visibility: 'private' | 'public';
}

// Playwright 흐름:
// 1. 저장된 세션으로 로그인 시도 → 만료 시 재로그인
// 2. 글쓰기 페이지 이동
// 3. 제목/본문(HTML) 입력
// 4. 커버 이미지 업로드
// 5. 카테고리/태그 설정
// 6. 공개 설정 → 발행
// 7. 발행된 URL 반환
```

#### 운영 정책

- 티스토리 하루 글 5개 제한 — 초과 시 저품질 판정 위험
- 자동 생성 콘텐츠 감지 방지 → brief body에 editorial 편집 품질 유지
- 세션 만료 시 watchdog으로 에스컬레이션

### 3-2. YouTube Data API v3

#### 사전 준비

| 단계 | 내용 | 소요 |
|------|------|------|
| Google Cloud 프로젝트 생성 | YouTube Data API v3 활성화 | 즉시 |
| OAuth 2.0 인증 | client ID/secret 생성 | 즉시 |
| 앱 인증 심사 | 미인증 → private만 가능 | **2~4주** |
| Refresh token 발급 | 1회 인증 후 토큰 저장 | 즉시 |

#### 쿼터 제한

- 일일 기본 쿼터: **10,000 유닛**
- 업로드 1건: **1,600 유닛**
- **하루 최대 ~6건** 업로드 가능
- 쿼터 리셋: 매일 자정 (Pacific Time)
- 별도 Google Cloud 프로젝트로 쿼터 풀 분리 가능

#### 업로드 프로토콜

```typescript
// youtube-publisher.ts
interface YouTubeUploadRequest {
  videoPath: string;          // Remotion 출력 .mp4
  title: string;              // brief.title (15~70자)
  description: string;        // brief.summary + source links
  tags: string[];
  categoryId: string;         // YouTube 카테고리 ID
  privacyStatus: 'private' | 'unlisted' | 'public';
  scheduledAt?: Date;         // 예약 발행
  thumbnailPath?: string;     // brief.coverImage
}

// Resumable Upload 프로토콜 (5MB 이상 필수):
// 1. POST 메타데이터 → 세션 URI 수신
// 2. PUT 비디오 데이터 (256KB 청크)
// 3. 중단 시 세션 URI로 재개
// 성공 시 HTTP 201 + video ID 반환
```

#### OAuth 스코프

```
https://www.googleapis.com/auth/youtube.upload
```

최소 권한 원칙 — `youtube` 전체 스코프 대신 `youtube.upload`만 사용.

#### Shorts 업로드

일반 `videos.insert`와 동일한 엔드포인트를 사용한다:
- 길이: 60초 이하
- 해상도: 1080×1920 (9:16)
- 제목 또는 설명에 `#Shorts` 포함
- 커스텀 썸네일 설정 불가 (YouTube 자동 지정)

#### 업로드 후 처리

```typescript
// videos.list로 processing 상태 확인
// status: 'uploaded' → 'processing' → 'processed'
// processingDetails로 진행률 폴링
```

### 3-3. 블로그 (Ghost / WordPress)

```typescript
// blog-publisher.ts
interface BlogConfig {
  platform: 'ghost' | 'wordpress';
  apiUrl: string;
  apiKey: string;             // Ghost Admin API key / WP Application Password
}

interface BlogPublishRequest {
  title: string;
  content: string;            // HTML body
  tags: string[];
  coverImage?: string;
  audioEmbed?: string;        // MimikaStudio mp3 URL (optional)
  status: 'draft' | 'published';
}

// Ghost: Admin API POST /ghost/api/admin/posts/
// WordPress: REST API POST /wp-json/wp/v2/posts
// 오디오 embed: <audio src="...mp3"> 태그 삽입
```

### 3-4. 팟캐스트 RSS

```typescript
// podcast-publisher.ts
import Podcast from 'podcast';

interface PodcastEpisode {
  title: string;
  description: string;
  audioUrl: string;           // Supabase Storage public URL
  duration: string;           // HH:MM:SS
  pubDate: Date;
}

// 흐름:
// 1. MimikaStudio TTS → mp3 생성
// 2. mp3 → Supabase Storage 업로드 (기존 supabase-storage.ts 활용)
// 3. podcast npm 패키지로 RSS XML 생성/갱신
// 4. RSS XML → Supabase Storage에 호스팅
// 5. RSS feed URL을 Apple Podcasts / Spotify에 등록 (1회)
```

---

## Layer 4: Publish Dispatcher

### 오케스트레이션

```typescript
// publish-dispatcher.ts
interface PublishTarget {
  channel: 'tistory' | 'youtube' | 'blog' | 'podcast';
  enabled: boolean;
  config: ChannelConfig;
}

interface PublishResult {
  channel: string;
  success: boolean;
  publishedUrl?: string;
  error?: string;
  timestamp: Date;
}

async function dispatch(
  brief: BriefPost,
  targets: PublishTarget[]
): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  // 1. 공통 가공: MimikaStudio TTS 나레이션 생성
  const narration = await mimikaClient.generate({
    text: brief.body,
    engine: 'qwen3',
    voicePreset: brief.voicePreset || 'default-ko',
    outputFormat: 'mp3',
    language: brief.language || 'ko',
  });

  // 2. 영상 필요 채널이 있으면 Remotion 렌더
  const needsVideo = targets.some(
    t => t.enabled && t.channel === 'youtube'
  );
  let videoPath: string | undefined;
  if (needsVideo) {
    videoPath = await renderBriefVideo({
      briefTitle: brief.title,
      briefBody: brief.body,
      coverImage: brief.coverImageUrl,
      narrationAudio: narration.audioPath,
      sourceDomains: brief.sourceDomains,
    });
  }

  // 3. 채널별 업로드 (병렬 가능)
  const uploads = targets
    .filter(t => t.enabled)
    .map(async (target) => {
      switch (target.channel) {
        case 'tistory':
          return tistoryPublisher.publish(brief, target.config);
        case 'youtube':
          return youtubePublisher.upload(videoPath!, brief, target.config);
        case 'blog':
          return blogPublisher.publish(brief, narration, target.config);
        case 'podcast':
          return podcastPublisher.publish(brief, narration, target.config);
      }
    });

  return Promise.allSettled(uploads);
}
```

### 상태 기록

배포 결과는 brief metadata에 채널별 URL로 기록한다:

```json
{
  "channel_results": [
    { "channel": "tistory", "url": "https://myblog.tistory.com/123", "publishedAt": "..." },
    { "channel": "youtube", "url": "https://youtu.be/abc123", "publishedAt": "..." },
    { "channel": "podcast", "url": "https://..../feed.xml", "episode": 42 }
  ]
}
```

### 실패 처리

- 채널별 업로드 실패는 다른 채널에 영향을 주지 않는다 (`Promise.allSettled`)
- 실패한 채널은 `channel_results`에 error 기록
- 반복 실패 시 watchdog 에스컬레이션 (기존 `AGENT-OPERATING-MODEL.md` 정책 준수)
- 티스토리 세션 만료, YouTube 쿼터 초과 등은 retryable 실패로 분류

---

## 파일 구조

```
packages/media-engine/src/
  tts/
    tts-types.ts                ← TtsRequest, TtsResult, VoicePreset 타입
    mimika-client.ts            ← MimikaStudio REST :8000 호출 + job polling
  publish/
    channel-types.ts            ← ChannelRenderer, PublishTarget, PublishResult
    tistory-publisher.ts        ← Playwright 브라우저 자동화
    youtube-publisher.ts        ← YouTube Data API v3 OAuth + resumable upload
    blog-publisher.ts           ← Ghost Admin API / WordPress REST API
    podcast-publisher.ts        ← mp3 → Supabase Storage + RSS XML
    publish-dispatcher.ts       ← brief → TTS → 채널별 분배 오케스트레이션
  (기존 16개 파일 유지)

apps/backend/
  scripts/
    publish-channels.ts         ← CLI entrypoint: npm run publish:channels

tools/
  remotion/
    src/
      BriefVideo.tsx            ← brief 일반 영상 Composition (16:9)
      BriefShort.tsx            ← brief Shorts Composition (9:16, 60초)
```

### 환경변수

```bash
# MimikaStudio
MIMIKA_BASE_URL=http://localhost:8000
MIMIKA_MCP_PORT=8010

# YouTube Data API
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...

# 티스토리 (Playwright 세션)
TISTORY_BLOG_URL=https://myblog.tistory.com
TISTORY_SESSION_PATH=./state/tistory-session.json

# Ghost Blog (선택)
GHOST_API_URL=https://myblog.ghost.io
GHOST_ADMIN_API_KEY=...

# 팟캐스트
PODCAST_TITLE=VibeHub AI Brief
PODCAST_FEED_PATH=./state/podcast-feed.xml
```

---

## 의존성

| 패키지 | 용도 | 설치 |
|--------|------|------|
| `playwright` | 티스토리 브라우저 자동화 | `npm install playwright` |
| `googleapis` | YouTube Data API v3 | `npm install googleapis` |
| `google-auth-library` | YouTube OAuth | `npm install google-auth-library` |
| `podcast` | RSS feed 생성 | `npm install podcast` |
| `@remotion/cli` | 영상 렌더링 | 기존 설치됨 |
| `@remotion/media-utils` | 오디오 길이 계산 | `npm install @remotion/media-utils` |

---

## 구현 우선순위

| Phase | 내용 | 의존성 | 산출물 |
|-------|------|--------|--------|
| **P1** | MimikaStudio Mac 설치 + `mimika-client.ts` | Mac 환경 | TTS API 호출 가능 |
| **P2** | 티스토리 Playwright 자동화 | playwright | 텍스트 게시 자동화 |
| **P3** | Remotion BriefVideo Composition | P1 TTS 출력 | mp4 영상 생성 |
| **P4** | YouTube Data API 업로더 | P3 영상 + OAuth 셋업 | 유튜브 업로드 자동화 |
| **P5** | 팟캐스트 RSS + 블로그 API | P1 TTS 출력 | 오디오/텍스트 배포 |
| **P6** | `publish-dispatcher` 통합 | P1~P5 전체 | `npm run publish:channels` |

---

## 리스크 & 대응

| 리스크 | 영향도 | 대응 |
|--------|--------|------|
| 티스토리 Open API 완전 종료 | 높음 | Playwright 브라우저 자동화로 대체, 세션 쿠키 재사용 |
| 티스토리 하루 5개 글 제한 | 중간 | `scheduled` 큐로 일일 배분, 초과 시 다음날 이월 |
| YouTube 쿼터 하루 ~6건 | 중간 | 일일 배치 스케줄링, 별도 GCP 프로젝트로 풀 확장 가능 |
| YouTube OAuth 미인증 앱 | 높음 | Google 인증 심사 **2~4주 사전 신청** 필수 |
| MimikaStudio Alpha 단계 | 중간 | job 실패 시 watchdog 에스컬레이션, TTS 재시도 로직 |
| MimikaStudio BSL-1.1 라이선스 | 낮음 | 내부 도구로만 사용, 산출물만 외부 유통 → 위반 없음 |
| Remotion Mediabunny 마이그레이션 | 낮음 | Media Parser deprecated (2026-02) → 신규 구현은 Mediabunny 기준 |
| Playwright 티스토리 UI 변경 | 중간 | selector 기반 → data-testid 또는 role 기반 선택자 우선 |

---

## 쿼터 & 일일 운영 제한 요약

| 채널 | 일일 제한 | 대응 전략 |
|------|----------|-----------|
| 티스토리 | ~5건/일 (비공식) | 일일 배치 최대 3~4건 권장 |
| YouTube | ~6건/일 (쿼터) | scheduled 큐, 필요 시 GCP 프로젝트 분리 |
| Ghost/WordPress | API 제한 없음 (셀프호스팅) | 제한 없음 |
| 팟캐스트 RSS | 제한 없음 | 제한 없음 |

---

## 참고 문서

### 내부
- `docs/ref/PIPELINE-OPERATING-MODEL.md` — 수집→가공→초안→검수→배포 흐름
- `docs/ref/AGENT-OPERATING-MODEL.md` — publisher/watchdog 에이전트 역할
- `docs/ref/AUTO-PUBLISH-RULES.md` — approved → scheduled → published 전환 규칙
- `docs/ref/VIDEO-PIPELINE.md` — video_jobs 파이프라인 (Remotion 연동 참고)
- `docs/ref/VIDEO-WORKER-CONTRACT.md` — watch folder 계약 (Playwright 정책 참고)
- `packages/media-engine/CLAUDE.md` — media-engine 구조 (render-spawn.ts, supabase-storage.ts)

### 외부
- [MimikaStudio GitHub](https://github.com/BoltzmannEntropy/MimikaStudio)
- [MimikaStudio 공식 사이트](https://boltzmannentropy.github.io/mimikastudio.github.io/)
- [티스토리 Open API 종료 안내](https://tistory.github.io/document-tistory-apis/)
- [YouTube Data API v3 공식](https://developers.google.com/youtube/v3)
- [YouTube Upload API 가이드](https://postproxy.dev/blog/youtube-upload-api-guide/)
- [Remotion 공식 문서](https://www.remotion.dev/docs/)
- [Remotion Audio 사용법](https://www.remotion.dev/docs/using-audio)
- [Remotion 오디오 동기화](https://oboe.com/learn/mastering-programmatic-video-with-remotion-4bsrlt/audio-and-synchronization-4)
- [podcast npm 패키지](https://www.npmjs.com/package/podcast)
- [Playwright 공식](https://playwright.dev/)
