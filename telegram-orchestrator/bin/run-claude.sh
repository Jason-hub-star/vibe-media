#!/bin/zsh
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

if [[ $# -lt 1 ]]; then
  echo "Usage: run-claude.sh <prompt>" >&2
  exit 2
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code CLI is not installed." >&2
  exit 1
fi

WORKDIR="${ROUTER_WORKDIR:-$PWD}"
VIBEHUB_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PROMPT="$1"
CLAUDE_MODEL="${ROUTER_CLAUDE_MODEL:-claude-sonnet-4-6}"

# vibehub-media .env.local 로드 (SUPABASE_DB_URL 등)
if [[ -f "$VIBEHUB_DIR/.env.local" ]]; then
  set -a
  source "$VIBEHUB_DIR/.env.local"
  set +a
fi

exec claude -p "$PROMPT" \
  --model "$CLAUDE_MODEL" \
  --output-format text \
  --permission-mode auto \
  --add-dir "$WORKDIR" \
  --add-dir "$VIBEHUB_DIR" \
  < /dev/null
