# Telegram Orchestrator

Local Telegram router for:

- OpenClaw-adjacent local orchestration
- Ollama as the local classifier / fallback assistant
- Claude Code CLI as an optional remote executor
- Codex CLI as an optional remote executor

## What this does

1. Receives Telegram messages through a bot token
2. Uses a local Ollama model to choose `local`, `claude`, or `codex` for `/auto`
3. Calls `claude -p` or `codex exec` through local wrapper scripts
4. Sends the result back to Telegram
5. Tracks model eval, shadow, activation, and rollback state in SQLite

## Commands

- `/help`
- `/status`
- `/models`
- `/model-eval <model>`
- `/model-shadow <model>`
- `/model-activate <model> [targets]`
- `/model-rollback [targets]`
- `/fact <message>`
- `/chat <message>`
- `/local <message>`
- `/claude <message>`
- `/codex <message>`
- `/auto <message>`
- plain messages without `/` are auto-routed and searched when needed

## Setup

1. Copy `.env.example` to `.env`
2. Fill in `TELEGRAM_BOT_TOKEN`
3. Optionally set `TELEGRAM_ALLOWED_CHAT_IDS`
4. Start the router:

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR/telegram-orchestrator"
./bin/start-router.sh
```

`start-router.sh`는 `.env`를 먼저 로드하고, 있으면 `.env.local`로 override한 뒤 라우터를 실행한다.

To keep the Mac awake while the router runs on charger:

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR/telegram-orchestrator"
./bin/start-router-awake.sh
```

## Notes

- `claude` must be logged in first: `claude`
- `codex` is already installed and can run with your ChatGPT login
- The default Codex wrapper uses `read-only` sandbox for safety
- This router does not require extra npm dependencies
- Model state is stored in `telegram-orchestrator/state/orchestrator.sqlite`
- `/model-eval` runs the fixed eval suite and records baseline drift
- `/model-shadow` lets a candidate observe live traffic without replacing the active model
- `/model-activate` can target specific `chat/router/search/memory` roles or VibeHub stage pointers like `classifier`, `brief-draft`, `discover-draft`, `critic`
- `/model-activate` starts automatic rollback monitoring only when a runtime role is activated
- `/model-rollback` restores the last stable snapshot for the requested targets
- `start-router-awake.sh` prevents idle sleep while the router runs, but closing the lid can still put the Mac to sleep
- `/fact` forces web search and includes sources
