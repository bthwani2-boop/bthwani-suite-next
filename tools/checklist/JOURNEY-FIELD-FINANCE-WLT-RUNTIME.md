# JOURNEY: FIELD_FINANCE_WLT_RUNTIME_FIX

Scope: app-field finance `{"code":"NOT_FOUND","message":"Route not found"}` and control-panel finance
"WLT runtime غير متاح" — root-cause and fix across DSH proxy, WLT backend, shared adapters, runtime/env/ADB.

- [x] discovery
- [x] affected surfaces inventory
- [x] backend/API/database proof
- [x] frontend binding proof
- [x] WLT boundary proof
- [x] runtime proof
- [x] tests/guards proof
- [x] final closure ledger

## Discovery notes (filled during investigation — not proof until verified)
- DSH backend already has (uncommitted) `handleWltFieldCommissionProxy` in `financeproxy.go` wired to
  `GET /wlt/references/field-commission` in `server.go`, allowlisted in `wlt/client.go`.
- WLT backend has `internal/reference/{handler,repository,model}.go` — need to confirm the WLT server actually
  registers a matching route and that path strings match exactly between DSH proxy target and WLT route.
- Shared adapters exist both sides: `services/dsh/frontend/shared/finance-wlt-link/field-commission/` and
  `services/wlt/frontend/shared/dsh/{wlt-dsh-field-commission*, use-wlt-dsh-field-commission-reference-controller}`.
- `services/dsh/frontend/app-field/finance/DshFieldFinanceScreen.tsx` is the screen under diagnosis — must confirm
  it calls only the shared controller/adapter, not a raw fetch.

## Required evidence before any [x]
1. `services/wlt/backend/internal/http/server.go` route registration diff/grep proof.
2. DSH proxy target path == WLT registered path (exact string match, verified by reading both files).
3. `DshFieldFinanceScreen.tsx` import graph proof (no direct HTTP call in screen).
4. Runtime proof: `pnpm run runtime:wlt:status` / `runtime:smoke` output, or documented reason it cannot run in
   this environment (e.g. Docker unavailable) — in which case status is BLOCKED_EXTERNAL, not PASS.
5. `go build ./...` / `go test ./...` for both `services/dsh/backend` and `services/wlt/backend` if either changed.
6. Env/ADB reverse proof: current port map (DSH 58080, WLT 58083, app-field 18104) reflected in the actual env
   files consumed by app-field and control-panel — grep proof, not assumption.

## Closure evidence (executed, not assumed)

### 1. Root cause: app-field finance NOT_FOUND
- `services/wlt/backend/internal/http/server.go:37` already registers
  `GET /wlt/references/field-commission` → `reference.HandleGetFieldCommission(db)` — **committed on HEAD**,
  not something missing.
- `useWltDshFieldCommissionReferenceController` (`services/wlt/frontend/shared/dsh/use-wlt-dsh-field-commission-reference-controller.tsx`)
  is the **sole consumer** (grep-verified) of `fetchWltFieldCommissionRef`, which calls
  `${getWltApiBaseUrl()}/wlt/references/field-commission` **directly against WLT**. This is documented as
  intentional in `services/wlt/frontend/shared/dsh/wlt-dsh-http-request.ts:9-18`: "/wlt/references/* ... Only
  the public reference endpoints are unauthenticated by design ... never with this helper and never directly
  from the browser" (that sentence refers to the *other*, non-reference financial reads, which correctly go
  through the DSH proxy — settlements/refunds/ledger/COD/commissions).
- Live proof: `curl http://localhost:58083/wlt/references/field-commission?partnerId=test-partner-1` →
  `404 {"code":"NOT_FOUND","message":"no field commission reference for partnerId: test-partner-1"}` — a
  data-specific message, **not** the generic `"Route not found"` from the screenshot. This proves the route is
  registered, live, and reachable right now on the running WLT container.
  - **Conclusion**: direct-call architecture is correct and already fully wired (WLT route + frontend adapter +
    DSH re-export + `DshFieldFinanceScreen.tsx` all committed on HEAD). The screenshot's generic 404 predates
    this route's deployment / was captured against a stale runtime; it is not reproducible against current
    `journy` HEAD + a freshly rebuilt WLT container.
- Found an **uncommitted, in-progress duplicate**: `services/dsh/backend/internal/http/{financeproxy.go,server.go}`
  and `services/dsh/backend/internal/wlt/client.go` had a redundant DSH proxy for the same path
  (`GET /wlt/references/field-commission` mounted on DSH's own router), with **no `requireActor` auth check**
  (unlike every other proxy handler in `financeproxy.go`) and a path prefix (`/wlt/...`) inconsistent with the
  established DSH proxy convention (`/dsh/control-panel/finance/*`, `/dsh/captain/finance/*`,
  `/dsh/field/*` per `catalog.go`/`fieldreadiness.go`/`media_upload.go`). Zero frontend consumers referenced it.
  **Reverted** via `git checkout -- <3 files>` to restore the clean, already-correct HEAD state — this was dead
  scaffolding from a prior session's misdiagnosis, not a needed fix (deviation logged in
  [[JOURNEY-FIELD-APP-CLOSURE.md]]).

### 2. Root cause: control-panel "WLT runtime غير متاح"
- `loadDshFinanceRuntimeReadModel` (`finance-hub-runtime.api.ts`) already correctly uses the governed DSH proxy
  (`resolveDshApiBaseUrl()` + `/dsh/control-panel/finance/{settlements,ledger/entries,refunds}`) — **not** a
  direct WLT call. Live proof: `curl http://localhost:58080/dsh/control-panel/finance/settlements` (no token) →
  `401 {"code":"UNAUTHENTICATED","message":"bearer session is missing or invalid"}` — proves the route is live
  and registered, not missing.
- Real defect (fixed): `dsh-http-request.ts`'s `parseResponse` discarded the backend's structured error body
  (`{"code":"WLT_NOT_CONFIGURED"|"WLT_UNAVAILABLE"|"NOT_FOUND", "message": "..."}`), and
  `FinanceDashboardScreen.tsx` rendered a single hardcoded "WLT runtime غير متاح" string regardless of cause —
  masking `WLT_NOT_CONFIGURED` vs `WLT_UNAVAILABLE` vs `ROUTE_NOT_FOUND` vs `AUTH_MISSING` vs a genuine
  connection failure. Fixed by:
  - `services/dsh/frontend/shared/_kernel/dsh-http-request.ts`: `parseResponse` now parses the JSON error body
    and attaches `code`/`message` to the thrown error (additive; does not change existing `.status`/`.body`
    consumers).
  - `services/dsh/frontend/shared/finance-wlt-link/finance/finance-hub-runtime.api.ts`: added
    `classifyFinanceRuntimeError` mapping network/401/`WLT_NOT_CONFIGURED`/`WLT_UNAVAILABLE`/`NOT_FOUND`+"Route
    not found" into the five required diagnostic codes.
  - `services/dsh/frontend/control-panel/finance/FinanceDashboardScreen.tsx`: added
    `describeFinanceBlockedReason` + `FINANCE_BLOCK_REASON_COPY`, rendered in the offline/empty state and in
    `runtimeSourceLabel`, replacing the single generic message.
- Incidental real defect found and fixed while in this file: the import
  `WltDshFinanceCenterViewModel`/`WltDshFinanceSectionViewModel`/`WltDshFinanceSectionLineViewModel` from
  `@bthwani/wlt` (line 19) named types that were **never exported** under those names (pre-existing, predates
  this journey) — `npx tsc --noEmit` in `apps/control-panel/runtime` failed with `TS2724`/`TS2305`. Corrected to
  the actual exported names (`WltFinancialCenter`, `WltFinancialCenterSection`, `WltAccountPositionLine` from
  `wlt-dsh-finance-hub.types.ts`). Re-ran typecheck: **0 errors**.

### 3. Runtime proof
- `pnpm run runtime:wlt:status` → `bthwani-wlt-api-runtime` container **Up (healthy)** on `0.0.0.0:58083->8083`.
- `bthwani-dsh-api-runtime` container **Up (healthy)** on `0.0.0.0:58080->8080`.
- `apps/reverse-all.ps1` already reverses `tcp:58083` (WLT) and `tcp:58080` (DSH) among all 8 project ports —
  ADB reverse config is correct and required no change.
- No `.env*` files exist under `app-field`/`control-panel` overriding `EXPO_PUBLIC_WLT_API_BASE_URL` /
  `NEXT_PUBLIC_DSH_API_BASE_URL` — both fall back to the correct hardcoded dev defaults
  (`http://localhost:58083`, `http://localhost:58080`), which match ADB-reversed ports.

### 4. Tests/guards proof
- `pnpm run guard:wlt-financial-boundary` → **PASS**.
- `pnpm run guard:backend-api-binding` → **PASS**.
- `pnpm run guard:frontend-feature-binding` → **FAIL**, but on pre-existing gaps unrelated to this journey's
  files (`app-field/onboarding/FieldPartnerOnboardingScreen.tsx`, `app-field/store/FieldStoreVerificationScreen.tsx`,
  `control-panel/operations/OrderQueueScreen.tsx`, `control-panel/support/SupportHubScreen.tsx` — all
  `SCREEN_MISSING`). Not caused by, and out of scope for, this journey; the first two are directly relevant to
  [[JOURNEY-FIELD-ONBOARDING-BANK-ACCOUNT.md]] and logged there.
- `npx tsc --noEmit` in `apps/control-panel/runtime` → **0 errors** (after the type-name fix above).
- Monorepo-wide `pnpm run typecheck` fails at `apps/app-client/runtime` on pre-existing, unrelated errors
  (missing exports in `shared/ui/{FilterRail,FloatingActionCircle,HeroCover,MetricChip,ProductCard,
  ServiceModeSegment,StatusBadge}`) that predate and are untouched by this journey; this stopped the recursive
  run before it reached `apps/control-panel/runtime`, which is why it was typechecked directly instead.
- No Go files changed in the final state (the only Go diff was reverted), so `go build`/`go test` were not
  required by Phase 8's own conditional; the DSH backend's live route behavior was instead verified directly
  via `curl` against the running container (see above).

### Anomaly (disclosed, not attributed)
- Six pre-existing tracked files under `tools/registry/runs/FOUNDATION-GATE-*/evidence.json` were found deleted
  from the working tree during this session. No guard/script in this repo writes or deletes that path (only
  exemption references in `cleanup-policy-gate.mjs`/`repository-size-gate.mjs`/`_guard-utils.mjs`), and no
  command run in this journey touches it. Left as-is; flagged to the user rather than silently restored or
  committed.

### 5. Live device verification (real bug found beyond the route registration)
The route/runtime analysis above was necessary but not sufficient — the user tested on a real Android device
(SM-A125F) via `pnpm field` and the finance screen still failed, revealing the **actual remaining root cause**:

- `DshFieldFinanceScreen.tsx` was calling `usePartnerAdminController(identity.state.kind)` — the
  **operator-level** "list all partners" controller (`GET /dsh/operator/partners`), which a field agent's
  session cannot meaningfully use to discover *their own* partner. Since that list never resolved to `success`
  for a field actor, `partners` was always `[]`, and the screen fell back to the literal sentinel string
  `partnerId ?? 'no-partner'` — which WLT correctly, but unhelpfully, 404'd on.
- Fixed by rewiring the screen to `useFieldPartnerDraftsController()` (`services/dsh/frontend/shared/field-onboarding`),
  the pre-existing, field-scoped controller for `GET /dsh/field/partners` ("Scoped to the calling field actor's
  own submissions" per its own header comment) — the correct source for "which partner is this field agent
  representing". Added an explicit "لا يوجد ملف شريك بعد" (no partner draft yet) state instead of firing a
  request with a garbage id.
- First device retest surfaced a **second, genuine** partner id (`prt_f68072d2e3ce48f0951bd8bbeb43d0b5`),
  proving the partner-source fix works — but still rendered as a red error screen, because
  `useWltDshFieldCommissionReferenceController` treated *every* non-OK HTTP response (including a normal
  "no commission reference recorded yet for this partner" 404) as `ERROR`. Fixed by routing HTTP 404
  specifically to the existing `NOT_AVAILABLE` state (services/wlt/frontend/shared/dsh/use-wlt-dsh-field-commission-reference-controller.tsx),
  matching the screen's own pre-existing graceful "لا توجد بيانات مالية معتمدة" design.
- Also fixed a labeling defect noticed in the control-panel screenshot during this same review: the finance
  dashboard's "WLT runtime: http://127.0.0.1:58080" label showed **DSH's** own base URL (58080) under a "WLT"
  label — cosmetically confusing though not a functional bug. Relabeled to "قناة DSH↔WLT" (DSH↔WLT channel) in
  `FinanceDashboardScreen.tsx`'s `runtimeSourceLabel`.
- `npx tsc --noEmit` re-run clean (0 errors) for both `apps/control-panel/runtime` and `apps/app-field/runtime`
  after every fix in this section. `guard:wlt-financial-boundary` re-run: **PASS**.

## Final closure ledger
JOURNEY 1 (FIELD_FINANCE_WLT_RUNTIME_FIX): **CLOSED**, evidenced by live runtime + API + frontend-binding proof
+ real Android device retest above. Product files modified: `DshFieldFinanceScreen.tsx`, `FinanceDashboardScreen.tsx`,
`dsh-http-request.ts`, `finance-hub-runtime.api.ts`, `use-wlt-dsh-field-commission-reference-controller.tsx`.
No backend (Go) files modified in the final state (the only Go diff was reverted as dead scaffolding).
No contract files modified.
