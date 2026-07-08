# Final Gate

## PHASE 10 escape-hatch check

Are changes confined to `governance/**`, `.diagnostics/**`, `tools/**`, `*.md`? **No.** Live code changed in
`services/dsh/backend/**` (5 Go files + 2 migrations), `services/dsh/contracts/**`,
`services/dsh/clients/generated/**`, `services/dsh/frontend/app-field/**` (9 files),
`services/dsh/frontend/app-partner/**` (2 files), `services/dsh/frontend/control-panel/**` (5 files),
`services/dsh/frontend/shared/**` (9 files). `PROTOCOL_VIOLATION` does not apply.

## GLOBAL FIELD CLOSURE GUARANTEE RULE check

> "لا تعتبر أي رحلة من رحلات app-field مغلقة إلا بعد إثبات أن كل ما يرتبط بالتطبيق الميداني عبر كل الأسطح قد
> تم فحصه وتصنيفه وربطه أو استبعاده بدليل."

| Requirement | Status |
|---|---|
| كل شاشات app-field | 19 files enumerated in [01_SCOPE_SURFACE_INVENTORY.md](01_SCOPE_SURFACE_INVENTORY.md); all 12 routes traced |
| كل tabs/buttons/icons/forms/states | Bottom nav (5 items) verified wired; account menu (now 4 items) verified wired; every wizard step in onboarding traced |
| كل routes/navigation/screen registry | `dsh-field.routes.ts` + `DshFieldRouteRenderer.tsx` fully cross-referenced against actual navigation calls (not just type definitions) |
| كل shared controllers/view-models/policies | 3 instances of a wrong-scope controller found and fixed (gap ledger #4); all others confirmed correctly scoped |
| كل backend routes التي يستهلكها app-field | Traced in [06_BACKEND_API_DATABASE_MATRIX.md](06_BACKEND_API_DATABASE_MATRIX.md) |
| كل OpenAPI operations | `guard:api-binding`/`guard:backend-api-binding` PASS — zero drift |
| كل generated clients | Regenerated and diff-inspected 3× |
| كل database tables | `dsh_partners` (+9 cols), `dsh_platform_store_onboarding_fee_policy` (new) — both live-verified via `psql` |
| كل ارتباط مع control-panel | Bank review, fee policy, approval, store governance — all traced and live-tested |
| كل ارتباط مع app-partner بعد الاعتماد | `PartnerHubScreen.tsx` onboarding-status gate confirmed real (code read); fee-policy reference wired |
| كل ارتباط مع app-client بعد نشر المتجر | 6-gate SQL enforcement confirmed (code read + live negative proof); zero Partner-type leakage (grep) |
| كل ارتباط مع WLT | [07_WLT_BOUNDARY_MATRIX.md](07_WLT_BOUNDARY_MATRIX.md) — no DSH-side ledger writes anywhere in this engagement's diff |
| كل runtime/env/ports/ADB reverse/API base URLs | Verified in the finance-WLT-runtime journey (prior session, re-confirmed live this session); ports 58080/58082/58083/55432 all correct and running |
| كل guards/tests/typecheck/go test/runtime smoke | [08_RUNTIME_VERIFICATION_MATRIX.md](08_RUNTIME_VERIFICATION_MATRIX.md) |
| أي dead code/duplicates/wrong ownership | 2 stale guard-manifest paths found and fixed; 1 genuinely orphaned screen found and wired; 3 wrong-scope-controller bugs found and fixed |

## Exclusions with proof (not silently dropped)

- `visit`/`checklist`/`escalation` routes: real, backend-complete, **disclosed** as unreachable with full
  reasoning in [02_GAP_LEDGER.md](02_GAP_LEDGER.md) — not fixed because doing so would require inventing a
  trigger mechanism (push notification or new store-browsing screen) not requested by any journey in scope.
- `control-panel/operations/OrderQueueScreen.tsx`, `control-panel/support/SupportHubScreen.tsx`: pre-existing,
  outside app-field/multi-surface scope, already logged before this engagement.
- `services/dsh/tests/catalog-contract.test.mjs` catalog-UI-roots failure: pre-existing, file deleted in a
  commit before this engagement (`c8625cb`).

## Result

`CLOSED_WITH_ONE_DISCLOSED_GAP`. All five journeys in the governing task
(`FIELD_ONBOARDING_BANK_ACCOUNT_FULLSTACK`, `FIELD_FINANCE_WLT_RUNTIME_FIX`,
`PLATFORM_STORE_ONBOARDING_FEE_POLICY`, `FIELD_TO_PARTNER_TO_CONTROL_PANEL_BINDING`,
`FIELD_TO_CLIENT_STORE_VISIBILITY_VALIDATION`) are closed with live runtime + API + DB + frontend-binding
proof. One item (visit/checklist/escalation reachability) is explicitly disclosed rather than closed, pending a
product decision this session cannot make unilaterally.
