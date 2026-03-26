# Media Publish — NotebookLM 오디오/비디오 생성 + YouTube 업로드 준비

Brief slug를 받아서 NotebookLM 오디오/비디오 생성 → 상태 폴링 → YouTube 업로드 가이드 생성까지 자동 실행한다.

## 인자

- `<slug>`: Brief slug (필수)
- `--audio-only`: 비디오 생성 생략, 오디오만
- `--video-only`: 오디오 생성 생략, 비디오만
- `--style <style>`: 비디오 스타일 (classic, whiteboard, kawaii, anime, watercolor, retro_print, heritage, paper_craft) 기본: classic
- `--lang <lang>`: 언어 (en, ko, es) 기본: en
- `--skip-nlm`: NotebookLM 생성 건너뛰고 YouTube 가이드만 생성

## Steps

### 1. Brief 확인
```bash
# Supabase에서 Brief 조회하여 제목/본문/태그 확인
npx tsx apps/backend/src/features/brief/get-brief-detail.ts <slug>
```
Brief가 없으면 에러 출력 후 종료.

### 2. NotebookLM 노트북 준비

기존 노트북이 있는지 확인:
```bash
nlm notebook list | grep -i "<slug>"
```

없으면 새로 생성:
```bash
nlm notebook create "VibeHub: <Brief 제목>"
nlm source add <notebook-id> --text "<Brief 본문>"
```

### 3. 오디오 생성 (--video-only가 아닐 때)
```bash
nlm audio create <notebook-id> -f brief -l short --language <lang> -y
```

### 4. 비디오 생성 (--audio-only가 아닐 때)
```bash
nlm video create <notebook-id> -f brief -s <style> --language <lang> -y
```

### 5. 완료 대기
```bash
# 30초 간격으로 폴링, 최대 10분
nlm studio status <notebook-id>
```
모든 artifact이 `completed`가 될 때까지 대기.

### 6. output 폴더 준비
```bash
mkdir -p output/<slug>
```

### 7. YouTube 업로드 가이드 생성
```bash
# Threads 발행 URL 확인 (이미 발행됐으면)
# youtube-upload-guide.txt 생성
```

Brief 정보 + Threads URL + 태그 + 해시태그 + 크로스프로모 링크 포함.

### 8. 수동 다운로드 안내

```
═══════════════════════════════════════
📥 수동 다운로드 필요
═══════════════════════════════════════
1. NotebookLM 웹 열기: https://notebooklm.google.com
2. 노트북 "<제목>" 선택
3. Studio 탭 → 오디오/비디오 다운로드
4. 저장 위치: output/<slug>/
   - 오디오: audio-<lang>.m4a
   - 비디오: video-<lang>.mp4
5. (선택) AI Studio에서 썸네일 생성 → thumbnail-<lang>.jpg
═══════════════════════════════════════
```

### 9. 파일 체크리스트 표시

output/<slug>/ 폴더를 스캔하여:
```
📁 output/<slug>/
  ✅ youtube-upload-guide.txt (자동 생성)
  ✅ youtube-metadata.json (자동 생성)
  ⬜ audio-en.m4a (수동 다운로드 필요)
  ⬜ video-en.mp4 (수동 다운로드 필요)
  ⬜ thumbnail-en.jpg (선택)
```

### 10. 결과 보고

Telegram으로 미디어 생성 완료 보고 (TELEGRAM_BOT_TOKEN이 있을 때):
```
🎬 Media ready: <Brief 제목>
Audio: ✅ generated (다운로드 대기)
Video: ✅ generated (다운로드 대기)
Guide: ✅ output/<slug>/youtube-upload-guide.txt
```

## 규칙
- nlm auth가 안 되어 있으면 `nlm login`부터 안내
- NotebookLM 생성은 brief당 1회만 (중복 방지)
- 비디오 생성은 5~15분 소요, 인내심 필요
- 다운로드는 현재 수동만 가능 (NotebookLM 웹)
- output/ 폴더는 .gitignore 대상
