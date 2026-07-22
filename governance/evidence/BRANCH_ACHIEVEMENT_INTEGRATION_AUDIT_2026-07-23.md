# Branch Achievement Integration Audit — 2026-07-23

## Target

- Repository: `bthwani2-boop/bthwani-suite-next`
- Integration branch: `integration/master-all-achievements-20260723`
- Baseline included: `master`
- Primary active source included: `sambassam`

## Governing rule

A branch is merged only when it contains a substantive functional, contract, migration, runtime, or durable test achievement that is not already present or superseded in the integration branch.

Verification nonces, trigger files, isolated runners, frozen snapshots, failure logs, and branches explicitly marked `Do not merge` are audited but not merged into product history.

## Integrated substantive achievements

### `sambassam`

Included completely. The integration branch contains the current `sambassam` ancestry and is not behind it at the recorded audit point.

### `catalog-structured-conflicts-20260718`

Integrated through PR #130.

Preserved achievement:

- split the oversized central-catalog HTTP handler into focused source files;
- corrected structured `ConflictError` handling to HTTP 409;
- corrected generic `ErrConflict` handling to HTTP 409;
- avoided the previous unreachable/nested conflict handling under `ErrForbidden`.

### `jrn-035-final-validation-v2`

Substantive PostgreSQL runtime tests integrated through PR #131. The temporary validation trigger was removed afterward.

Preserved achievement:

- provider-confirmed refund completion;
- definitive provider failure handling;
- ambiguous provider result and governed reconciliation;
- single-claim/no automatic retry behavior;
- balanced refund ledger entries;
- durable DSH outbox retry and delivery;
- partial/full refund and over-refund protection;
- explicit outcome-persistence failure behavior.

## Already contained or superseded by current ancestry

The following branches were checked and have no current functional achievement requiring a separate merge:

- `master`
- `onebyone`
- `fieldapp`
- `reem`
- `bassam`
- `fix/lian-sovereign-final-closure`
- `tmp/partner-closure-run`
- `verification/jrn-034-final-base-f8ccd72`
- `verify/jrn-036-snapshot-20260722-v2`
- `verify/jrn-036-snapshot-20260722-v3`
- `verify/jrn-036-snapshot-20260722-v4`
- `jrn-035-final-validation`

Earlier `bassam`-era functional branches were previously consolidated into `master` through PR #101, and the later active work is inherited through `sambassam`.

## Verification-only branches audited and intentionally not merged

### JRN-029

- `verify/jrn-029-final-proof-2`
- `verify/jrn-029-pr-proof-20260722`
- `verify/jrn-029-final-20260722`

Only proof nonces, diagnostic triggers, or verification-workflow adjustments were unique. PRs #128 and #129 explicitly state that no functional code is proposed for merge.

### JRN-032

- `verify/jrn-032-runner-master`
- `verify/jrn-032-final2-8e71db5`
- `verify/jrn-032-final-ca9d706`
- `verify/jrn-032-final-8f2d3e7`

These branches contain isolated workflows, verification scripts, focused compile contracts, triggers, and historical failure logs. Their route implementation is older than the current registered JRN-032 route owner and was not merged over the current code.

### JRN-034

- `verification/jrn-034-final-f8ccd72`
- `verification/jrn-034-8423652`
- `verification/jrn-034-base-f08ef17`

The branches are frozen verification candidates. The payout compatibility helper is already present in the current integration branch, while the historical actor-finance handler is superseded by current governed JRN-037 delegation.

### JRN-036

- `verify/jrn-036-runner-master-20260722-v2`
- `verify/jrn-036-closure-20260722`

Unique changes are isolated runner/workflow and trigger files. PRs #122 and #125 explicitly mark them validation-only and not for merge.

### Historical platform verification branches

- `bassam-platform-verification-head-20260718-v5` through `v15`
- corresponding `bassam-platform-verification-base-*` branches

These are immutable evidence snapshots or one-line verification markers. The functional implementation is inherited through `bassam`, `master`, and `sambassam`.

### Catalog trigger

- `catalog-occ-trigger-20260718`

Contains only a one-line workflow trigger. The actual catalog fix was separately preserved from `catalog-structured-conflicts-20260718`.

## Legacy backup branch

### `backup/begin-before-identity-rewrite-20260704_180838`

Not merged wholesale.

Reason:

- it is a historical backup thousands of commits behind the current integration branch;
- applying it would remove current devcontainer, governance, guards, contracts, and later runtime work;
- substantive marketing migrations and capabilities represented by the backup are already present in the current tree in later form, including `dsh-017_marketing_governance.sql` and subsequent marketing migrations;
- the branch is retained as forensic history, not a current merge source.

## Final branch relationship at recorded audit point

- The integration branch contains all recorded `sambassam` commits.
- The integration branch additionally contains the reconciled catalog OCC achievement and missing JRN-035 runtime tests.
- Verification-only branches remain available as evidence but are excluded from production code integration.

## Release limitation

This audit proves branch ancestry and selective achievement preservation. It does not by itself prove that every repository-wide CI, runtime, migration, security, or visual acceptance gate passes on the final integration SHA. Those gates must execute against the final immutable integration commit before merging to `master`.
