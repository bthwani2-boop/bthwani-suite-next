# PACKAGE — FAIL-CLOSED SYSTEM EXECUTION / RADICAL ROOT REMEDIATION

Status: `PREPARED_NOT_CLOSED`
Repository: `bthwani2-boop/bthwani-suite-next`
Prepared for branch: `b`
Current invocation mode: `PREPARE`
Future execution mode required for live remediation: `EXECUTE_END_TO_END`

## 0. Canonical execution command

Use the following as the governing task body for the implementation run:

> **BRANCH: `b` | TARGET: `the entire BTHWANI system/repository: every actor, capability, journey, state, surface, app, core, service, contract, API, binding, database, migration, event, job, provider, integration, permission, runtime, config, test, workflow, governance rule and cleanup dependency` | MODE: `EXECUTE_END_TO_END`. Use exclusively `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` as the operational entry point and consume `plans/diagnose-implementing/diagnose_all-end-to-end` as evidence/plan, never as runtime truth. Execute V5 FAIL-CLOSED by `TOP-DOWN DIAGNOSIS; FIX HIGHEST PROVEN ROOT FIRST`: pin latest `b`, reconcile all foreign delta, establish the highest product/operational meaning and canonical authority before descending, build complete actor/outcome/authority/journey/state/invariant/handoff/writer-reader-consumer traceability, classify every technical finding as Evidence/HOLD until its operational parent and highest proven Root Cause are known, then immediately remediate the highest proven executable root End-to-End across `Product Truth/Logic/Journeys/States -> Frontend/UI -> Client/Bindings -> Contracts/APIs/Events -> Backend/Domain -> Data/DB/Migrations -> Providers/Jobs/Reconciliation -> Auth/Permissions/Audit -> Runtime/Config/Deploy -> every writer/reader/consumer/surface`. Migrate all consumers and historical data required by the supported compatibility window, establish one canonical source of truth, delete every obsolete/wrong/duplicate/dead/reachable-legacy path and every unjustified workaround/fallback/compatibility route only after cutover/zero-reference proof, and never create a parallel authority to make tests pass. For every distributed mutation prove idempotency, retry, duplicate, timeout/unknown-result, restart, concurrency, ordering, degraded-provider and reconciliation behavior. For every trust boundary prove authentication, authorization, actor/tenant/scope isolation, IDOR resistance, service identity, privileged mutation authority, privacy and audit. For every active UI prove canonical binding plus loading/empty/error/retry/offline/disabled/success and negative permission/state behavior. Use current Product Truth under `governance/product/contracts/**`; the attached canonical blueprint is a human system model/coverage input and MUST NOT override machine truth or become a competing runtime/data/financial/contract authority. Run only diagnostics/tests needed to prove the active root until remediation is complete, then expand to its entire blast radius and required global gates. Use all applicable Codex capabilities: Graphify/dependency tools for impact graph, generated-contract guards, DB/runtime/security/observability tooling; when available run Codex Security Deep Scan for repository-wide security closure followed by validation and attack-path analysis, and CodeRabbit review on the resulting diff. Re-pin and re-diagnose after the last code/data/config write. Do not claim DONE/CLOSED/READY/100% while any material Root Cause, Decision, Dependency, Consumer, Binding, Integration, Migration, Security finding, Runtime proof, Legacy path, Cleanup item or same-candidate evidence remains open. No patch, workaround, silent fallback, fake success, UI-only authorization, duplicated policy or parallel source of truth is permitted. Continue root by root until the closure law below is fully proved.**

### Explicit branch-policy note

The user explicitly instructed execution directly on `b` and prohibited creating another branch/worktree. This conflicts with the V5 orchestrator isolation rule for remote/API writes. Record this as `USER_ISOLATION_OVERRIDE / ORCHESTRATOR_CONFLICT`; do not falsely label direct-`b` execution isolation-compliant. The semantic/root/closure gates remain mandatory.

## 1. Non-negotiable laws

### L1 — Meaning before mechanism

Do not let a code smell define the target architecture. Determine product outcome, actor, authority and legal state transition first.

### L2 — Highest proven root first

A leaf defect cannot consume execution priority while a higher proven root explains it and is executable.

### L3 — One authority per authoritative fact/mutation

Multiple projections are allowed only if they are non-authoritative, source-linked, rebuildable/reconcilable where required and cannot mutate canonical state.

### L4 — No hidden compatibility

Compatibility exists only as an explicit migration mechanism with owner, scope, tests, expiry/removal condition and observability. Silent fallback is forbidden.

### L5 — No data-loss refactor

Schema/API/state changes require supported migration/backfill/cutover/rollback evidence. “Clean architecture” does not justify dropping live meaning/history.

### L6 — No security-by-UI

Every privileged capability is enforced at authoritative backend/service boundaries. UI gating is supplementary.

### L7 — Failure is a state, not an exception to architecture

Timeout, retry, duplicate, restart, partial success and provider degradation must preserve explicit safe state and deterministic recovery.

### L8 — Same-candidate evidence

Final proof must correspond to the final candidate SHA after the last relevant write. Older PASS output is historical evidence, not final proof.

### L9 — Cleanup is part of correctness

Old reachable paths, duplicate truths, stale clients, dead migrations, obsolete docs that still claim authority and unused dependencies remain open closure items.

### L10 — Plans are not implementation

This directory is an execution package. It cannot satisfy a live-code/runtime closure gate by itself.

## 2. Required Phase 0 — Truth pin and reconciliation

Record:

- exact branch/ref and current SHA;
- current commit intent and recent delta relevant to open roots;
- package baseline vs current candidate;
- concurrent/foreign delta classification: `DISJOINT | RELATED | OVERLAP | CONFLICT | AUTHORITY_CHANGE`;
- Product Truth and orchestrator versions relevant to target;
- no stale path assumption from the attached blueprint.

If branch movement changes authority, re-run root ordering before executing.

## 3. Required Phase 1 — Operational root inventory

Inventory without omission:

- actors/principals/service identities;
- product outcomes/capabilities;
- canonical authorities and responsibilities;
- policies vs hard invariants vs runtime config vs operator-configurable values;
- journeys and entry points;
- states/transitions/commands/events/handoffs;
- success/failure/recovery/terminal outcomes;
- cross-surface expectations;
- data classification/privacy/audit requirements.

Every item receives stable ID and owner or an explicit `AUTHORITY_CONFLICT` finding.

## 4. Required Phase 2 — Total live traceability

For each material capability/journey build:

`Decision -> Capability -> Journey -> Invariant -> Product-Truth contract -> canonical owner -> route/command/event -> handler/domain -> writer/table/model -> outbox/job/provider -> generated client -> binding/controller/view-model -> surface/screen/action -> test/runtime evidence`.

Required side inventories:

- all authoritative writers;
- readers/projections/caches;
- API/event operations;
- generated/manual clients;
- UI direct transports and local business logic;
- migrations/seeds;
- provider callbacks/jobs;
- auth/RBAC checks;
- runtime/config endpoints;
- tests/guards/workflows;
- legacy/dead/duplicate candidates.

Anything missing from traceability is a finding, not an implicit N/A.

## 5. Required Phase 3 — Root clustering and frontier

Every finding records:

- `finding_id`
- `classification`
- `operational_parent`
- `highest_proven_root`
- `evidence`
- `blast_radius`
- `canonical_owner`
- `writers/readers/consumers`
- `dependencies`
- `risk`
- `required_action`
- `verification`
- `status`

Build a graph and select frontier by:

1. highest semantic/authority root;
2. widest proven systemic leverage;
3. prerequisite relation;
4. safety/data/security severity;
5. consumer blast radius.

Do not sort primarily by file count or easiest test.

## 6. Required Phase 4 — Radical root remediation pattern

For each selected root:

1. freeze canonical meaning and owner;
2. define target state/contract/schema/event model;
3. identify every writer/read consumer and migration path;
4. implement canonical owner and enforce invariants;
5. migrate backend handlers/workers/providers;
6. migrate DB/schema/data with forward-safe migration;
7. regenerate/update contracts and clients;
8. migrate shared bindings/controllers/view-models;
9. migrate every surface/action/state;
10. migrate integrations/jobs/events/callbacks;
11. align auth/RBAC/audit/observability;
12. verify failure/idempotency/concurrency paths;
13. cut over callers/readers;
14. prove zero use of old authority;
15. delete obsolete paths/config/schema/docs/deps;
16. re-run target + blast-radius verification;
17. re-diagnose root and only then mark it closed.

No two authoritative paths may be left “temporarily” active without an explicit bounded migration gate.

## 7. Mandatory subsystem fronts

These are starting fronts, not independent silos.

### A. Product Truth / governance

- reconcile blueprint semantics with `governance/product/contracts/**`;
- add missing machine-enforceable contracts/invariants rather than encoding mutable truth in prose;
- ensure Decision Registry and invariant IDs can trace into implementation/tests;
- eliminate canonical-doc contradictions.

### B. Identity / Workforce / Platform Control / Providers

- actor lifecycle, roles, scopes, activation/session;
- workforce profile/readiness/accreditation/suspension;
- versioned platform/operator configuration;
- provider registry, credentials, callbacks and degradation;
- explicit service-to-service identity.

### C. DSH business system

- partner vs store boundary;
- catalog/discovery/serviceability;
- cart/quote/checkout/order/fulfillment;
- dispatch/fleet/captain/field/support handoffs;
- all customer/partner/captain/field/control-panel surfaces;
- UI remains consumer of canonical shared/domain bindings, not authority.

### D. Financial system

Retain and close all prior finance roots:

- canonical checkout choices/allocation vs provider funding rails;
- wallet/ledger lifecycle owner;
- WLT/PYMT/FIN/ORDER/WALLET/LEDGER/STL responsibilities;
- settlement/refund/reversal/COD exposure/custody/payout/debt;
- provider callbacks/reconciliation;
- remove direct/cyclic/legacy financial authority.

### E. Data/integration/runtime/security

- canonical writer ownership and schema lineage;
- event/outbox/job durability;
- restart/idempotency/concurrency;
- runtime config/ports/startup/readiness;
- audit/observability;
- security/trust boundaries;
- CI/release/rollback.

## 8. Verification contract per root

Run the smallest sufficient proof while fixing, then full blast-radius proof before closure.

### Static/contract

- changed-language compile/typecheck/lint;
- contract schema/lint/registry/provenance;
- generated-client drift/binding guards;
- boundary/ownership guards;
- `git diff --check` equivalent in local execution.

### Data

- migration syntax/order/manifest;
- fresh DB;
- supported upgrade DB;
- invariant/constraint tests;
- backfill/cutover correctness;
- old writer/read zero-residue.

### Integration/distributed

- success;
- invalid state/permission;
- duplicate request/callback;
- timeout after commit/unknown result;
- dependency unavailable/degraded;
- restart/replay;
- out-of-order events where relevant;
- concurrency race;
- reconciliation without double effect.

### UI/UX

Every active state/action proves:

- correct actor/scope/permission;
- canonical binding;
- loading;
- empty;
- error;
- retry/offline/stale where applicable;
- disabled/forbidden;
- success/readback;
- RTL/layout/accessibility/visual integrity where UI changes;
- no local authoritative calculation/transition.

### Security

- targeted auth/RBAC/IDOR/tenant/scope negatives;
- sensitive-data/log/secret review;
- service-to-service trust proof;
- Codex Security Deep Scan + validation + attack-path analysis when available for repository-wide security closure;
- unresolved scanner candidate remains open until validated/triaged.

### Review

Use CodeRabbit on the implementation diff when available. Every critical/major issue is fixed or explicitly disproved with evidence before closure.

### Runtime

- required service profiles start;
- migrations/bootstrap succeed;
- health/readiness semantics are meaningful;
- critical E2E journeys and negative/failure paths execute against the candidate;
- logs/audit/readback prove canonical outcomes;
- no fallback masks a missing dependency.

## 9. Cleanup contract

After canonical cutover, search semantically and textually for:

- old type/state/enum names;
- old routes/clients/adapters;
- old tables/columns/migrations seeds;
- direct URLs/transports;
- duplicate calculations/policies;
- debug/test auth shortcuts;
- legacy ports/config keys;
- fallback/workaround markers;
- stale imports/exports/dependencies;
- abandoned plan/docs that still claim current authority.

Each deletion must have zero-reference/reachability and replacement proof. Each retained compatibility item must have explicit owner/removal gate.

## 10. Closure law

A root may become `CLOSED` only when all are true:

- highest parent/root meaning is resolved;
- one canonical authority/write path is proven;
- all dependencies and consumers are migrated;
- Product Truth/contracts/code/schema/events/clients/UI agree;
- data migration/cutover is safe;
- required security/privacy/audit controls pass;
- distributed failure/idempotency/reconciliation semantics pass;
- relevant runtime/E2E proof passes;
- old reachable/duplicate/fallback paths are removed;
- cleanup is complete;
- no `DECISION_REQUIRED` blocks the root;
- no material finding under the root is OPEN/HOLD without explicit external blocker;
- final evidence is from the final candidate SHA;
- adversarial re-diagnosis finds no material contradiction/gap.

The entire TARGET may become `CLOSED` only when **every active root** satisfies this law and the repository-wide coverage matrix has no unclassified material item.

## 11. Allowed final statuses

- `PREPARED_NOT_CLOSED`
- `EXECUTING_ROOT_<id>`
- `BLOCKED_DECISION_REQUIRED`
- `BLOCKED_EXTERNAL_WITH_EXACT_UNBLOCK`
- `ROOT_<id>_CLOSED`
- `TARGET_CLOSED_SAME_CANDIDATE_EVIDENCE`

Never use `100%`, `1000%`, `10000%`, `FINAL`, `READY` or `CLOSED` as rhetorical confidence. They are evidence states only.
