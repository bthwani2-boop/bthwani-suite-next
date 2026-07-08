# Journey 03 — FIELD_ONBOARDING_BANK_ACCOUNT_FULLSTACK

Full evidence: [tools/checklist/JOURNEY-FIELD-ONBOARDING-BANK-ACCOUNT.md](../../../../tools/checklist/JOURNEY-FIELD-ONBOARDING-BANK-ACCOUNT.md)

## Summary

Added "معلومات الحساب البنكي للشريك" (9 fields: beneficiaryName, bankName, bankBranch, accountNumber, iban,
payoutMobileNumber, settlementPreference, bankAccountHolderMatchesOwner, bankNotes) as Partner-level
readiness/metadata, captured during app-field onboarding, reviewed masked in control-panel, never mutated in
WLT.

## Chain

`FieldPartnerDraftForm` (shared types + validation + missing-count) → `OnboardingBankAccountSection.tsx` (new
wizard step) → `fieldUpdatePartner()` (exported from previously-dead code) → `PATCH /dsh/field/partners/{id}`
→ `UpdatePartnerInput`/`UpdatePartner` (Go) → `dsh_partners` columns (migration `dsh-027`) → `GetPartner`/
control-panel `PartnerDetailScreen.tsx` → `buildBankAccountViewModel()` masking (last 4 digits only) →
`dsh.openapi.yaml` + regenerated `dsh-api.ts` client.

## Closure status

CLOSED. All 8 required-evidence items satisfied with live proof (DB schema, live container rebuild, live DB
integration test, guard passes). One honestly-disclosed gap at closure time: no fully-authenticated curl
round-trip was performed (dev-bypass token is client-side-only, doesn't validate against the real backend) —
superseded in this engagement by the multi-surface-binding journey's live authenticated trace using real
`field`/`operator` dev logins, which did exercise this exact PATCH path end-to-end (see journey 07/08).
