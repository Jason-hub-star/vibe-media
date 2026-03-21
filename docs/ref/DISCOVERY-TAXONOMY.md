# Discovery Taxonomy

## Purpose
- `radar`와 `admin/discover`가 무엇을 담을 수 있는지 고정하는 분류 기준이다.
- 분류는 UI 필터, admin 큐레이션, 향후 Supabase 스키마 설계의 기준이 된다.

## Core Discovery Categories
- `open_source`
- `skill`
- `plugin`
- `os`
- `website`
- `event`
- `contest`
- `news`

## Builder Workflow Categories
- `model`
- `api`
- `sdk`
- `agent`
- `template`
- `integration`

## Knowledge Categories
- `research`
- `dataset`
- `benchmark`
- `tutorial`
- `newsletter`
- `repo_list`

## Opportunity Categories
- `job`
- `grant`
- `community`

## Asset Categories
- `asset`

## Notes
- 하나의 항목은 하나의 대표 category만 가진다.
- 세부 분류는 `tags`로 보조한다.
- category를 더 늘릴 때는 `packages/content-contracts/src/discover.ts`, presenter, admin filter 순서로 같이 수정한다.
