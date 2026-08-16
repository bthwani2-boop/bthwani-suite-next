# START HERE — BTHWANI SYSTEM ROOT-CLOSURE PACKAGE

Status: `PREPARED_NOT_CLOSED`
Mode: `PREPARE`
Execution target branch: `b` only, by explicit user instruction
Pinned evidence HEAD before package writes: `7f053af499891b6bb6ae9281c658f7eeedd35eb7`
Orchestration root: **the whole BTHWANI repository/system**

> This directory is the single diagnosis/execution package for closing BTHWANI from product meaning to runtime evidence. It is not runtime truth and it must never become a competing product, financial, contract, data, or operational source of truth.

## 1. Scope

Nothing materially connected to BTHWANI is implicitly out of scope. The execution package covers:

- every actor, capability, product rule, journey, state, transition, handoff, invariant and failure/recovery path;
- every active mobile/web/control surface, screen, route, tab, action, binding and state;
- `apps/**`, including active customer/partner/captain/field/control-panel runtime hosts and any older or alternative app roots that still have live references;
- `core/identity`, `core/workforce`, `core/platform-control`, `core/providers`;
- `services/dsh`, `services/wlt`, `services/fin`, `services/pymt`, `services/order`, `services/wallet`, `services/ledger`, `services/stl`, `services/ops`, `services/mkt`, `services/support`, plus every discovered service/adapter/worker;
- `contracts/**`, generated clients, shared packages and frontend sovereign/shared layers;
- database schemas, migrations, seeds, read models, materialized/projection state and ownership of every write;
- events, outbox, queues, jobs, callbacks, retries, providers, reconciliation and idempotency;
- auth, RBAC, actor/scope/tenant isolation, internal service identity, privacy and audit;
- runtime wiring, ports, config, Docker, health/readiness, bootstrap, deployment and CI/CD;
- observability, diagnostics, security, tests, release/cutover/rollback and cleanup;
- `governance/**`, `tools/**`, `.github/**`, `infra/**`, docs/plans only where they materially affect authority or execution.

## 2. Governing authority chain

Use this authority order. Lower layers may prove implementation, but must not invent higher-level meaning:

1. explicit current user decision;
2. `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` for V5 operational execution protocol;
3. canonical machine-enforceable Product Truth under `governance/product/contracts/**` and its schema;
4. canonical architecture/contract/runtime governance that is compatible with 1–3;
5. current candidate implementation on branch `b`;
6. current executable evidence from that same candidate SHA;
7. this package and the attached blueprint as diagnosis/planning evidence only;
8. historical plans/docs as untrusted input until re-proven.

If two authorities conflict, do not average them. Record the conflict, choose only what the hierarchy/evidence permits, and create `DECISION_REQUIRED` only when no higher authority resolves it.

## 3. Attached Blueprint handling

The attached `BTHWANI_CANONICAL_SYSTEM_LOGIC_BLUEPRINT` is valuable as a system-model/coverage specification, but its generation baseline predates the pinned branch HEAD. Therefore every statement is classified as one of:

- `ADOPT`: invariant/trace rule directly compatible with current authority;
- `REFINE`: direction is correct but must be made machine-enforceable or owner-specific;
- `MUST_PROVE`: plausible requirement that needs current-code/runtime evidence;
- `REJECT_AS_AUTHORITY`: would create a parallel source of truth or contradict current canonical authority.

The blueprint must map downward as:

`Decision -> Capability -> Journey -> State/Invariant -> Product-Truth Contract -> Owner -> API/Event -> DB/Write Model -> Client/Binding -> Surface -> Verification/Evidence`.

No row may skip a material layer silently.

## 4. Systemic root-cause hierarchy

The prior finance diagnosis is retained as a subsystem cluster, but the package root is now system-wide.

### SYS-RC-00 — Canonical operational model is not yet proven closed end-to-end

A human-readable model, machine Product Truth, code, persistence, runtime and evidence all exist, but closure requires proving that they describe one system rather than partially overlapping systems.

### SYS-RC-01 — Authority/ownership fragmentation

For every business state or mutation, prove one canonical authority, one write policy and explicit read/projection consumers. Duplicate writers or parallel lifecycle owners are root defects.

### SYS-RC-02 — Journey/state-transition ambiguity

Every material journey requires explicit actors, preconditions, legal transitions, handoffs, failure/recovery and terminal outcomes. UI labels or service-local enums cannot independently define lifecycle semantics.

### SYS-RC-03 — Contract/binding drift

Product Truth, OpenAPI/event schemas, generated clients, backend handlers and frontend bindings must have traceable semantic parity. Local DTOs or hardcoded interpretation that bypass the canonical contract remain open.

### SYS-RC-04 — Persistence/migration/read-model drift

Every authoritative field/table/write must have a canonical owner, migration/cutover policy, supported historical upgrade path, constraints and read-model consistency. Seeds/mocks cannot become runtime truth.

### SYS-RC-05 — Distributed failure/idempotency/reconciliation gaps

Callbacks, retries, duplicate commands, timeout/unknown-result, process restart, event reordering and concurrency require explicit semantics and durable recovery.

### SYS-RC-06 — Security/trust-boundary ambiguity

Identity propagation, RBAC, actor/tenant/scope isolation, service-to-service authorization, financial mutation authority, IDOR protection, audit and sensitive-data handling must be machine-auditable end-to-end.

### SYS-RC-07 — Runtime/config/deployment drift

Runtime endpoints, ports, startup validation, profiles, environment authority, health/readiness and CI must fail closed on ambiguous or invalid wiring. No debug-header or accidental local fallback may carry production authority.

### SYS-RC-08 — Observability/explainability/reconciliation incompleteness

Critical decisions and mutations must be attributable through correlation/idempotency/actor/source version, with enough evidence to explain current state and reconcile divergence.

### SYS-RC-09 — Legacy/duplicate/dead/fallback residue

Old APIs, parallel sources of truth, compatibility shims, silent fallbacks, dead code, obsolete migrations/config/routes and duplicate policy remain defects until proven unreachable and deleted or explicitly time-bounded with a removal gate.

### SYS-RC-10 — Verification/release closure not unified

No subsystem is `CLOSED` because a unit test or one surface passes. Closure requires same-candidate cross-layer evidence, adversarial negatives, runtime proof, cleanup proof and re-diagnosis after the final write.

### Finance subgraph retained

The existing finance roots remain mandatory children of the system graph: explicit execution/control/economic order semantics, canonical financial instrument taxonomy, canonical financial lifecycle owner, canonical checkout/financial intent, and removal of cyclic/direct legacy financial dependencies. The latest WLT commit rejecting `official_wallet` as checkout tender is evidence for that cutover, not proof that the whole finance root is closed.

## 5. Negative architecture — mandatory

The following are prohibited unless a narrowly documented, time-bounded migration gate proves why they temporarily exist and when they are removed:

- parallel business/financial/product truth;
- authoritative calculations or lifecycle decisions in frontend;
- UI-only authorization;
- manual authoritative balance/state edits outside canonical command paths;
- duplicate wallet/state per provider when provider is only a rail;
- fake success before canonical readback;
- implicit critical identifiers/amounts/actor authority;
- silent fallback, hidden workaround or compatibility behavior that masks a broken canonical path;
- duplicated business policy in multiple services/surfaces;
- runtime discovery-by-convention for critical authority;
- provider callback/retry handling without idempotency/reconciliation;
- caller-selected authoritative financial amounts when canonical evidence can derive them;
- seed/demo/mock state accepted as production truth.

## 6. Required working order

`TOP-DOWN DIAGNOSIS; FIX HIGHEST PROVEN ROOT FIRST`

1. Pin latest `b` HEAD and reconcile this package.
2. Build operational root: actors, outcomes, authorities, responsibilities, capabilities.
3. Build journey/state/invariant/decision registry.
4. Build total traceability and writer/reader/consumer graph.
5. Cluster findings under highest proven root; technical leaves stay `Evidence/HOLD` until parent/root is proven.
6. Execute only the highest proven executable root and its full blast radius.
7. Migrate all consumers and data; cut over canonical truth atomically where practical.
8. Delete obsolete/duplicate/fallback paths after zero-reference and rollback evidence.
9. Verify affected layers plus required global guards/runtime/security gates.
10. Re-pin latest HEAD, re-diagnose, and repeat until no material root remains open.

## 7. Package map

- `DIAGNOSIS.md` — current system diagnosis and root landscape.
- `COVERAGE.md` — total operational/layer/surface/service coverage contract.
- `PACKAGE.md` — strongest executable command and ordered implementation frontier.
- `BLUEPRINT-TRACEABILITY.md` — exact reflection of the attached blueprint into implementation/verification obligations.
- `DECISIONS.md` — resolved decisions, conflicts and decision-required registry.
- `CLEANUP.md` — cutover/deletion/cleanup contract.
- `RECONCILIATION.md` — baseline/head/foreign-delta reconciliation rules.
- `IMPLEMENTATION-AUDIT.md` — proof ledger and closure audit.
- `SOURCE-MANIFEST.md` — evidence provenance.

## 8. Current verdict

`PREPARED_NOT_CLOSED`.

Reason: this invocation is `MODE: PREPARE`. It authorizes diagnosis/package writes, not a truthful claim that all runtime/code/data/security/UX roots have already been remediated and verified. The next execution invocation must consume this package root-first and may call `CLOSED` only after the closure law in `PACKAGE.md` is satisfied.
