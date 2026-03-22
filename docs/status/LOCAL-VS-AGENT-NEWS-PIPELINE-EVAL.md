# Local Vs Agent News Pipeline Eval

이 문서는 `VibeHub Media` 최신 IT 뉴스 파이프라인 점검 프롬프트를 기준으로, 로컬 LLM과 agentic runner 중 어디에 어떤 단계를 맡기는 게 더 현실적인지 기록한 실험 로그다.

## Goal
- `점검용` 프롬프트를 실제로 돌렸을 때 로컬 모델이 감당 가능한지 확인한다.
- repo-scale 점검, 병목 추출, 후속 실행/배포 판단 중 어느 단계에 로컬을 쓰는 게 맞는지 결정한다.

## Scope
- 대상 프롬프트: 최신 IT 뉴스 파이프라인 `점검용`
- 대상 범위:
  - `source fetch`
  - `ingest spine`
  - `classification`
  - `brief/discover draft`
  - `review/publish/exceptions`
  - `Supabase sync/read`

## Environment
- date: `2026-03-22`
- local model: `mistral-small3.1`
- agent runner: `Codex CLI`
- Codex sandbox: `read-only`
- working repo: `/Users/family/jason/vibehub-media`

## Ground Truth Used
- snapshot file: [`apps/backend/state/live-ingest-snapshot.json`](/Users/family/jason/vibehub-media/apps/backend/state/live-ingest-snapshot.json)
  - `generatedAt = 2026-03-22T00:34:34.895Z`
  - `sources = 5`
  - `runs = 3`
  - `items = 9`
  - `classifications = 9`
  - `review = 4`
  - `publish = 5`
  - `exceptions = 4`
- source registry: [`apps/backend/src/shared/live-source-registry.ts`](/Users/family/jason/vibehub-media/apps/backend/src/shared/live-source-registry.ts)
  - enabled `3`
  - disabled `2`
- worker/read path files:
  - [`apps/backend/src/shared/live-source-fetch.ts`](/Users/family/jason/vibehub-media/apps/backend/src/shared/live-source-fetch.ts)
  - [`apps/backend/src/workers/run-live-ingest-spine.ts`](/Users/family/jason/vibehub-media/apps/backend/src/workers/run-live-ingest-spine.ts)
  - [`apps/backend/src/features/review/list-review-items.ts`](/Users/family/jason/vibehub-media/apps/backend/src/features/review/list-review-items.ts)
  - [`apps/backend/src/features/publish/list-publish-queue.ts`](/Users/family/jason/vibehub-media/apps/backend/src/features/publish/list-publish-queue.ts)
  - [`apps/backend/src/features/exceptions/list-exception-queue.ts`](/Users/family/jason/vibehub-media/apps/backend/src/features/exceptions/list-exception-queue.ts)
- verification:
  - `npm run typecheck`: pass
  - `npm run test:unit`: pass (`16 files`, `34 tests`)

## Experiment Process

### 1. Local Full-Context Audit
- input:
  - status docs + operating model + package scripts + source registry + fetch/ingest/read-path code
  - combined context size: about `40.5 KB`
- model: `mistral-small3.1`
- expected task:
  - read the repo context
  - identify blocked points
  - propose 1 to 3 small tasks
- result:
  - no usable answer returned
  - run exceeded `3 minutes` and was stopped

### 2. Local Reduced-Context Audit
- input:
  - reduced context with status highlights + registry + key workers + read paths
  - combined context size: about `30.6 KB`
- model: `mistral-small3.1`
- expected task:
  - same audit goal with less context
- result:
  - no usable answer returned
  - run exceeded `1 minute` and was stopped

### 3. Local Small Classification Test
- input:
  - snapshot counts
  - enabled/disabled source counts
  - worker existence facts
  - typecheck/test pass facts
- model: `mistral-small3.1`
- expected task:
  - return strict JSON only
  - mark each pipeline stage as `green/yellow/red`
  - choose one `primary_bottleneck`
- result:
  - no usable answer returned
  - run exceeded `1 minute` and was stopped

### 4. Codex Read-Only Audit
- input:
  - same `점검용` prompt against the actual repo
- runner: `Codex CLI`
- sandbox: `read-only`
- result:
  - completed
  - elapsed time: `307150ms` (`about 5m 7s`)
  - returned a concrete audit with:
    - current pipeline status
    - blocked points
    - today tasks 1 to 3
    - validation checklist

## Agent Output Summary
- current status:
  - live fetch is running on `3` enabled sources
  - local snapshot and Supabase-first read path are wired
  - brief/discover rows are generated
- bottlenecks reported by Codex:
  - source coverage is still narrow because `2` sources are disabled
  - live path still relies on feed/release summary and lacks stronger full-content ingest
  - `both => review` routing pushes too many items into review/exceptions
  - `pipeline:supabase-sync` may overwrite human lifecycle state in editorial tables
- recommended smallest tasks:
  1. stop editorial sync from overwriting manual lifecycle state
  2. narrow the `both => review` rule
  3. restore at least one disabled source, starting with `OpenAI API Changelog`

## Result
- local `mistral-small3.1` can still be useful for very small routing, memory, or summary work.
- local `mistral-small3.1` is not practical for repo-scale audit prompts that require reading many docs and code files together.
- `Codex` can complete the audit, but latency is still minutes, not seconds.
- with current settings, `Codex` is good for inspection and bottleneck finding, but not for write tasks because the sandbox is `read-only`.

## Recommended Stage Split
- local:
  - very small preprocessing
  - route/search/memory style classification
  - short post-processing summaries
- Codex:
  - audit / inspection / bottleneck finding
  - read-only repo exploration
- Claude:
  - actual implementation work
  - validation-heavy execution
  - release gate review

## Practical Conclusion
- `점검용` 프롬프트:
  - default to agent runner, not local
- `실행용` 프롬프트:
  - default to Claude until Codex write sandbox policy changes
- `배포판단용` 프롬프트:
  - default to Claude or another verification-capable agent
- local should remain a helper layer, not the main auditor, for this workflow.
