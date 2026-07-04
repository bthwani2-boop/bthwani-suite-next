# dead_code_and_duplication_matrix

resolved_commit_sha: 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3

Executed directly in this closure (06#24.2 — no pending FIX_REQUIRED):

```yaml
dead_code_and_duplication_matrix:
  removed_dead_content:
    - path: services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx (PromotionIntentPanel + PromotionCandidateRow + resolvePromotionIntentStateMeta + dshPromotionCandidates usage, ~196 lines)
      reason: local-only promotion/marketing actions with no runtime backing; also misused shared dshPromotionCandidates (a function) as an array — dead/broken affordance
      action: RETIRE_DEAD — replaced with an honest operator-owned note; "فعّل العرض" no-op button removed
      verification_command: rg -n "PromotionIntentPanel|dshPromotionCandidates" services/dsh/frontend/app-partner
    - path: services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx (modeOverrides local state + toggle)
      reason: local mutation of service modes (publication-relevant) without any API; UI pretended to change operational modes
      action: RETIRE_DEAD — modes render read-only from shared serviceModes; note points to control-panel
      verification_command: rg -n "modeOverrides" services/dsh/frontend/app-partner
    - path: services/dsh/frontend/app-partner/Catalog/InventoryCatalogScreen.tsx (StoreReadinessGate mutation path)
      reason: partner-surface toggle of partner_readiness via getDshStoreVisibilityRuntimeClient() which always returns null — dead affordance AND an entity-boundary leak (publication gate mutation offered to partner)
      action: RETIRE_DEAD + boundary fix — converted to read-only notice; unused imports removed; error string referencing EXPO_PUBLIC env var removed from screen
      verification_command: rg -n "handleToggle|updatePartnerReadiness|EXPO_PUBLIC" services/dsh/frontend/app-partner/Catalog/InventoryCatalogScreen.tsx
    - path: services/dsh/backend/cmd/verify_partner_onboarding_api, services/dsh/backend/cmd/dev_seed_partner_onboarding
      reason: verifier used spoofable X-Actor headers (explicitly ignored by the API — handler_test.go), wrong routes (/health, POST /dsh/partner/stores does not exist), stale evidence dir; seed cmd printed a pointer to the broken verifier. Zero references elsewhere (rg across repo).
      action: RETIRE_DEAD — deleted; go build/test/vet PASS after deletion; replaced operationally by the authenticated E2E in manual_e2e_evidence.md
      verification_command: rg -ln "verify_partner_onboarding_api|dev_seed_partner_onboarding" . ; go build ./... (services/dsh/backend)
  removed_duplication_or_contradiction:
    - item: duplicate/contradictory operation binding table in partner.api.ts header
      problem: listed non-existent operationIds (getDshPartnerDetail, postDshPartnerActivationTransition, getDshPartnerSelfStatus, getFieldPartnerDocuments...) contradicting dsh.openapi.yaml
      action: corrected to the real 26 operationIds (operation_binding_matrix.md)
    - item: TestHideAndDeactivateBlockStoreDiscovery (added then found duplicate of existing TestPartnerReadinessForActivationStatus)
      action: MERGE_DUPLICATE — removed before commit; single test remains canonical
    - item: frontend isDshPartnerActivationComplete excluded client_hidden while backend partnerActiveDone included it
      action: contradiction resolved — frontend aligned with backend (client_hidden = activation complete, not client visible)
  stale_references_removed:
    - services/dsh/runtime-map.ts + SERVICE_BLUEPRINT.md → <BRANCH_NAME>-final-closure evidence paths (dir does not exist) replaced with this evidence folder
    - SERVICE_BLUEPRINT.md → non-existent script guard:no-legacy-journey-labels replaced with guard:no-legacy-slice-labels; stale checklist SHA 9b9ef503 replaced with resolved SHA
    - tools/guards/no-legacy-slice-labels.mjs → <BRANCH_NAME>-final-closure exclusion token removed
    - services/dsh/runtime-map.ts → legacy journey comment "Partner Store Activation" renamed to "Partner Onboarding & Store Publication"
  accepted_pre_existing_out_of_scope:
    - item: suppressed pre-existing TS errors in app-partner/app-field runtime typecheck (script tolerates via "|| echo 'Pre-existing TS errors ignored for validation'")
      evidence: none of the error lines overlap lines added in this closure (line-set comparison in verification-output.md)
      required_owner: dsh frontend surfaces maintainer
      required_action: burn down the pre-existing suppressed error list (StateView/ListItem prop drift, exactOptionalPropertyTypes)
      verification_command: cd apps/app-partner/runtime && npx tsc --noEmit -p tsconfig.json
```
