# Closure — app-partner-fullstack-journeys

**Decision: OPEN — implementation and evidence required.**

The existing Partner package has been re-diagnosed against `BB@f48d27e09e17dffaa471f394a46cd2878d3c1d86`. This update makes the plan current; it does not execute product changes or manufacture PASS evidence.

## Zero-known-defect gate

`CLOSED_WITH_EVIDENCE` is forbidden until every in-scope known fixable error, gap, contradiction, stale canonical reference, unjustified duplicate, dead live path, incomplete integration, authorization/data/privacy weakness, financial inconsistency, unresolved state, hidden workaround, regression and executable remaining task has been eliminated and verified on the latest implementation SHA.

Cleanup is mandatory. Proven dead/duplicate/stale routes, imports, types, contracts, evidence pointers, compatibility layers and misleading presentation must be removed after caller/blast-radius proof. A compiling obsolete path is still a closure blocker when it contradicts the canonical model.

## Current known blockers

1. **U001 — Identity/session:** current Partner closure evidence must cover Identity refresh-rotation concurrency, replay/conflict, exact `partner` + `app-partner` session surface, outage, logout/relogin/restart and actor switch. The old generic session check is insufficient.
2. **U001 — post-onboarding rating:** `PartnerFieldRatingGate` is a current app-partner interaction absent from the previous package. Its prompt eligibility, one-time completion, actor/onboarding isolation, duplicate/retry/readback and non-blocking semantics must be proven without broadening Field-app scope.
3. **U004 — fleet evidence drift:** `PARTNER_FLEET_CONNECTION.product-truth.json` references removed `dsh-933_jrn030_partner_fleet_action_audit.sql`; canonical evidence must point to live `dsh-933_partner_fleet_action_audit.sql` without rewriting migration history.
4. **U007 — finance contract drift:** Partner finance must be closed against current `WLT_MONEY_MOVEMENT_SETTLEMENT` semantics: read-only verified destination, beneficiary cannot mutate destination master data, FULL_AVAILABLE/SPECIFIED server validation, actor isolation, idempotency, held unknown external result, reconciliation and WLT-only financial truth. Partner COD/legacy finance routes require a current canonical-model census.
5. **U008 — analytics:** selected-Store UI semantics remain disconnected from the Partner performance request/backend Store resolution and require a contract/root-cause correction.
6. Partner onboarding/publication is still `READY_FOR_IMPLEMENTATION`; support/rescue and WLT money movement are still `DISCOVERY`. Protected product acceptance cannot be self-issued by engineering/package text.
7. Exact-candidate runtime, PostgreSQL/migration, WLT reconciliation/provider, device, visual/RTL/accessibility and CI evidence has not been executed by this GitHub-only package update.

## Mandatory final adversarial cycle

After the last relevant implementation and cleanup write, repeat until exhaustion:

`Root Cause review → blast-radius census → cleanup/refactor → positive paths → negative/authorization paths → concurrency/replay/idempotency → weak-network/unknown-result recovery → contract/generated binding → PostgreSQL/migration → cross-surface canonical readback → privacy/security → WLT ledger/reconciliation where applicable → regression → deliberate remaining-defect search`

Any new finding returns the owning unit to OPEN.

## Required final package/repository gates

At minimum, execute the unit-specific `VERIFICATION.json` checks plus affected repository gates from the exact final candidate, including where applicable:

```text
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/app-partner-fullstack-journeys --strict
pnpm --filter @bthwani/app-partner-runtime lint
pnpm --filter @bthwani/app-partner-runtime typecheck
pnpm --filter @bthwani/app-partner-runtime test
pnpm --filter @bthwani/app-partner-runtime build
pnpm guard:no-broken-imports
pnpm guard:cleanup-policy
pnpm guard:fullstack-boundary
pnpm guard:wlt-financial-boundary
pnpm guard:contract-registry-drift
pnpm database:dsh:test
pnpm database:dsh:contract
pnpm runtime:full:smoke
pnpm guard:journey:full
```

Unit-specific Identity, DSH Partner/fleet/order/support/analytics and WLT payout/COD/ledger/database/provider checks remain mandatory even if global gates pass.

## Required evidence characteristics

- Every required check records PASS on the exact resulting SHA after the last relevant write.
- Every `RESULT.json` is based on executed evidence, not inherited historical status.
- Cross-Partner/Store and cross-actor negative cases are explicit.
- State-changing retries prove identical replay and payload-divergent rejection where contracted.
- Unknown network/provider results are reconciled from canonical state and never shown as local success.
- Partner payout destination is read-only on beneficiary surfaces and sensitive identifiers remain masked.
- Required counterpart surfaces prove only the same Partner journey; they do not expand into independent app scope.
- Physical-device evidence is attached for native behavior that cannot be established statically when affected.
- CI/security/quality/protected product or finance approvals required by current governance are satisfied without self-approval.

## Proof limits of this package update

No shell, Node, Go, PostgreSQL, WLT provider, Android runtime, visual QA or CI execution was performed by this planning edit. Therefore implementation remains `NOT_STARTED`, verification remains `NOT_STARTED`, and product closure remains OPEN even though the diagnosis/plan is READY.
