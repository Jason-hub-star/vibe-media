# Telegram 대화 히스토리 야간 공고화

## 목적
전날 Telegram 대화 에피소드(단기기억)를 로컬 Ollama로 요약해  
Obsidian `Telegram/Memory/YYYY-MM-DD.md`에 의미기억(장기기억)으로 저장한다.  
해마의 sleep consolidation 패턴을 구현한 자동화다.

Cowork 스케줄러에서 **매일 새벽 02:06** 자동 실행된다.
태스크 ID: `telegram-history-consolidate`

---

## 전제 조건

| 항목 | 확인 방법 |
|---|---|
| Ollama 실행 중 | `curl -s http://127.0.0.1:11434/api/tags` |
| 활성 모델 존재 | `vibehub-chat-g4` 또는 `CONSOLIDATION_MODEL` env |
| 전날 에피소드 파일 | `jasonob/Telegram/YYYY-MM-DD.md` 존재 여부 |

Ollama가 꺼져 있으면 공고화 실패 — 이튿날 수동 재실행으로 보완한다.

---

## 실행

```bash
cd /Users/family/jason/vibehub-media/telegram-orchestrator
node bin/consolidate-history.mjs
# 특정 날짜 지정 시:
node bin/consolidate-history.mjs 2026-04-06
```

환경변수 (선택):
```bash
OBSIDIAN_VAULT_ROOT=/Users/family/jason/jasonob   # 기본값
OLLAMA_BASE_URL=http://127.0.0.1:11434             # 기본값
CONSOLIDATION_MODEL=vibehub-chat-g4                # 기본값
```

---

## 성공 기준

| stdout 패턴 | 의미 |
|---|---|
| `[consolidate] 완료 → Telegram/Memory/YYYY-MM-DD.md` | 정상 |
| `[consolidate] 히스토리 없음 — 건너뜀` | 전날 대화 없음 (정상) |
| `[consolidate] 빈 파일 — 건너뜀` | 에피소드 파일 비어있음 (정상) |
| `[consolidate] Ollama 오류: ...` | Ollama 미실행 → 수동 재실행 |

---

## Obsidian 파일 구조

```
jasonob/
  Telegram/
    2026-04-07.md        ← 에피소드 (당일 실시간 append)
    2026-04-06.md        ← 에피소드 (전날)
    Memory/
      2026-04-06.md      ← 의미기억 요약 (이날 새벽 공고화)
      2026-04-05.md
```

에피소드 파일 라인 형식:
```
[17:32:15] [123456789] [user] 클로드한테 물어봐 오늘 파이프라인 어때
[17:32:45] [123456789] [assistant] 오늘 파이프라인은 정상적으로...
```

---

## 봇 재시작 시 히스토리 복원

`telegram-bot.mjs`는 기동 시 오늘치 에피소드 파일을 읽어  
chatId별 최근 6턴을 `conversationHistory` Map에 자동 복원한다.  
봇이 재시작되어도 당일 대화 맥락이 유지된다.

---

## 관련 파일

| 파일 | 역할 |
|---|---|
| `telegram-orchestrator/router/telegram-bot.mjs` | 에피소드 실시간 append + 기동 시 복원 |
| `telegram-orchestrator/bin/consolidate-history.mjs` | 야간 공고화 스크립트 |
| Cowork Scheduled → `telegram-history-consolidate` | 새벽 02:06 자동 실행 |
| `jasonob/Telegram/` | 에피소드 저장소 |
| `jasonob/Telegram/Memory/` | 의미기억 저장소 |
