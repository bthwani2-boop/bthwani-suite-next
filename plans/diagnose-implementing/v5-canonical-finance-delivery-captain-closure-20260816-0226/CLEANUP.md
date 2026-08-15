# Cleanup Contract — Zero Residue After Canonical Cutover

## Purpose

Cleanup is part of the root fix, not optional housekeeping. The final state must not contain a second writer, stale fallback, misleading identifier, dead configuration, obsolete DTO, or document that can re-create the old authority model.

Cleanup must operate at **line, symbol, file, directory, schema, route, config, generated-client, test, workflow and governance-reference level**.

Applied historical migrations are the only intentional exception: do not rewrite migration history. Add forward-only corrective migrations, then remove all live consumers of obsolete columns/tables.

## Mandatory cleanup rule

For every canonical replacement:

1. inventory all current writers/readers/references before change;
2. introduce and verify canonical replacement;
3. migrate only facts that can be proven;
4. cut all writers to old truth;
5. cut all readers to old truth;
6. remove compatibility/fallback paths;
7. remove dead declarations/storage/config/tests/docs;
8. run zero-reference inventory;
9. prove no runtime behavior depends on the removed source.

"Keep it temporarily" is not an accepted final state.

---

## C01 — Remove financial guarantee authority from Workforce

Inventory and eliminate live authority equivalent to:

- `financialGuaranteeMinorUnits`
- `financialGuaranteeCurrency`
- `financialGuaranteeStatus`
- Workforce-side minimum guarantee constants/policy
- Workforce-side guarantee arithmetic
- readiness code that treats local monetary fields as canonical
- request/response DTOs that allow Workforce to write those values
- UI forms that mutate them through Workforce
- fixtures/tests asserting Workforce ownership

Replacement: WLT decision/reference only.

## C02 — Introduce precise WLT guarantee terminology

Do not reuse ambiguous generic terms if they hide product semantics.

Required distinctions:

- spendable wallet balance;
- restricted captain guarantee/collateral position;
- protected minimum;
- releasable excess;
- active exposure reservation;
- open cash custody;
- debt/receivable;
- other holds.

Remove UI/backend aliases that make these interchangeable.

## C03 — Remove fourth checkout authority

Inventory/remove `official_wallet` / `PaymentMethodOfficialWallet` as an **order payment method** across:

- backend enums/validators;
- OpenAPI;
- generated clients;
- app-client checkout;
- app-partner/store-delivery configuration;
- app-captain order display;
- control-panel order/payment filters;
- analytics/tests/fixtures/seeds;
- docs.

Do **not** remove official provider support from top-up/funding flows. Rename/restructure where necessary so external rails cannot be mistaken for internal order tender.

## C04 — Eliminate method-name financial branching

Find all equivalents of:

- `paymentMethod == cod`
- `paymentMethod != cod`
- switch cases that infer money allocation from enum

For governed financial behavior, replace with canonical persisted allocation amounts.

Allowed enum branching after cutover is presentation only or validation of the exact three UX choices, never the source of monetary amount.

## C05 — Remove Mixed cash-leg blind spots

Inventory every COD reserve/finalize/collect/remit/eligibility/refund/settlement path and prove Mixed cash leg enters the same cash risk/custody logic using its exact amount.

Delete special-case workarounds once allocation-driven logic is canonical.

## C06 — Remove collateral/custody conflation

Delete any state/field/helper whose semantics imply that releasing/finalizing collateral reservation also means collected cash was remitted.

No shared status enum may ambiguously represent both exposure and custody.

## C07 — Remove duplicate financial eligibility

Inventory all captain financial-readiness calculations in Workforce/DSH/apps.

After WLT cutover, keep only:

- WLT authoritative financial decision;
- clearly read-only projection with source/version/freshness if needed for display.

UI-local computation is deleted.

## C08 — Remove duplicate captain eligibility engines

Inventory all `eligible`, `ready`, candidate, capacity, assign, reassign, inbox and accept helpers.

Converge governed semantics on one composite primitive/contract. Remove old helpers, independent filters and fallback evaluation paths.

A helper may remain only if it is a thin typed client/adapter to the canonical decision.

## C09 — Remove DSH mutable operational accreditation authority

Inventory DSH `accreditation_status` or equivalent schema/DTO/domain writer.

Cut writers and readers to Workforce canonical accreditation. Remove obsolete writable column through forward migration when safe, plus routes/forms/tests/config.

## C10 — Separate suspension from dispatch presence

Remove DSH mutable provider-suspension authority from presence state.

Keep only ephemeral dispatch states such as online/offline/available/busy. Workforce suspension/absence remains external gate consumed by eligibility.

Rename ambiguous `status` fields where semantics are not obvious.

## C11 — Remove ambiguous courier identifiers

Eliminate `storeCourierId` or any field whose value can mean membership ID in one layer and actor ID in another.

Replace with explicit `captainMembershipId` and `captainActorId`, resolving through DSH Fleet before a Workforce call.

Update:

- DB names/FKs;
- Go types/commands/events;
- OpenAPI;
- generated TypeScript;
- UI state/query keys;
- audit payloads;
- tests/fixtures.

## C12 — Remove fake branch identity

Inventory `selectedBranchIds`, `branchId`, route params and data stores that actually contain Store/Scope IDs.

Cut to real StoreBranch canonical identity. Remove compatibility conversion once migrated.

Do not keep `branchId = storeId` fallback.

## C13 — Delete legacy store-courier person truth

Remove live use of settings such as:

- `courierName`
- `courierPhone`
- `isActive` when it represents a second courier lifecycle
- free-text courier person records embedded in delivery settings

Person/provider data comes from Workforce; store membership/affiliation comes from DSH Fleet.

## C14 — Delete legacy store-delivery pricing source

If canonical `dsh_store_delivery_pricing`/equivalent is the live pricing authority, remove parallel `pricingSource` selectors/settings and all branches preserving a second calculation authority.

## C15 — Isolate partner courier from BTHWANI captain money paths

Inventory all places where partner/store courier becomes a collector/captain for:

- BTHWANI guarantee/collateral;
- BTHWANI captain commission;
- BTHWANI captain debt;
- BTHWANI captain payout;
- BTHWANI captain earnings.

Remove those mappings. Store courier may remain sub-custodian evidence under store settlement, not a BTHWANI captain financial counterparty.

## C16 — Remove BTHWANI payroll authority for store employees

Delete any implication that selecting monthly salary/per-delivery settings in app-partner makes WLT/BTHWANI the employer/payer.

If store compensation configuration is retained for workflow clarity, namespace and label it as store-owned operational configuration/projection and ensure no WLT payroll writer consumes it.

## C17 — Remove caller-authoritative partner settlement amounts

Inventory `GrossAmountMinorUnits` or equivalent caller-computed settlement inputs.

WLT must derive/verify settlement from canonical order/quote/tender/contract evidence. Remove the ability for DSH/operator UI to choose authoritative gross settlement amount.

## C18 — Remove caller-authoritative penalty amounts

Remove `proposedPenaltyMinorUnits`/equivalent as authoritative financial input.

Operations sends incident facts + versioned policy reference. WLT derives bounded monetary effect.

Tests must assert caller cannot override amount.

## C19 — Remove caller-authoritative refund source

Delete financial authority of mutable `fundsSource` where immutable original funding lineage is available.

Refund API may reference original payment/ledger transaction and requested refund scope/amount; WLT resolves the correct legs itself.

## C20 — Remove ignored financial errors

Adversarially inventory patterns equivalent to:

- `_ = wltCall(...)`
- `go wltCall(...)` without durable obligation tracking
- catch/log/continue after required financial transition
- best-effort release compensation with no reconciliation record

Every required financial side effect must either be part of a durable state machine or leave an explicit recoverable/reconcilable state.

## C21 — Remove raw generic IDs at authority boundaries

Use distinct types/branded IDs in Go/TypeScript where practical. Remove function signatures where multiple entity classes are all plain `string` and can be interchanged without compile-time or boundary validation.

## C22 — Remove actor-provenance fallback/unknown fabrication

After actor provenance is successfully implemented:

- no writer may omit `actorId` when a trusted actor is available;
- no migration may fabricate historical actor identity;
- unknown historical provenance remains explicitly unknown;
- no client/partner response accidentally leaks internal actor IDs.

The failed prior workflow cannot be used as cleanup proof.

## C23 — Remove stale governance and duplicate Product Truth

After runtime cutover, reconcile every affected Product Truth/governance/architecture document with the machine-readable authority registry.

Delete or archive stale draft packages according to repository retention policy rather than leaving contradictory "current" instructions.

Do not delete historical evidence required for audit, but mark it historical/non-authoritative and remove it from active entry points.

## C24 — Remove temporary orchestration artifacts

Final inventory must contain zero orphaned temporary scripts/files/workflows created only for implementation, including `.tmp-*`, abandoned stage workflows, generated scratch files and one-off migration helpers, unless they are intentionally promoted to maintained tooling with ownership/tests/docs.

## C25 — Generated artifacts and API drift

After contract changes:

- regenerate clients once from canonical OpenAPI;
- remove old generated types/enums/methods;
- remove handwritten compatibility DTOs made obsolete by generated contracts;
- prove no stale imports remain.

## C26 — Test cleanup

Delete or rewrite tests that assert old/incorrect ownership, including tests that expect:

- Workforce financial authority;
- official_wallet checkout method;
- Mixed without exact cash exposure;
- DSH accreditation authority;
- partner courier as BTHWANI captain financial counterparty;
- ambiguous ID semantics;
- ignored financial failure;
- legacy courier settings.

Add negative tests proving the old behavior is impossible.

## C27 — UI cleanup

Across app-client/app-captain/app-partner/control-panel remove:

- stale payment choices;
- duplicate financial labels;
- local eligibility calculations;
- forms that write old authority;
- legacy courier identity fields;
- misleading branch fields;
- hidden compatibility state.

The UI must display authority-backed reason codes/values, not manufacture financial truth.

## C28 — DB cleanup

Use forward-only migrations to:

- add canonical structures/invariants/FKs;
- migrate only proven facts;
- disable old writers;
- backfill with provenance where possible;
- preserve unknown when not provable;
- drop obsolete live columns/tables after all readers/writers are gone.

Mandatory DB constraints should enforce arithmetic/non-negative/exclusivity/integrity where the database can prove them.

## C29 — Configuration and environment cleanup

Remove stale env vars, feature flags, config keys and deployment settings that can reactivate old financial/eligibility/partner-delivery behavior.

A feature flag is not an acceptable permanent parallel authority.

## C30 — Zero-residue final inventory

Before DONE, search the entire target for every old symbol/semantic and produce a machine-readable zero/nonzero report.

At minimum inventory:

`financialGuaranteeMinorUnits`
`financialGuaranteeCurrency`
`financialGuaranteeStatus`
`PaymentMethodOfficialWallet`
`official_wallet` in checkout semantics
`proposedPenaltyMinorUnits`
`storeCourierId`
`courierName`
`courierPhone`
`pricingSource`
mutable DSH `accreditation_status`
caller settlement gross authority
caller refund source authority
payment-method COD-only financial guards
ignored required WLT calls
duplicate eligibility evaluators
store-id-as-branch-id conversions
partner-courier-to-BTHWANI-finance mappings

Any nonzero result must be classified as canonical, historical migration/evidence, false positive, or blocker. Unclassified residue blocks closure.
