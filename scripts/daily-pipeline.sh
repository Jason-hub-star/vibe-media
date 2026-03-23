#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Load env vars (run-daily-pipeline.ts has no dotenv import)
if [ -f .env ]; then
  set -a && source .env && set +a
fi
if [ -f .env.local ]; then
  set -a && source .env.local && set +a
fi

mkdir -p logs

npx tsx apps/backend/src/workers/run-daily-pipeline.ts 2>&1 | tee "logs/pipeline-$(date +%Y%m%d-%H%M%S).log"
