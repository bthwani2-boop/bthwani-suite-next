# Bthwani Task Package

SCHEMA: BTHWANI_PACKAGE_V5
TASK_ID: v5-commandn-system-root-de1f700b
TARGET: كل الأسطح والخدمات وكل ما يرتبط بها End-to-End
MODE: EXECUTE_END_TO_END
INTEGRATION_BRANCH: b
TASK_BRANCH: task/v5-commandn-system-root-de1f700b
BASE_SHA: de1f700b94196117c07de6cf5c3131ab4af087b6
LATEST_RECONCILED_SHA: 76506c23bc5149356c98862a8e220f08bf9c97d0
ROOT: كل الأسطح والخدمات وكل ما يرتبط بها End-to-End
INTEGRATION_OWNER: UNASSIGNED
RUNTIME_REQUIRED: YES

## Operational Coverage

| Node | Kind | Parent | Claim | Status | Evidence |
|---|---|---|---|---|---|
| OP-SYSTEM-ROOT | SYSTEM_ROOT | ROOT | Product outcomes, actor boundaries, cross-surface journeys, and canonical operational/financial ownership are reconciled for the target. | PROVEN | EVD-ROOT |
| OP-ACTOR-SURFACES | ACTORS_SURFACES | OP-SYSTEM-ROOT | Operator, partner, captain, field, and customer journeys map to control-panel, partner, captain, field, and client surfaces. | PROVEN | EVD-ROOT |
| OP-DISPATCH-JOURNEY | JOURNEY | OP-SYSTEM-ROOT | DSH owns governed captain dispatch; WLT supplies financial eligibility; Workforce consumes the bounded DSH projection. | PROVEN | EVD-ROOT,EVD-ADVERSARIAL |
| OP-FINANCIAL-HANDOFF | HANDOFF | OP-DISPATCH-JOURNEY | The WLT decision is persisted as a DSH projection and read by Workforce for dispatch readiness without local financial policy. | PROVEN | EVD-ROOT,EVD-RC-001 |
| OP-CONTRACT-BINDING | CONTRACT_BOUNDARY | OP-FINANCIAL-HANDOFF | The implemented DSH internal route, canonical OpenAPI contract, outbound Workforce client, and generated/bound artifacts must agree. | PROVEN | EVD-RC-001 |
| OP-DATA-RUNTIME | DATA_RUNTIME | OP-FINANCIAL-HANDOFF | DSH persistence, WLT integration, service authentication, operator context, runtime configuration, and canonical readback are part of the affected cone. | PROVEN | EVD-ADVERSARIAL |
| OP-FINANCE-MIGRATION | FINANCIAL_MIGRATION | OP-DATA-RUNTIME | The WLT migration source and explicit migration manifest must agree so the funding-rail integrity invariant is discoverable and ordered. | PROVEN | EVD-RC-002 |
| OP-NEGATIVE-SPACE | NEGATIVE_SPACE | OP-SYSTEM-ROOT | Competing financial writers, local Workforce financial policy, silent fallback, and undocumented legacy compatibility paths are challenged in the selected cone. | PROVEN | EVD-NEGATIVE-SPACE |

## Root-Cause Graph

| RC | Root cause | Operational parent | Evidence | Depends on | Consumers | Blast / unlock | Priority | Deepening | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| RC-002 | WLT contains the intended wlt-937 payment-session funding-rail integrity migration, but the current immutable manifest omits it; ordered migration authority and the WLT readiness consumer could not discover or verify the database invariant. | OP-FINANCE-MIGRATION | EVD-RC-002 | NONE | CON-WLT-MANIFEST,CON-WLT-MIGRATION-RUNNER,CON-WLT-READINESS | Restores WLT financial migration discoverability, readiness truth, and unlocks schema, upgrade-path, integrity, and finance evidence. | 1 | DEEPENED_ENOUGH_TO_RANK | READY |
| RC-001 | DSH registers GET /dsh/internal/workforce/captains/{captainId}/financial-eligibility in Go and Workforce calls it, but the canonical DSH runtime OpenAPI contract omits it; backend API binding therefore rejects a live cross-service route. | OP-CONTRACT-BINDING | EVD-RC-001 | RC-002 | CON-DSH-CONTRACT,CON-WORKFORCE-CLIENT | Restores one governed WLT→DSH→Workforce contract boundary and unlocks generated/binding, journey, runtime, and readback verification after the higher-risk migration authority is repaired. | 2 | DEEPENED_ENOUGH_TO_RANK | DEPENDENT |

## Ledger

| Type | ID | RC | Relation / claim | Status | Evidence |
|---|---|---|---|---|---|
| FINDING | FND-MIGRATION-DRIFT | RC-002 | Current WLT migration source is absent from the explicit migration manifest. | DISPOSITIONED | EVD-RC-002 |
| DECISION | DEC-MIGRATION-REGISTER | RC-002 | Register wlt-937 as the next active ordered migration using its exact source hash; do not rewrite historical entries. | RESOLVED | EVD-RC-002 |
| CONSUMER | CON-WLT-MANIFEST | RC-002 | WLT migration manifest must include wlt-937 with ordinal 107 and the exact SHA-256. | RESOLVED | EVD-RC-002 |
| CONSUMER | CON-WLT-MIGRATION-RUNNER | RC-002 | The WLT migration runner consumes the manifest to discover and order migrations. | RESOLVED | EVD-RC-002 |
| CONSUMER | CON-WLT-READINESS | RC-002 | WLT readiness must require the latest active migration from the governed set; the runtime marker now matches wlt-937. | RESOLVED | EVD-VERIFICATION |
| DEPENDENCY | DEP-WLT-FINANCIAL-INVARIANT | RC-002 | The funding-rail/source check must remain WLT-owned and fail closed on contradictory existing rows. | RESOLVED | EVD-ADVERSARIAL |
| SCOPE_DELTA | SCOPE-WLT-MIGRATION | RC-002 | Scope includes manifest integrity and the representative WLT migration/schema verification path; no production migration is run here. | RESOLVED | EVD-RC-002 |
| FINDING | FND-ROUTE-CONTRACT | RC-001 | Implemented DSH route is absent from the canonical runtime contract. | DISPOSITIONED | EVD-RC-001 |
| DECISION | DEC-CONTRACT-OWNER | RC-001 | DSH runtime contract is the authoritative interface; Workforce remains a consumer and WLT remains the financial decision owner. | RESOLVED | EVD-ROOT |
| CONSUMER | CON-DSH-CONTRACT | RC-001 | dsh.openapi.yaml/runtime-extensions contract and registry/bundle must expose the route. | RESOLVED | EVD-RC-001 |
| CONSUMER | CON-WORKFORCE-CLIENT | RC-001 | core/workforce dshclient/client.go depends on the route and response envelope. | RESOLVED | EVD-RC-001 |
| DEPENDENCY | DEP-CONTRACT-GENERATION | RC-001 | Contract composition and canonical generated artifacts must run after the contract cutover. | RESOLVED | EVD-VERIFICATION-PLAN |
| SCOPE_DELTA | SCOPE-DISPATCH-HANDOFF | RC-001 | Scope is the captain dispatch financial-eligibility handoff and its required contract/runtime consumers. | RESOLVED | EVD-ROOT |
| LOWER_LAYER | LOW-MISSING-GENERATED-CLIENTS | RC-001 | Fresh worktree initially lacked generated clients; frozen install plus canonical postinstall generation is setup evidence, not a product root. | DISPOSITIONED | EVD-VERIFICATION-PLAN |
| CLEANUP | CLN-BOUNDARY-DRIFT | RC-001 | Remove the contract/binding drift and ensure no undocumented parallel route remains. | DONE | EVD-CLEANUP |
| CLEANUP | CLN-MIGRATION-DRIFT | RC-002 | Remove the manifest/source divergence without deleting or rewriting the financial migration. | DONE | EVD-CLEANUP |

## Frontier

| Work | RC | Depends on | Blocks / unlocks | Conflict | Owner | Parallel | State | Evidence |
|---|---|---|---|---|---|---|---|---|
| WORK-WLT-MIGRATION-MANIFEST | RC-002 | NONE | WLT migration discovery, ordering, financial integrity, readiness, and journey gate. | wlt-migration-authority | task-owner | NO | COMPLETE | EVD-VERIFICATION |
| WORK-CONTRACT-CUTOVER | RC-001 | WORK-WLT-MIGRATION-MANIFEST | DSH OpenAPI, composed bundle, backend binding, Workforce client, and dispatch readback verification. | dsh-contract-boundary | task-owner | NO | COMPLETE | EVD-VERIFICATION |

## Evidence

| Evidence | Claim | Check / source | Candidate | Environment | Result | Limits / invalidates on |
|---|---|---|---|---|---|---|
| EVD-ROOT | Product outcomes, actor/surface map, DSH/WLT ownership, and the selected operational root are reconciled. | PRD + platform model + Product Truth registry + current implementation map | BASE | repo:b@de1f700b | PASS | Invalidates on authority, product-truth, or baseline change |
| EVD-NEGATIVE-SPACE | Selected dispatch cone has no second financial writer or permitted silent fallback; the undocumented route is not classified as legacy compatibility. | backend route inventory + route classification + WLT/Workforce ownership inspection | BASE | repo:b@de1f700b | PASS | Invalidates on route, writer, compatibility, or consumer change |
| EVD-ADVERSARIAL | WLT decision, DSH projection, Workforce readback, service auth, operator context, expiry, and unavailable/invalid decision paths are challenged. | captain-dispatch Product Truth + DSH/WLT/Workforce implementation/tests | BASE | repo:b@de1f700b | PASS | Invalidates on state, authority, contract, or failure-path change |
| EVD-VERIFICATION-PLAN | Verification is defined before writes across contract composition, binding, generated artifacts, backend, data, runtime, security, readback, and adversarial paths. | V5 package verification plan and repository guard/runtime commands | BASE | task branch | PASS | Invalidates on root, solution, scope, or environment change |
| EVD-RC-001 | The live DSH Go route and Workforce outbound client exist, while the canonical DSH OpenAPI runtime contract lacks the route. | backend-api-binding-gate + route/contract/client inspection | BASE | repo:b@de1f700b | PASS | Invalidates on route or contract change |
| EVD-RC-002 | The current WLT migration source exists with an exact SHA, while the immutable manifest omits it; history confirms registration was intentionally added then removed by the baseline restore. | migration-manifest-drift-gate + manifest/source hash + current Git history | BASE | repo:b@de1f700b | PASS | Invalidates on migration source, manifest, or migration-policy change |
| EVD-IMPLEMENTATION | DSH canonical contract route, WLT migration manifest registration, and WLT readiness consumer are implemented on the task candidate. | task source diff + focused DSH/WLT/Workforce tests | TASK_HEAD | task@a446560e | PASS | Invalidates on any source write |
| EVD-CONSUMERS | Contract composition/generated DSH client, backend binding, Workforce client, WLT migration runner, and readiness consumer reconcile on the task candidate. | DSH OpenAPI tests/verify, generated client parity, backend binding, WLT/Workforce tests | TASK_HEAD | task@a446560e | PASS | Invalidates on any consumer/contract write |
| EVD-CLEANUP | Undocumented route drift and migration/readiness divergence are removed without adding a fallback or parallel authority. | cleanup-policy, migration-manifest, WLT financial boundary, negative-space tests | TASK_HEAD | task@a446560e | PASS | Invalidates on any source write |
| EVD-VERIFICATION | Exact task candidate passes final affected verification. | DSH test/build, WLT test/build, Workforce tests, focused guards, V5 execute gate | SELF | task@a446560e | PASS | Invalidates on any source write |
| EVD-GOVERNANCE | Governance/self-guard evidence passes on the exact task candidate. | governance-schema, required-command-integrity, cleanup-policy, foundation static evidence | SELF | task@a446560e | PASS | Invalidates on governance/source write |
| EVD-FINAL-ADVERSARIAL | Final negative-space/adversarial checks pass on the exact task candidate. | WLT financial boundary, fullstack boundary, runtime anti-stub, generated-client parity, failure-closed tests | SELF | task@a446560e | PASS | Invalidates on any source write |
| EVD-RUNTIME | Required runtime/product/readback evidence passes on the exact task candidate. | pending runtime and journey verification | SELF | task runtime | MISSING | Invalidates on runtime/config/source write |

## Closure

- Integration head: SELF
- Final candidate: SELF
- Verification: PASS (task candidate only)
- Runtime/product evidence: MISSING (runtime smoke/readback not executed in this session)
- Cleanup: PASS
- Governance: PASS
- Final adversarial: PASS
