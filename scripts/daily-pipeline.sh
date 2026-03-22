#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p logs

npx tsx apps/backend/src/workers/run-daily-pipeline.ts 2>&1 | tee "logs/pipeline-$(date +%Y%m%d-%H%M%S).log"
