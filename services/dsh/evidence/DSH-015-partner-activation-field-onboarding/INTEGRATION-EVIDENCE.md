# DSH-015 — Partner Store Activation & Field Onboarding
## Integration Evidence

**Branch:** `integration/partner-store-activation-field-onboarding-from-slice`
**Target:** `feat/post-merge-dev`
**Date:** 2026-06-26
**Source:** `slice/partner-store-activation-field-onboarding` (functional donor only — no direct merge)

---

## Summary of Changes

### Backend

| File | Action | Description |
|------|--------|-------------|
| `services/dsh/backend/internal/partner/model.go` | NEW | State machine, allowed transitions map, Partner & AuditEvent structs |
| `services/dsh/backend/internal/partner/repository.go` | NEW | DB queries: CreatePartner, GetPartner, ListPartners, UpdatePartner, CreateFieldVisit, ListFieldVisits, AddDocument, ReviewDocument, InsertAuditEvent, GetReadiness |
| `services/dsh/backend/internal/partner/handler.go` | MODIFIED | All HTTP handlers wired to model + repository; field-visit, document, audit, transition, readiness endpoints |
| `services/dsh/backend/internal/http/server.go` | MODIFIED | Routes registered under `/dsh/operator/partners`, `/dsh/field/partners`, `/dsh/partner/activation` |
| `services/dsh/database/migrations/dsh-015_partner_lifecycle.sql` | NEW | Canonical migration: `dsh_partners`, `dsh_partner_activation_events`, `dsh_partner_documents`, `dsh_partner_field_visits` |
| `services/dsh/database/migrations/dsh-015_partner_activation.sql` | DELETED | Superseded by canonical migration above |

### Frontend — Shared

| File | Action | Description |
|------|--------|-------------|
| `services/dsh/frontend/shared/partner/partner.types.ts` | MODIFIED | Normalized to `activationStatus`, added document types, readiness model |
| `services/dsh/frontend/shared/partner/partner.api.ts` | MODIFIED | Centralized: operator, partner-self, field endpoints. Removed competing client |
| `services/dsh/frontend/shared/partner/partner.view-model.ts` | MODIFIED | Updated to match `activationStatus`, `DshPartnerReadiness` checklist model |
| `services/dsh/frontend/shared/partner/use-partner-admin-controller.tsx` | MODIFIED | Uses centralized API; mutation and readiness handlers updated |
| `services/dsh/frontend/shared/partner/index.ts` | MODIFIED | Exports all new types, API functions, and controllers |
| `services/dsh/frontend/shared/field-onboarding/field-onboarding.types.ts` | NEW | Field-surface types: step definitions, form state, UI state |
| `services/dsh/frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx` | NEW | Controller for field onboarding: multi-step draft flow, document upload, submit |
| `services/dsh/frontend/shared/field-onboarding/index.ts` | NEW | Public barrel for field-onboarding shared module |

### Frontend — app-field

| File | Action | Description |
|------|--------|-------------|
| `services/dsh/frontend/app-field/onboarding/FieldPartnerOnboardingScreen.tsx` | NEW | Multi-step field onboarding screen |
| `services/dsh/frontend/app-field/onboarding/index.ts` | NEW | Screen barrel |
| `services/dsh/frontend/app-field/partner-intake/` | DELETED | Replaced by the new onboarding module above |
| `apps/app-field/runtime/src/App.tsx` | MODIFIED | Routes `/dsh/field/partners/new` and `/:partnerId` to `FieldPartnerOnboardingScreen` |

### Frontend — app-partner

| File | Action | Description |
|------|--------|-------------|
| `services/dsh/frontend/app-partner/onboarding/PartnerActivationStatusScreen.tsx` | MODIFIED | Sub-tab navigation: Status / Requirements / Documents |
| `services/dsh/frontend/app-partner/onboarding/PartnerDocumentsScreen.tsx` | NEW | Document upload & status tracking for partner self-service |
| `services/dsh/frontend/app-partner/onboarding/PartnerRequirementsScreen.tsx` | NEW | Readiness checklist for partner self-service |

### Frontend — control-panel

| File | Action | Description |
|------|--------|-------------|
| `services/dsh/frontend/control-panel/partners/PartnerDetailPanel.tsx` | NEW/MODIFIED | Flat props, readiness model, audit trail view |
| `services/dsh/frontend/control-panel/partners/PartnersReviewQueueScreen.tsx` | NEW/MODIFIED | Correct routing `/dsh/operator/partners`, status filtering |

### Contracts

| File | Action | Description |
|------|--------|-------------|
| `services/dsh/contracts/dsh.openapi.yaml` | MODIFIED | Schema sync: `activationStatus`, `documentType/documentStatus`, `toStatus`, `canActivate+checklist` readiness, pagination, `field-visits` endpoint added |

---

## Architecture Decisions

- **Single API client**: All partner API calls consolidated in `services/dsh/frontend/shared/partner/partner.api.ts`. Competing client `services/dsh/clients/partner-client.ts` deleted.
- **No state activation from app-field**: Field surface only collects evidence (draft, documents, visits, submit). All activation transitions occur via `control-panel` only.
- **Routing namespaces enforced**:
  - `/dsh/operator/partners/*` — control-panel operator surface
  - `/dsh/field/partners/*` — field agent surface
  - `/dsh/partner/activation/*` — partner self-service surface

---

## OpenAPI Contract Alignment

The following schema mismatches were resolved to match the canonical frontend types:

| Schema | Old | New |
|--------|-----|-----|
| `DshPartner.onboardingStatus` | `onboardingStatus` | `activationStatus` |
| `DshPartnerDocument.docType` | `docType` | `documentType` |
| `DshPartnerDocument.status` | `status` | `documentStatus` |
| `DshPartnerDocument` enums | `uploaded/verified/rejected` | `pending/under_review/approved/rejected/needs_resubmit` |
| `DshPartnerTransitionRequest.targetStatus` | `targetStatus` | `toStatus` |
| `DshPartnerReadiness` shape | flat boolean flags | `canActivate` + `checklist[]` |
| `listDshPartners` response | no pagination | `pagination: {total, limit, offset}` |
| `/operator/partners/{id}/field-visits` | missing | added |

---

## Verification Checklist

- [ ] `pnpm run contracts:lint` passes
- [ ] `pnpm run typecheck` passes for `services/dsh/frontend`
- [ ] `pnpm run test` passes for `services/dsh`
- [ ] `go build ./...` passes for `services/dsh/backend`
- [ ] `go test ./...` passes for `services/dsh/backend/internal/partner`
- [ ] App runs at `http://localhost:13000/dsh/partners` (control-panel review queue visible)
- [ ] App runs at `/dsh/partners/new` (field onboarding form loads)
