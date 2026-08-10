# Diagnosis — U001 partner-access-readiness-store-scope

## Inclusion reason

Partner access is not an app-only concern. `App.tsx` gates the surface through Identity, while onboarding/readiness, Store ownership, Store selection, publication and serviceability are DSH state; field evidence and operator review are required by Partner onboarding Product Truth; payout destination remains WLT truth. Client discovery is an affected readback after publication. Therefore only these exact slices of app-field, control-panel, app-client and WLT belong here.

## Current behavior and observable defect

The runtime already uses secure session storage, Partner role/surface gating and `usePartnerSelfController`, and the Partner guard rejects fake ready state or silent all-Store fallback. The remaining risk is partial readiness: a valid identity can exist while Partner/Store evidence, operator activation, payout reference, Store serviceability or publication is not canonical-ready. Multi-Store selection is also intent only and must never become trusted authorization.

## Root cause and target architecture

Identity owns authentication/session/role; DSH owns Partner/Store readiness, ownership, settings and publication; WLT owns payout destination truth. Target path is Identity session → Partner self/readiness → authorized Store scope → DSH settings/serviceability/publication → affected Partner/client/operator readback. Every Store ID must be authorized server-side.

## Exact affected paths and symbols

`apps/app-partner/runtime/src/App.tsx`, `services/dsh/frontend/shared/partner`, `services/dsh/frontend/app-partner/account/PartnerOnboardingStatusView.tsx`, control-panel Partner/Platform slices, DSH backend/database/contracts and bounded WLT payout-reference integration. Key symbols include `IdentitySessionGate`, `usePartnerSelfController`, `useStoreScopeModel`, `getDshPartnerActivationStatus` and `getDshPartnerSelfReadiness`.

## Risks and evidence

Do not add client-selected trusted context, self-activation, raw payout truth in DSH, or unrelated HR behavior. Retries, versioning, cross-Store denial, refresh/restart and publication readback require same-candidate proof. Evidence: `EV-003`, `EV-005`, `EV-009`, `EV-014`, `EV-015`.
