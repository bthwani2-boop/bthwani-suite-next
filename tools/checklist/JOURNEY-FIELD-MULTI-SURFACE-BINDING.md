# JOURNEY: FIELD_TO_PARTNER_TO_CONTROL_PANEL_BINDING + FIELD_TO_CLIENT_STORE_VISIBILITY_VALIDATION

Scope: verify/close the cross-surface chain — app-field Partner draft + first Store capture → control-panel
approval/publish/fee-policy/bank-review → app-partner post-approval visibility → app-client store visibility
only after publication. No Partner/Store boundary violations (see governing PHASE 5 rules).

- [x] discovery
- [x] affected surfaces inventory
- [x] backend/API/database proof
- [x] frontend binding proof
- [x] WLT boundary proof
- [x] runtime proof
- [x] tests/guards proof
- [x] final closure ledger

## Required evidence before any [x]
1. app-field: creates Partner draft + first Store + bank metadata + documents only; does not approve Partner,
   publish Store, or record finance (grep/route proof of absence of those capabilities in app-field).
2. control-panel: approval, platform fee policy, bank account review, store publish/hide, WLT finance read-only
   via DSH proxy (proof of route wiring, not direct WLT calls from control-panel frontend).
3. app-partner: sees onboarding status; can manage Store only after approval (guard/permission proof).
4. app-client: sees only published Store; no Partner/bank/fee data (negative proof).
5. Runtime end-to-end trace evidence (or documented external blocker) for the full chain.

## Closure evidence (2026-07-08) — live authenticated end-to-end trace

Used real seeded dev logins (`core/identity/backend/internal/identity/repository.go:BootstrapLocalActors`:
username `field`/`operator`/password `123456`) against the live `identity-api` + `dsh-api` containers — not
synthetic route-registration checks alone.

### Real bug found and fixed
`TransitionStatus` in `services/dsh/backend/internal/partner/repository.go` — its `UPDATE ... RETURNING`
clause (used by every partner status transition: field submit, operator approve/reject/activate/publish/hide)
did not select the 9 bank-account columns added in the bank-account journey. The `UPDATE` itself only ever
touched `activation_status`/`version`/`updated_at`, so **no data was lost in the database** — confirmed by
direct `psql` query showing intact `beneficiary_name`/`bank_name`/`bank_account_number` after a live submit
that returned blank bank fields in its JSON response. But every transition response (submit, approve, reject,
activate, publish, hide) was silently returning zero-valued bank fields, which would make control-panel's new
bank-account card flicker to hidden immediately after any transition until a manual reload. Fixed by adding
the 9 columns to the `RETURNING`/`Scan` clause, matching the pattern already used in
`CreatePartner`/`GetPartner`/`UpdatePartner`. Verified no other Partner-scanning query in the file was missing
them (`grep` for the full column-list pattern found exactly 4 matches: the 3 already-correct ones + this fix).
`go build`/`go test ./internal/partner/... ./internal/http/...` clean; live container rebuilt
(`docker compose ... build --force-recreate dsh-api`) and re-verified live (see trace below).

### Live end-to-end trace (real HTTP calls, real tokens, real DB)
1. **Field creates + fills + submits** (`field` login): `POST /dsh/field/partners/drafts` →
   `PATCH /dsh/field/partners/{id}/store` → `PATCH /dsh/field/partners/{id}` (bank fields) →
   `POST /dsh/field/partners/{id}/submit`. Post-fix, the submit response correctly returns the just-set
   `beneficiaryName`/`bankName` (pre-fix it returned blank — see bug above).
2. **Operator sees it** (`operator` login): `GET /dsh/operator/partners?status=submitted` includes the new
   partner id; `GET /dsh/operator/partners/{id}` returns full detail including bank fields (for control-panel's
   masked display).
3. **Operator drives the full approval lifecycle**: `documents_uploaded → documents_verified → ops_review →
   ops_approved → partner_active`, five consecutive `POST .../transition` calls, each returning `200` with
   `bankName` intact at every step (post-fix) — proves the state machine in `model.go:allowedTransitions` is
   real and enforced, and the bank-field fix holds across the whole lifecycle, not just submit.
4. **Store publication gate is real, not decorative**: attempted `POST .../transition {"toStatus":"client_visible"}`
   on a `partner_active` partner with no ready store → `422 STORE_PUBLICATION_GATES_FAILED` — confirms
   `TransitionStatus`'s hard-coded gate (store must be `active`+`is_visible`+`serviceable/limited`+
   `partner_readiness=ready`+`catalog_approval_status=approved`+`marketing_visibility=visible`) blocks
   Partner→Store boundary violations exactly as PHASE 5 requires — a partner cannot self-publish by merely
   being approved.
5. **Public store list never leaks unpublished stores**: `GET /dsh/stores?limit=100` (no auth — the actual
   app-client route) does not include the test store created in step 1, even though no `isVisible` filter was
   passed. Confirmed via code read this isn't accidental: `store/repository.go:listStores(publicOnly=true)`
   hard-codes all 6 gate conditions in the `WHERE` clause regardless of query params (`isVisible` param can
   only ADD a redundant filter, never remove the hard-coded one); `GetStoreByID` (used by
   `GET /dsh/stores/{storeId}`) hard-codes the same 6 conditions directly in SQL, so even a direct-by-id lookup
   of a known unpublished store id returns `404`, not the row. `GetStoreByPartnerID` is explicitly commented
   "never by app-client" and is only called from field/operator-scoped code paths.

### Per-surface boundary proof (code + grep, not assumption)
1. **app-field boundary**: `grep -rn "transitionPartner|publishStore|/transition|WLT_DSH_SERVICE_TOKEN" services/dsh/frontend/app-field`
   → 0 matches. app-field's only partner-mutating calls are `fieldCreateDraft`/`fieldUpdatePartner`/
   `fieldUpdatePartnerStore`/`fieldUploadDocument`/`fieldCreateVisit`/`fieldSubmitPartner` — none can approve,
   publish, or record finance.
2. **control-panel**: approval = `PartnerDetailScreen.tsx`'s `handleTransition` (live-tested above); platform
   fee policy = `StoreOnboardingFeePolicySection.tsx` (this session); bank review = `PartnerDetailScreen.tsx`'s
   masked bank card (bank-account journey); store publish/hide = `StoreGovernanceActions.tsx`, a real 6-dimension
   governance form (lifecycle/visibility/serviceability/partner-readiness/catalog-approval/marketing-visibility)
   with version-check + idempotency + audit trail, calling `OperatorStoreGovernanceRequest`; WLT finance = DSH
   proxy routes only (verified live in the finance-WLT-runtime journey).
3. **app-partner**: `PartnerHubScreen.tsx` calls `usePartnerSelfController` (`GET /dsh/partner/activation/status`
   + `.../readiness`) and, while
   `!isDshPartnerActivationComplete(status)` (i.e. before `partner_active`/`client_hidden`/`client_visible`),
   renders a dedicated "حالة الانضمام" screen (status badge, readiness items, blocked reason, next action) —
   the full operational hub (orders/store management) is only reached once activation is complete. This is a
   real, already-implemented gate, not a gap — confirmed by reading the conditional render logic
   (`PartnerHubScreen.tsx:1543-1600`) and the `isDshPartnerActivationComplete`/`isDshPartnerClientVisible`
   status-set definitions in `partner-activation.model.ts`.
4. **app-client negative proof**: `grep -rn "legalIdentityNumber|createdByActorId|DshPartner\b|activationStatus|operator/partners" services/dsh/frontend/app-client`
   → 0 matches, in addition to the bank/fee negative proofs already logged in the bank-account and
   platform-fee-policy journeys.

### Tests/guards
- `go build ./...` clean; `go test ./... -count=1` → all 21 packages `ok` (post-fix, fresh run).
- Live container rebuilt from current source and re-verified healthy + functionally correct (trace above).
- Test partners created during this trace (`prt_50872f2668054c1a828996d4e8347853`,
  `prt_a87bc3bbd3aa4a7781401c046619bffb`) were left in the local dev database — harmless local test data,
  consistent with pre-existing seed/test rows already present (e.g. `test-partner-1` referenced in the
  finance-WLT-runtime journey's evidence).

## Final closure ledger
Both sub-journeys **CLOSED**: `FIELD_TO_PARTNER_TO_CONTROL_PANEL_BINDING` and
`FIELD_TO_CLIENT_STORE_VISIBILITY_VALIDATION`. One product file fixed:
`services/dsh/backend/internal/partner/repository.go` (`TransitionStatus`). All other required capabilities
across app-field/control-panel/app-partner/app-client were found already correctly implemented and were
verified live rather than re-built from scratch.
