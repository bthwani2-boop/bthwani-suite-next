# Merge Reconciliation — Finance / Delivery Canonical Truth

Status: `PREPARE_ONLY / NOT_EXECUTED / NOT_DONE`

This document reconciles the package against the latest user attachment/discussion and the two source task branches before integration verification. It is additive authority for diagnosis coverage; `DECISIONS.md` on the current integration branch remains the canonical resolved product decision register.

## 1. Branch execution verification

### `task/v5-finance-delivery-canonical-truth-20260816-0214`

- The branch is a diagnosis/package branch only.
- Its package declares `MODE: PREPARE_ONLY`.
- Its branch delta contains package/documentation files, not product/runtime implementation.
- No GitHub Actions run was present for that branch at verification time.

Result: `DIAGNOSIS_PREPARED`, not product implementation.

### `task/v5-all-surfaces-rootfix-20260815-2345`

- The branch attempted the lower `RC-ORDER-ACTOR-PROVENANCE` Stage-2 workflow.
- GitHub Actions run `31908535848` completed with `failure`.
- The failure occurred at `Compile and test all DSH backend consumers`.
- OpenAPI/shared verification and `Governed staging and product commit` were skipped.
- Therefore no successful governed product commit was produced by that execution attempt.

Result: `FAILED_TEST_GATE`; no final closure may be inferred from it.

## 2. Integration-time branch containment

At reconciliation time, the latest `A` already contains the complete histories of both source branches (`behind_by=0` for each source branch when compared to `A`). The later integration history also removes the failed rootfix temporary workflow/script and the superseded rootfix package from the active tree.

This means no additional merge commit is required merely to contain the two requested branches. The useful diagnosis is retained in the finance/delivery package; stale failed execution machinery is intentionally not retained as active authority.

## 3. Findings recovered from the prior deep diagnosis / attachment

The original finance package covered the main P0/P1 roots but underrepresented several proven or material search cones from the preceding diagnosis. They are mandatory execution-scope findings and may not be dropped.

### MR-F01 — Store courier parallel identity/lifecycle truth

Reprove and eliminate any surviving legacy `StoreCourierSettings`-style identity/lifecycle fields (for example courier name/phone/active state) when they duplicate canonical Identity/Workforce person truth or DSH Fleet/Membership truth. A copied name/phone/status inside store delivery settings must not become a second person or membership authority.

### MR-F02 — Store courier pricing parallel configuration

Reprove any legacy `pricingSource`/store-courier pricing configuration against canonical store-delivery pricing (including `dsh_store_delivery_pricing` or its current replacement). If both are reachable, consolidate to one governed owner and remove the obsolete selector, routes, types, UI, tests and references.

### MR-F03 — Identifier semantic overloading beyond `storeCourierId`

Inventory and repair all identifier aliases across DB/OpenAPI/Go/TS/events/audit. Prior diagnosis found patterns including actor/store semantic substitution and Store/Scope IDs represented as Branch IDs. The `membershipId -> actorId` defect is only one member of this class.

### MR-F04 — Canonical StoreBranch gap

Where product/UI semantics say “branch”, the implementation must use a real canonical `StoreBranch` entity/identifier or remove the false branch concept. `selectedBranchIds` or equivalent fields must not contain Store/Scope IDs under a branch name. Migration must repair persistence, contracts, service-area/inventory/delivery references and all consumers.

### MR-F05 — Partner courier leaking into BTHWANI captain finance

Reprove the legacy partner-delivery/outbox/collector path that may normalize a store courier into BTHWANI captain collector/commission semantics. If live, remove it. Store courier finance is store/partner-scoped and must not create BTHWANI captain collateral, commission, debt or earnings.

### MR-F06 — Distributed financial best-effort mutations

The ignored `FinalizeCodReservation` failure is one proven instance, not the whole class. Inventory every cross-service financial mutation—including coupon/promotion funding bind/release/compensation flows—and require idempotency, durable unknown-result state, retry, readback, reconciliation and compensating transition where valid. No material finance error may be ignored.

### MR-F07 — Partner settlement gross / amount authority drift

Reprove settlement paths that accept caller `GrossAmountMinorUnits` or derive store gross from subtotal alone. Partner-delivery fee, platform fee/commission, discounts/subsidies and any authorized earning must derive from canonical PaymentAllocation/contract policy. WLT must not trust a caller-authored settlement total.

### MR-F08 — Electronic WALLET/MIXED journey gap

Existence of WLT authorize/capture primitives or payment enums is not end-to-end implementation. Prove or implement the complete customer journey:

`checkout -> WLT authorization/funding -> order confirmation -> capture/rollback -> readback/reconciliation`

for `WALLET` and the wallet portion of `MIXED`, including idempotency, timeout/unknown-result and failure recovery.

### MR-F09 — Payment tender / exposure / custody / settlement separation

Treat these as distinct canonical concepts:

- customer tender/funding allocation;
- BTHWANI captain financial collateral/exposure;
- physical cash custody/evidence;
- final settlement/payable/debt.

A collateral reservation must not silently erase physical-cash audit semantics, and physical custody must not create a duplicate economic liability for an amount already settled by the chosen canonical model.

### MR-F10 — Store delivery fleet / compensation parallel truth

Store courier membership, assignment, compensation mode and financial responsibility must have one owner each. Salaried mode cannot generate per-order earning. Platform-managed per-delivery earning, where authorized by `DECISIONS.md`, must be store-funded and WLT-canonical; no free-form amount or duplicate Partner/DSH financial truth is allowed.

### MR-F11 — ORDER_ACTOR_PROVENANCE remains open but lower-ranked

The failed Stage-2 execution does not close `RC-ORDER-ACTOR-PROVENANCE`. It remains a valid lower root and must be re-proven on the exact future candidate after higher monetary/eligibility roots are closed and the graph is re-ranked.

## 4. No-omission execution inventory

A future `EXECUTE_END_TO_END` task must explicitly disposition every relevant surface/layer:

- app-client;
- app-captain;
- app-partner;
- app-field where actor/provider creation or scopes intersect;
- control-panel Platform / Operations / Finance / Partner sections;
- Identity;
- Workforce;
- DSH shared/backend/database/contracts/generated clients;
- WLT shared/backend/database/contracts/generated clients;
- events/outbox/jobs/cron/reconciliation;
- migrations and upgraded-data paths;
- runtime/Docker/env;
- tests/guards/CI;
- Product Truth/governance;
- line/file/folder cleanup.

Every finding must finish as `FIXED_BY_CODE`, `KEEP_ACTIVE_WITH_MACHINE_PROOF`, `FALSE_POSITIVE_WITH_MACHINE_PROOF`, or `BLOCKED_EXTERNAL_ONLY` with exact evidence. `LEAVE_OPEN`, internal blockers, report-only fixes, parallel fallback truth and manual zeroing are not closure.

## 5. Final status after reconciliation

- Source branch history containment in `A`: `PASS`.
- Finance/delivery diagnosis package: `PRESENT`.
- Latest product decisions: `RESOLVED` in current `DECISIONS.md` (`DECISION_REQUIRED = 0` for the enumerated decisions).
- Rootfix Stage-2 execution: `FAILED_TEST_GATE`.
- Product/runtime implementation of the higher finance/delivery roots: `NOT_EXECUTED` by these branches.
- Runtime closure: `NOT_PROVEN`.
- Cleanup for future root treatment: `MANDATORY` down to line/file/folder level.

No final `DONE` claim is permitted until an exact future execution candidate proves the root cutover, runtime/data behavior, all consumers, adversarial negatives, and zero reachable parallel truth/remnants.
