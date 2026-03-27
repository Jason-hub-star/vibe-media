# VibeHub YouTube Link Intake

## 목적

운영자가 YouTube Studio에 영상을 올린 뒤, public YouTube URL을 VibeHub 시스템에 등록한다.
이 단계가 완료되어야 브리프 상세, 홈, Threads Pass 3에 YouTube 링크가 반영된다.

---

## 입력 방식

기본 입력:

```text
<youtube-url>
```

또는 로컬 LLM이 명확히 YouTube 연결 완료 의도로 해석할 수 있는 메시지:

```text
이 링크 연결해줘 <youtube-url>
```

명시 연결 override:

```text
/vh-youtube <brief-slug> <youtube-url>
```

CLI fallback:

```bash
npm run publish:link-youtube -- <video-id-or-url>
```

CLI 명시 연결:

```bash
npm run publish:link-youtube -- <brief-slug> <video-id-or-url>
```

---

## 기대 결과

- `brief_posts.youtube_video_id` 갱신
- `brief_posts.youtube_url` 갱신
- `brief_posts.youtube_linked_at` 갱신
- `channel_publish_results`에 public YouTube URL 이력 추가
- Threads Pass 3 크로스프로모 재주입
- 웹사이트 브리프 상세/홈 surface 자동 반영

---

## 운영 원칙

- 업로드 완료 감지는 polling하지 않는다.
- 일반 자연어 메시지로 상태를 바꾸지 않는다.
- 로컬 LLM은 `YouTube 연결 완료` 의도가 분명한 메시지 1종만 intake로 분류한다.
- YouTube URL이 정확히 1개 있을 때만 자동 intake 후보로 본다.
- YouTube 연결은 운영자 명시 입력으로만 완료한다.
- URL은 반드시 public YouTube watch URL 또는 11자리 video id여야 한다.
