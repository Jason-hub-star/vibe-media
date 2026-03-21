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
- ingest / inbox / classification / publish queue admin routes are documented but not implemented
- ingest core SQL draft is added, but Supabase apply/verification is still pending
- source/tool/orchestration final decision remains pending and is now tracked in `docs/status/DECISION-LOG.md`
- design docs need route-by-route expansion for Claude-led frontend refinement
- admin authentication is intentionally local-only and must be replaced before real deployment
- remote push to `origin` still requires GitHub 인증이 가능한 세션
