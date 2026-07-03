# entity_boundary_matrix (Partner vs Store)

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

```yaml
entity_boundary_matrix:
  - entity: Partner
    definition: credential/identity/document/decision entity (per 03#11.1); Partner 1->N Stores.
    touched_by_dsh_marketing: indirectly only — validateStoreTarget() in visibility_gate.go requires
      s.partner_readiness='ready' as one of six AND-ed conditions before a campaign/banner/promo may
      bind to a store target. Marketing never reads/writes partner identity, documents, or activation
      status directly.
    verification_command: rg -n "partner_readiness" services/dsh/backend/internal/marketing/visibility_gate.go
    result: PASS — no Partner-lifecycle mutation from marketing code.
  - entity: Store
    definition: appearance/catalog/order/discovery entity (per 03#11.1).
    touched_by_dsh_marketing: campaigns/banners/promos may bind target_type=store to a dsh_stores row;
      ValidateTarget requires status=active, is_visible=true, serviceability in (serviceable,limited),
      partner_readiness=ready, catalog_approval_status=approved, marketing_visibility=visible — i.e. the
      SAME conjunctive gate used for client visibility elsewhere (store_client_visibility_gate_matrix
      pattern), not a marketing-only shortcut.
    verification_command: rg -n "validateStoreTarget" services/dsh/backend/internal/marketing/visibility_gate.go
    result: PASS — no bypass of the store client-visibility gate found.
  - entity: PartnerOffer (control-panel "partner-offers" tab)
    definition: a proposed store-scoped promotional offer submitted by a partner.
    touched_by_dsh_marketing: usePartnerOffersController is local-state-only (no dsh_partner_offers
      table exists); ValidateTarget explicitly REJECTS target_type=offer with reason "offer targeting
      is not yet backed by a partner-offer table" rather than silently allowing it — confirmed by
      TestMarketingTargetVisibilityGateDBIntegration/offer-gate-rejected assertion (PASS).
    verification_command: go test ./internal/marketing/... -run TestMarketingTargetVisibilityGateDBIntegration -v
    result: PASS on the boundary the code claims (rejects unbacked offer targets); the feature itself
      remains FIX_REQUIRED (no backend), tracked separately, not an entity-boundary leak.
  - entity: Campaign/Banner/Promo row itself
    definition: marketing content entity, distinct from both Partner and Store.
    boundary_note: no client-facing or partner-facing read route exists for this entity at all (see
      capability-map.ts note added in this pass) — so there is no risk today of a Partner surface
      reading/mutating Store-owned data through it, simply because nothing outside control-panel/operator
      can read it yet.
    verification_command: grep -n "operator/marketing" services/dsh/backend/internal/http/server.go
    result: PASS on boundary (no leak found); FIX_REQUIRED on completeness (no client/partner read path).
```
