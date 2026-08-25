# BThwani Objectives Playbook
## Discovery, Selection, Decomposition and Synthesis

Status: ACTIVE_PROMPTING_REFERENCE  
Class: NON_AUTHORITATIVE_OBJECTIVE_SELECTION_PLAYBOOK  
Applies to: objective discovery and composition across the full software lifecycle  
Execution authority: `tools/prompting/bthwani-orchestrator/**`  
Delivery authority: `governance/policies/delivery.md`

## 0. Purpose and authority boundary

This file answers one question:

> **What is the next materially correct objective, at the right causal altitude and the right execution size, for the current live state?**

It is a selection/synthesis aid. It is **not** Product/System truth, governance policy, execution law, repository status, a root-cause registry, or closure evidence.

All generated objectives inherit the current BThwani Root-Cause Orchestrator. This file MUST NOT restate, weaken, override, or compete with the semantic owners under `tools/prompting/bthwani-orchestrator/**`.

Current governance and executable owners MUST be resolved live. At minimum, when applicable:

- `governance/policies/delivery.md` owns delivery, promotion, environment gates and release lifecycle.
- `governance/policies/engineering.md` owns durable engineering policy.
- `governance/policies/security.md` owns durable security/privacy policy.
- service/domain contracts, schemas, data owners, runtime, workflows and guards own their respective executable truth.

Historical objective catalogs, prior prompts, old PR bodies, plans, examples and earlier branch/SHA-specific text are discovery support only. They never establish current repository truth.

```text
OBJECTIVE = current priority
OBJECTIVE != AUTHORITY
OBJECTIVE != PROJECT TRUTH
OBJECTIVE != CLOSURE EVIDENCE
PLAYBOOK != ORCHESTRATOR
PLAYBOOK != GOVERNANCE
```

## 1. Desired operating model

Use:

> **WIDE DISCOVERY; NARROW COMPLETE EXECUTION.**

Maintain a project-wide orientation so a narrow task cannot create a narrow worldview. Execute only the smallest complete root-correct cone that can reach real closure without knowingly exporting material debt to a later objective.

Do not optimize for:
- the smallest diff;
- the easiest file;
- the first failing check;
- the highest count of findings;
- the latest discovered problem;
- a visually impressive rewrite;
- a predetermined objective catalog order.

Optimize for the highest proven systemic leverage and the smallest complete canonical cutover.

## 2. Objective levels

### 2.1 Project Frame

The durable orientation needed to understand the system-wide relationships relevant to selection. It may span Product/System, actors, domains, surfaces, contracts, data, runtime, security, delivery and governance.

A broad Project Frame does not imply repository-wide mutation.

### 2.2 Macro Objective

A broad outcome family that may require multiple closure windows, for example:

- canonical Product/System and journey truth;
- architecture/ownership/dependency closure;
- security/authorization/trust-boundary closure;
- runtime/infrastructure/configuration closure;
- release/deployment/promotion closure.

A Macro Objective is an orientation boundary, not automatically one executable session.

### 2.3 Closure Unit

The preferred unit for one execution window:

> **the smallest complete root or causally cohesive root cluster that can be treated End-to-End and reach exact-candidate closure without half migration, dual authority, deferred cleanup, deferred governance reconciliation, or knowingly missing verification.**

A Closure Unit may touch many files, packages, services or surfaces when they are causally required by one root.

### 2.4 Treatment Steps

Implementation actions such as rewrite, move, rename, split, merge, migrate, backfill, regenerate, cut over, delete, harden, verify and reconcile governance.

Treatment steps are not separate objectives when they are obligations of the same root closure.

## 3. Live-state selection protocol

When the human asks for the next objective or an objective suitable for a new window:

1. **Resolve the live target**
   - repository;
   - exact branch/ref or PR;
   - current HEAD SHA;
   - base/trunk and current PR identity when material;
   - current concurrent/foreign delta.

2. **Resolve the current delivery position**
   Use the live `governance/policies/delivery.md` lifecycle. Determine whether the relevant candidate is in requirement/change intent, local development, local verification, remote qualification, PR/exact-candidate closure, integration, release build, staging, release readiness, production deployment, post-deploy verification, store rollout, or post-release observation.

3. **Orient at the mandatory diagnostic altitude**
   Apply the current `02-DIAGNOSE-ROOT-CAUSE.md` ordering:
   `Product/Operational Outcome -> Actor/Authority/Responsibility -> Capability/Journey -> State/Transition/Invariant/Handoff -> Canonical Ownership -> Contract/Data -> Service/Surface -> Runtime/Implementation/Test/Tool`.

4. **Evaluate all materially applicable focus families**
   An explicit starting focus is not a closure ceiling. Cross-check Product/UX, governance, code/structure/UI implementation, data/contracts/runtime/security/quality/operations as required by the current orchestrator.

5. **Search both positive and negative space**
   For materially inspected capabilities, determine what is:
   `WRONG | MISSING | INCOMPLETE | CONFLICTING | DUPLICATED | MISOWNED | MISPLACED | OBSOLETE | UNPROVEN`.
   Absence of implementation, recovery, consumer, transition, invariant, permission, migration or readback can be a material finding.

6. **Build the Root Graph**
   Normalize and cluster findings under causal parents. Do not create one objective per symptom or one objective per tool finding.

7. **Rank roots using the orchestrator's current leverage criteria**
   Use the live `02-DIAGNOSE-ROOT-CAUSE.md` ordering, currently centered on:
   `upstream depth -> blocking power -> canonical importance -> blast radius -> user/operational/security/data/finance risk -> recurrence -> structural multiplier -> cosmetic impact`.

8. **Prove the Source-of-Fix frontier**
   Before selecting an executable Closure Unit, establish enough of the actual Source-of-Defect, required Source-of-Fix, canonical owner/write path, affected writers/readers/consumers, migration/cutover implications, obsolete implementation and required proof.

9. **Apply the Window-Fit Gate**
   Split independent roots; keep one root together when separation would create a half cutover or defer a required obligation.

10. **Check collision with active work**
    Do not select an objective that independently claims the same material truth, writer, migration, cutover, integration ref or unsafe overlapping write set as current active work. Follow the orchestrator's concurrency rules.

11. **Synthesize the objective**
    Compose only the outcome, proven root family, bounded closure unit, relevant authority/consumer context, delivery-stage relevance and any context-specific exclusions. Inherit execution/cleanup/verification laws from the orchestrator instead of copying them.

12. **After each closed Closure Unit**
    `RE-RESOLVE LIVE TRUTH -> RE-DIAGNOSE AFFECTED PROJECT FRAME -> INVALIDATE STALE FINDINGS -> RE-RANK ROOTS -> SELECT NEXT HIGHEST EXECUTABLE CLOSURE UNIT`.

A previous queue is a hypothesis, not a schedule authority.

## 4. Window-Fit Gate

A Closure Unit is a strong one-window candidate when, after diagnosis:

- one primary root or tightly coupled root cluster dominates;
- the Canonical Target is sufficiently defined;
- the Source-of-Fix is known enough to execute;
- the authoritative owner/write path is known;
- material writers/readers/consumers can be bounded;
- required migration/cutover can be completed without transferring dual authority to another objective;
- related cleanup/deletion/finishing can complete in the same closure;
- materially required governance reconciliation can complete in the same closure;
- required proof can be obtained on the resulting candidate;
- no unresolved higher semantic decision can invalidate the treatment;
- it does not bundle causally independent roots merely for comprehensiveness.

### Split rule

> **Split by causal independence, never by arbitrary file count, line count, token count, language, frontend/backend layer, or visual size.**

Split when there are independent roots with independent owners/cutovers/verification contracts and no causal ordering requirement.

Do not split when the pieces share:
- the same canonical authority;
- one required migration/cutover;
- one state-machine transition;
- one persisted truth;
- a writer/reader migration that must be atomic at the objective level;
- an evidence dependency that would make the first half impossible to close honestly.

If an indivisible root remains large, preserve root correctness rather than inventing an artificial partial objective.

## 5. Objective discovery families

These are discovery axes, not a fixed execution order. A finding from any family can become the highest root when evidence proves higher leverage.

### 5.1 Product / System / Operational Semantics and UX

Inspect outcomes, actors, responsibilities, authorities, journeys, state machines, decision rules, invariants, handoffs, success/failure/recovery, later readback, missing actions, missing terminal semantics and cross-surface meaning.

UX here means operational meaning and journey semantics. Concrete visual/component implementation belongs to the implementation/UI family.

### 5.2 Security / Authorization / Trust / Financial Safety

Inspect authentication, authorization, resource/object scope, actor/operator/delegation context, service-to-service trust, privileged actions, maker-checker, sessions, credentials, secrets, replay, financial mutation safety and cross-domain writes.

### 5.3 Architecture / Ownership / Dependency Graph

Inspect canonical owners, public boundaries, dependency direction, domain/service separation, shared ownership, deep/internal bypasses, cycles, undeclared dependencies, package/workspace/export truth and unjustified abstraction.

### 5.4 Contracts / APIs / Events / Generated Bindings

Inspect canonical contract ownership, runtime/contract alignment, generated provenance, consumer drift, compatibility windows, shadow endpoints, DTO/error/enum semantics and generation boundaries.

### 5.5 Data / Database / Migration / Reconciliation

Inspect data ownership, allowed writers/readers, schemas, constraints, transactions, idempotency, concurrency, migration histories, backfills, historical data repair, projections/caches and old-writer elimination.

### 5.6 Runtime / Infrastructure / Configuration / Integrations / Observability

Inspect startup, topology, service dependencies, environment/config ownership, ports/endpoints, secrets injection, containers/processes, providers, readiness/health, jobs/queues, observability, failure/restart/recovery and runtime determinism.

### 5.7 UI / Design System / Accessibility / Rendering

Inspect presentation implementation against proven Product/UX meaning: component ownership, design-system authority, state/readback binding, loading/empty/error/recovery presentation, responsive behavior, RTL/localization, keyboard/screen-reader support, rendered evidence and visual consistency.

UI does not own Product/System semantics or authorization truth.

### 5.8 Verification / Tests / Invariants / Evidence

Inspect whether evidence can falsify the claims that matter: positive/negative behavior, contracts, integration, database, runtime, security, journey/E2E, concurrency, idempotency, retry/recovery, migrations, realistic fixtures and exact-candidate provenance.

Tests and tools are evidence, never Product/System authority.

### 5.9 CI / Quality / Security Analysis / Review Control Paths

Inspect workflow authority, exact-candidate identity, branch/PR event ownership, analyzer execution, trust context, permissions, cache/artifact provenance, review provenance, finding disposition, duplicate workflows and assurance-to-cost efficiency.

### 5.10 Reliability / Failure / Concurrency / Recovery

Inspect duplicate delivery, retry, timeout, unknown external result, race, ordering, crash/restart, partial failure, compensation, reconciliation and recoverability of the material journey.

### 5.11 Performance / Scalability / Resource Efficiency

Inspect material user/operational bottlenecks, query plans/indexes/N+1, payloads, pagination, connection pools, memory/CPU, backpressure, frontend rendering, assets/bundle size and control-path/build/test cost. Correctness cannot be traded for speed.

### 5.12 Privacy / Data Lifecycle / Backup / Restore / Disaster Recovery

Inspect collection, access, minimization, retention, archival, deletion, logs/evidence exposure, uploaded files, orphaned data, backup provenance, restore proof, RPO/RTO-relevant behavior and rebuildable versus non-rebuildable truth.

### 5.13 Supply Chain / Build / Artifact Provenance

Inspect locked dependencies, third-party actions, generated outputs, build inputs, artifact identity, SBOM/attestations where governed, reproducibility and provenance from source to promotable artifact.

### 5.14 Release / Deployment / Promotion / Rollback / Store Distribution

Inspect build-to-environment lineage, immutable artifact promotion where valid, environment-specific native builds where required, migrations, readiness, deployment, rollback/forward-fix, post-deploy verification, staged rollout and store submission/approval.

### 5.15 Developer Toolchain / Local Feedback Loop

Inspect canonical tool versions, dependency installation, local startup, device/mobile transport, bootstrap/reset, code generation, developer commands, hidden machine prerequisites and feedback-loop determinism.

### 5.16 External Providers and Boundary Integrations

Inspect provider ownership, credentials, sandbox/production separation, callback/webhook trust, timeout/retry/idempotency, quotas, failure semantics, reconciliation and leakage of provider-specific workarounds into domain truth.

### 5.17 Governance / Durable Project Memory

Always assess governance impact when durable truth changes. Route only proven reusable durable truth to the smallest current canonical owner according to the orchestrator. Governance is reconciled after underlying truth is proven; it does not substitute for treatment.

### 5.18 Structural Finishing / Repository Hygiene

Normally this is a closure obligation of a root, not a separate cleanup objective. It becomes an independent objective only when structure itself is a proven material root: misleading ownership, junk-drawer directories, duplicate abstractions, stale aliases, misnaming that redirects writes, dead packages, obsolete dependencies or repository organization that materially creates wrong work.

## 6. Delivery-stage objective map

Use the delivery stage to sharpen selection, not to create environment-specific Product Truth.

| Delivery position | Objective roots commonly worth testing |
| --- | --- |
| Requirement / Change Intent | Product outcome, actor/authority, acceptance semantics, missing decisions, blast radius |
| Local Development | root-correct implementation, architecture, contracts, data, security, UI, provider boundaries, cleanup |
| Local Verification | clean-state reproducibility, targeted invariants, failure paths, runtime/journey proof, migration proof |
| Remote CI / Security / Quality | independent reproducibility, exact-candidate analysis, trust boundaries, material tool execution/finding lifecycle |
| PR / Review | candidate identity, review scope, consumer completeness, stale evidence, semantic/architecture/security findings |
| Exact Candidate Closure | final affected-cone proof, negative space, no half cutover, no unresolved material residue |
| Protected Integration | merge-candidate integrity, base movement, integration conflict, post-merge invariants |
| Release Build / Provenance | reproducible build, immutable artifact identity, supply-chain provenance, environment inputs |
| Staging / Pre-Production | production-relevant runtime, migrations, providers, representative journeys, failure/recovery, observability |
| Release Readiness | unresolved material risk, rollback/forward-fix, security/privacy/finance, capacity and operational readiness |
| Production Deployment | exact approved lineage, config/secrets, migration/deploy ordering, protected operations |
| Post-Deployment Verification | actual production health, business/journey readback, reconciliation, regression and observability |
| Store Release / Rollout | signing/entitlements, production binary qualification, staged rollout, store policy and rollback path |
| Post-Release Observation | SLO/user impact, incident signals, reconciliation, latent failure, regression and durable lessons |

The exact gates and promotion rules remain owned by the live `delivery.md`.

## 7. Catastrophic and material-harm overlay

Catastrophic harm is a **ranking overlay**, not the first semantic altitude.

After candidate roots are proven, elevate roots capable of causing, as applicable:

- unauthorized privileged action or cross-scope access;
- financial duplication, loss, corruption or irreconcilable outcome;
- durable data corruption/loss;
- privacy or credential exposure;
- irreversible destructive migration;
- false success/false system truth that drives further harmful actions;
- unsafe production startup/deployment;
- unrecoverable state or missing recovery for a material journey;
- promotion of an artifact/candidate different from the one qualified.

A catastrophic local symptom still yields to a proven higher causal parent when the parent is the real Source-of-Defect.

## 8. Objective collision and concurrency

Before proposing multiple objectives in parallel, apply the orchestrator's current maximum-safe-parallelism rules.

Prefer parallel Closure Units only when proven to have:
- no causal dependency;
- no conflicting canonical authority;
- no unsafe overlapping write set;
- no shared migration/cutover ordering;
- no verification dependency requiring serialization.

Do not parallelize by arbitrary frontend/backend/file/language partitioning when one root spans them.

One integration authority must reconcile shared live truth.

## 9. Governance impact in objective synthesis

Every synthesized objective must assess whether its treatment may alter durable Product/System meaning, ownership, boundaries, policy or delivery semantics.

Possible outcomes are governed by the live orchestrator's governance focus:
- no material governance mutation required;
- affected governance must be reconciled after the implementation truth is proven;
- a genuine non-derivable durable decision is required.

Do not create or update governance merely because a task happened. Do not leave materially touched governance stale when the root closure proves it wrong, conflicting, incomplete or durably missing.

## 10. Objective synthesis grammar

A strong generated objective should normally contain only what is unique to the current closure unit:

1. **Material outcome** — what must become true.
2. **Selected root family / closure unit** — the root or cohesive cluster being closed.
3. **Current target binding** — repository/branch/PR context when relevant, while requiring live re-resolution.
4. **Canonical authority expectation** — known owner/boundary if proven; otherwise permission for the orchestrator to derive it.
5. **Affected-cone intent** — enough breadth to migrate all causally affected writers/readers/consumers.
6. **Delivery-stage relevance** — Local/PR/Staging/Production/etc. only when it materially changes the claim.
7. **Non-overlap boundary** — exclude independent roots already active elsewhere, without excluding descendants of the selected root.
8. **Orchestrator inheritance statement** — execution, cleanup, evidence, re-diagnosis, governance and closure remain governed by the current orchestrator.

Avoid copying large generic cleanup/security/verification checklists into every objective. The objective selects the outcome and root; the orchestrator owns how root closure is proven and executed.

### Generic template

```text
OBJECTIVE: On the current live <target>, close the highest proven executable root within
<material outcome / macro family>, selecting the smallest complete causally cohesive Closure Unit
that can reach End-to-End canonical cutover in this execution window.

The selected unit must preserve the project-wide frame, derive the actual Source-of-Defect and
Source-of-Fix, include all causally affected writers/readers/consumers and any required contract,
data, runtime, surface and governance impact, and must not be artificially split if that would
create half migration, dual authority or deferred material residue.

Independent roots outside this unit remain candidates for re-ranking after closure; descendants
and exposed findings tied to the selected root remain part of the same closure.

Execute and close under the current `tools/prompting/bthwani-orchestrator/**` and applicable live
governance/policies. After closure, re-resolve live truth, re-diagnose the affected Project Frame,
invalidate stale candidates and select the next highest executable Closure Unit.
```

## 11. Selection output contract

When asked to **recommend/extract the next objective**, return enough decision information to make the choice reviewable:

```text
LIVE_TARGET
DELIVERY_POSITION
MACRO_FAMILY
SELECTED_CLOSURE_UNIT
ROOT_LEVERAGE_REASON
KNOWN_SOURCE_OF_FIX_STATUS
DEPENDENCIES / COLLISIONS
SESSION_FIT = HIGH | MEDIUM | LOW
OBJECTIVE_TEXT
```

`SESSION_FIT` is a qualitative complexity judgment, not a token/time promise.

When the human requests only the objective text, return only `OBJECTIVE_TEXT`.

## 12. Anti-patterns

Do not select or synthesize objectives such as:

- `make CI green`;
- `fix these files`;
- `remove these warnings`;
- `increase coverage`;
- `refactor this folder` without a proven structural root;
- `clean the repository` as a parking lot for debt that belonged to earlier roots;
- `rewrite everything`;
- `run all tools`;
- `fix frontend` when the actual root is Product/System semantics;
- `fix backend` when the actual root is ownership/contract/data authority;
- a 100-item catalog entry copied because its historical rank was high;
- a mega-objective that combines independent roots only to sound comprehensive;
- micro-objectives that split one required cutover into rename/import/delete/test windows.

## 13. Fast invocation patterns

### Extract the next objective

```text
Read `tools/prompting/04-OBJECTIVES-PLAYBOOK.md`.
Using the current BThwani orchestrator and live governance, inspect the current target deeply,
build/rerank the material Root Graph, and return the highest-leverage Session-Sized Closure Unit
that can be closed End-to-End now. Do not reuse stale objective rankings as current truth.
```

### Extract and execute

```text
Read `tools/prompting/04-OBJECTIVES-PLAYBOOK.md`.
Resolve the live target, select the highest executable Session-Sized Closure Unit under the
current orchestrator, and execute it through exact-candidate closure. After closure, re-diagnose
and report the next candidate rather than silently starting an independent root unless the
current human instruction authorizes continued multi-unit execution.
```

### Continue a Macro Objective

```text
Re-resolve live truth after the previous Closure Unit, re-diagnose the affected Project Frame,
invalidate stale roots, and select the next highest executable Closure Unit inside the current
Macro Objective. If a higher cross-family root preempts it, surface that fact rather than forcing
the old queue.
```

## 14. Final selection principle

> **Do not ask: “Which catalog objective comes next?”**

Ask:

> **“What is the highest materially proven way the current system can still be wrong, what is its highest causal root, and what is the smallest complete root-correct Closure Unit that can be closed now without transferring its obligations elsewhere?”**

That is the objective to synthesize.
