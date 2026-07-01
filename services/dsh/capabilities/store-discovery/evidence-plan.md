# Store Discovery Store Discovery — Journey Evidence Plan

## Journey Identity
- Journey ID: Store Discovery
- Capability ID: dsh.store.discovery
- Service Owner: services/dsh
- Primary Surface: app-client
- Execution Mode: full-stack, Docker-backed, evidence-gated

## In Scope
- OpenAPI: GET /dsh/stores
- OpenAPI: GET /dsh/stores/{storeId}
- Domain types/policy/errors
- DSH database migration and local seed
- DSH backend repository/handlers/routes
- DSH runtime health/readiness
- DSH Docker profile activation
- Generated typed client
- Frontend shared adapter
- app-client Store Discovery screen
- Live API smoke
- Live UI screenshot

## Out of Scope
- control-panel
- app-partner
- app-captain
- app-field
- cart
- checkout
- order lifecycle
- payment
- wallet
- refund
- settlement
- payout
- commission
- COD ledger
- WLT runtime
- MinIO upload workflow
- Redis
- Mongo

## Required Evidence
- git-status.txt
- git-diff-check.txt
- foundation-gate.txt
- contracts-lint.txt
- docker-runtime-smoke.txt
- docker-ps.txt
- migration-output.txt
- seed-output.txt
- api-smoke-health.txt
- api-smoke-readiness.txt
- api-smoke-list-stores.txt
- api-smoke-get-store.txt
- dsh-package-typecheck.txt
- dsh-package-build.txt
- dsh-package-test.txt
- dsh-package-lint.txt
- journey-gate.txt
- app-client-store-discovery-screenshot.png
- machine-readable-audit.md
- donor-extraction-notes.md
- graph-analysis-notes.md
