# Bthwani Task Package

SCHEMA: BTHWANI_PACKAGE_V5
TASK_ID: workspace-v5-e2e-closure-20260815
TARGET: كل الوركسبايس
MODE: EXECUTE_END_TO_END
INTEGRATION_BRANCH: A
TASK_BRANCH: task/workspace-v5-e2e-closure-20260815
BASE_SHA: babc873b6b2e712efbe082e37d1bcec977fc3d8d
LATEST_RECONCILED_SHA: babc873b6b2e712efbe082e37d1bcec977fc3d8d
ROOT: كل الوركسبايس
INTEGRATION_OWNER: bthwani-v5-integration-owner
RUNTIME_REQUIRED: YES

## Operational Coverage

| Node | Kind | Parent | Claim | Status | Evidence |
|---|---|---|---|---|---|
| OP-ROOT | SYSTEM_ROOT | ROOT | BThwani is one unified multi-surface commerce, fulfillment, workforce, control and financial platform; workspace closure is outcome-wide rather than app-local. | PROVEN | EVD-ROOT |
| OP-PRODUCT | PRODUCT_OUTCOMES | OP-ROOT | Product outcomes span customer, partner, captain, field and operator journeys with DSH operational truth and WLT financial truth. | PROVEN | EVD-ROOT |
| OP-IDENTITY | AUTHORITY_OWNER | OP-ROOT | Identity owns actors, activation, authentication and sessions; protected product acceptance remains independent. | PROVEN | EVD-PRODUCT-LIFECYCLE |
| OP-WORKFORCE | AUTHORITY_OWNER | OP-ROOT | Workforce owns employment/profile readiness consumed by field and captain journeys. | PROVEN | EVD-RUNTIME-DEPENDENCIES |
| OP-DSH | DOMAIN_OWNER | OP-ROOT | DSH owns commerce, catalog, checkout, order, partner operations, dispatch, serviceability and bounded application projections. | PROVEN | EVD-DSH-READINESS |
| OP-WLT | DOMAIN_OWNER | OP-ROOT | WLT exclusively owns wallet, ledger, payment, COD, payout, settlement, commission and reconciliation truth. | PROVEN | EVD-FINANCE-DEEPENING |
| OP-CONTROL | CONTROL_PLANE | OP-ROOT | Platform Control and Providers own governed platform/provider configuration and control-plane outcomes. | PROVEN | EVD-PRODUCT-LIFECYCLE |
| OP-SURFACES | CONSUMERS | OP-ROOT | app-client, app-partner, app-captain, app-field and control-panel consume shared owners through contracts/controllers/runtime. | PROVEN | EVD-CONSUMERS |
| OP-RUNTIME | RUNTIME_PATH | OP-ROOT | Canonical runtime owns selected-profile startup/readiness; mobile/frontend adapters now share one governed profile-readiness contract and candidate checks prevent drift. | PROVEN | EVD-RUNTIME-DEPENDENCIES |
| OP-GOVERNANCE | GOVERNANCE | OP-ROOT | Product Truth states, manifests, maps, guards and CI are evidence/accounting layers and cannot self-grant runtime or protected acceptance. | PROVEN | EVD-PRODUCT-LIFECYCLE |

## Root-Cause Graph

| RC | Root cause | Operational parent | Evidence | Depends on | Consumers | Blast / unlock | Priority | Deepening | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| RC-001 | Runtime/readiness/evidence truth was duplicated across independent manifests, maps and preflights instead of derived from one governed contract, allowing both false-ready startup and stale false-not-ready governance. | OP-RUNTIME | EVD-RC-001 | NONE | CON-MOBILE,CON-CONTROL,CON-DSH-GOV | Unlocks truthful startup/readiness for all mobile surfaces and removes a systemic source of readiness drift across DSH/runtime governance. | 1 | DEEPENED_ENOUGH_TO_RANK | READY |
| RC-002 | Protected Product/QA/Security/Finance acceptance remains intentionally independent for several critical capabilities; engineering cannot self-promote those lifecycle states even when implementation exists. | OP-GOVERNANCE | EVD-RC-002 | NONE | CON-ALL-SURFACES | Bounds final closure and prevents false product acceptance; not an executable engineering root until independent authorities act. | 2 | PROVEN_CANNOT_OUTRANK | DEPENDENT |
| RC-003 | The DSH workspace package remains an explicit legacy mixed web/mobile dependency quarantine, retaining native dependencies at a shared service root until exact consumer migration/build proof exists. | OP-DSH | EVD-RC-003 | RC-001 | CON-MOBILE,CON-CONTROL | Removing the quarantine would improve platform boundaries, but its own guard forbids deletion until package-specific approval and exact native evidence prove consumer migration. | 3 | DEEPENED_ENOUGH_TO_RANK | DEPENDENT |

## Ledger

| Type | ID | RC | Relation / claim | Status | Evidence |
|---|---|---|---|---|---|
| FINDING | FND-MOBILE-FALSE-READY | RC-001 | Mobile declared identity,workforce,dsh,wlt,media profiles but fast-path readiness checked only Identity readiness plus Workforce/DSH liveness, so WLT or MinIO could be down while startup was considered ready. | RESOLVED | EVD-IMPLEMENTATION |
| FINDING | FND-FRONTEND-READINESS-DUP | RC-001 | Frontend binding preflight independently hard-coded DSH/Identity and accepted HTTP success without validating owner readiness status. | RESOLVED | EVD-IMPLEMENTATION |
| FINDING | FND-DSH-READINESS-CONFLICT | RC-001 | DSH service manifest manually reported backendRuntimeReady/databaseReady true while runtime evidence map had no current-candidate proof. | RESOLVED | EVD-IMPLEMENTATION |
| FINDING | FND-DSH-EVIDENCE-STALE | RC-001 | DSH runtime map referenced historical services/dsh/evidence paths absent on the exact task ref. | RESOLVED | EVD-IMPLEMENTATION |
| FINDING | FND-PROTECTED-ACCEPTANCE | RC-002 | Identity and multiple product contracts remain DISCOVERY/PENDING because schema requires independent PM/PO/Product acceptance that engineering cannot self-issue. | RESOLVED | EVD-RC-002 |
| FINDING | FND-FINANCE-DOC-LAG | RC-002 | Finance Product Truth describes legacy destination/COD gaps, while exact live code already retires beneficiary destination mutations and implements order-specific atomic COD reservation; remaining closure requires same-candidate runtime/protected evidence rather than speculative financial rewrites. | RESOLVED | EVD-FINANCE-DEEPENING |
| FINDING | FND-DSH-MIXED-PACKAGE | RC-003 | @bthwani/dsh is explicitly LEGACY_MIXED_PACKAGE_QUARANTINE with active/review-pending native dependency ownership and deletionAuthorized=false. | RESOLVED | EVD-RC-003 |
| DECISION | DEC-READINESS-OWNER | RC-001 | One runtime-readiness contract owns profile/path/status semantics; mobile/frontend consume it and the mobile runtime contract cross-checks the canonical runtime implementation/environment. | RESOLVED | EVD-IMPLEMENTATION |
| DECISION | DEC-PROTECTED-APPROVAL | RC-002 | Do not alter protected approvals or promote Product Truth lifecycle without independent authority; treat them as explicit closure dependencies. | RESOLVED | EVD-RC-002 |
| DEPENDENCY | DEP-PROTECTED-APPROVALS | RC-002 | Independent Product/QA/Security/Finance/Release acceptance remains external to engineering execution. | DISPOSITIONED | EVD-RC-002 |
| DEPENDENCY | DEP-RUNTIME-EVIDENCE | RC-001 | Runtime claims require same-candidate runtime evidence; static checks alone cannot close runtime readiness. | DISPOSITIONED | EVD-VERIFICATION-PLAN |
| DEPENDENCY | DEP-NATIVE-BUILD | RC-003 | DSH native quarantine removal requires exact consumer, lockfile, Metro/typecheck and fresh native-build evidence plus package-specific deletion authorization. | DISPOSITIONED | EVD-RC-003 |
| CONSUMER | CON-MOBILE | RC-001 | app-client, app-partner, app-captain and app-field share apps/mobile runtime bootstrap. | RESOLVED | EVD-CONSUMERS |
| CONSUMER | CON-CONTROL | RC-001 | control-panel and frontend development depend on trustworthy owner-service readiness before binding/runtime verification. | RESOLVED | EVD-CONSUMERS |
| CONSUMER | CON-DSH-GOV | RC-001 | DSH service manifest, capability/runtime/surface maps and governance guards consume readiness/evidence semantics. | RESOLVED | EVD-CONSUMERS |
| CONSUMER | CON-ALL-SURFACES | RC-002 | Protected product acceptance affects every required surface in capability-specific Product Truth contracts. | RESOLVED | EVD-PRODUCT-LIFECYCLE |
| SCOPE_DELTA | SCOPE-READINESS-CONTRACT | RC-001 | Added canonical runtime-readiness contract and migrated mobile/frontend readiness consumers; DSH manifest/runtime evidence accounting now fails closed. | RESOLVED | EVD-IMPLEMENTATION |
| LOWER_LAYER | LOW-FINANCE-LEGACY-ROUTES | RC-002 | Early finance Product Truth symptoms were held and then dispositioned after exact-ref routes/tests proved beneficiary destination mutation retirement and atomic COD reservation. | DISPOSITIONED | EVD-FINANCE-DEEPENING |
| LOWER_LAYER | LOW-MAPS-RUNTIME-FLAG | RC-001 | Maps Product Truth says code complete while DSH flags remained FIX_REQUIRED/runtimeBound false; treated as readiness/evidence drift, not maps rewrite authority. | PROMOTED | EVD-IMPLEMENTATION |
| CLEANUP | CLN-DUPLICATE-READINESS | RC-001 | Duplicate mobile/frontend readiness endpoint/status ownership replaced by the governed runtime-readiness contract plus drift test. | DONE | EVD-IMPLEMENTATION |
| CLEANUP | CLN-STALE-DSH-EVIDENCE-REFS | RC-001 | Nonexistent historical DSH evidence paths removed from runtime truth; candidate evidence now starts at NONE. | DONE | EVD-IMPLEMENTATION |
| CLEANUP | CLN-DSH-NATIVE-QUARANTINE | RC-003 | Native quarantine cannot be removed safely without the exact native-build/package-specific evidence required by its owner guard. | PLANNED | EVD-RC-003 |

## Frontier

| Work | RC | Depends on | Blocks / unlocks | Conflict | Owner | Parallel | State | Evidence |
|---|---|---|---|---|---|---|---|---|
| WORK-001 | RC-001 | NONE | Establish one governed profile-readiness source for mobile/frontend and close the mobile false-ready path. | runtime-readiness-contract | integration-owner | NO | COMPLETE | EVD-IMPLEMENTATION |
| WORK-002 | RC-001 | WORK-001 | Reconcile DSH service/runtime readiness and remove nonexistent historical evidence-path authority without fabricating runtime PASS. | dsh-readiness-accounting | integration-owner | NO | COMPLETE | EVD-IMPLEMENTATION |
| WORK-003 | RC-003 | WORK-002 | Re-evaluate DSH shared-root native quarantine; removal is blocked until exact native-build/package-specific deletion evidence exists. | dsh-package-boundary | integration-owner | NO | BLOCKED | EVD-RC-003 |

## Evidence

| Evidence | Claim | Check / source | Candidate | Environment | Result | Limits / invalidates on |
|---|---|---|---|---|---|---|
| EVD-ROOT | Unified platform Operational Root, actors, ownership and cross-surface outcomes are defined. | governance/product/PRD.md + governance/product/platform-model.yaml + product contracts on exact task ref | BASE_SHA | repository | PASS | Invalidated by product ownership/context model change. |
| EVD-NEGATIVE-SPACE | Bounded material coverage includes all five apps, DSH/WLT, Identity/Workforce/Platform/Providers, data/contracts/runtime/governance and protected closure dependencies. | exact task tree and top-level apps/services/core/governance inventories | BASE_SHA | repository | PASS | Does not prove runtime behavior; invalidated by scope/tree authority change. |
| EVD-ADVERSARIAL | Cross-checked product documents against live finance/runtime code; stale document statements were not accepted as execution authority and contradictory readiness states were challenged. | exact-ref finance routes/tests, COD reservation, DSH manifest/runtime map, Product Truth schema | BASE_SHA | repository | PASS | Invalidated by relevant code/product-contract changes. |
| EVD-VERIFICATION-PLAN | Verification requires mobile runtime contracts, service-manifest guard, affected tests, same-candidate CI and runtime/native evidence before corresponding closure claims. | package.json governed commands + full-verification-policy.json + runtime.ps1 | BASE_SHA | repository | PASS | Static verification alone cannot satisfy runtime/product/protected acceptance. |
| EVD-RUNTIME-DEPENDENCIES | Runtime readiness definitions and mobile/frontend consumers are now governed by one contract, with runtime implementation drift checked statically. | infra/docker/runtime-readiness.contract.json + apps/mobile/ensure-mobile-dev-runtime.ps1 + tools/scripts/check-frontend-binding-readiness.mjs + apps/mobile/test-mobile-runtime-contract.mjs | TASK_HEAD | repository | MISSING | Requires CI/execution proof on exact Task HEAD. |
| EVD-DSH-READINESS | DSH runtime evidence starts at NONE; manifest readiness is derived from runtime map and service-manifest guard forbids historical paths/manual true readiness. | services/dsh/runtime-map.ts + services/dsh/service.manifest.ts + tools/guards/service-manifest-drift-gate.mjs | TASK_HEAD | repository | MISSING | Requires type/guard/CI proof; no runtime PASS is inferred. |
| EVD-PRODUCT-LIFECYCLE | Product Truth schema binds lifecycle promotion to independent approvals; several critical contracts remain PENDING/DISCOVERY. | governance/product/product-truth.schema.json + identity/finance/platform Product Truth contracts | BASE_SHA | repository | PASS | Engineering cannot convert this into protected approval. |
| EVD-FINANCE-DEEPENING | Live finance code retires legacy beneficiary payout destination mutations, keeps finance-owned destination governance and implements atomic order-specific COD reservation. | payout_finance_routes.go + representative_finance_routes.go + retired_financial_routes_test.go + cod/reservation.go | BASE_SHA | repository | PASS | Does not replace same-candidate DB/runtime/finance-control review. |
| EVD-RC-001 | Duplicate readiness ownership caused false-ready mobile startup and contradictory DSH readiness accounting; root treatment is implemented pending exact-candidate verification. | readiness contract + migrated consumers + derived DSH readiness + guard | TASK_HEAD | repository | MISSING | Must PASS on exact Task HEAD before RC-001 can be RESOLVED. |
| EVD-RC-002 | Protected acceptance is a real external dependency and cannot be outranked as executable engineering work. | product-truth.schema.json + Identity/finance contract owners/unknowns | BASE_SHA | repository | PASS | Changes only with independent authority/evidence. |
| EVD-RC-003 | DSH native dependency inventory guard requires deletionAuthorized=false until package-specific closure evidence; active/review-pending consumers make blind cleanup unsafe. | services/dsh/package.json + tools/guards/dsh-native-dependency-inventory-gate.mjs | BASE_SHA | repository | PASS | Native-build/consumer evidence is still missing. |
| EVD-CONSUMERS | Readiness treatment touches shared mobile/bootstrap, frontend preflight and DSH governance consumers without changing Product semantics. | exact task diff + consumer inventory | TASK_HEAD | repository | MISSING | Must be re-proven after final implementation write. |
| EVD-IMPLEMENTATION | WORK-001/WORK-002 root treatment and cleanup are implemented on the task branch. | exact task diff | TASK_HEAD | repository | MISSING | Requires affected CI/type/guard verification; invalidated by source write. |
| EVD-CLEANUP | Duplicate readiness ownership and stale DSH evidence references are removed; native quarantine remains explicitly blocked, not silently dropped. | exact task diff + DSH native inventory policy | TASK_HEAD | repository | MISSING | Overall cleanup cannot PASS while CLN-DSH-NATIVE-QUARANTINE remains open. |
| EVD-VERIFICATION | Exact-candidate verification has not run yet. | GitHub PR CI/runtime evidence | TASK_HEAD | repository | MISSING | Required before integration. |

## Closure

- Integration head: SELF
- Final candidate: SELF
- Verification: OPEN — exact Task HEAD CI not yet run.
- Runtime/product evidence: OPEN — runtime/native/protected acceptance evidence remains required by scope.
- Cleanup: PARTIAL — readiness/evidence cleanup done; native quarantine remains governed and blocked on proof.
- Governance: OPEN — same-candidate governance gates pending.
- Final adversarial: OPEN — must rerun after CI and latest-A reconciliation.
