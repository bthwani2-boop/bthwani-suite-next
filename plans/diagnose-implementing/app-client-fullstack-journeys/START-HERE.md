# App Client Full-Stack Journeys — Start Here

This is a disposable Schema v3 implementation-support artifact for the `app-client` scope only.

## Source boundary

- Repository: `bthwani2-boop/bthwani-suite-next`
- Target branch: `abbas`
- Diagnosis source SHA: `49bb4723f969c7275445d0c2ea96a4ee8fb8e2fa`
- Latest reconciled remote SHA before package construction: `2c0869268115d6f8928fd887e9eda4e07ecd82be`
- Branch movement after the diagnosis pin affected only ArchPulse diagnostic scripts and did not alter the diagnosed app-client, DSH or WLT source.

## Execution rule

Execute units in `EXECUTION-ORDER.json`. Correct the canonical owner first, then migrate directly affected client consumers/readbacks, remove obsolete parallel truth only when proven safe, and run every required verification attached to the unit. Do not broaden a unit merely because a shared service contains unrelated features.

The package is not runtime, build, CI, migration, governance or operations input. Product Truth, contracts, source, migrations, database behavior and exact-candidate runtime evidence remain authoritative.

## Hard scope

Included: client runtime/session/account/address; discovery/store/catalog/marketing/special requests; cart/serviceability/checkout/order creation; customer-visible order fulfillment/tracking/pickup/proof; WLT wallet/payment/refund boundary; support/ratings/notifications/preferences. Other surfaces are included only where their authorized mutation or readback changes the same client-visible canonical state.

Excluded: independent Partner/Captain/Field workforce, fleet, payout, HR or business administration; generic control-panel areas; production deployment; provider activation; policy invention; unrelated refactoring.

`docs/architecture.drawio` was requested and inspected but is zero bytes at the diagnosis SHA, so it is recorded as an evidence defect and is not used as architecture truth.
