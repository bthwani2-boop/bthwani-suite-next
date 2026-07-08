# Journey 04 — FIELD_FINANCE_WLT_RUNTIME_FIX

Full evidence: [tools/checklist/JOURNEY-FIELD-FINANCE-WLT-RUNTIME.md](../../../../tools/checklist/JOURNEY-FIELD-FINANCE-WLT-RUNTIME.md)

## Summary

Closed in a prior session (not this conversation). Re-verified live in this session before relying on it:
`GET /wlt/references/field-commission?partnerId=test-partner-1` → data-specific 404 (route live);
`GET /dsh/control-panel/finance/settlements` → 401 UNAUTHENTICATED (route live). Both prove the routes are
registered and reachable — the original "Route not found" screenshot was not reproducible against current
`journy` HEAD + a freshly rebuilt runtime.

## Root causes fixed (prior session)

1. `dsh-http-request.ts` discarded the backend's structured error code — control-panel always showed one
   hardcoded "WLT runtime غير متاح" regardless of actual cause. Fixed to surface
   `WLT_NOT_CONFIGURED`/`WLT_UNAVAILABLE`/`ROUTE_NOT_FOUND`/`AUTH_MISSING` distinctly.
2. **Real bug found via live Android device testing**: `DshFieldFinanceScreen.tsx` called the operator-level
   "list all partners" controller instead of the field-scoped one, so it could never resolve which partner the
   field agent represents. Fixed to `useFieldPartnerDraftsController()` — the same fix pattern this engagement
   independently re-applied to two more screens in journey 07 (`DshFieldStoresHistoryScreen.tsx`,
   `DshFieldProfileScreen.tsx`), confirming it was a systemic copy-paste pattern, not an isolated bug.
3. 404 "no commission reference yet" was being treated as a hard error instead of a graceful empty state.

## Closure status

CLOSED. No changes made in this session for this journey — verification only.
