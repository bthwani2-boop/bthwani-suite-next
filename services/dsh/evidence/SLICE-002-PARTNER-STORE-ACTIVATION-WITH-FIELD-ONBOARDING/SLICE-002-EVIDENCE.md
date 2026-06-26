# SLICE-002 Evidence: Partner Store Activation with Field Onboarding

**Execution branch:** `slice/partner-store-activation-field-onboarding`
**Date:** 2026-06-26
**Author:** bthwani2-boop

---

## Database Evidence

**Migration:** `services/dsh/database/migrations/dsh-015_partner_lifecycle.sql`

Tables created:
- `dsh_partners` — 18-status CHECK constraint, `created_by_surface` column
- `dsh_stores.partner_id` — nullable FK added (stores without partners unaffected)
- `dsh_partner_documents` — document uploads per partner
- `dsh_partner_document_reviews` — per-document review decisions
- `dsh_partner_field_visits` — partner-centric (not store-centric), partner_id required
- `dsh_partner_activation_events` — immutable audit log
- `dsh_partner_store_visibility_events` — client visibility lifecycle

---

## Backend Evidence

**Go build:** `go build ./...` — PASS (zero errors)
**Go tests:** `go test ./...` — all existing tests pass, no regressions

Files:
- `services/dsh/backend/internal/partner/model.go` — 18-state machine, `IsTransitionAllowed()`, all domain structs
- `services/dsh/backend/internal/partner/repository.go` — full CRUD, `TransitionStatus()` with optimistic locking
- `services/dsh/backend/internal/partner/handler.go` — 19 HTTP handlers split by surface
- `services/dsh/backend/internal/http/server.go` — 19 routes registered under DSH-015

**State machine enforcement:** `TransitionStatus()` calls `IsTransitionAllowed()` before any DB write. Illegal transitions return HTTP 422.

**Field cannot activate:** `HandleFieldSubmitPartner` hardcodes `ActorSurface: "app-field"` — transition only to `submitted`.

**Partner cannot self-activate:** `HandlePartnerMe` and `HandlePartnerMeReadiness` are read-only.

**client_visible gate:** `ListHomeStores` in `homediscovery/repository.go` adds:
```sql
LEFT JOIN dsh_partners p ON p.id = s.partner_id
WHERE ... AND (s.partner_id IS NULL OR p.activation_status = 'client_visible')
```
Stores without a partner are unaffected (NULL passes the OR).

---

## Frontend Evidence

### DSH Shared Brain (`services/dsh/frontend/shared/partner/`)

- `partner.types.ts` — re-exports all client types + REQUIRED_DOCUMENT_TYPES
- `partner.states.ts` — `DSH_PARTNER_ACTIVATION_STATES` (18 entries), `getPartnerStateMetadata()`
- `partner.view-model.ts` — PartnerAdminRow, PartnerSelfViewModel, DocumentViewModel, ReadinessViewModel
- `partner.controller-core.ts` — loadPartnerList, loadPartnerDetail, performTransition, performDocumentReview
- `use-partner-admin-controller.tsx` — control-panel hook, manages list/detail/action/readiness state
- `use-partner-self-controller.tsx` — app-partner hook, `autoLoadDocuments` opt-in flag (no surface useEffect)

### DSH Shared Brain (`services/dsh/frontend/shared/field-onboarding/`)

- `field-onboarding.types.ts` — 7-step form state machine
- `use-field-partner-onboarding-controller.tsx` — multi-step controller, creates draft on step 1, submits on review

### TypeScript typecheck: `pnpm typecheck` — PASS (zero errors)

---

## Surface Evidence

### app-field
- `FieldPartnerOnboardingScreen.tsx` — 7-step multi-step form, success screen shows partner ID
- Review step note: "لا يمكن للميداني تفعيل الشريك مباشرة" (informational, no activation button)
- Zero fetch/axios/useEffect in surface component ✓

### control-panel/partners
- `PartnersReviewQueueScreen.tsx` — partner list table with status filter chips
- `PartnerDetailPanel.tsx` — tabs: البيانات / الوثائق / الزيارات / الجاهزية / السجل
  - Transition panel: only shows `allowedNextStatuses` from state machine metadata
  - Document review: approve/reject/needs_resubmit with reason field
  - Audit timeline: every status transition with actor and timestamp

### app-partner
- `PartnerActivationStatusScreen.tsx` — status badge, next-action label, readiness checklist on demand
- `PartnerDocumentsScreen.tsx` — documents list with status badges, no useEffect (controller auto-loads)
- `PartnerRequirementsScreen.tsx` — activation steps, required document types, readiness check CTA
- No self-activation button on any screen ✓

### app-client
- `ListHomeStores` partner gate added — stores with `partner_id` hidden until `activation_status = 'client_visible'`
- Existing stores without `partner_id` unaffected ✓

### app-captain
- `CaptainStorePickupContextScreen.tsx` — uses `useStoreRoleContextController` from `shared/store`
- No partner imports, no partner documents, no activation buttons ✓

---

## WLT Boundary Evidence

**Guard: `no-financial-mutation-outside-wlt`** — PASS
**Guard: `wlt-dsh-frontend-shared-ownership`** — PASS

Partner domain has no financial fields (no commission, settlement, payment, wallet). Activation events are operational lifecycle only.

---

## Gate Matrix

| Gate | Result |
|------|--------|
| `guard:no-financial-mutation-outside-wlt` | ✅ PASS |
| `guard:wlt-dsh-frontend-shared-ownership` | ✅ PASS |
| `guard:dsh-frontend-shared-ownership` | ✅ PASS (2 non-blocking warnings) |
| `guard:dsh-001-cross-surface-dependency-map` | ✅ PASS |
| `contracts:lint` | ✅ PASS |
| `go build ./...` | ✅ PASS |
| `go test ./...` | ✅ PASS |
| `pnpm typecheck` (dsh) | ✅ PASS |

---

## Architecture Invariants Verified

| Rule | Status |
|------|--------|
| Store ≠ Partner (separate entities) | ✅ |
| Field cannot activate partner | ✅ `HandleFieldSubmitPartner` → `submitted` only |
| Partner cannot self-activate | ✅ `/partner/me` endpoints read-only |
| Store hidden from client until `client_visible` | ✅ SQL gate in `ListHomeStores` |
| Backend rejects illegal transitions | ✅ `IsTransitionAllowed()` enforced in `TransitionStatus()` |
| No financial mutation outside WLT | ✅ Guards pass |
| Surface UI never fetches directly | ✅ All loading in shared controllers |
| app-captain no crash, no partner data | ✅ Verified by inspection |
