# VibeHub Project Status

## Current Phase
- bootstrap scaffold complete: done
- P0-1 JS runtime baseline + typecheck stabilization: done
- P0-2 git bootstrap + decision-log split: done

## Active Tracks
- frontend shell: done
- admin workflow shell: done
- discovery/radar shell: done
- pipeline operating model docs: done
- ingest core SQL draft: done
- admin inbox scaffold: done
- admin runs scaffold: done
- admin review scaffold: done
- admin publish scaffold: done
- admin exceptions scaffold: done
- admin policies scaffold: done
- admin programs scaffold: done
- video pipeline scaffold refresh: done
- video worker contract + queue routing docs: done
- target_surface routing + human-on-exception state wiring: done
- ingest stack decision: done
- source catalog v1: done
- operating docs set: done
- shared contracts: done
- token system: done
- test harness: done
- route-level design docs: in progress
- frontend state hardening: pending

## Validation
- Validation precondition: confirm `node`, `npm` (or team package manager), and root workspace scripts are available before running checks
- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm run build`: pass
- `npm run test:unit`: last known pass
- `npm run test:e2e`: last known pass

## Open Follow-ups
- `apps/web` typecheck now depends on `next typegen` before `tsc --noEmit`; keep this as the canonical Next 16 flow on new machines
- page-level loading/empty/error states need explicit implementation pass
- discovery filters, sort rules, and category drill-down are still scaffold-level only
- `admin/inbox`, `admin/runs`, `admin/review`, `admin/publish`, `admin/exceptions`, `admin/policies`, `admin/programs`는 scaffold 구현 완료
- `admin/video-jobs`는 이제 `auto analysis -> CapCut -> parent review -> private upload` 흐름을 반영하는 scaffold 상태다
- `video_jobs`는 `upload_ready/uploaded_private -> publish`, `blocked -> exceptions` 규칙까지 mock data와 문서 기준으로 연결된 상태다
- `docs/ref/VIDEO-WORKER-CONTRACT.md`가 watch folder -> auto analysis -> CapCut handoff -> parent review 계약을 정의한다
- inbox의 `target_surface`는 이제 `review/publish/archive/discard` 다음 큐로 실제 파생되고, human exception 규칙은 review/exceptions에 반영된다
- ingest core SQL draft is added, but Supabase apply/verification is still pending
- video job schema 확장 마이그레이션은 추가됐지만 Supabase apply/verification은 아직 pending
- source/tool decision is fixed for v1; orchestration final choice remains pending and is tracked in `docs/status/DECISION-LOG.md`
- design docs need route-by-route expansion for Claude-led frontend refinement
- admin authentication is intentionally local-only and must be replaced before real deployment
- remote push to `origin` is working in the current SSH-authenticated environment
