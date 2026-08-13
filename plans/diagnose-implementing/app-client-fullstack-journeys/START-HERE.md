# START HERE — app-client full-stack journeys

This is the existing client package, independently corrected on `BB@a13eacd6c5892501358563e324b1a9a53fa912cf` after source audit at `659c05537d235e59b8fc39c64534df46987dcd0c`. It is a derived execution artifact, not Product Truth.

## Why it was reopened

The previous package missed two real client areas: (1) commercial profile/consents/privacy-right reachability and (2) loyalty/offers/membership/subscriptions including WLT payment and compensation. It also carried superseded CI findings as if still current. The re-audit adds those scopes without importing unrelated Partner/Field/payout work.

## Execution order

1. U001 — runtime, Identity, account/profile/consents/address/privacy.
2. U002 — discovery, catalog, marketing media, special requests.
3. U003 — cart, serviceability, OCC checkout, exactly-once order creation.
4. U004/U005/U006 — order fulfillment; wallet/payment/refund; support/ratings/notifications.
5. U007 — benefits, loyalty, offers, membership and subscription purchase/renew/cancel/compensation.
6. U008 — visible-action/dead-residue census, cleanup, adversarial E2E and exact-SHA closure.

Before implementation, re-resolve `BB`, compare against `a13eacd6c5892501358563e324b1a9a53fa912cf`, and classify concurrent changes. Related/overlapping movement requires package reconciliation before writes; disjoint work is preserved. Push non-force only.

Current project-wide blockers that are Partner/Field/payout-only are not client implementation scope. They stay visible in coverage as external closure blockers and must be fixed by their owners if a required global gate needs them.

Run the strict package validator before execution when shell capability is available:

`node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/app-client-fullstack-journeys --strict`

Then execute with `tools/prompting/02-execute-verify-close.md`. No unit may be marked DONE from static source, planned commands or stale CI. U008 must run after the last implementation write on the exact final SHA.
