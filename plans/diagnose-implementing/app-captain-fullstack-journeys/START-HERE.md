# App Captain full-stack journeys — START HERE

## Current repository truth

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `BB`
- Product/implementation rebaseline start: `bee8e9cfe1762cef39690f0b254fdf0b6855e1a9`
- Latest remote observed before final package write: `0628bf1aa3fe39477197f9a9cb8cf04c8e8332ef`
- Concurrent delta: one descendant commit adding only `plans/diagnose-implementing/field-3`; classified `DISJOINT_PLANNING_ONLY` and preserved unchanged.
- Existing package mode: `RESUME_AND_RECONCILE`
- Package decision: `READY_FOR_IMPLEMENTATION`
- Product/runtime closure: **OPEN**

The previous Captain package commit `82f1743e6c8e4139a87ea1ac4c1cbb75fccd9986` is 310 product/implementation commits behind the rebaseline start and 311 branch commits behind the latest observed head. No old candidate-bound PASS/DONE claim is inherited.

## Fail-closed execution rule

Every unit starts OPEN. A unit becomes DONE only after root cause, blast radius, owner-level correction, affected-consumer migration, cleanup, adversarial negative cases, regression checks and required end-to-end evidence are complete on the exact resulting SHA. Any known fixable Captain-related defect, contradiction, duplicate live path, dead code, stale contract, missing required surface, unresolved state, authorization weakness, data inconsistency or regression keeps the unit OPEN.

Build, lint, typecheck, unit tests, partial CI, a successful screen or disappearance of one error are supporting evidence only. Workarounds, bypasses, silent fallbacks, weakened gates or tests, and knowingly retained obsolete behavior are forbidden as closure mechanisms.

## Bounded scope

`app-captain` is primary. Other surfaces enter only when Captain truth actually crosses them:

- `control-panel`: Captain access/HR, fleet, dispatch/custody/proof/support and Captain-affecting WLT finance.
- `app-partner`: partner-fleet and store↔Captain custody only.
- `app-client`: Captain-caused tracking/order readback only.
- `app-field`: excluded unless a Captain fix changes an actual shared consumer; then verify only that shared effect.

Catalogs, marketing, generic analytics/dashboard/login, client-owned address/privacy flows and unrelated WLT work remain excluded unless a direct Captain dependency is proven before a write.

## Current end-to-end path

`Identity exact session-surface binding → Workforce Captain profile/readiness → DSH fleet/complete eligibility → dispatch policy/assignment → bilateral custody → tracking/PoD/support → canonical DSH readback → WLT financial eligibility/Cash-In/COD/earnings/payout where applicable`

Identity owns authentication/session. Workforce owns provider readiness. DSH owns operational Captain truth. WLT is the sole financial truth owner.

## Material findings to execute

1. Identity authorization requires authenticated state, exact `sessionSurface`, matching `surfaceAccess`, role-to-surface mapping and `captain` role. Refresh rotation is database-governed and concurrent reuse has an explicit conflict state.
2. Workforce has provider-direct and DSH-internal readiness transports that must converge on the same Workforce truth and fail closed independently.
3. Dispatch eligibility includes accreditation, availability, WLT financial eligibility with expiry, profile freshness, provider absence, service-area context and transactional capacity locking.
4. Dispatch assignment has a mandatory explicit kill-switch configuration; missing/malformed/nil states fail closed and must not be bypassed.
5. Captain support has a known route contradiction: `orderchat` says disabled while `chat-read-ack`/`chat-send` use `CaptainOrderSupportConversationScreen`. Reachability and canonical convergence are mandatory cleanup.
6. WLT Product Truth now requires Captain Cash-In top-up, order-specific governed COD financial effect, automatic earnings, read-only payout destination and `FULL_AVAILABLE`/`SPECIFIED` payout intent.
7. WLT already implements server-derived `captain_topup` and atomic capture+wallet credit, but this diagnosis did not prove a reachable app-captain top-up entry. U006 must prove the consumer census and implement the missing bounded surface/adapter if absent.
8. `WltDshCaptainBridge` contains stale finance presentation that can contradict the newer primary finance screen. Any live contradictory route must migrate; dead legacy behavior must be removed/delegated with callers/imports/types cleaned.
9. DSH still exposes Captain COD collect/remit while current WLT Product Truth forbids a second remittance liability for the same Captain-funded COD effect. Model selection must be explicit and mutually exclusive per order/effect.

## Execution order

`U001 → U002 → U003 → U004 → U005`, with `U006` starting only after U004 and closing all Captain financial boundaries before package closure.

## Mandatory package check

```text
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/app-captain-fullstack-journeys --strict
```

This re-diagnosis used GitHub Remote/API. The strict validator and product/runtime commands are not PASS until they are actually executed on the checked-out candidate.
