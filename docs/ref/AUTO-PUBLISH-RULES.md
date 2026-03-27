# Auto Publish Rules

## Default Goal
- 승인된 브리프를 quality gate 뒤에만 `review -> scheduled -> published`로 전환한다.
- `draft` 브리프는 auto-publish 대상이 아니며 반드시 editorial review를 먼저 거친다.
- 즉시 공개는 허용하지만, 여전히 quality gate와 상태 가드를 통과해야 한다.
- 기본 운영은 `human approve`가 아니라 `guardrail auto-approve`다. 기준 미달 항목만 예외적으로 사람이 본다.

## Auto Queue Conditions
- `review_status = approved`
- `status IN ('review', 'scheduled')`
- title length `15-70`
- summary length `50-200`
- body paragraphs `>= 3` (헤딩 제외)
- source count `>= 2`
- source URLs are all `https://`
- internal terms `pipeline`, `ingest`, `classify`, `orchestrat` absent

## Default Route
1. 수집
2. 가공
3. 초안 (`draft`)
4. editorial review (`review + pending`)
5. guardrail auto-approve (`review + approved`) 또는 exception hold (`review + pending`)
6. auto-publish (`scheduled` or `published`)

## Auto Approve Conditions
- quality gate 6/6 pass
- `qualityScore >= 70`
- classifier confidence `>= 0.85`
- `duplicate_of is null`
- `exception_reason is null`
- `target_surface != 'both'`
- source tier not in `manual-review-required`, `blocked`
- no high-similarity match against existing published brief titles/summaries

## Auto Publish Actions
- `review + approved`는 auto-publish 실행 시 `scheduled`로 전환된다.
- `scheduled + approved`는 `scheduled_at <= NOW()`일 때 `published`로 전환된다.
- 한 번에 최대 10개 브리프만 처리한다.

## Quality Failure Recovery
- quality gate 실패 브리프는 발행을 진행하지 않는다.
- 실패 브리프는 `draft + pending`으로 자동 복귀한다.
- recovery 사유는 `last_editor_note`에 남긴다.
- 다음 `daily-editorial-review` 실행에서 다시 가공 대상이 된다.

## State Integrity Guard
- `approve`와 `schedule`은 `review` 상태 브리프에서만 허용한다.
- `draft + approved`, `draft + scheduled_at`, `draft + published_at` 같은 복구 가능한 조합은 `publish:repair-state`로 정리한다.
- automation 문서와 실제 실행 스크립트 drift는 `automation:check`로 점검한다.

## Human Escalation Conditions
- auto-approve hold 사유가 남은 경우
- 원문 접근 실패로 editorial review가 충분한 본문/소스를 만들지 못한 경우
- quality gate 반복 실패가 누적되는 경우
- source provenance 또는 policy ambiguity가 남는 경우
- dual-surface/duplicate/manual-review source처럼 의도적으로 operator review를 요구하는 경우

## Immediate Publish
- 기본 우선순위는 `scheduled` 경유다.
- 다만 현재 구현은 `scheduled_at <= NOW()`면 같은 워커가 즉시 `published`까지 올릴 수 있다.
