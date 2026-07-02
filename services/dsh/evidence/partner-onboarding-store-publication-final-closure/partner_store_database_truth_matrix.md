# partner_store_database_truth_matrix

resolved_commit_sha: 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3

```yaml
partner_store_database_truth_matrix:
  partner_truth:
    canonical_table: dsh_partners (services/dsh/database/migrations/dsh-015_partner_lifecycle.sql:10)
    required_columns: [id, legal_name_ar, legal_name_en, display_name, legal_identity_type, legal_identity_number, owner_name, primary_phone, category, activation_status, created_by_actor_id, created_by_surface, version]
    forbidden_columns: store visibility columns (is_visible/serviceability/catalog/marketing) — not present in dsh_partners
    lifecycle_status_columns: activation_status (single owner of partner lifecycle) + dsh_partner_activation_events audit
    verification_command: rg -n "CREATE TABLE IF NOT EXISTS dsh_partners" -A 40 services/dsh/database/migrations/dsh-015_partner_lifecycle.sql
  store_truth:
    canonical_table: dsh_stores (dsh-001_store_discovery.sql + governance/publication columns)
    required_columns: [id, status, is_visible, serviceability_status, partner_readiness, catalog_approval_status, marketing_visibility, partner_id, version]
    forbidden_columns: partner identity/documents columns — not present in dsh_stores
    publication_visibility_columns: [status, is_visible, serviceability_status, partner_readiness, catalog_approval_status, marketing_visibility]
    verification_command: rg -n "partner_readiness|catalog_approval_status|marketing_visibility" services/dsh/database/migrations
  relationship_truth:
    canonical_join: dsh_stores.partner_id -> dsh_partners.id (dsh-015:65-71, ON DELETE SET NULL)
    nullable_allowed_for_legacy: true
    nullable_allowed_for_new_onboarding: false  # client_visible transition requires linked store; field intake creates first-store draft (dsh-016_field_partner_store_draft.sql)
    backfill_required: false (legacy stores remain partner_id NULL and are unaffected)
    verification_command: rg -n "partner_id" services/dsh/database/migrations/dsh-015_partner_lifecycle.sql services/dsh/database/migrations/dsh-016_field_partner_store_draft.sql
  duplicate_truth_check:
    duplicate_partner_identity_in_store: PASS  # store carries only partner_id FK
    duplicate_store_visibility_in_partner: PASS  # partner carries no visibility columns; partner_readiness on store is a derived propagation written transactionally by TransitionStatus (repository.go:291-319) with store audit — documented read-model of partner state, single writer
    duplicate_activation_status: PASS  # one activation_status column; store publication gates are separate store-owned columns
    required_action: none
```

## frontend/backend/type alignment
- DB: dsh_partners.activation_status ⇄ backend partner.ActivationStatus (model.go:38 constants) ⇄ OpenAPI DshPartner activationStatus ⇄ frontend DshPartnerActivationStatus (partner-activation.model.ts:11) — same 18 statuses.
- Verification: `rg -n "client_visible" services/dsh/backend/internal/partner/model.go services/dsh/frontend/shared/partner/partner-activation.model.ts services/dsh/contracts/dsh.openapi.yaml`
