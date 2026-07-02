# store_client_visibility_gate_matrix

resolved_commit_sha: 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3

All client-facing store reads flow through the same SQL gate set in
`services/dsh/backend/internal/store/repository.go`:

Public list filter (repository.go:56-61):
```
is_visible = true
status = active
serviceability_status IN ('serviceable','limited')
partner_readiness = 'ready'
catalog_approval_status = 'approved'
marketing_visibility = 'visible'
```

```yaml
store_client_visibility_gate_matrix:
  listDshStores:
    must_filter_by_partner_readiness: PASS (repository.go:59)
    must_filter_by_store_status: PASS (repository.go — status=active)
    must_filter_by_catalog_approval: PASS (repository.go:60)
    must_filter_by_serviceability: PASS (repository.go:58)
    must_filter_by_marketing_visibility: PASS (repository.go:61)
    must_hide_when_partner_deactivated: PASS (TransitionStatus sets partner_readiness='blocked' on partner_deactivated → fails partner_readiness gate)
    must_hide_when_client_hidden: PASS (same propagation for client_hidden)
    verification_command: rg -n "partner_readiness = 'ready'" services/dsh/backend/internal/store/repository.go
  getDshHomeDiscovery:
    same_gates: PASS — home discovery store surfacing reads the same publication-eligible store set
    verification_command: rg -n "is_visible|partner_readiness" services/dsh/backend/internal/homediscovery
  getDshStoreById:
    same_visibility_policy_as_list: PASS (repository.go:125-130 applies identical WHERE clauses on single-store fetch)
    verification_command: rg -n "AND is_visible = true" -A 5 services/dsh/backend/internal/store/repository.go
  transition_gate:
    client_visible_requires: linked store + status=active + is_visible + serviceability IN (serviceable,limited) + catalog approved + marketing visible + allowed partner status transition
    failure_behavior: 422 STORE_PUBLICATION_GATES_FAILED (handler.go:311); transaction rolls back → no success audit row written
    verification_command: rg -n "STORE_PUBLICATION_GATES_FAILED" services/dsh/backend/internal/partner/handler.go
  tests:
    unit: TestComputeReadiness_storePublicationGates (partner/model_test.go) — per-gate cases: no store / inactive / hidden / unserviceable / unapproved catalog / hidden marketing / pre-active partner / all-pass
    unit_store: TestPublicationEligibilityRequiresAllGates (store/store_test.go)
    propagation: TestPartnerReadinessForActivationStatus (client_visible→ready, client_hidden/deactivated→blocked)
    runtime: manual_e2e_evidence.md (hide/deactivate removes store from /dsh/stores)
```
