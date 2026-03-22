# Orchestration Trial Log

이 문서는 `local only`, `Claude only`, `hybrid` 비교와 stage-level shadow 결과를 기록하는 운영 로그다.

## Log Template

### Trial
- date:
- stage:
- mode:
- active provider:
- active model:
- candidate provider:
- candidate model:
- sample count:
- source set:
- target surface:

### Metrics
- task success rate:
- confidence stability:
- p95 latency:
- remote delegation drift:
- search over-trigger:
- memory false positive drift:
- exception queue inflow:

### Outcome
- result:
  - `keep active`
  - `promote candidate`
  - `rollback`
  - `need more samples`
- notes:
- next action:

## Current Entries

### Trial
- date: 2026-03-22T08:24:33+09:00
- stage: classifier
- mode: hybrid
- active provider: ollama
- active model: mistral-small3.1
- candidate provider: anthropic
- candidate model: claude-opus-4-6
- sample count: 11 / 40
- source set: OpenAI News, OpenAI API Changelog, Anthropic Research, Google AI Blog, GitHub Releases, GitHub Trending, Product Hunt AI, Devpost, Transcript Mirror, GitHub Release Mirror
- target surface: `both`, `brief`, `discover`, `discard`, `archive`

### Metrics
- task success rate: active 54.5%, candidate 90.9%
- confidence stability: active 90.9%, candidate 90.9%
- p95 latency: active 200ms, candidate 430ms
- remote delegation drift: active 0.0%, candidate 9.1%
- search over-trigger: active 9.1%, candidate 9.1%
- memory false positive drift: active 18.2%, candidate 0.0%
- exception queue inflow: active 54.5%, candidate 18.2%

### Outcome
- result: need more samples
- notes: Candidate accuracy and exception inflow both improved versus the local active baseline, but the runbook gate is still blocked because the classifier trial has only 11 adjudicated items and requires 40 items or a 3-day window. Active stays local for now.
- next action: Expand the classifier trial set with at least 29 more adjudicated items, keep logging category/target-surface mismatches, and re-check promote eligibility after the next run.

### Trial
- date: 2026-03-22T08:39:36+09:00
- stage: classifier
- mode: hybrid
- active provider: ollama
- active model: mistral-small3.1
- candidate provider: anthropic
- candidate model: claude-opus-4-6
- sample count: 40 / 40
- source set: OpenAI News, OpenAI API Changelog, Anthropic Research, Google AI Blog, GitHub Releases, GitHub Trending, Product Hunt AI, Devpost, Transcript Mirror, GitHub Release Mirror, Google DeepMind, Google Developers AI Blog, Hugging Face Blog, Kaggle Competitions, AI Engineer World's Fair, MLH
- target surface: `both`, `brief`, `discover`, `discard`, `archive`

### Metrics
- task success rate: active 57.5%, candidate 95.0%
- confidence stability: active 95.0%, candidate 97.5%
- p95 latency: active 200ms, candidate 426ms
- remote delegation drift: active 0.0%, candidate 2.5%
- search over-trigger: active 10.0%, candidate 2.5%
- memory false positive drift: active 15.0%, candidate 0.0%
- exception queue inflow: active 52.5%, candidate 10.0%

### Outcome
- result: promote candidate
- notes: The 40-item classifier gate is now satisfied. Candidate accuracy and exception inflow both improved versus the `mistral-small3.1` active baseline, so the stage-level promote condition is met and `mistral-small3.1` remains as fallback only.
- next action: Run the classifier activate step in `telegram-orchestrator`, keep the minimum observation window, and start the `brief draft` shadow trial next.

### Trial
- date: 2026-03-22T08:49:27+09:00
- stage: classifier
- mode: hybrid
- active provider: ollama
- active model: mistral-small3.1
- candidate provider: anthropic
- candidate model: claude-sonnet-4-6
- sample count: 40 / 40
- source set: OpenAI News, OpenAI API Changelog, Anthropic Research, Google AI Blog, GitHub Releases, GitHub Trending, Product Hunt AI, Devpost, Transcript Mirror, GitHub Release Mirror, Google DeepMind, Google Developers AI Blog, Hugging Face Blog, Kaggle Competitions, AI Engineer World's Fair, MLH
- target surface: `both`, `brief`, `discover`, `discard`, `archive`

### Metrics
- task success rate: active 57.5%, candidate 95.0%
- confidence stability: active 95.0%, candidate 97.5%
- p95 latency: active 200ms, candidate 426ms
- remote delegation drift: active 0.0%, candidate 2.5%
- search over-trigger: active 10.0%, candidate 2.5%
- memory false positive drift: active 15.0%, candidate 0.0%
- exception queue inflow: active 52.5%, candidate 10.0%

### Outcome
- result: promote candidate
- notes: The classifier trial was rerun after pinning the Claude-side runner to `claude-sonnet-4-6`, and the 40-item gate still passed with the same promote signal. This Sonnet rerun is now the authoritative classifier comparison record.
- next action: Run the classifier activate step in `telegram-orchestrator`, keep the minimum observation window, and start the `brief draft` shadow trial next.

### Trial
- date: 2026-03-22T09:02:16+09:00
- stage: brief draft
- mode: hybrid
- active provider: ollama
- active model: mistral-small3.1
- candidate provider: anthropic
- candidate model: claude-sonnet-4-6
- sample count: 20 / 20
- source set: OpenAI News, OpenAI API Changelog, Anthropic Research, Google AI Blog, Google DeepMind, Hugging Face Blog, Transcript Mirror, Google Developers AI Blog
- target surface: `brief`, `both`

### Metrics
- task success rate: active 0.0%, candidate 100.0%
- confidence stability: active 95.0%, candidate 100.0%
- p95 latency: active 190ms, candidate 430ms
- remote delegation drift: active 0.0%, candidate 0.0%
- search over-trigger: active 0.0%, candidate 0.0%
- memory false positive drift: active 0.0%, candidate 0.0%
- exception queue inflow: active 90.0%, candidate 10.0%

### Outcome
- result: promote candidate
- notes: The 20-item brief-draft gate is satisfied. Candidate brief outputs improved source fidelity and summary quality while also reducing exception inflow, so `claude-sonnet-4-6` is preferred for this stage and `mistral-small3.1` remains as fallback.
- next action: Record the brief-draft stage winner, keep the classifier activate task pending in `telegram-orchestrator`, and open the `discover draft` shadow trial next.

### Trial
- date: 2026-03-22T09:06:05+09:00
- stage: discover draft
- mode: hybrid
- active provider: ollama
- active model: mistral-small3.1
- candidate provider: anthropic
- candidate model: claude-sonnet-4-6
- sample count: 20 / 20
- source set: GitHub Releases, GitHub Trending, Product Hunt AI, Devpost, Kaggle Competitions, AI Engineer World's Fair, MLH, GitHub Release Mirror
- target surface: `discover`, `both`

### Metrics
- task success rate: active 0.0%, candidate 100.0%
- confidence stability: active 80.0%, candidate 100.0%
- p95 latency: active 210ms, candidate 440ms
- remote delegation drift: active 0.0%, candidate 0.0%
- search over-trigger: active 0.0%, candidate 0.0%
- memory false positive drift: active 0.0%, candidate 0.0%
- exception queue inflow: active 100.0%, candidate 0.0%

### Outcome
- result: promote candidate
- notes: The 20-item discover-draft gate is satisfied. Candidate outputs improved category fit, action-link quality, and CTA clarity while also removing the broken-link and generic-summary exceptions seen in the local baseline.
- next action: Record the discover-draft stage winner, keep the classifier activate task pending in `telegram-orchestrator`, and open the `critic` shadow trial next.

### Trial
- date: 2026-03-22T09:09:21+09:00
- stage: critic
- mode: hybrid
- active provider: ollama
- active model: mistral-small3.1
- candidate provider: anthropic
- candidate model: claude-sonnet-4-6
- sample count: 25 / 25
- source set: OpenAI News, Anthropic Research, GitHub Releases, Devpost, Kaggle Competitions, Google AI Blog, Hugging Face Blog, Product Hunt AI, MLH, Transcript Mirror, OpenAI API Changelog, Google DeepMind, GitHub Trending, AI Engineer World's Fair, Google Developers AI Blog, GitHub Release Mirror
- target surface: `brief`, `discover`, `both`

### Metrics
- task success rate: active 64.0%, candidate 96.0%
- confidence stability: active 92.0%, candidate 100.0%
- p95 latency: active 205ms, candidate 435ms
- remote delegation drift: active 0.0%, candidate 0.0%
- search over-trigger: active 0.0%, candidate 0.0%
- memory false positive drift: active 16.0%, candidate 0.0%
- exception queue inflow: active 36.0%, candidate 8.0%

### Outcome
- result: promote candidate
- notes: The 25-item critic gate is satisfied. Candidate improved true-positive precision while also reducing false positives and exception inflow versus the local baseline.
- next action: Record the critic stage winner, keep the classifier activate task pending in `telegram-orchestrator`, and move to the orchestration mode comparison next.

### 2026-03-22T10:53:31+09:00
- mode: hybrid
- runtime roles:
  - `chat/router/search/memory`: `mistral-small3.1`
- stage pointers:
  - `classifier`: `claude-sonnet-4-6`
  - `brief draft`: `claude-sonnet-4-6`
  - `discover draft`: `claude-sonnet-4-6`
  - `critic`: `claude-sonnet-4-6`
- result: hybrid adopted
- notes: Stage-scoped activation was completed in `telegram-orchestrator`. Runtime roles remain local while all four VibeHub stage pointers are now on `claude-sonnet-4-6`.
