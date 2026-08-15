# Bthwani Task Package

SCHEMA: BTHWANI_PACKAGE_V5
TASK_ID: system-root-v5-20260815-211414
TARGET: كل الوركسبايس
MODE: EXECUTE_END_TO_END
INTEGRATION_BRANCH: A
TASK_BRANCH: task/v5-system-root-20260815-211414
BASE_SHA: babc873b6b2e712efbe082e37d1bcec977fc3d8d
LATEST_RECONCILED_SHA: babc873b6b2e712efbe082e37d1bcec977fc3d8d
ROOT: كل الوركسبايس
INTEGRATION_OWNER: codex
RUNTIME_REQUIRED: YES

## Operational Coverage

| Node | Kind | Parent | Claim | Status | Evidence |
|---|---|---|---|---|---|
| OP-ROOT | SYSTEM_ROOT | ROOT | Unified multi-surface operational truth across client, partner, captain, field, control-panel, DSH, WLT, contracts, persistence, runtime, and evidence | PROVEN | EVD-ROOT |
| OP-AUTHORITY | AUTHORITY_BOUNDARY | OP-ROOT | Identity, Workforce, DSH, WLT, and Platform Control have distinct owners and trusted contexts | PROVEN | EVD-PRD-WLT |
| OP-FIELD-FINANCE | MATERIAL_JOURNEY | OP-AUTHORITY | Field finance readback and payout-request journey must remain WLT-backed, read-only for destination master data, and server-authorized | PROVEN | EVD-PRD-WLT,EVD-FIELD-CONTRACT |
| OP-CONTRACT-BINDING | CROSS_LAYER_HANDOFF | OP-FIELD-FINANCE | DSH OpenAPI, Go routes, generated clients, frontend consumers, and canonical readback must agree | PROVEN | EVD-FIELD-CONTRACT,EVD-BACKEND-BINDING |
| OP-EVIDENCE-CHAIN | GOVERNANCE_VERIFICATION | OP-CONTRACT-BINDING | Foundation, journey, binding, parser, registry, migration, and cleanup guards must produce trustworthy candidate-bound evidence | PROVEN | EVD-FOUNDATION,EVD-FRONTEND-BINDING,EVD-RUNTIME-NAMING,EVD-PARSER |
| OP-CI-GOVERNANCE | GOVERNANCE_CONTROL | OP-EVIDENCE-CHAIN | CI policy must execute the registered governance, branch-safety, hygiene, and portability controls | PROVEN | EVD-CI-GOVERNANCE |
| OP-SURFACE-INVARIANTS | SURFACE_INVARIANT | OP-ROOT | Required multi-surface UI code must use the canonical UI-kit token boundary | PROVEN | EVD-UI-BOUNDARY |

## Root-Cause Graph

| RC | Root cause | Operational parent | Evidence | Depends on | Consumers | Blast / unlock | Priority | Deepening | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| RC-001 | DSH field-finance contract reintroduced duplicate/unimplemented destination routes that exceed the canonical WLT-backed read-only field capability | OP-CONTRACT-BINDING | EVD-FIELD-CONTRACT,EVD-PRD-WLT,EVD-BACKEND-BINDING | NONE | CON-DSH-CONTRACT,CON-DSH-GENERATED,CON-FIELD-FINANCE | Removes unreachable/forbidden financial surface and restores one canonical field readback path | 1 | DEEPENED_ENOUGH_TO_RANK | RESOLVED |
| RC-002 | OpenAPI binding guard parser ignores inline flow-style `parameters: [{...}]` arrays and reports valid onboarding path parameters as missing | OP-EVIDENCE-CHAIN | EVD-PARSER,EVD-BACKEND-BINDING | NONE | CON-BACKEND-GUARD | Restores trustworthy backend-contract evidence and prevents false route findings across the workspace | 2 | DEEPENED_ENOUGH_TO_RANK | RESOLVED |
| RC-003 | Frontend static binding registry retains deleted screen paths and stale controller edges after surface refactors | OP-CONTRACT-BINDING | EVD-FRONTEND-BINDING,EVD-FRONTEND-SOURCES | NONE | CON-FRONTEND-REGISTRY,CON-FRONTEND-SURFACES | Restores static coverage for checkout, order, captain, and field surfaces without creating parallel UI truth | 3 | DEEPENED_ENOUGH_TO_RANK | RESOLVED |
| RC-004 | Foundation test harness imports `fileURLToPath` from `node:path`, so the registered source-integrity test cannot instantiate on the supported Node runtime | OP-EVIDENCE-CHAIN | EVD-FOUNDATION,EVD-SOURCE-TEST | NONE | CON-FOUNDATION-GATE | Unlocks the full foundation guard chain and same-candidate governance evidence | 4 | DEEPENED_ENOUGH_TO_RANK | RESOLVED |
| RC-005 | Runtime real-bindings filename rule only accepts three-digit migration sequences although active DSH migrations use four-digit immutable sequence numbers | OP-EVIDENCE-CHAIN | EVD-RUNTIME-NAMING,EVD-MIGRATION-MANIFEST | NONE | CON-RUNTIME-GUARD,CON-DSH-MIGRATIONS | Makes static runtime-binding evidence reflect the immutable migration history without renaming applied migrations | 5 | DEEPENED_ENOUGH_TO_RANK | RESOLVED |
| RC-006 | CI policy workflow omitted required governance, direct-work, repository-hygiene, and portable-config execution markers enforced by the canonical guard registry | OP-CI-GOVERNANCE | EVD-CI-BASELINE,EVD-CI-GOVERNANCE | NONE | CON-CI-GOVERNANCE | Restores executable CI coverage for registered fail-closed governance controls | 6 | DEEPENED_ENOUGH_TO_RANK | RESOLVED |
| RC-007 | UI surfaces contained raw colors and CSS fallbacks outside the canonical UI-kit token boundary, blocking the foundation gate | OP-SURFACE-INVARIANTS | EVD-UI-BASELINE,EVD-UI-BOUNDARY | NONE | CON-UI-SURFACES | Restores token-governed styling across affected client, partner, and control-panel surfaces | 7 | DEEPENED_ENOUGH_TO_RANK | RESOLVED |

## Ledger

| Type | ID | RC | Relation / claim | Status | Evidence |
|---|---|---|---|---|---|
| FINDING | FND-001 | RC-001 | backend-api-binding surfaced two active field payout-destination routes with no Go registration; Product Truth forbids field destination mutation and the canonical `/me` readback already exists | RESOLVED | EVD-FIELD-CONTRACT,EVD-PRD-WLT |
| FINDING | FND-002 | RC-002 | five onboarding path-parameter findings are false positives caused by the guard parser not reading inline parameter arrays; the source contract declares each parameter | RESOLVED | EVD-PARSER,EVD-ONBOARDING-CONTRACT |
| FINDING | FND-003 | RC-003 | frontend-feature-binding surfaced seven stale/missing screen-controller bindings; current source contains replacement routes/screens for the affected journeys | RESOLVED | EVD-FRONTEND-BINDING,EVD-FRONTEND-SOURCES |
| FINDING | FND-004 | RC-004 | foundation gate cannot run its first test because of a standards-invalid Node import; direct source-integrity guard still passes | RESOLVED | EVD-FOUNDATION,EVD-SOURCE-TEST |
| FINDING | FND-005 | RC-005 | runtime-real-bindings rejects eight existing dsh-1000..1007 migrations solely because its filename grammar caps the numeric prefix at three digits | RESOLVED | EVD-RUNTIME-NAMING,EVD-MIGRATION-MANIFEST |
| FINDING | FND-006 | RC-006 | exact origin/A guard-registry check found ci-policy missing nine required execution markers while the registered scripts and policies existed | RESOLVED | EVD-CI-BASELINE,EVD-CI-GOVERNANCE |
| FINDING | FND-007 | RC-007 | exact origin/A foundation sweep found raw color literals/fallbacks across the affected UI surfaces; no token boundary exception applied | RESOLVED | EVD-UI-BASELINE,EVD-UI-BOUNDARY |
| DECISION | DEC-001 | RC-001 | Remove the duplicate field finance collection/item destination paths and the duplicate server registration; retain the canonical `/dsh/field/me/finance/payout-destination` readback and payout-request flow | RESOLVED | EVD-PRD-WLT,EVD-FIELD-CONTRACT |
| DECISION | DEC-002 | RC-002 | Extend the parser and its regression tests to understand both block-style and inline flow-style OpenAPI parameters; do not weaken the binding gate | RESOLVED | EVD-PARSER,EVD-VERIFICATION-PLAN |
| DECISION | DEC-003 | RC-003 | Reconcile the registry to actual canonical screens/controllers and preserve the existing shared controller ownership where reachable | RESOLVED | EVD-FRONTEND-BINDING,EVD-FRONTEND-SOURCES |
| DECISION | DEC-004 | RC-006 | Add executable workflow steps for every marker required by guard-registry, preserving read-only and fail-closed policy semantics | RESOLVED | EVD-CI-GOVERNANCE |
| DECISION | DEC-005 | RC-007 | Replace raw UI colors with existing colorRoles/alpha tokens and remove CSS fallback literals; do not add a new design-system layer | RESOLVED | EVD-UI-BOUNDARY |
| DEPENDENCY | DEP-001 | RC-001 | Contract edits require deterministic OpenAPI materialization and generated-client/readback verification | RESOLVED | EVD-VERIFICATION-PLAN |
| DEPENDENCY | DEP-002 | RC-002 | Parser changes require guard unit/regression evidence before re-running backend binding | RESOLVED | EVD-VERIFICATION-PLAN |
| CONSUMER | CON-DSH-CONTRACT | RC-001 | DSH modular OpenAPI and bundled contract | RESOLVED | EVD-FIELD-CONTRACT |
| CONSUMER | CON-DSH-GENERATED | RC-001 | DSH generated client and downstream contract consumers | RESOLVED | EVD-FIELD-CONTRACT |
| CONSUMER | CON-FIELD-FINANCE | RC-001 | Field finance surface and WLT-backed DSH BFF readback | RESOLVED | EVD-PRD-WLT,EVD-FIELD-CONTRACT |
| CONSUMER | CON-BACKEND-GUARD | RC-002 | backend-api-binding guard and its contract parser | RESOLVED | EVD-PARSER,EVD-BACKEND-BINDING |
| CONSUMER | CON-FRONTEND-REGISTRY | RC-003 | frontend-binding-registry static evidence | RESOLVED | EVD-FRONTEND-BINDING |
| CONSUMER | CON-FRONTEND-SURFACES | RC-003 | app-client, app-partner, app-captain, and app-field screen composition | RESOLVED | EVD-FRONTEND-SOURCES |
| CONSUMER | CON-FOUNDATION-GATE | RC-004 | run-foundation-gate.ps1 source-integrity test stage | RESOLVED | EVD-FOUNDATION |
| CONSUMER | CON-RUNTIME-GUARD | RC-005 | runtime-real-bindings-gate filename validation | RESOLVED | EVD-RUNTIME-NAMING |
| CONSUMER | CON-DSH-MIGRATIONS | RC-005 | immutable DSH migration history dsh-1000 through dsh-1007 | RESOLVED | EVD-MIGRATION-MANIFEST |
| CONSUMER | CON-CI-GOVERNANCE | RC-006 | .github/workflows/ci-policy.yml and registered governance scripts | RESOLVED | EVD-CI-GOVERNANCE |
| CONSUMER | CON-UI-SURFACES | RC-007 | client, partner, and control-panel UI surfaces scanned by ui-kit-boundary-gate | RESOLVED | EVD-UI-BOUNDARY |
| SCOPE_DELTA | SCOPE-001 | RC-001 | Target is the complete workspace; all required product surfaces and shared/backend/evidence layers are in scope | RESOLVED | EVD-ROOT |
| LOWER_LAYER | LOW-001 | RC-001 | Missing route registration is a technical symptom held under the contract/product-truth contradiction, not a reason to add a new financial handler | DISPOSITIONED | EVD-FIELD-CONTRACT,EVD-PRD-WLT |
| LOWER_LAYER | LOW-002 | RC-002 | Missing path parameters are a parser observation held under evidence-tool logic until source contract lines are compared | DISPOSITIONED | EVD-PARSER,EVD-ONBOARDING-CONTRACT |
| LOWER_LAYER | LOW-003 | RC-004 | Node module-instantiation SyntaxError is a test-harness symptom; source-integrity implementation itself passes | DISPOSITIONED | EVD-SOURCE-TEST,EVD-FOUNDATION |
| CLEANUP | CLN-001 | RC-001 | Remove obsolete field payout-destination collection/item contract entries, duplicate server binding, and regenerated stale client operations | DONE | EVD-CLEANUP |
| CLEANUP | CLN-002 | RC-003 | Remove stale frontend binding registry entries and replace them with current canonical screen/controller paths | DONE | EVD-CLEANUP |
| CLEANUP | CLN-003 | RC-005 | Keep migration files immutable; update only the guard grammar and regression coverage | DONE | EVD-CLEANUP |
| CLEANUP | CLN-004 | RC-006 | Keep one canonical CI policy execution path and remove the previously unexecuted governance gap | DONE | EVD-CLEANUP |
| CLEANUP | CLN-005 | RC-007 | Remove raw-color and CSS-fallback drift from affected surfaces without creating parallel token definitions | DONE | EVD-CLEANUP |

## Frontier

| Work | RC | Depends on | Blocks / unlocks | Conflict | Owner | Parallel | State | Evidence |
|---|---|---|---|---|---|---|---|---|
| WORK-001 | RC-001 | NONE | Canonical field finance contract, DSH route binding, generated clients, and WLT-backed readback | dsh-contract-and-http | codex | NO | COMPLETE | EVD-IMPLEMENTATION,EVD-CONSUMERS,EVD-CLEANUP |
| WORK-002 | RC-002 | NONE | Trustworthy OpenAPI parameter evidence and backend binding gate | openapi-parser-and-tests | codex | NO | COMPLETE | EVD-IMPLEMENTATION,EVD-VERIFICATION |
| WORK-003 | RC-003 | NONE | Static frontend coverage for client/partner/captain/field surfaces | frontend-binding-registry | codex | NO | COMPLETE | EVD-IMPLEMENTATION,EVD-CONSUMERS,EVD-VERIFICATION |
| WORK-004 | RC-004 | NONE | Foundation gate and source-integrity test execution | foundation-test-harness | codex | NO | COMPLETE | EVD-VERIFICATION |
| WORK-005 | RC-005 | NONE | Runtime real-bindings guard evidence for immutable migrations | runtime-binding-guard | codex | NO | COMPLETE | EVD-VERIFICATION |
| WORK-006 | RC-006 | NONE | Executable fail-closed CI governance coverage | ci-policy-governance | codex | NO | COMPLETE | EVD-CI-GOVERNANCE |
| WORK-007 | RC-007 | NONE | Token-governed UI surface styling and foundation closure | ui-token-boundary | codex | NO | COMPLETE | EVD-UI-BOUNDARY,EVD-VERIFICATION |

## Evidence

| Evidence | Claim | Check / source | Candidate | Environment | Result | Limits / invalidates on |
|---|---|---|---|---|---|---|
| EVD-ROOT | System root covers unified product surfaces, authority boundaries, and full-stack owner/readback path | governance/product/PRD.md; governance/GOVERNANCE.md; target-wide repository inventory | BASE | task worktree at babc873b6b2e712efbe082e37d1bcec977fc3d8d | PASS | invalidate on target, owner, or capability-scope change |
| EVD-PRD-WLT | WLT owns payout/destination financial truth; field may read masked current destination and request payout but may not create/update/deactivate/select destination | governance/product/PRD.md; governance/product/contracts/wlt-money-movement-settlement.product-truth.json | BASE | task worktree | PASS | invalidate on Product Truth or financial-owner change |
| EVD-FIELD-CONTRACT | DSH contract contains field destination collection/item operations and their generated bundle/client entries | services/dsh/contracts/dsh.openapi.yaml; services/dsh/contracts/paths/field.paths.yaml; services/dsh/contracts/generated/dsh.bundle.openapi.yaml; services/dsh/clients/generated/dsh-api.ts | BASE | task worktree after canonical materialization | PASS | invalidate on contract or generated-artifact change |
| EVD-BACKEND-BINDING | Journey backend binding scan deterministically reports two unregistered field destination routes and five parameter observations | node tools/guards/backend-api-binding-gate.mjs | BASE | Node 24.17.0, generated artifacts materialized | PASS | invalidate on route/contract/parser change |
| EVD-ONBOARDING-CONTRACT | Onboarding source paths explicitly declare assignmentId parameters in field.paths.yaml | services/dsh/contracts/paths/field.paths.yaml:1104-1184 | BASE | task worktree | PASS | invalidate on onboarding contract change |
| EVD-PARSER | `_openapi-utils.mjs` parses block-style `- name:` parameters but does not consume same-line `parameters: [{ name, in, required }]` arrays | tools/guards/_openapi-utils.mjs; backend-api-binding output; source contract comparison | BASE | Node 24.17.0 | PASS | invalidate on parser or contract syntax change |
| EVD-FRONTEND-BINDING | Static binding scan deterministically reports seven missing/stale screen-controller bindings | node tools/guards/frontend-feature-binding-gate.mjs; governance/guards/frontend-binding-registry.json | BASE | Node 24.17.0, generated artifacts materialized | PASS | invalidate on registry or surface composition change |
| EVD-FRONTEND-SOURCES | Current source has replacement/canonical files for checkout, captain map/pickup, field store history, and surface-specific order controllers | rg --files services/dsh/frontend; source imports in affected screens | BASE | task worktree | PASS | invalidate on screen/controller refactor |
| EVD-FOUNDATION | Foundation gate fails before guard execution at source-integrity-gate.test.mjs module instantiation | pnpm run guard:foundation | BASE | Node 24.17.0, pnpm 10.34.0 | PASS | invalidate on test import or foundation script change |
| EVD-SOURCE-TEST | Test imports fileURLToPath from node:path; direct source-integrity-gate.mjs passes independently | tools/guards/source-integrity-gate.test.mjs:5; node tools/guards/source-integrity-gate.mjs | BASE | Node 24.17.0 | PASS | invalidate on test-harness change |
| EVD-RUNTIME-NAMING | Runtime real-bindings scan rejects dsh-1000 through dsh-1007 filenames as outside a three-digit grammar | node tools/guards/runtime-real-bindings-gate.mjs | BASE | Node 24.17.0 | PASS | invalidate on guard grammar or migration naming change |
| EVD-MIGRATION-MANIFEST | Migration manifest accepts the existing immutable DSH migration sequence and does not require renaming | node tools/guards/migration-manifest-drift-gate.mjs; services/dsh/database/migrations | BASE | Node 24.17.0 | PASS | invalidate on migration manifest/history change |
| EVD-NEGATIVE-SPACE | Foundation/Journey/static guard sweep covered missing routes, stale bindings, generated artifacts, migrations, and evidence tooling; every material observation is ledgered | guard:foundation, guard:journey, targeted binding/migration/runtime guards | BASE | task worktree | PASS | invalidate on scope or guard-set change |
| EVD-ADVERSARIAL | Contract-vs-Product Truth, contract-vs-Go routes, registry-vs-source, and parser-vs-inline-YAML comparisons challenge both implementation and evidence assumptions | current source inspection, Product Truth, history, targeted guards | BASE | task worktree | PASS | invalidate on causal graph change |
| EVD-VERIFICATION-PLAN | Exact candidate verification is defined before writes: targeted tests, contract/binding guards, generated-client materialization, foundation/journey reruns, cleanup check, and final governance/adversarial checks | repository package scripts; V5 execution frontier | BASE | task worktree | PASS | invalidate on solution, scope, or dependency change |
| EVD-CI-BASELINE | Exact origin/A guard-registry evidence identifies missing ci-policy markers for registered governance and branch-safety controls | node tools/guards/guard-registry-gate.mjs on origin/A tree; .github/workflows/ci-policy.yml | BASE | origin/A=babc873b6b2e712efbe082e37d1bcec977fc3d8d | PASS | invalidate on workflow or guard-registry change |
| EVD-UI-BASELINE | Exact origin/A UI boundary evidence identifies raw colors/fallbacks in affected surfaces | node tools/guards/ui-kit-boundary-gate.mjs; origin/A source inspection | BASE | origin/A=babc873b6b2e712efbe082e37d1bcec977fc3d8d | PASS | invalidate on UI boundary or affected source change |
| EVD-CI-GOVERNANCE | CI policy now executes the required governance, direct-work, CI immutability, hygiene, and portability controls | node tools/guards/guard-registry-gate.mjs; node tools/scripts/check-ci-source-immutability.mjs; node tools/scripts/check-portable-tracked-config.mjs; direct-work tests/gate | TASK_HEAD | Node 24.17.0, pnpm 10.34.0, task worktree | PASS | invalidate on workflow, policy, or guard-registry change |
| EVD-UI-BOUNDARY | Affected client, partner, captain, field, and control-panel source passes the canonical raw-color/token boundary | node tools/guards/ui-kit-boundary-gate.mjs | TASK_HEAD | Node 24.17.0, task worktree | PASS | invalidate on affected UI source or token contract change |
| EVD-IMPLEMENTATION | All bounded work units have implementation changes recorded on the isolated task branch | git diff --name-only BASE_SHA..TASK_HEAD; targeted source review | TASK_HEAD | isolated task branch task/v5-system-root-20260815-211414 | PASS | invalidate on any implementation write |
| EVD-CONSUMERS | Contract, generated-client materialization, backend, capability, frontend registry, CI, and UI consumers were reconciled | postinstall-generate-clients; backend/frontend/service-manifest/foundation guards | TASK_HEAD | Node 24.17.0, pnpm 10.34.0 | PASS | invalidate on consumer or generated-contract change |
| EVD-CLEANUP | Obsolete field destination bindings, stale capability operation, stale frontend entries, and token/CI drift are removed or reconciled | rg negative-space checks; cleanup-policy; targeted guard suite | TASK_HEAD | task worktree | PASS | invalidate on cleanup or consumer change |
| EVD-VERIFICATION | Targeted implementation checks and full foundation verification pass on the task candidate | parser test; foundation; all twelve registered static journey guards run directly; targeted boundary/binding/runtime guards | SELF | Node 24.17.0, pnpm 10.34.0, task candidate | PASS | invalidate on any final relevant write |
| EVD-RUNTIME | Candidate-bound runtime/product smoke for WLT-backed financial ownership and affected DSH surfaces | runtime:smoke; runtime:wlt:smoke; runtime:wlt:provider:smoke with local-dsh context and container-provided secrets; WireMock journal | SELF | Docker local runtime, DSH/WLT/Identity/Postgres healthy; migrations sha ac2dd554d3b9f5733fcea353a9210b17df822079 | PASS | invalidate on runtime or candidate change |
| EVD-GOVERNANCE | Final candidate governance, schema, authority, CI-policy, and same-candidate evidence | guard:foundation; guard:governance-all; guard-registry; orchestrator verify | SELF | Node 24.17.0, pnpm 10.34.0, task candidate | PASS | invalidate on final candidate or governance change |
| EVD-FINAL-ADVERSARIAL | Final adversarial checks confirm no obsolete field destination route, stale capability/client/registry edge, parser false negative, or token drift remains | negative-space rg checks; Product Truth comparison; all registered static journey guards | SELF | task candidate | PASS | invalidate on final candidate or root-cause graph change |

## Closure

- Integration head: SELF
- Final candidate: SELF
- Verification: SELF foundation and all twelve registered static journey guards pass
- Runtime/product evidence: SELF DSH, WLT, and provider-through-WLT smoke pass with WireMock readback
- Cleanup: SELF obsolete routes, capability operation, stale registry edges, and token/CI drift reconciled
- Governance: SELF governance, CI policy, authority, and evidence gates pass
- Final adversarial: SELF negative-space and Product Truth ownership checks pass
