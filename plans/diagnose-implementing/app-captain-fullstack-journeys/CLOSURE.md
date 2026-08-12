# Closure — App Captain

**Decision: OPEN — implementation and evidence required.**

`CLOSED_WITH_EVIDENCE` is forbidden until every in-scope known fixable defect is eliminated and every required result is proved on the latest execution SHA after the final relevant write. The package update itself is not product closure.

## Zero-known-defect gate

Final closure requires zero known in-scope errors, gaps, contradictions, unjustified duplication, material technical noise, dead/obsolete live paths, incomplete logic, incomplete integration, unresolved states, hidden workarounds, regressions or executable remaining work. A newly discovered defect immediately reopens the owning unit.

Cleanup is mandatory: remove proven dead/duplicate/stale routes, callers, imports, exports, types, configurations, dependencies and compatibility behavior when they no longer have a current justified consumer. Do not keep an incorrect architecture merely to minimize the diff.

## Mandatory final adversarial cycle

After the last product write, repeat: root-cause review → blast-radius census → cleanup/refactor → positive and negative execution → concurrency/retry/unknown-result cases → contracts/bindings → database/runtime → cross-surface readback → security/privacy → financial reconciliation where applicable → regression review → deliberate search for remaining defects. Repeat until no known fixable in-scope finding remains.

## Required package and repository gates

Run from the final candidate, not from an older evidence SHA:

```text
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/app-captain-fullstack-journeys --strict
pnpm --filter @bthwani/app-captain-runtime lint
pnpm --filter @bthwani/app-captain-runtime typecheck
pnpm --filter @bthwani/app-captain-runtime test
pnpm --filter @bthwani/app-captain-runtime build
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

Also run every required unit-specific Identity, Workforce, DSH and WLT Go/contract/provider check in `VERIFICATION.json`. A global gate cannot replace a more specific negative/concurrency/finance check.

## End-to-end evidence still required when applicable

- exact role/surface/session and refresh-concurrency negative cases;
- provider-direct and DSH-internal Workforce readiness convergence;
- dispatch kill-switch absent/malformed/killed/open states;
- PostgreSQL dispatch capacity/idempotency/reassignment/custody concurrency;
- app-captain/app-partner/app-client role-appropriate cross-surface readback;
- physical Android session restart/logout/relogin, camera/location/permission/weak-network evidence for touched native paths;
- Captain support route reachability and single canonical conversation behavior;
- Captain Cash-In reachable surface, provider unknown-result behavior and exactly-once wallet credit;
- mutually exclusive COD financial effect per order, cancellation/finalization/retry and WLT ledger/audit/reconciliation;
- payout destination beneficiary read-only behavior, FULL_AVAILABLE/SPECIFIED server validation, unknown-result hold/reconciliation and cross-Captain isolation;
- current CI/security/quality checks required by the final diff;
- protected product/QA/accessibility/security/release approvals where current governance requires them.

Every unit `RESULT.json` must be `DONE`, have a 40-character `resultingSha`, `decision=PASS`, no blockers/deviations, and PASS for every required verification before final `--strict --closure` validation is allowed.
