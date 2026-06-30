## Scope

- [ ] UI only
- [ ] Frontend logic
- [ ] Backend/API
- [ ] Database migration
- [ ] OpenAPI/contracts
- [ ] Runtime/Docker
- [ ] Agent/tooling
- [ ] Documentation only

## Surfaces touched

- [ ] app-client
- [ ] app-partner
- [ ] app-captain
- [ ] app-field
- [ ] control-panel
- [ ] backend
- [ ] shared packages

## Linked Issue
<!-- #XX -->

## Risk level
<!-- Low / Medium / High / P0 -->

## Exact SHA
<!-- git rev-parse HEAD -->

## CI run ID
<!-- https://github.com/bthwani2-boop/bthwani-suite-next/actions/runs/... -->

## CodeQL run ID
<!-- https://github.com/bthwani2-boop/bthwani-suite-next/actions/runs/... -->

## Runtime smoke result
<!-- pass / skip / N/A -->

## DB migration impact
<!-- none / describe -->

## Screens affected
<!-- list or none -->

## Rollback plan
<!-- describe -->

## Dependency contamination check
<!-- pnpm install --frozen-lockfile passed / N/A -->

## Logs/evidence committed
<!-- yes / no / N/A -->

## Required evidence

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm run contracts:lint`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run test`
- [ ] `pnpm run build`
- [ ] Go tests/build pass for touched backend modules
- [ ] Runtime smoke verified when backend/database changes are included
- [ ] No local machine paths committed
- [ ] No secrets committed
- [ ] No preview/mock-only claim unless explicitly marked as non-production

## Merge decision

- [ ] Ready for review
- [ ] Ready to merge
- [ ] FIX_REQUIRED
- [ ] BLOCKED_NEEDS_EVIDENCE
