# Runtime Verification Matrix

All verification in this engagement was performed against live Docker containers (`bthwani-postgres-runtime`,
`bthwani-identity-api-runtime`, `bthwani-dsh-api-runtime`, `bthwani-wlt-api-runtime`), rebuilt from current
source at each backend change point — not assumed from reading code alone.

## Container/image lifecycle

| Step | Command | Result |
|---|---|---|
| Bring up runtime | `pnpm run runtime:up` (profiles: identity, dsh, media) | postgres/identity-api/dsh-api healthy |
| Apply migrations | `pnpm run runtime:migrate` | `dsh-027_partner_bank_account.sql: PASS`, `dsh-028_store_onboarding_fee_policy.sql: PASS` (2 separate runs, one per journey) |
| Rebuild image (×3, once per backend change) | `docker compose ... build dsh-api` | clean build from current source each time |
| Recreate container (×3) | `docker compose ... up -d --force-recreate dsh-api` | started healthy each time |
| Health check (repeated) | `curl http://localhost:58080/dsh/health` | `{"service":"dsh","status":"healthy"}` every time |

## Live DB schema proof

- `\d dsh_partners` — 9 bank columns + `settlement_preference` CHECK constraint present.
- `\d dsh_platform_store_onboarding_fee_policy` — full singleton schema + 4 CHECK constraints present.
- Direct `SELECT` queries confirmed real row data at every stage of the multi-surface-binding trace (proving no
  data loss during the `TransitionStatus` response bug — see gap ledger #3).

## Live authenticated API trace (multi-surface-binding journey)

Real logins via `identity-api`'s `/auth/login` (seeded dev accounts: `field`/`operator`, password `123456` —
`core/identity/backend/internal/identity/repository.go:BootstrapLocalActors`), not synthetic/dev-bypass tokens:

1. Field creates draft → sets bank fields → submits → **200**, bank data round-trips correctly (post-fix).
2. Operator lists submitted partners → sees the new partner → **200**.
3. Operator drives 5 consecutive lifecycle transitions (`documents_uploaded → documents_verified → ops_review →
   ops_approved → partner_active`) → all **200**, bank data intact at every step.
4. Attempted `client_visible` transition without a ready store → **422 STORE_PUBLICATION_GATES_FAILED** —
   confirms the Partner→Store publication gate is real and enforced, not decorative.
5. Public store list (`GET /dsh/stores?limit=100`, unauthenticated — the actual app-client route) does not leak
   the unpublished test store.
6. Field session calling the operator-only `GET /dsh/operator/partners` → **403 FORBIDDEN** — this is the proof
   that led to discovering and fixing gap ledger items #4 (two more app-field screens making this same
   mis-scoped call).
7. Field session calling the correctly-scoped `GET /dsh/field/partners` → **200**, `"total":10` — confirms the
   fix.

## OpenAPI/generated-client regeneration

`pnpm run openapi:generate:dsh` re-run 3 times (once per contract change: bank account, platform fee, and the
post-boundary-test wording fix); each time the diff was inspected to confirm the intended fields/operations
landed and nothing else drifted.

## Guard suite (representative, risk-weighted subset — not literally every script in `package.json`)

All of the following re-run at least once after this engagement's final code state, all **PASS**:
`guard:fullstack-boundary`, `guard:wlt-financial-boundary`, `guard:no-broken-imports`, `guard:api-binding`,
`guard:backend-api-binding`, `guard:frontend-feature-binding` (after manifest fix), `guard:ui-kit-boundary`,
`guard:runtime-config`, `guard:cleanup-policy`, `guard:go-routes-ci`, `guard:dependency-graph`, `guard:secrets`
(gitleaks, 378 commits scanned, no leaks), `guard:operational-diagnostics-reconciliation`.

Not run: guard scripts orthogonal to this engagement's actual changes (Dockerfile lint, YAML lint, Rego/OPA
policy checks, GitHub Actions pinning, bundle/performance budgets, SBOM/CVE scanners, repo-size/naming/structure)
— none of this engagement's diffs touch Dockerfiles, CI workflows, Rego policies, or bundle-affecting code.

## Backend tests

`go build ./...` and `go test ./... -count=1` (all 21 packages) re-run clean after every Go change (4 times
total across the engagement).

## Frontend tests

`pnpm --filter "@bthwani/dsh" typecheck` and `test` re-run after every batch of frontend changes; consistently
9 pre-existing typecheck errors (unrelated files) and 216/217 test pass (1 pre-existing unrelated failure) —
zero regressions introduced.
