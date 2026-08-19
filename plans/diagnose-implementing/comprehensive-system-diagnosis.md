# Comprehensive System Diagnosis — AUDIT_PREPARE

**Repository:** `bthwani2-boop/bthwani-suite-next`  
**Branch:** `b`  
**Phase:** `AUDIT_PREPARE`  
**Objective:** تشخيص جميع الفجوات والتناقضات ومصادر الحقيقة الموازية والعيوب المتبقية عبر جميع الأسطح والخدمات، وتتبعها إلى أعلى Root Cause مثبتة وتحديد Canonical Target وRoot-Correct Treatment قبل أي تنفيذ.  
**Governing authority:** `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`  
**Target-system mutation:** `FORBIDDEN IN THIS PHASE`  
**Only permitted write:** this temporary execution record.

> **DOCUMENTATION RECORDS THE FIX; IT MUST NEVER SUBSTITUTE FOR THE FIX.**
>
> هذا الملف سجل تشخيص/أدلة/خطة تنفيذ مؤقت. أي إغلاق فعلي لاحقًا يجب أن يحدث في الكود/العقود/البيانات/runtime/المستهلكين الحقيقيين، وليس في هذا الملف.

---

## 0. Live-target and concurrency ledger

### Audit pin history

| Purpose | SHA | Meaning |
|---|---|---|
| Initial deep-audit baseline | `8a73fe3b98e324c19895173158b2579e26da6bb8` | baseline الذي بدأت عليه جولة التدقيق الأولى |
| Re-pinned code baseline after concurrent changes | `bf1e68375f9a5c02cf3d3872d481a0a7a499fe3c` | أحدث code baseline قبل إنشاء هذا السجل، ويشمل Workforce/WLT updates |
| Initial plan-file creation commit | `ab6e635ce384b2e5f865a17d58d387e5854155d4` | أنشأ هذا الملف فقط كـTemporary Execution Record |
| Current integration HEAD before this population write | `8a1c7b1f1df9241979f5dceda5898596700fd507` | أحدث HEAD تمت إعادة المصالحة معه قبل تعبئة الملف |

### Foreign/concurrent delta classification

Between `ab6e635...` and `8a1c7b1...`, another commit changed diagnostics/tooling and two DSH frontend discovery files. Material changed paths included:

- `.github/workflows/ci-node-diagnostics.yml`
- `package.json`
- `services/dsh/frontend/shared/home-discovery/home-discovery.api.ts`
- `services/dsh/frontend/shared/store/store-discovery.view-model.ts`
- multiple `tools/guards/**` and `tools/scripts/**` paths
- `tools/guards/cleanup-policy-gate.mjs` was removed.

**Concurrency disposition:** `FOREIGN_DELTA = INPUT, NOT INSTRUCTION`.

The proven roots below were rechecked against the compare set. Their direct evidence paths were not modified by that delta except verification/tooling assumptions, which were updated here to use the current `package.json` instead of the removed cleanup gate. No concurrent change to this PLAN_FILE itself was present before this population write.

---

## 1. Governing lifecycle applied

This audit follows:

`AUDIT + INSPECT + DIAGNOSE + ANALYZE → HIGHEST PROVEN ROOT → CANONICAL TARGET → ROOT-CORRECT TREATMENT → VERIFY → RE-AUDIT/RE-RANK → REPEAT → CLOSE`

Forbidden treatment classes for EXECUTE_CLOSE:

- Patch
- Workaround
- Silent fallback
- Symptom-only fix
- Half migration
- Parallel Truth
- Documentation-only closure
- Permanent retirement shim when the obsolete path can be removed safely
- Physical-install-layout dependency masquerading as package ownership

---

## 2. Effective scope and authority map

### Operational surfaces

1. `apps/app-client/runtime`
2. `apps/app-partner/runtime`
3. `apps/app-captain/runtime`
4. `apps/app-field/runtime`
5. `apps/control-panel/runtime`

### Bounded contexts / services

- `core/identity`
- `core/workforce`
- `core/platform-control`
- `core/providers`
- `services/dsh`
- `services/wlt`

### Shared/frontend/runtime foundations

- `shared/ui-kit`
- `shared/data-runtime`
- `shared/control-panel`
- root TypeScript resolution (`tsconfig.base.json`)
- pnpm workspace/install authority (`pnpm-workspace.yaml`)
- Go workspace (`go.work`)
- OpenAPI aggregation and context-owned contracts
- runtime/service-auth boundaries
- generated clients / route binding / workspace guards

### Workspace truth established

`pnpm-workspace.yaml` declares:

- `apps/*/runtime`
- `shared/*`
- `services/*`
- all four core contexts
- `contracts`

and uses `nodeLinker: isolated`.

`go.work` links exactly six backend modules:

- `core/identity/backend`
- `core/platform-control/backend`
- `core/providers/backend`
- `core/workforce/backend`
- `services/dsh/backend`
- `services/wlt/backend`

This proves that application/runtime ownership and backend bounded-context ownership are intentionally separated; physical `node_modules` layout must not become an alternative package-authority model.

---

## 3. Material coverage accounting

| Cone | Audit state in this pass | Material result |
|---|---|---|
| app-client | `DEEP_MATERIAL_EVIDENCE` | participates in ROOT-02 mobile resolution; owns Expo/native dependencies in its runtime manifest |
| app-partner | `DEEP_MATERIAL_EVIDENCE` | same duplicated Metro authority as client |
| app-captain | `DEEP_MATERIAL_EVIDENCE` | same duplicated Metro authority as client |
| app-field | `DEEP_MATERIAL_EVIDENCE` | same duplicated Metro authority as client |
| control-panel | `ACCOUNTED / NO ROOT YET` | structurally in scope; no higher proven root established in the inspected cone yet |
| DSH backend | `DEEP_MATERIAL_EVIDENCE` | ROOT-01, ROOT-03, ROOT-04 consumer/boundary evidence |
| WLT backend | `DEEP_MATERIAL_EVIDENCE` | ROOT-03 finance delegation/legacy transport evidence |
| Identity backend | `DEEP_MATERIAL_EVIDENCE` | ROOT-01 service-auth contract mismatch proof |
| Workforce backend | `DEEP_MATERIAL_EVIDENCE` | ROOT-04 retired internal write surface; additional legacy data/model cleanup candidate |
| Platform Control | `ACCOUNTED / NO ROOT YET` | structurally inventoried; no higher proven contradiction in current evidence cone |
| Providers | `ACCOUNTED / NO ROOT YET` | structurally inventoried; no higher proven contradiction in current evidence cone |
| Contracts | `DEEP_AUTHORITY_CHECK` | central master index is aggregation-only and not itself Parallel Truth |
| Runtime/tooling | `MATERIAL_CHECK` | current root scripts/gates identified; final exact-candidate execution evidence not yet produced because this phase is read-only |

`ACCOUNTED / NO ROOT YET` means no root is being invented from absence of evidence; it does **not** mean a permanent clean bill of health. EXECUTE_CLOSE must re-audit any newly affected consumer cone before closure.

---

# 4. Proven root-cause landscape

## ROOT-01 — LIVE Identity session verification contract is incompatible, and push delivery fails open on verifier errors

**Priority:** `P0 / SECURITY + PRIVACY + AUTHORITY`  
**Status:** `PROVEN`  
**Affected authorities:** Identity, DSH notification outbox, push endpoints, service-auth configuration  
**Blast radius:** any active DSH push endpoint that stores an `identity_session_id`; compromised/revoked-session delivery protection; operational notifications to client/partner/captain/field actors.

### Direct evidence

#### A. DSH Identity client exposes a live verifier

Path:

`services/dsh/backend/internal/auth/client.go`

`Client.IsSessionValid(ctx, actorID, sessionID)` calls:

`GET /internal/actors/{actorId}/sessions`

but sends:

`X-Service-Caller: <internalServiceToken value>`

and does **not** send the Bearer service token required by Identity's `serviceOnly` boundary.

This request shape is inconsistent with the same DSH client's other canonical DSH→Identity calls, which send:

- `Authorization: Bearer <DSH Identity service token>`
- `X-Service-Caller: dsh`

#### B. Identity route is not a DSH route

Path:

`core/identity/backend/internal/http/server.go`

`GET /internal/actors/{actorId}/sessions` is wrapped by `serviceOnly(...)`.

`serviceOnly` currently requires:

- `X-Service-Caller: workforce`
- bearer token matching `IDENTITY_WORKFORCE_SERVICE_TOKEN`

Therefore the DSH `IsSessionValid` request cannot satisfy this route contract as implemented.

#### C. The verifier is not orphan code; it is wired into runtime

Path:

`services/dsh/backend/cmd/dsh-api/main.go`

The push worker is started with `identityClient` as the session verifier:

`RunPushWorker(..., identityClient, ...)`

Path:

`services/dsh/backend/internal/operationaloutbox/push_worker.go`

`SessionVerifier` declares `IsSessionValid`, and `ProcessPushOnce` invokes it for push endpoints with `IdentitySessionID`.

#### D. Error semantics are fail-open

The worker only deactivates/skips a push token when:

`vErr == nil && !valid`

If verification returns an error—exactly what the incompatible service contract causes—the code does **not** reject the endpoint and continues to append the token for delivery.

### Highest proven root

This is not merely a malformed header. The higher root is:

> **There is no coherent canonical DSH-authorized Identity session-validity contract for this live push-security journey, while the consumer treats authority failure as permission to continue.**

It combines:

1. wrong service-auth ownership/contract selection;
2. a live consumer wired to that invalid contract;
3. fail-open handling when the security authority cannot answer.

### Canonical target

- Identity remains the **only** authority for session validity/revocation/compromise.
- DSH receives session-validity truth through one explicitly DSH-authorized internal contract with correct service identity.
- DSH must not impersonate Workforce or reuse a Workforce-only route.
- Verification unavailability/error must **not** be interpreted as session validity.
- Push delivery for an endpoint whose bound Identity session cannot be authoritatively validated must fail closed according to the delivery retry/state model; it must not silently send.
- Contract, implementation, tests, service-token/env wiring, and runtime smoke must describe the same authority.

### Root-correct treatment

1. Identify the smallest Identity-owned session-validity operation required by DSH.
2. Implement or reuse a canonical **DSH-authorized** Identity internal boundary rather than widening Workforce's actor-administration endpoint ad hoc.
3. Update DSH `IsSessionValid` to the canonical service-auth contract.
4. Change push-worker error semantics so authority unavailability cannot authorize delivery.
5. Preserve retryability for transient Identity outage without sending to an unverified endpoint.
6. Add positive, revoked/compromised, forbidden-caller, invalid-token, Identity-unavailable, and retry semantics tests.
7. Verify exact DSH+Identity runtime behavior.
8. Remove any obsolete session-verification path created or superseded by the cutover.

### Closure proof

`ROOT-01 CLOSED` only when all are true:

- live DSH verifier reaches a route that explicitly accepts DSH service identity;
- correct Bearer + caller semantics are enforced;
- revoked/compromised session prevents push delivery;
- Identity outage/error cannot result in push delivery;
- no Workforce impersonation or parallel session authority exists;
- runtime and tests prove the exact final candidate.

---

## ROOT-02 — Mobile TypeScript/Metro resolution encodes physical install layout as a parallel authority

**Priority:** `P1 / SYSTEMIC BUILD + ARCHITECTURE`  
**Status:** `PROVEN`  
**Affected surfaces:** all four mobile apps  
**Blast radius:** TypeScript resolution, Metro bundling, Expo/Sentry integration, workspace dependency ownership, local/CI/EAS behavior, package upgrades.

### Direct evidence

#### A. Root TypeScript aliases point into another package's physical install tree

Path:

`tsconfig.base.json`

It maps runtime/native dependencies including:

- `react-native`
- `react-native-maps`
- `@tanstack/react-query`
- `expo-image-picker`
- `expo-location`
- `expo-notifications`
- `expo-secure-store`
- `expo-constants`
- `expo-crypto`

to paths under:

`./services/dsh/node_modules/...`

#### B. pnpm's declared install model is isolated

Path:

`pnpm-workspace.yaml`

`nodeLinker: isolated`

That makes package manifests/workspace edges the declared dependency graph. Hard-wiring resolution to another workspace package's `node_modules` makes physical installation layout a second authority.

#### C. Native dependencies are owned by app runtimes

Example path:

`apps/app-client/runtime/package.json`

The app declares its own Expo/React Native/native dependencies directly, including Expo 56 packages and React Native 0.85.x.

#### D. Metro authority is duplicated four times

Identical config content is present at:

- `apps/app-client/runtime/metro.config.cjs`
- `apps/app-partner/runtime/metro.config.cjs`
- `apps/app-captain/runtime/metro.config.cjs`
- `apps/app-field/runtime/metro.config.cjs`

Each manually configures:

- `watchFolders`
- `resolver.nodeModulesPaths`
- `resolver.extraNodeModules`
- manual aliases to workspace and app `node_modules`
- custom `.js` resolution fallback

The four files had the same blob SHA in the inspected baseline, proving copied resolver truth rather than one shared owner.

#### E. DSH native capability boundary does not justify DSH owning Expo installs

Path:

`services/dsh/frontend/shared/mobile-capabilities.ts`

DSH exposes adapters/factories for location, image picker, documents, maps, notifications, linking, etc. The design allows runtime modules to be injected; this is a semantic capability boundary, not proof that `services/dsh/node_modules` should be the physical resolution authority for app-native packages.

### Highest proven root

> **Dependency ownership is declared at app/package level, but TypeScript and Metro bypass that ownership through manually encoded physical `node_modules` paths, with the Metro policy copied into four separate runtime files.**

This creates Parallel Truth among:

1. package manifests;
2. pnpm isolated workspace resolution;
3. root TS path aliases;
4. four separate Metro resolver copies.

### Canonical target

- Package manifests/workspace exports are the dependency authority.
- No app resolves runtime/native libraries by reaching into another package's physical `node_modules` directory.
- Shared package imports resolve through workspace package identity/exports.
- Metro configuration has one canonical policy owner for the four mobile apps, with only app-specific values passed explicitly.
- Retain only resolver customization that is empirically required by the final Expo/Sentry/pnpm stack.
- No hidden fallback that masks undeclared dependencies.

### Root-correct treatment

1. Inventory every root `paths` alias that points at physical `node_modules`.
2. Remove cross-package physical-layout aliases.
3. Ensure each actual importer declares the dependency it uses.
4. Replace the four copied Metro configs with one canonical shared config factory or another single-owner mechanism appropriate to the repository.
5. Reduce manual `watchFolders/nodeModulesPaths/extraNodeModules` to the minimum proven necessary.
6. Preserve Sentry's Expo Metro integration without using it as justification for duplicate resolution authority.
7. Verify all four apps independently: typecheck, source verification, runtime contract tests, Metro start/bundle resolution, and build/export gate.
8. Negative-space check: no remaining `*/node_modules/*` authority aliases across root/shared/app configs unless a narrow exception is proven and documented at the true owner.

### Closure proof

- four apps resolve from declared workspace/package ownership;
- no DSH `node_modules` path serves as global native dependency authority;
- one canonical Metro resolution policy remains;
- undeclared imports fail rather than silently resolving through another package;
- all four mobile verification/build paths pass on exact candidate.

---

## ROOT-03 — WLT finance still depends on an explicitly legacy OperatorContext transport after service authentication

**Priority:** `P1 / FINANCE + AUTHORITY + LEGACY CUTOVER`  
**Status:** `PROVEN LEGACY MIGRATION ROOT`  
**Affected systems:** DSH→WLT payment sessions, commissions, payment expiry/cancellation/readback and other WLT service-authenticated financial routes  
**Security nuance:** direct browser spoofing is **not proven** because WLT checks service authentication before trusting the context. The defect is incomplete canonical cutover / legacy transport authority, not an unauthenticated-header claim.

### Direct evidence

#### A. DSH resolves trusted OperatorContext from Identity

Path:

`services/dsh/backend/internal/http/trusted_operator_context_context.go`

`TrustedOperatorContextMiddleware`:

- resolves the incoming Bearer session through Identity;
- reads `resolved.OperatorContextID`;
- installs it in trusted request context;
- explicitly does not accept browser `X-Operator-Context-ID` as ownership evidence.

This disproves the weaker hypothesis that browser header input is the primary authority.

#### B. DSH WLT client explicitly labels transport as temporary compatibility

Path:

`services/dsh/backend/internal/wlt/client.go`

Comments state that:

- `OperatorContextID` is compile-only while legacy DSH call sites are cleaned;
- `resolveTrustedOperatorContext` and `setTrustedOperatorContextHeader` are temporary compatibility helpers for WLT routes not migrated yet;
- payment-session creation prepares a `deprecated WLT payment scope bridge`.

The client sends:

- `Authorization: Bearer <WLT_DSH_SERVICE_TOKEN>`
- `X-Service-Caller: dsh`
- `X-Operator-Context-ID: <trusted context>`

for material financial calls.

#### C. WLT itself names this transport legacy

Path:

`services/wlt/backend/internal/shared/serviceauth.go`

The header constant is:

`legacyOperatorContextHeader = "X-Operator-Context-ID"`

`RequireServiceCaller` first validates:

- configured token;
- Bearer token;
- expected service caller;

then requires the legacy OperatorContext header and installs it into WLT request context.

The same file also defines delegated-finance-principal context support, demonstrating that finance delegation semantics are being modeled separately, but the inspected path still depends on the legacy OperatorContext transport.

#### D. WLT route registry applies service auth broadly to financial reads/mutations

Path:

`services/wlt/backend/internal/http/server.go`

Material WLT financial reads/mutations are wrapped by DSH service authentication; OperatorContext-scoped handlers consume the authenticated request context.

### Highest proven root

> **The finance boundary has reached authenticated service delegation, but the migration stopped with an explicitly deprecated context transport still required as live authority input across sensitive financial journeys.**

This is architectural/contract debt at a high-risk boundary: the system contains a “temporary/deprecated” transport that is still part of the operational contract.

### Canonical target

- WLT remains the sovereign financial state/ownership authority.
- DSH may delegate an Identity-authenticated operator/principal only through **one explicit internal finance delegation contract**.
- The final contract must state what is being delegated: principal identity, operator context/scope, or both, and where each is independently validated.
- No `legacy*`, compatibility helper, deprecated transport, or dual context interpretation remains reachable after cutover.
- Browser/user paths derive context from Identity; internal service paths accept only authenticated service delegation.

### Root-correct treatment

1. Inventory every DSH→WLT request and every WLT reader of OperatorContext/delegated principal.
2. Decide the final internal finance delegation shape from existing semantic ownership—not by preserving a deprecated header for compatibility.
3. Migrate all finance writers/readers/handlers together.
4. Update contracts/generated clients where applicable.
5. Remove `legacyOperatorContextHeader`, temporary DSH helpers, compile-only fields, and stale CORS/header allowances when no longer needed.
6. Prove WLT financial ownership isolation by OperatorContext on create/read/mutate flows.
7. Verify DSH service-auth denial, wrong-context denial, cross-context read/write denial, and happy path.

### Closure proof

- zero reachable code calls the legacy compatibility helpers;
- zero active WLT route requires a header labeled/treated as legacy;
- one finance delegation model is used across all DSH↔WLT paths;
- service auth + scope binding are fail closed;
- financial state remains WLT-owned;
- all finance boundary/integration tests and runtime smoke pass.

---

## ROOT-04 — Workforce assignment write cutover is functionally complete, but a reachable retirement shim remains

**Priority:** `P2 / LEGACY SURFACE + COMPLEXITY`  
**Status:** `PROVEN CLEANUP ROOT`  
**Affected boundary:** DSH↔Workforce operational assignments.

### Direct evidence

#### A. Workforce still registers PUT internal scopes route

Path:

`core/workforce/backend/internal/http/server.go`

The router registers:

`PUT /internal/assignments/{actorId}/scopes`

#### B. The handler is a retirement shim, not a writer

Path:

`core/workforce/backend/internal/http/assignments.go`

`handleSetActorScopes` is explicitly described as a `fail-closed retirement shim` and returns `405 METHOD_NOT_ALLOWED`; it does not decode a body and does not reach a repository write.

#### C. The active internal contract declares only GET

Path:

`core/workforce/contracts/workforce.internal-scopes.openapi.yaml`

The canonical internal scopes contract exposes GET for:

`/internal/assignments/{actorId}/scopes`

with DSH bearer/service-caller/operator-context requirements. No PUT operation is declared.

#### D. Current DSH Workforce client is read-only for scopes

Path:

`services/dsh/backend/internal/workforceclient/client.go`

It exposes `GetActorScopes` and `VerifyActorInOperatorContext`; no setter/PUT client exists.

### Highest proven root

> **The authority cutover removed the parallel writer but did not complete reachable legacy-surface deletion.**

This is no longer a Parallel Write defect; it is incomplete cleanup after a successful ownership migration.

### Canonical target

- Workforce is the only operational assignment mutation owner.
- DSH consumes Workforce scopes through authenticated read/verification boundaries only.
- No historical DSH mutation endpoint remains registered merely to return 405 when no active consumer/contract needs it.

### Root-correct treatment

1. Re-prove zero consumers of the retired PUT on live HEAD.
2. Delete PUT route registration and retirement shim.
3. Delete/update tests whose only purpose is preserving the retired route.
4. Remove stale comments/docs/fixtures that still imply a DSH assignment writer.
5. Verify GET readback and actor/operator-context attestation remain intact.

### Closure proof

- no PUT assignment route is registered;
- no generated/manual client references it;
- no test or runtime script expects it;
- Workforce write ownership remains singular.

---

## CLEANUP-01 — Workforce field shift compatibility residue remains in model/database path

**Priority:** `P3 / LEGACY DATA-MODEL CLEANUP`  
**Status:** `PROVEN RESIDUE; TREAT UNDER WORKFORCE CLEANUP CONE`  
**Not ranked above ROOT-04 because it does not currently represent an active external authority.**

### Evidence

Path:

`core/workforce/backend/internal/workforce/model.go`

Field `ShiftCode` appears with comments such as:

- `deprecated database compatibility only; field providers have no shifts`
- ignored compatibility slot; never accepted from API

Path:

`core/workforce/backend/internal/workforce/repository.go`

Field creation still writes historical `shift_code` with `'not_applicable'`, and person reads still project the column.

Historical schema/migrations include `workforce_shifts` and `workforce_field_profiles.shift_code`.

### Canonical target

If field providers semantically have no shifts, field-shift state must cease to exist as a live compatibility concept after safe data/schema migration. Employee shift reference data may remain if it has a real employee consumer.

### Required treatment before final Workforce closure

- prove all field-shift consumers absent;
- migrate/drop field-specific compatibility column/constraints if safe;
- remove `ShiftCode` compatibility fields and repository projection;
- preserve only legitimate employee shift semantics.

---

# 5. Rejected hypotheses / non-findings

## NON-FINDING-01 — Central `contracts/openapi/index.yaml` is not itself a second runtime contract authority

The file explicitly declares:

- `MASTER_INDEX_ONLY`
- `paths: {}`
- generation disabled for master
- context-owned contract references for Identity, Workforce, Platform Control, Providers, DSH, WLT.

Therefore the presence of both `contracts/` and context-owned contracts is not automatically Parallel Truth. A real defect would require an active runtime/generated client/schema to bypass the canonical master→context ownership tree. No such bypass was proven in this inspected cone.

## NON-FINDING-02 — DSH mobile capability adapters do not prove DSH should own Expo package installation

The adapters are a valid semantic dependency-inversion boundary. ROOT-02 concerns physical resolution authority and duplicated Metro policy, not the existence of DSH capability interfaces.

## NON-FINDING-03 — `X-Operator-Context-ID` is not proven to be directly browser-spoofable into WLT finance

WLT's inspected financial routes require authenticated service identity before the legacy context header is consumed. ROOT-03 is therefore classified as incomplete legacy finance delegation/cutover, not an unauthenticated-header vulnerability.

## NON-FINDING-04 — Workforce PUT shim is not an active parallel writer

The current handler cannot write. Its defect is reachable legacy residue after cutover, not ongoing assignment mutation ownership.

---

# 6. Decision-required accounting

## Material Product/Business/Semantic decisions

`NONE PROVEN AT THIS STAGE.`

The current highest roots can be treated from existing authority semantics:

- Identity owns session truth.
- Workforce owns workforce/assignment truth.
- WLT owns financial truth.
- DSH orchestrates delivery/shopping journeys and consumes those authorities.
- app runtimes own native runtime dependencies; workspace/package declarations own dependency edges.

### Technical evidence still required during EXECUTE_CLOSE is not a human Product decision

Examples:

- exact minimal Identity operation to expose to DSH for session validity;
- exact final WLT internal finance delegation representation after inventorying every consumer;
- whether any narrow Metro resolver customization remains empirically necessary;
- whether field shift DB compatibility can be dropped in one migration or requires a staged data migration.

These must be resolved by live evidence and tests, not by inventing Product Truth.

---

# 7. Canonical execution order

Execution must re-pin current HEAD first and may re-rank if new higher evidence appears.

## Execution Wave A — security authority first

### A1. ROOT-01 Identity session verification + push fail-open

Reason for priority:

- live runtime path;
- security/privacy boundary;
- current verifier contract is provably incompatible;
- consumer error handling authorizes continuation.

No lower cleanup should delay this root.

## Execution Wave B — independent systemic authorities

The following may execute in parallel only after collision analysis proves disjoint write sets.

### B1. ROOT-02 mobile module-resolution authority

Touches root TS config + four mobile runtimes/shared config; should have one integration owner.

### B2. ROOT-03 DSH↔WLT finance delegation cutover

Touches DSH WLT client + WLT serviceauth/handlers/contracts/tests/runtime. Keep finance migration coherent end-to-end; do not split DSH and WLT into competing target models.

## Execution Wave C — Workforce legacy closure

### C1. ROOT-04 delete retired assignment PUT surface

Only after zero-consumer proof.

### C2. CLEANUP-01 field shift compatibility retirement

Perform only after data/consumer proof. Keep legitimate employee shift semantics.

## Re-audit frontier

After each root:

`VERIFY → RE-AUDIT affected cone → RE-RANK → expose new roots → continue`

The plan list is not a stopping boundary.

---

# 8. Verification matrix for exact final candidate

## Identity / DSH notification security

Required evidence:

- Identity backend unit/integration tests for DSH service caller/token contract
- DSH auth client tests for session-valid / revoked / compromised / unauthorized / unavailable
- push-worker tests proving verifier error does not send
- push retry/state tests for transient Identity outage
- runtime Identity + DSH smoke on exact candidate

## Mobile resolution

For all four apps:

- package dependency ownership check
- TypeScript typecheck
- app source verification/lint
- runtime contract tests
- Metro resolver/start/bundle check
- build/export check
- negative search for cross-package physical `node_modules` aliases

Relevant current root commands include the workspace/affected verification and app-local scripts exposed by `package.json`/runtime package manifests. Do not use the removed `cleanup-policy-gate.mjs` as verification evidence on the current HEAD.

## DSH↔WLT finance

Required evidence:

- `guard:wlt-financial-boundary`
- affected DSH/WLT Go tests
- service-auth negative tests
- cross-OperatorContext negative tests
- payment session/commission/expiry/cancellation/readback integration tests
- OpenAPI compose/generate/drift verification where contract changed
- WLT runtime smoke and DSH↔WLT smoke
- zero grep/AST evidence for removed legacy compatibility transport

## Workforce

Required evidence:

- Workforce backend tests
- DSH Workforce client tests
- internal contract compose/generation/drift checks
- zero-consumer proof before deleting PUT shim
- DB migration/schema tests if field shift compatibility is removed
- Workforce + Identity runtime smoke

## Repository-level exact-candidate closure

At minimum, as applicable to changed cone:

- `pnpm run contracts:lint`
- `pnpm run guard:source-integrity`
- `pnpm run guard:fullstack-boundary`
- `pnpm run guard:wlt-financial-boundary`
- `pnpm run guard:aggregate-ownership`
- `pnpm run guard:runtime-config`
- `pnpm run guard:no-broken-imports`
- `pnpm run guard:contract-registry-drift`
- `pnpm run guard:migration-manifest-drift`
- `pnpm run guard:generated-client-provenance`
- `pnpm run guard:contract-scope-binding`
- `pnpm run guard:openapi-bundle-provenance`
- relevant affected typecheck/lint/test/build
- `pnpm run workspace:verify` when the final blast radius justifies full-workspace proof
- `pnpm run runtime:full:smoke` for final end-to-end runtime closure when environment is available

Final candidate SHA must be pinned **after the last write**, not before it.

---

# 9. Closure invariants

The execution is not closed until all applicable invariants hold:

1. **Identity session truth is singular** and DSH cannot send to an endpoint merely because Identity verification failed.
2. **No service impersonation:** DSH never uses a Workforce-only Identity service contract.
3. **Package declarations are module-resolution authority:** no global resolution through another package's physical `node_modules`.
4. **One Metro policy owner** for all four mobile apps; app-specific values only where real.
5. **WLT financial ownership remains sovereign** and internal delegation has one non-legacy contract.
6. **Zero reachable deprecated finance bridge** after cutover.
7. **Workforce is the only assignment mutation owner.**
8. **No retired assignment PUT shim** remains after zero-consumer proof.
9. **No field-shift compatibility residue** remains if field providers truly have no shift semantics; employee semantics remain only if consumed.
10. **No contract/client/runtime drift** in affected contexts.
11. **No dead/stale/orphan/duplicate path exposed by the treatment** is deferred as “later cleanup” inside the affected cone.
12. **Exact final candidate verified** after last write.
13. **Re-audit/re-rank performed** after each major root and once globally before closure.

---

# 10. Current risk ranking

| Rank | ID | Risk | Current classification |
|---|---|---|---|
| 1 | ROOT-01 | compromised/revoked-session push protection can fail open because the live Identity verifier uses an incompatible service contract | `P0 PROVEN` |
| 2 | ROOT-03 | sensitive DSH↔WLT finance flows still depend on explicitly legacy context transport | `P1 PROVEN LEGACY MIGRATION ROOT` |
| 3 | ROOT-02 | four mobile surfaces depend on duplicated/manual physical-layout resolution conflicting with isolated workspace ownership | `P1 PROVEN SYSTEMIC` |
| 4 | ROOT-04 | retired Workforce assignment mutation route remains reachable as a 405 shim after contract/client cutover | `P2 PROVEN CLEANUP ROOT` |
| 5 | CLEANUP-01 | deprecated field shift concept persists in Workforce model/repository/database compatibility path | `P3 PROVEN RESIDUE` |

Ranking may change only if a higher root is proven during re-audit. New evidence preempts lower execution.

---

# 11. Remaining audit obligations before claiming repository-wide diagnosis closure

This file is now **materially populated** from the completed evidence cones; it is no longer a blank template. However, because the stated objective is repository-wide, the following accounting must still be completed before claiming that the *audit itself* is globally exhausted:

1. deep consumer sweep for `core/platform-control` and `core/providers` beyond structural inventory;
2. control-panel cross-context consumer/authority sweep;
3. re-audit of the two DSH discovery files changed by foreign delta `8a1c7b1...` if their journey intersects any newly proven root;
4. contract-generation/runtime binding negative-space pass across all six contexts;
5. final repository-wide stale/dead/duplicate/legacy negative-space pass using current tooling after the concurrent guard cleanup;
6. exact GitHub/CI candidate evidence during EXECUTE_CLOSE; AUDIT_PREPARE does not manufacture a green status.

These obligations are explicitly recorded so the plan cannot falsely equate “five proven roots” with “nothing else exists.”

---

# 12. PLAN status

`AUDIT_PREPARE_POPULATED`

- Proven high-priority roots: **4**
- Proven subordinate legacy cleanup: **1**
- Material human `DECISION_REQUIRED`: **NONE currently proven**
- Target system modified during this phase: **NO**
- Orchestrator modified: **NO**
- Temporary plan file modified: **YES — this file only**
- Execution authorized by this status alone: **NO**

The next audit pass must continue the remaining repository-wide accounting above, then re-pin live HEAD, reconcile any foreign delta, update this same file, and only then advance it to `READY_FOR_EXECUTION` if no material unresolved decision remains.
