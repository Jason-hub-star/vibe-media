---
name: telegram-memory
description: Telegram 대화 히스토리를 Obsidian에서 조회·수동 공고화·히스토리 초기화하는 스킬.
user_invocable: true
---

# Telegram Memory Skill

Telegram 봇 대화 히스토리(에피소드 + 의미기억)를 조회하고 관리한다.

## 구조 개요

```
jasonob/Telegram/
  YYYY-MM-DD.md          ← 에피소드 (당일 실시간 기록)
  Memory/
    YYYY-MM-DD.md        ← 의미기억 (야간 공고화 결과)
```

에피소드는 봇이 실시간으로 append하고, 의미기억은 매일 새벽 Ollama가 요약한다.

---

## 사용 시나리오

### 1. 오늘 대화 조회

```bash
cat /Users/family/jason/jasonob/Telegram/$(date +%Y-%m-%d).md
```

### 2. 특정 날짜 의미기억 조회

```bash
cat /Users/family/jason/jasonob/Telegram/Memory/2026-04-06.md
```

### 3. 지난 7일 의미기억 목록

```bash
ls -lt /Users/family/jason/jasonob/Telegram/Memory/ | head -8
```

### 4. 수동 공고화 (Ollama 켜진 상태 필요)

```bash
cd /Users/family/jason/vibehub-media/telegram-orchestrator
# 어제치:
node bin/consolidate-history.mjs
# 특정 날짜:
node bin/consolidate-history.mjs 2026-04-05
```

### 5. 에피소드에서 키워드 검색

```bash
grep -r "키워드" /Users/family/jason/jasonob/Telegram/ --include="*.md" \
  --exclude-dir=Memory | sort
```

### 6. 의미기억에서 주제 검색

```bash
grep -r "파킨슨\|Solomon\|파이프라인" \
  /Users/family/jason/jasonob/Telegram/Memory/ | sort
```

---

## 봇 히스토리 초기화 (/forget 미구현 시 수동)

특정 chatId의 in-memory history를 지우려면 봇을 재시작한다.  
오늘치 에피소드 파일에서 해당 chatId 라인만 삭제하면  
재시작 시 그 대화만 blank로 복원된다.

```bash
# chatId 123456789의 오늘 기록만 제거
TODAY=/Users/family/jason/jasonob/Telegram/$(date +%Y-%m-%d).md
grep -v "\[123456789\]" "$TODAY" > "$TODAY.tmp" && mv "$TODAY.tmp" "$TODAY"
# 봇 재시작
launchctl unload ~/Library/LaunchAgents/com.family.telegram-orchestrator.plist
launchctl load  ~/Library/LaunchAgents/com.family.telegram-orchestrator.plist
```

---

## 공고화 스케줄 확인

Cowork 사이드바 → Scheduled → `telegram-history-consolidate`  
cron: `0 2 * * *` (매일 새벽 02:06 로컬 시각)

수동 실행은 "Run now" 클릭 또는 위 섹션 4 참고.

---

## 관련 자동화

- `.claude/automations/daily-telegram-consolidate.md` — 야간 공고화 전체 runbook
- `telegram-orchestrator/bin/consolidate-history.mjs` — 실행 스크립트
- `telegram-orchestrator/router/telegram-bot.mjs` — 에피소드 append + 복원 로직
