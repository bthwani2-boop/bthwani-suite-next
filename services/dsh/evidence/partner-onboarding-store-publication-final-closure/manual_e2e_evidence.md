# manual_e2e_evidence — Partner Onboarding & Store Publication

resolved_commit_sha (source): 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3
runtime: docker compose profiles identity,dsh,media — DSH API http://localhost:58080 (host 58080 -> container 8080), identity http://localhost:58082
dsh-api image rebuilt from this working tree before the run (stale cached image from commit 178619f was detected via 404 on PATCH /dsh/field/partners/{id}/store and rebuilt).
actors: identity bootstrap users field / operator / bthwani(partner) via POST /auth/login (real bearer tokens; X-Actor headers are ignored by the API).
script: journey E2E (50 steps) — full transcript below; machine-readable step results in e2e-results.json.

RESULT: ALL E2E STEPS PASSED

## Coverage
- A. app-field: draft -> first-store draft -> 2 documents -> visit(location) -> submit; field token CANNOT transition/activate (403) and has no client-visibility decision (403).
- B. control-panel: queue -> details -> document reviews -> readiness -> staged transitions -> activate partner (partner_active only) -> client_visible BLOCKED 422 while store gates incomplete -> governance completes 5 store gates -> client_visible allowed -> audit written -> hide/deactivate.
- C. app-partner: reads own status/readiness only; partner token cannot transition (403) nor run governance (403); client_hidden state reflected as internal-active.
- D. app-client: store absent before client_visible; present after; hidden immediately on client_hidden and partner_deactivated; getDshStoreById returns 404 for hidden store (same gates as list).

## Transcript
tokens acquired
PASS  A1 field creates partner draft
partner id: prt_91fb9539b07f4c1dae0a978c07de2a97
PASS  A2 field enters first-store draft
store id: store-1782960696359383869
PASS  A3 field uploads document 1 (commercial register)
PASS  A4 field uploads document 2 (national id)
PASS  A5 field records visit notes + location
PASS  A6 field submits partner file
PASS  A7 app-field cannot activate (no transition permission) (HTTP 403)
PASS  A8 app-field has no client-visibility decision (HTTP 403)
PASS  B1 partner appears in operator queue (submitted)
PASS  B2 operator opens details
PASS  B3 operator lists documents
PASS  B4 operator approves document commercial_register
PASS  B4 operator approves document national_id
PASS  B5 operator checks readiness (pre-activation)
PASS  B6 transition submitted→documents_uploaded
PASS  B7 transition documents_uploaded→documents_verified
PASS  B8 transition documents_verified→ops_review
PASS  B9 transition ops_review→ops_approved
PASS  B10 cannot jump ops_approved→client_visible (invalid transition) (HTTP 422)
PASS  B11 activate partner (partner_active only, no client exposure)
PASS  B12 show_store_to_client blocked while store gates incomplete (422) (HTTP 422)
PASS  D1 app-client does not see store before client_visible
PASS  B13 governance: store lifecycle=active
PASS  B14 governance: visibility=visible
PASS  B15 governance: serviceability=serviceable
PASS  B16 governance: catalog-approval=approved
PASS  B17 governance: marketing-visibility=visible
PASS  B18 readiness now allows store publication
PASS  B19 show_store_to_client succeeds after all gates (client_visible)
PASS  B20 audit trail written
PASS  D2 app-client sees store after client_visible + gates
PASS  D3 getDshStoreById honors same gates (store fetch ok when visible)
PASS  B21 hide_store_from_client (client_hidden)
PASS  D4 hide removes store from public discovery immediately
PASS  D5 hidden store not fetchable by id (HTTP 404)
PASS  B22 restore client_visible
PASS  B23 deactivate_partner hides store immediately
PASS  D6 deactivation removes store from public discovery
PASS  C1 partner reads own activation status (no self-activation route)
PASS  C2 partner reads own readiness checklist
PASS  C3 partner token cannot call operator transition (no self-activation) (HTTP 403)
PASS  C4 partner token cannot run store governance (HTTP 403)
PASS  C5 operator sets seeded partner client_hidden (internal-active mode)
PASS  C6 app-partner sees internal-active status
PASS  D7 seeded store hidden while client_hidden
PASS  C7 operator restores seeded partner client_visible
PASS  D8 seeded store restored

RESULT: ALL E2E STEPS PASSED

