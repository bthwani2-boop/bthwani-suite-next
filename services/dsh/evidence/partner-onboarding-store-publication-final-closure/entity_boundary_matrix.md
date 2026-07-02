# entity_boundary_matrix — Partner vs Store

resolved_commit_sha: 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3

```yaml
entity_boundary_matrix:
  partner:
    domain_meaning: كيان الاعتماد/الهوية/الوثائق/القرار — يخضع للانضمام والتحقق والتفعيل
    canonical_backend_model: services/dsh/backend/internal/partner/model.go (Partner, ActivationStatus)
    canonical_database_tables: [dsh_partners, dsh_partner_documents, dsh_partner_document_reviews, dsh_partner_field_visits, dsh_partner_activation_events]
    canonical_openapi_schemas: DshPartner*, contracts/dsh.openapi.yaml (tag DshPartnerActivation)
    canonical_frontend_types: services/dsh/frontend/shared/partner/partner.types.ts + partner-activation.model.ts
    owned_statuses: draft…ops_approved, partner_active, partner_deactivated, client_visible, client_hidden (activation lifecycle)
    owned_actions: create draft (field), documents upload/review, field visits, transition (operator only)
    forbidden_actions: self-activation from app-partner; activation/client-visibility from app-field
    allowed_surfaces: app-field (intake), control-panel (decisions), app-partner (read status/readiness)
    forbidden_surfaces: app-client (never sees Partner)
    verification_command: rg -n "transitionDshPartner|/dsh/partner/activation" services/dsh
  store:
    domain_meaning: كيان الظهور/الكتالوج/الطلبات/الاكتشاف — نقطة البيع الظاهرة للعميل
    canonical_backend_model: services/dsh/backend/internal/store/model.go (DshStoreRow)
    canonical_database_tables: [dsh_stores, dsh_store_action_audit, dsh_partner_store_visibility_events]
    canonical_openapi_schemas: DshStoreSummary/DshStoreDetail (listDshStores/getDshStore/getDshHomeDiscovery)
    canonical_frontend_types: services/dsh/frontend/shared (store/catalog topics)
    owned_statuses: status(active/inactive), is_visible, serviceability_status, catalog_approval_status, marketing_visibility, partner_readiness
    owned_actions: governance updates (operator), catalog submission (partner), discovery (client)
    forbidden_actions: partner_readiness mutation from app-partner (removed in this closure — StoreReadinessGate is now read-only)
    allowed_surfaces: app-client (discovery read), control-panel (governance), app-partner (catalog mgmt post-permission)
    forbidden_surfaces: app-field cannot publish store to client
    verification_command: rg -n "IsPublicationEligible|partner_readiness" services/dsh/backend/internal/store
  relationship:
    cardinality: "Partner 1 -> N Stores"
    join_field: dsh_stores.partner_id REFERENCES dsh_partners(id) (dsh-015_partner_lifecycle.sql:68)
    legacy_nullability_policy: partner_id nullable for legacy/backfill (ON DELETE SET NULL)
    new_flow_requirement: field intake creates partner + first-store draft; client_visible transition requires a linked store (repository.go TransitionStatus gate)
    verification_command: rg -n "partner_id" services/dsh/database/migrations/dsh-015_partner_lifecycle.sql
  conflation_check:
    partner_used_as_store: PASS  # app-client discovery renders Stores only; no Partner exposure in client endpoints
    store_used_as_partner: PASS
    mixed_activation_visibility_status: PASS  # partner_active (activation) separated from client_visible (publication); UI split enforced in PartnerHubScreen
    ambiguous_labels_absence: PASS  # "Partner Store Activation" label removed from runtime-map.ts; journey named Partner Onboarding & Store Publication
    ambiguous_routes_absence: PASS  # operator/field/partner namespaces separated in server.go
    ambiguous_types_absence: PASS  # DshPartnerActivationStatus vs store gate columns are distinct types
    required_action: none
```
