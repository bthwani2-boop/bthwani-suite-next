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
| OP-RUNTIME | RUNTIME_PATH | OP-ROOT | Canonical runtime owns selected-profile startup/readiness, while mobile and frontend preflights duplicate only subsets of that readiness truth. | PROVEN | EVD-RUNTIME-DEPENDENCIES |
| OP-GOVERNANCE | GOVERNANCE | OP-ROOT | Product Truth states, manifests, maps, guards and CI are evidence/accounting layers and cannot self-grant runtime or protected acceptance. | PROVEN | EVD-PRODUCT-LIFECYCLE |

## Root-Cause Graph

| RC | Root cause | Operational parent | Evidence | Depends on | Consumers | Blast / unlock | Priority | Deepening | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| RC-001 | Runtime/readiness/evidence truth is duplicated across independent manifests, maps and preflights instead of derived from one canonical readiness contract, allowing both false-ready startup and stale false-not-ready governance. | OP-RUNTIME | EVD-RC-001 | NONE | CON-MOBILE,CON-CONTROL,CON-DSH-GOV | Unlocks truthful startup/readiness for all mobile surfaces and removes a systemic source of readiness drift across DSH/runtime governance. | 1 | DEEPENED_ENOUGH_TO_RANK | READY |
| RC-002 | Protected Product/QA/Security/Finance acceptance remains intentionally independent for several critical capabilities; engineering cannot self-promote those lifecycle states even when implementation exists. | OP-GOVERNANCE | EVD-RC-002 | NONE | CON-ALL-SURFACES | Bounds final closure and prevents false product acceptance; not an executable engineering root until independent authorities act. | 2 | PROVEN_CANNOT_OUTRANK | DEPENDENT |
| RC-003 | The DSH workspace package remains an explicit legacy mixed web/mobile dependency quarantine, retaining native dependencies at a shared service root until exact consumer migration/build proof exists. | OP-DSH | EVD-RC-003 | RC-001 | CON-MOBILE,CON-CONTROL | Removing the quarantine would improve platform boundaries and dependency ownership, but blind removal can break Metro/native consumers and therefore follows stronger readiness/evidence truth. | 3 | DEEPENED_ENOUGH_TO_RANK | DEPENDENT |

## Ledger

| Type | ID | RC | Relation / claim | Status | Evidence |
|---|---|---|---|---|---|
| FINDING | FND-MOBILE-FALSE-READY | RC-001 | Mobile declares identity,workforce,dsh,wlt,media profiles but fast-path readiness checks only Identity readiness plus Workforce/DSH liveness, so WLT or MinIO can be down while startup is considered ready. | RESOLVED | EVD-RC-001 |
| FINDING | FND-FRONTEND-READINESS-DUP | RC-001 | Frontend binding preflight independently hard-codes only DSH and Identity while describing itself as an all-backend readiness check. | RESOLVED | EVD-RC-001 |
| FINDING | FND-DSH-READINESS-CONFLICT | RC-001 | DSH service manifest reports backendRuntimeReady/databaseReady true while runtime map hard-codes every capability databaseReady false, screensReady false and experience-fix-required. | RESOLVED | EVD-DSH-READINESS |
| FINDING | FND-DSH-EVIDENCE-STALE | RC-001 | DSH runtime map references historical services/dsh/evidence paths that are absent on the exact task ref and cannot prove current-candidate runtime readiness. | RESOLVED | EVD-DSH-READINESS |
| FINDING | FND-PROTECTED-ACCEPTANCE | RC-002 | Identity and multiple product contracts remain DISCOVERY/PENDING because schema requires independent PM/PO/Product acceptance that engineering cannot self-issue. | RESOLVED | EVD-RC-002 |
| FINDING | FND-FINANCE-DOC-LAG | RC-002 | Finance Product Truth describes legacy destination/COD gaps, while exact live code already retires beneficiary destination mutations and implements order-specific atomic COD reservation; remaining closure requires same-candidate runtime/protected evidence rather than speculative financial rewrites. | RESOLVED | EVD-FINANCE-DEEPENING |
| FINDING | FND-DSH-MIXED-PACKAGE | RC-003 | @bthwani/dsh is explicitly LEGACY_MIXED_PACKAGE_QUARANTINE with native dependencies and migration targets; some consumers remain active or review-pending. | RESOLVED | EVD-RC-003 |
| DECISION | DEC-READINESS-OWNER | RC-001 | Derive runtime profile readiness from one cross-tool contract; runtime, mobile and frontend preflight consume it rather than owning endpoint/status literals independently. | RESOLVED | EVD-RC-001 |
| DECISION | DEC-PROTECTED-APPROVAL | RC-002 | Do not alter protected approvals or promote Product Truth lifecycle without independent authority; treat them as explicit closure dependencies. | RESOLVED | EVD-RC-002 |
| DEPENDENCY | DEP-PROTECTED-APPROVALS | RC-002 | Independent Product/QA/Security/Finance/Release acceptance remains external to engineering execution. | DISPOSITIONED | EVD-RC-002 |
| DEPENDENCY | DEP-RUNTIME-EVIDENCE | RC-001 | Runtime claims require same-candidate runtime evidence; static checks alone cannot close runtime readiness. | DISPOSITIONED | EVD-VERIFICATION-PLAN |
| CONSUMER | CON-MOBILE | RC-001 | app-client, app-partner, app-captain and app-field share apps/mobile runtime bootstrap. | RESOLVED | EVD-CONSUMERS |
| CONSUMER | CON-CONTROL | RC-001 | control-panel and frontend development depend on trustworthy owner-service readiness before binding/runtime verification. | RESOLVED | EVD-CONSUMERS |
| CONSUMER | CON-DSH-GOV | RC-001 | DSH service manifest, capability/runtime/surface maps and governance guards consume readiness/evidence semantics. | RESOLVED | EVD-DSH-READINESS |
| CONSUMER | CON-ALL-SURFACES | RC-002 | Protected product acceptance affects every required surface in capability-specific Product Truth contracts. | RESOLVED | EVD-PRODUCT-LIFECYCLE |
| SCOPE_DELTA | SCOPE-READINESS-CONTRACT | RC-001 | Add one canonical runtime-readiness contract and migrate duplicate profile readiness consumers to it. | RESOLVED | EVD-VERIFICATION-PLAN |
| LOWER_LAYER | LOW-FINANCE-LEGACY-ROUTES | RC-002 | Early finance Product Truth symptoms were held and then dispositioned after exact-ref routes/tests proved beneficiary destination mutation retirement and atomic COD reservation. | DISPOSITIONED | EVD-FINANCE-DEEPENING |
| LOWER_LAYER | LOW-MAPS-RUNTIME-FLAG | RC-001 | Maps Product Truth says code complete while DSH extension flags remain FIX_REQUIRED/runtimeBound false; treated as readiness/evidence drift, not a maps rewrite authority. | PROMOTED | EVD-DSH-READINESS |
| CLEANUP | CLN-DUPLICATE-READINESS | RC-001 | Remove duplicated endpoint/status ownership after all consumers use the canonical readiness contract. | PLANNED | EVD-VERIFICATION-PLAN |
| CLEANUP | CLN-STALE-DSH-EVIDENCE-REFS | RC-001 | Remove or replace nonexistent historical DSH evidence path declarations; historical documentation must not masquerade as current runtime evidence. | PLANNED | EVD-VERIFICATION-PLAN |
| CLEANUP | CLN-DSH-NATIVE-QUARANTINE | RC-003 | Migrate/remove quarantined shared-root native dependencies only after exact consumer and native build evidence. | PLANNED | EVD-VERIFICATION-PLAN |

## Frontier

| Work | RC | Depends on | Blocks / unlocks | Conflict | Owner | Parallel | State | Evidence |
|---|---|---|---|---|---|---|---|---|
| WORK-001 | RC-001 | NONE | Establish one profile readiness source for runtime/mobile/frontend and close the mobile false-ready path. | runtime-readiness-contract | integration-owner | NO | READY | EVD-VERIFICATION-PLAN |
| WORK-002 | RC-001 | WORK-001 | Reconcile DSH service/runtime/surface readiness and remove nonexistent historical evidence-path authority without fabricating runtime PASS. | dsh-readiness-accounting | integration-owner | NO | WAITING | EVD-VERIFICATION-PLAN |
| WORK-003 | RC-003 | WORK-002 | Re-evaluate DSH shared-root native quarantine against exact consumers; migrate only proven-safe ownership deltas and retain active bridges. | dsh-package-boundary | integration-owner | NO | WAITING | EVD-VERIFICATION-PLAN |

## Evidence

| Evidence | Claim | Check / source | Candidate | Environment | Result | Limits / invalidates on |
|---|---|---|---|---|---|---|
| EVD-ROOT | Unified platform Operational Root, actors, ownership and cross-surface outcomes are defined. | governance/product/PRD.md + governance/product/platform-model.yaml + product contracts on exact task ref | BASE_SHA | repository | PASS | Invalidated by product ownership/context model change. |
| EVD-NEGATIVE-SPACE | Bounded material coverage includes all five apps, DSH/WLT, Identity/Workforce/Platform/Providers, data/contracts/runtime/governance and protected closure dependencies. | exact task tree and top-level apps/services/core/governance inventories | BASE_SHA | repository | PASS | Does not prove runtime behavior; invalidated by scope/tree authority change. |
| EVD-ADVERSARIAL | Cross-checked product documents against live finance/runtime code; stale document statements were not accepted as execution authority and contradictory readiness states were challenged. | exact-ref finance routes/tests, COD reservation, DSH manifest/runtime map, Product Truth schema | BASE_SHA | repository | PASS | Invalidated by relevant code/product-contract changes. |
| EVD-VERIFICATION-PLAN | Verification will require mobile Expo guard/contracts, governance/service-manifest guards, affected tests, same-candidate CI and runtime smoke for runtime claims before closure. | package.json governed commands + full-verification-policy.json + runtime.ps1 | BASE_SHA | repository | PASS | Static verification alone cannot satisfy runtime/product/protected acceptance. |
| EVD-RUNTIME-DEPENDENCIES | Canonical runtime checks Identity/Workforce/WLT/DSH/Providers/Platform/MinIO by selected profiles, while mobile preflight duplicates only a subset. | infra/docker/scripts/runtime.ps1 + apps/mobile/ensure-mobile-dev-runtime.ps1 | BASE_SHA | repository | PASS | Invalidated by runtime profile/readiness contract change. |
| EVD-DSH-READINESS | DSH readiness sources conflict and runtime map carries non-current historical evidence references with hard-coded negative readiness. | services/dsh/service.manifest.ts + services/dsh/runtime-map.ts + capability-map/extensions + surface-map.ts + exact directory absence | BASE_SHA | repository | PASS | No current runtime PASS is inferred from this static evidence. |
| EVD-PRODUCT-LIFECYCLE | Product Truth schema binds lifecycle promotion to independent approvals; several critical contracts remain PENDING/DISCOVERY. | governance/product/product-truth.schema.json + identity/finance/platform Product Truth contracts | BASE_SHA | repository | PASS | Engineering cannot convert this into protected approval. |
| EVD-FINANCE-DEEPENING | Live finance code retires legacy beneficiary payout destination mutations, keeps finance-owned destination governance and implements atomic order-specific COD reservation. | payout_finance_routes.go + representative_finance_routes.go + retired_financial_routes_test.go + cod/reservation.go | BASE_SHA | repository | PASS | Does not replace same-candidate DB/runtime/finance-control review. |
| EVD-RC-001 | Duplicate readiness ownership causes false-ready mobile startup and contradictory DSH readiness accounting. | runtime.ps1 + ensure-mobile-dev-runtime.ps1 + check-frontend-binding-readiness.mjs + DSH manifest/runtime map | BASE_SHA | repository | PASS | Must be re-proven after cutover. |
| EVD-RC-002 | Protected acceptance is a real external dependency and cannot be outranked as executable engineering work. | product-truth.schema.json + Identity/finance contract owners/unknowns | BASE_SHA | repository | PASS | Changes only with independent authority/evidence. |
| EVD-RC-003 | DSH root contains an explicit mixed-package native dependency quarantine with active/review-pending consumers. | services/dsh/package.json x-bthwani-platform-boundary | BASE_SHA | repository | PASS | Removal requires exact consumer, lockfile, Metro/typecheck/native-build proof. |
| EVD-CONSUMERS | Shared runtime/readiness changes affect all mobile apps and governance/readiness consumers. | apps inventory + apps/mobile shared launcher + DSH service maps | BASE_SHA | repository | PASS | Invalidated by consumer ownership changes. |

## Closure

- Integration head: SELF
- Final candidate: SELF
- Verification:
- Runtime/product evidence:
- Cleanup:
- Governance:
- Final adversarial:
