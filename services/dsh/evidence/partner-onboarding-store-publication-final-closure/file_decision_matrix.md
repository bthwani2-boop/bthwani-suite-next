# file_decision_matrix

resolved_commit_sha: 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3

```yaml
file_decision_matrix:
  - path: services/dsh/frontend/shared/partner/partner.api.ts
    current_role: manual shared API adapter (transport only)
    references_checked: imports (shared controllers), OpenAPI operationIds, guards
    decision: KEEP_ACTIVE
    reason: Option B policy documented; binding table corrected to real operationIds
    verification_command: pnpm run guard:no-direct-fetch-in-screen
  - path: services/dsh/frontend/shared/partner/partner-activation.model.ts
    current_role: canonical activation state machine (SSOT)
    decision: KEEP_ACTIVE (edited — isDshPartnerActivationComplete now includes client_hidden, aligned with backend)
    verification_command: rg -n "client_hidden" services/dsh/frontend/shared/partner/partner-activation.model.ts
  - path: services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx
    current_role: partner hub surface
    decision: REFACTOR (edited) — promotion panel + mode overrides removed (RETIRE_DEAD parts), publication-gate banner + analytics lock added
    verification_command: rg -n "isInternalActiveOnly" services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx
  - path: services/dsh/frontend/app-partner/Catalog/InventoryCatalogScreen.tsx
    current_role: partner catalog surface
    decision: REFACTOR (edited) — StoreReadinessGate made read-only; dead runtime-client imports removed
    verification_command: rg -n "StoreReadinessGate" -A 5 services/dsh/frontend/app-partner/Catalog/InventoryCatalogScreen.tsx
  - path: services/dsh/runtime-map.ts
    decision: KEEP_ACTIVE (edited — evidence paths now point to existing folder; journey label corrected)
    verification_command: rg -n "<BRANCH_NAME>|Partner Store Activation" services/dsh/runtime-map.ts (no hits)
  - path: services/dsh/SERVICE_BLUEPRINT.md
    decision: KEEP_ACTIVE (edited — evidence locations, guard name, verification SHA corrected)
    verification_command: rg -n "guard:no-legacy-journey-labels|<BRANCH_NAME>" services/dsh/SERVICE_BLUEPRINT.md (no hits)
  - path: tools/guards/no-legacy-slice-labels.mjs
    decision: KEEP_ACTIVE (edited — stale exclusion token removed)
    verification_command: pnpm run guard:no-legacy-slice-labels
  - path: services/dsh/backend/internal/partner/model_test.go
    decision: KEEP_ACTIVE (edited — TestComputeReadiness_storePublicationGates added, 8 per-gate cases)
    verification_command: go test ./internal/partner/ (services/dsh/backend)
  - path: services/dsh/backend/cmd/verify_partner_onboarding_api/
    decision: RETIRE_DEAD (deleted — see dead_code_and_duplication_matrix.md)
    verification_command: go build ./... (services/dsh/backend)
  - path: services/dsh/backend/cmd/dev_seed_partner_onboarding/
    decision: RETIRE_DEAD (deleted)
    verification_command: rg -ln "dev_seed_partner_onboarding" .
  - path: services/dsh/evidence/partner-onboarding-store-publication-final-closure/
    decision: KEEP_ACTIVE (new — canonical evidence root for this journey closure)
    verification_command: ls services/dsh/evidence/partner-onboarding-store-publication-final-closure
  - path: tools/plan/command_operational_journey_unified, tools/plan/command_old_new
    decision: KEEP_ACTIVE (untouched — LEGACY_SOURCE_TRACE.md deletion conditions govern them; deleting here would be PROTOCOL_VIOLATION)
    verification_command: git status --short tools/plan
```
