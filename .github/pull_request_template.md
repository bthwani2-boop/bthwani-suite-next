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
