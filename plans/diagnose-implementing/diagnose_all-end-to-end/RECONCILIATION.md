# Reconciliation — diagnose_all-end-to-end

## Purpose

This file reconciles branch history, source-package semantics, later user decisions, failed execution evidence and the consolidation itself. It prevents an older statement, temporary copy, failed workflow or foreign delta from silently becoming active authority.

## 1. Source packages merged

The active diagnostic meaning of these two directories is consolidated into this package:

1. `plans/diagnose-implementing/v5-finance-delivery-canonical-truth-20260816-0214`
2. `plans/diagnose-implementing/v5-canonical-finance-delivery-captain-closure-20260816-0226`

The first contained 6 source artifacts; the second contained 8. `SOURCE-MANIFEST.md` maps all 14 to the merged canonical files.

The original directories remain provenance/historical evidence. They are not the continuing active entry point after this merge.

## 2. Branch history reconciliation

### Finance diagnosis task

`task/v5-finance-delivery-canonical-truth-20260816-0214`

- diagnosis/package branch only;
- declared `PREPARE_ONLY`;
- branch delta was documentation/package material, not product runtime cutover;
- no runtime implementation may be inferred from branch containment.

Result: `DIAGNOSIS_PREPARED`, runtime `NOT_EXECUTED` by that branch.

### All-surfaces rootfix / actor provenance task

`task/v5-all-surfaces-rootfix-20260815-2345`

- attempted lower `RC-ORDER-ACTOR-PROVENANCE` Stage-2 execution;
- GitHub Actions run `31908535848` failed;
- failure occurred at `Compile and test all DSH backend consumers`;
- OpenAPI/generated verification, full tests/static checks, client smoke, final DB reproof and governed final implementation commit were skipped.

Result: `FAILED_TEST_GATE`; actor provenance remains OPEN.

### Containment

Both requested source-branch histories were previously verified as contained in `A`. Containment is not runtime closure.

## 3. Previous package reconciliation

The prior finance package had identified major P0/P1 roots but underrepresented several search cones. Its later `MERGE-RECONCILIATION.md` carried these forward as mandatory findings:

- `MR-F01` store courier parallel identity/lifecycle truth;
- `MR-F02` store courier parallel pricing/`pricingSource` configuration;
- `MR-F03` identifier overloading beyond only `storeCourierId`;
- `MR-F04` canonical StoreBranch gap;
- `MR-F05` partner courier leaking into BTHWANI captain finance;
- `MR-F06` distributed financial best-effort mutation class;
- `MR-F07` partner settlement caller gross/amount authority drift;
- `MR-F08` full electronic WALLET/MIXED E2E journey gap;
- `MR-F09` tender/exposure/custody/settlement separation;
- `MR-F10` store-delivery fleet/compensation parallel truth;
- `MR-F11` actor provenance still open/lower-ranked.

All 11 are explicitly represented in the merged `DIAGNOSIS.md`, `CLEANUP.md`, `COVERAGE.md` and `PACKAGE.md`.

## 4. Decision conflict reconciliation

The older finance decision register contained 20 decisions and one earlier suggestion that a store-selected per-delivery compensation model could become a store-funded WLT-canonical earning product.

The later explicit user decision narrowed that boundary:

- store-courier employment/payroll/compensation remains store responsibility;
- BTHWANI does not become payer/payroll ledger merely because it provides the application/management UI;
- app-partner may keep clearly store-owned operational configuration/projection where useful;
- monthly salary produces no per-delivery BTHWANI entitlement;
- optional store-specific courier collateral remains store responsibility and is not BTHWANI/WLT custody;
- any future BTHWANI-managed payroll/earning/collateral-custody product requires a new explicit product/contract decision.

This later decision is binding and supersedes any older permissive wording.

The customer/store settlement boundary is not changed by this narrowing: WLT remains canonical for BTHWANI's monetary settlement with the store and for platform-handled customer tender.

## 5. Captain wallet/guarantee terminology reconciliation

The older package described “one WLT captain wallet; no second visible guarantee wallet.” The later package required a precise restricted `CaptainGuaranteePosition`/equivalent.

These are reconciled as follows:

- there is one coherent captain-facing WLT financial account/wallet experience;
- WLT must internally represent protected collateral as an explicit restricted position distinct from spendable funds, exposure, custody and debt;
- this restricted position is not a second independently authoritative wallet/source of truth;
- Workforce never owns the monetary amount.

This preserves the original “one source/account experience” decision while preventing generic wallet-balance conflation.

## 6. COD semantic reconciliation

The earlier diagnosis described BTHWANI COD as collateral-backed net settlement where reservation becomes final WLT debit and should not create a duplicate remittance liability for the same economic amount.

The later diagnosis additionally made physical cash custody explicit.

Final merged interpretation:

- exposure reservation is a financial risk-control state;
- physical collection opens/increases custody evidence/obligation;
- final financial settlement must not double-count the same economic amount;
- releasing/finalizing exposure never erases custody/audit truth;
- legacy collection/remittance paths that duplicate the same economic liability are removed after the canonical custody/settlement model is proven.

Thus “no duplicate remittance liability” and “cash custody remains explicit” are both retained.

## 7. Historical finance finding reconciliation

Historical `wlt-finance-wallet-multisurface` findings are Derived Support/search seeds only.

One older claim was already superseded: penalty posting no longer directly mutates wallet balance and instead uses canonical ledger behavior. That subfinding must not be resurrected.

Other historical cones—legacy ledger coexistence, daily finance close, promotion funding, subscription/onboarding fees, pricing, payouts, reconciliation—must be re-proven on the exact future candidate before being treated as current defects.

## 8. Foreign-delta rule

Any later movement of `A` is:

`FOREIGN_DELTA = INPUT, NOT INSTRUCTION`

Before execution and final merge:

- re-pin `A`;
- classify delta as `DISJOINT`, `RELATED`, `OVERLAP`, `CONFLICT`, or `AUTHORITY_CHANGE`;
- reconcile material related/overlap/authority changes;
- rerun affected gates;
- never let unrelated branch movement redirect root-cause priority.

## 9. Real consolidation correction

An earlier consolidation commit created `diagnose_all-end-to-end` by copying all 14 source artifacts into the directory as `SOURCE-0214-*` and `SOURCE-0226-*` files plus an index/manifest. That preserved bytes but did not satisfy the intended semantic merge into one coherent file set.

This correction replaces that temporary copy layout with canonical merged files:

- `START-HERE.md`
- `DIAGNOSIS.md`
- `DECISIONS.md`
- `IMPLEMENTATION-AUDIT.md`
- `COVERAGE.md`
- `CLEANUP.md`
- `PACKAGE.md`
- `RECONCILIATION.md`
- `SOURCE-MANIFEST.md`

All `SOURCE-*` files in `diagnose_all-end-to-end` are removed as temporary consolidation scaffolding. Their original source files remain in the two historical source directories and are mapped in `SOURCE-MANIFEST.md`.

## 10. No-omission contract

No source concept may disappear merely because wording was deduplicated.

The merged package explicitly preserves:

- canonical authority ownership;
- checkout three-choice decision;
- official-provider top-up/funding semantics;
- PaymentAllocation;
- BTHWANI collateral/protected floor/excess release;
- COD/Mixed exact cash exposure;
- physical cash custody and rolling settlement;
- failure/recovery/idempotency/reconciliation;
- unified eligibility/service-area/capacity;
- accreditation and presence/suspension split;
- exclusive BTHWANI/PARTNER affiliation;
- partner membership->actor handoff;
- store as settlement counterparty;
- store-owned compensation/payroll/collateral;
- legacy store courier identity/pricing cleanup;
- StoreBranch/identifier semantics;
- penalties/debt/refund/reversal;
- caller amount/source elimination;
- distributed financial durability;
- actor provenance open status;
- historical-finance reproof discipline;
- line/file/folder/config/generated/governance cleanup;
- multi-surface coverage and final same-SHA evidence gates.

## 11. Current reconciliation result

- `SOURCE_PACKAGES_MERGED = true`
- `TEMP_SOURCE_COPY_LAYOUT_RETIRED = true`
- `DECISION_REQUIRED = 0`
- `AUTHORITY_CONFLICT = 0` for known merged decisions
- `ACTOR_PROVENANCE = OPEN / FAILED PRIOR VERIFICATION`
- `RUNTIME_IMPLEMENTATION = OPEN`
- `CLEANUP_IMPLEMENTATION = OPEN`
- `FINAL_E2E_CLOSURE = OPEN`

A future execution must re-pin the then-current `A`; this document does not freeze technical truth permanently.
