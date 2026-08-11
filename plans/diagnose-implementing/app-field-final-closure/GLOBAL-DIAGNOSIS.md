# Global diagnosis — App Field final closure on BB

## Pinned truth and reconciliation

Repository: `bthwani2-boop/bthwani-suite-next`. Target: `BB`. Diagnosis pin: `397dcae545d723d88e96828535973533f4f6ad68`.

The package was created against `abbas` and later observed `a2373ded31dc04f807d182997d0f07f56cd1f3fb`; current `BB` is materially ahead, so historical findings and historical unit PASS values are not inherited as current closure. During this diagnosis `BB` moved from `869c7bf8ca4790d6ff3738584b9c9b1815388a65` to the pin above via `chore: add sonar coverage reports`. That movement was reconciled instead of overwriting the old head.

## Current facts that supersede stale findings

`apps/app-field/runtime/src/App.tsx` now renders an explicit readiness failure state; the old blank-readiness finding is stale. The field work queue distinguishes current work from stale/revoked work and exposes governed lifecycle actions. `DshFieldSurface` plus `use-field-offline-sync.ts` replay `create_visit`, `complete_visit`, `upsert_readiness_check` and `create_escalation` through one field offline path. The v2 queue scopes actor/installation, persists idempotency/correlation, quarantines corrupt current JSON, backs off failures and supports retry/discard. Preserve this architecture rather than rebuilding it.

Field finance is also materially ahead of the old package: `services/wlt/frontend/shared/dsh/field-finance` contains the field API, controller and payout-attempt persistence, including prepared/unknown payout-attempt state intended for reconciliation. U008 is verification-first; no parallel financial truth may be created outside WLT.

## Confirmed remaining blockers

1. **The package itself was stale and not strict-validator ready.** It lacked `START-HERE.md`; execution-order units omitted required `path`; excluded coverage entries omitted `exclusionReason`/`reopenTrigger`; and root metadata still named `abbas`. This reconciliation repairs those planning defects only.
2. **The canonical app-field test gate is broken as a closure signal.** `apps/app-field/runtime/package.json` invokes Vitest against `src/__tests__`, while the complete current `apps/app-field/runtime/src` tree contains no `__tests__` directory and no test files. U001 must establish a real field behavioral suite and make the canonical test command execute it plus the runtime contract. `passWithNoTests`/skip behavior is forbidden.
3. **Historical evidence is mixed/stale.** U004-U006 contain useful old implementation SHAs. U002 has no resulting SHA/check evidence. U003 records PASS together with NOT_RUN. U008/U009 were tied to a different branch/readback context, and U009 explicitly lacked real-device and cross-surface final proof. Preserve these result files as provenance, not closure.
4. **Offline durability needs focused proof, not replacement.** Current replay breadth/scoping/backoff exist, but queue preparation removes the legacy v1 key without demonstrated lossless migration of pending legacy work. Ambiguous-result reconciliation is explicit in field finance but is not equivalently proven for governed DSH replay. U007 must reproduce these risks with direct tests before changing code.
5. **Current-candidate final evidence is absent.** Closure still requires strict package validation, real field tests/type/lint, DSH/WLT backend/database/security checks, actor/store isolation, offline recovery, Android device flows, restart/logout/session boundaries and same-store control/partner/client readback.

## Scope boundary

In scope: app-field runtime/navigation/readiness; field Identity activation/session/device trust; Workforce field profile/assignment/readiness; DSH field work queue, onboarding, visits, checklists, catalog/product operations, escalations and field-facing finance facade; WLT field wallet/ledger/commission/payout truth; field evidence media; control-panel sections only for field provisioning/review/readback; app-partner/app-client only for causally required field-created readiness/publication readback.

Out of scope absent new current authority: app-captain implementation/custody/COD; consumer checkout/order journeys; generic dashboard/analytics/marketing/platform administration; generic operator-login redesign; unrelated WLT settlement/accounting; unrelated cleanup.

## Closure standard

Static inspection is discovery, not closure. Each unit verifies current implementation first, changes code only for a reproduced defect, runs required checks on the resulting candidate and records the exact SHA. Shared changes require actual-consumer regression verification but do not broaden product scope. U009 may close only after all prior units have candidate-bound evidence plus native and cross-surface proof.
