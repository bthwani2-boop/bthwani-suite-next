# Cleanup Contract — diagnose_all-end-to-end

## Purpose

Cleanup is part of the root fix. A new canonical path plus an old reachable writer/fallback/alias is not closure.

Final cleanup applies at line, symbol, file, directory, schema, table/column, route, DTO, OpenAPI, generated client, config, env, UI state, test, workflow, job/event, migration-consumer and governance-reference level.

Applied historical migrations are not rewritten. Use forward-only corrective migrations and remove all live consumers of obsolete structures after safe cutover.

## Universal cutover sequence

For every replaced truth:

1. inventory current writers/readers/consumers/references;
2. prove canonical owner and target invariant;
3. introduce canonical replacement;
4. migrate only facts that can be proven from canonical evidence;
5. cut all old writers;
6. cut all old readers/write-gates;
7. remove compatibility/fallback/dual-write paths;
8. remove dead declarations/storage/routes/config/tests/docs;
9. run whole-target zero-reference inventory;
10. prove runtime no longer depends on removed semantics.

`Keep it temporarily` is not an accepted final state.

## C01 — Remove authoritative money from Workforce

Inventory and eliminate live authority equivalent to:

- `financialGuaranteeMinorUnits`
- `financialGuaranteeCurrency`
- `financialGuaranteeStatus`
- writable guarantee/reference fields used as financial proof
- Workforce-side minimum guarantee/collateral constants or arithmetic
- readiness logic using local monetary values
- DTO/OpenAPI/shared/generated clients allowing Workforce to write money
- control-panel/app forms mutating such fields through Workforce
- fixtures/tests asserting Workforce money ownership.

Replacement: WLT-owned financial position/decision/reference only.

## C02 — Precise WLT captain financial semantics

Keep distinct:

- spendable wallet balance where applicable;
- restricted captain collateral/guarantee;
- protected minimum;
- releasable excess;
- active exposure reservation;
- open physical cash custody;
- debt/receivable;
- payout/other holds.

Remove aliases/UI/backend names that make these interchangeable or imply a second parallel guarantee wallet.

## C03 — Remove fourth checkout authority

Inventory and remove `official_wallet`, `PaymentMethodOfficialWallet` or equivalent as an **order-payment method** across:

- DSH enums/validators/handlers;
- DB data/constraints where live;
- OpenAPI;
- generated clients;
- app-client checkout;
- app-partner store-delivery configuration;
- app-captain order display;
- control-panel filters/views;
- analytics/tests/fixtures/seeds;
- docs/Product Truth.

Do not remove official-provider support from top-up/funding flows.

## C04 — Remove payment-method monetary branching

Inventory all equivalents of:

- `paymentMethod == cod`
- `paymentMethod != cod`
- switches reconstructing money allocation from enum.

For governed financial behavior, replace with persisted `PaymentAllocation` amounts.

Enum branching may remain only for UX/presentation/validation of the three choices, never as authoritative monetary derivation.

## C05 — Remove Mixed cash-leg blind spots

Every reserve/finalize/collect/custody/remit/eligibility/refund/settlement path must consume the exact Mixed cash leg.

Delete special-case workarounds once allocation-driven semantics are canonical.

## C06 — Separate exposure from custody

Delete/rename any state/helper/status implying reservation release/finalize means physical cash was remitted.

No shared ambiguous status may represent both exposure and custody.

## C07 — Remove duplicate financial eligibility

Inventory captain financial-readiness calculations in Workforce/DSH/apps/control-panel.

After WLT cutover retain only:

- WLT authoritative financial decision;
- explicitly read-only source/version/freshness-bound projections for display if needed.

Delete UI/local calculations used as write gates.

## C08 — Remove duplicate captain eligibility engines

Inventory every `eligible`, `ready`, candidate, capacity, assign, reassign, inbox/offer and accept helper.

Converge on one composite semantic contract. Keep only thin typed adapters to the canonical decision.

Delete independent filters/fallback evaluators capable of granting a governed action.

## C09 — Remove DSH duplicate accreditation authority

Inventory mutable DSH `accreditation_status`/equivalent.

Cut to Workforce canonical accreditation, remove obsolete writers/readers/routes/forms/tests/config, and drop obsolete live storage via forward migration after all consumers are gone.

If a genuinely distinct dispatch certification remains, rename it with separate meaning/lifecycle and prove non-overlap.

## C10 — Separate durable suspension from ephemeral presence

Remove DSH mutable provider-suspension authority from presence state.

DSH presence remains online/offline/available/busy/current conflict/capacity only. Workforce owns suspension/absence/work-window.

Rename ambiguous `status` fields where needed.

## C11 — Remove ambiguous courier identifiers

Eliminate `storeCourierId` or any field whose value can mean membership in one layer and actor in another.

Use explicit `captainMembershipId` and `captainActorId`, resolving through DSH Fleet before Workforce.

Update DB/FKs, Go types/commands/events, OpenAPI, generated TS, UI state/query keys, audit and fixtures/tests.

## C12 — Remove generic cross-authority raw IDs

Use distinct/branded types where practical for actor, membership, person, partner, store and branch.

Reject wrong entity-class values at contract/DB/domain boundaries. Generic `id: string` is not acceptable where entity confusion can cross authority/security boundaries.

## C13 — Canonical StoreBranch cutover

Inventory `selectedBranchIds`, `branchId`, route params, persisted state and analytics that actually contain Store/Scope IDs.

Cut to real canonical StoreBranch with parent Store and relevant location/hours/status/service-area/inventory/fleet links.

Remove all `branchId = storeId` or Store/Scope-to-branch compatibility conversion after migration.

## C14 — Remove legacy store-courier person/lifecycle truth

Remove live use of settings equivalent to:

- `courierName`
- `courierPhone`
- duplicate `isActive` lifecycle state
- free-text person records embedded in delivery configuration.

Person/provider comes from Workforce; primary affiliation/membership comes from DSH.

## C15 — Remove legacy store-delivery pricing source

Reprove `pricingSource`/legacy courier pricing against canonical store-delivery pricing. If both are reachable, keep one governed pricing owner and remove obsolete selector, routes/types/UI/tests/config/references.

## C16 — Isolate partner/store courier from BTHWANI captain finance

Inventory every mapping where partner/store courier becomes BTHWANI collector/captain for:

- collateral/guarantee;
- commission;
- debt/receivable;
- payout;
- earning;
- penalty semantics intended for BTHWANI captain.

Remove them. Store courier may remain sub-custodian evidence under store settlement, not BTHWANI captain financial counterparty.

## C17 — Remove BTHWANI payroll/compensation authority for store employees

Delete any implication that app-partner salary/per-delivery configuration makes BTHWANI/WLT employer/payer/payroll ledger.

If operational compensation configuration is retained, namespace/label it explicitly store-owned and prove no BTHWANI financial writer consumes it under the current product boundary.

Monthly salary must generate zero per-delivery BTHWANI entitlement.

## C18 — Remove BTHWANI custody of store-specific courier collateral

Any store-specific guarantee amount remains outside BTHWANI WLT under current decisions.

UI/config may represent requirement/status/evidence only. Remove fake wallet/balance/asset/liability representation and any DSH/Workforce monetary writer.

## C19 — Remove caller-authoritative partner settlement amounts

Inventory `GrossAmountMinorUnits`, subtotal-only gross reconstruction or equivalent caller totals.

WLT must derive/verify store settlement from immutable order/quote/tender/contract evidence. Remove operator/DSH ability to choose authoritative settlement gross.

## C20 — Remove caller-authoritative penalty amounts

Remove `proposedPenaltyMinorUnits`/equivalent financial authority.

Operations sends immutable incident facts + versioned policy reference. WLT derives/bounds/posts the amount.

Tests must prove caller cannot override it.

## C21 — Remove caller-authoritative refund source/dimensions

Delete authority of mutable `fundsSource` or reconstructed source when original ledger/tender lineage exists.

Refund APIs reference original transaction/payment and requested scope/amount; WLT resolves correct reversible legs/dimensions.

## C22 — Remove ignored/best-effort required finance mutations

Adversarially inventory patterns equivalent to:

- `_ = wltCall(...)`
- discarded return/error
- fire-and-forget required finance call
- catch/log/continue after material financial failure
- best-effort release/compensation with no durable obligation/reconciliation.

Every required financial side effect either succeeds under the governed state machine or leaves an explicit recoverable/reconcilable state.

## C23 — Remove COD reservation caller amount authority

Where WLT can derive/verify exact cash leg from canonical PaymentAllocation/order/payment reference, remove trusted cross-domain amount/currency inputs as financial authority.

The caller may identify the order/allocation; WLT proves amount.

## C24 — Remove duplicate/legacy COD liability semantics

For BTHWANI collateral-backed COD, remove legacy collection/remittance paths that create a second economic liability for the same amount once the final canonical exposure/custody/settlement model is live.

Do not delete physical cash custody/audit evidence. Delete only duplicate economic authority.

Rename misleading `funded-wallet order` or similar terminology to precise canonical semantics.

## C25 — Enforce exact cancellation/reassignment/failure cleanup

Prove cancellation, reassignment, rejection, timeout, failed delivery, duplicate proof and retry resolve reservations/custody/state exactly once.

Delete fallback/manual repair paths superseded by durable reconciliation.

## C26 — Official-provider Cash-In cleanup

Keep external providers only in funding/top-up architecture.

Remove checkout-specific provider authority, duplicated local provider balances, client assumptions, and any provider-specific dispatch/payment eligibility.

Prove idempotent callback/unknown-result/reconciliation and internal WLT ledger readback.

## C27 — WALLET/MIXED E2E cleanup

Existence of authorize/capture primitives is insufficient.

Ensure no stale alternate path bypasses canonical:

`checkout -> authorization -> order confirmation -> capture/rollback -> readback/reconciliation`

For Mixed, wallet and cash legs remain separately accountable throughout cancellation/refund/failure.

## C28 — Actor provenance cleanup

After the actor-provenance repair actually passes all gates:

- writers persist trusted `actorId` when known;
- no migration fabricates unknown historical actor;
- operator-authorized views may expose provenance;
- client/partner surfaces redact internal actor identity where not required;
- failed temporary workflow/script is not retained as active authority/tooling unless intentionally promoted and maintained.

## C29 — Contracts/generated artifacts

For every changed boundary update and verify:

- OpenAPI schemas;
- Go domain/DTO types;
- TS shared/branded types;
- generated clients;
- frontend adapters/hooks;
- event/outbox payloads;
- DB constraints/indexes;
- analytics/audit schemas where affected;
- Product Truth/governance;
- integration tests.

Remove old generated enums/types/routes and handwritten compatibility DTOs after cutover.

## C30 — DB/migration cleanup

Use forward-only migrations to:

- add canonical structures/invariants/FKs;
- migrate only provable facts;
- preserve explicit unknown where facts cannot be proven;
- disable/cut old writers;
- drop obsolete live columns/tables only after every reader/writer is gone.

Test fresh DB and supported upgrade DB. Never synthesize historical money/provenance to satisfy a new schema.

## C31 — Line-level cleanup

Remove proven:

- dead branches;
- stale comments;
- unused imports/types/functions;
- duplicate helpers;
- compatibility aliases beyond migration window;
- TODO/FIXME/HACK for treated roots;
- debug flags/temp logging;
- hard-coded fallback amounts;
- ignored finance errors;
- copied client monetary calculations;
- magic role/status/ID semantics replaced by canonical typed contracts.

## C32 — File-level cleanup

Inventory/disposition obsolete:

- finance adapters;
- legacy COD handlers;
- old eligibility services;
- duplicate shared finance modules;
- stale contract/generated files;
- superseded tests;
- temporary scripts/workflows;
- migration helpers;
- diagnosis executables presented as active authority.

Historical/audit files are retained only under explicit non-authoritative classification.

## C33 — Folder/module cleanup

After symbol/file cleanup:

- remove empty directories;
- merge duplicate module folders;
- place money policy/effects in WLT ownership;
- keep Workforce operational/non-financial logic out of finance modules;
- keep partner-delivery operations in DSH while BTHWANI monetary settlement stays WLT;
- prevent parallel `shared` folders from becoming independent truth.

## C34 — UI cleanup

Across app-client/app-captain/app-partner/control-panel remove:

- stale payment choices;
- duplicate/misleading financial labels;
- local eligibility calculations;
- forms writing old authority;
- legacy courier identity fields;
- fake branch fields;
- hidden compatibility state;
- BTHWANI-only finance controls from partner courier contexts;
- unsupported store payroll/collateral money controls.

UI displays authority-backed values/reason codes and does not manufacture truth.

## C35 — Test cleanup

Delete/rewrite tests asserting incorrect ownership such as:

- Workforce money authority;
- official_wallet checkout method;
- Mixed without exact cash exposure;
- DSH general accreditation authority;
- partner courier as BTHWANI financial counterparty;
- ambiguous IDs;
- ignored required financial failures;
- legacy free-text courier settings;
- store-ID-as-branch-ID fallback.

Add negative tests proving old behavior is impossible.

## C36 — Configuration/environment cleanup

Remove stale env vars, feature flags, config keys and deployment settings capable of reactivating old financial/eligibility/store-delivery semantics.

A permanent feature flag is not acceptable parallel authority.

## C37 — Governance cleanup

Reconcile Product Truth/architecture/governance to the machine-readable authority registry.

Delete/archive stale draft packages according to retention policy or mark them historical/non-authoritative and remove them from active entry points.

The active continuing entry point for this merged scope is `diagnose_all-end-to-end`.

## C38 — Temporary orchestration artifact cleanup

Final inventory must contain zero orphaned `.tmp-*`, abandoned stage workflows, scratch files, one-off execution helpers or temporary package-copy artifacts unless intentionally promoted to maintained tooling with ownership/tests/docs.

The prior `SOURCE-*` copy layout inside `diagnose_all-end-to-end` is temporary consolidation scaffolding and must be removed by this real merge.

## C39 — Zero-residue inventory

Before DONE search the entire target for at least:

`financialGuaranteeMinorUnits`
`financialGuaranteeCurrency`
`financialGuaranteeStatus`
`PaymentMethodOfficialWallet`
checkout-semantic `official_wallet`
`proposedPenaltyMinorUnits`
`storeCourierId`
`courierName`
`courierPhone`
`pricingSource`
mutable DSH `accreditation_status`
caller settlement gross/amount authority
caller refund source authority
payment-method COD-only financial guards
ignored required WLT calls
duplicate eligibility evaluators
store/scope-ID-as-branch-ID conversions
partner-courier-to-BTHWANI-finance mappings
old generated checkout/payment/ID contracts
stale compatibility/fallback routes

Every nonzero match must be classified as canonical, historical migration/evidence, false positive with machine proof, or blocker. Unclassified residue blocks closure.

## C40 — Final verification after cleanup

Run on one exact final candidate:

- affected Go tests/static checks;
- TS typecheck/builds;
- OpenAPI/generated sync;
- DB migrations/constraints fresh + upgrade;
- top-up readback;
- opening/protected policy readback;
- COD reserve concurrency;
- Mixed cash-only reserve;
- cancellation/reassignment exact release;
- cash custody/settlement/deadline;
- WLT timeout/failure recovery;
- excess release above/below safe threshold;
- penalty policy/debt/reversal;
- partner COD/Wallet/Mixed;
- salaried courier no earning;
- partner membership->actor readiness;
- wrong store/area/affiliation/ID negatives;
- refund by lineage;
- WALLET/MIXED full E2E;
- actor provenance/redaction;
- zero-residue inventory;
- governance drift check.

No cleanup proof from a pre-reconciliation SHA is sufficient for final DONE.
