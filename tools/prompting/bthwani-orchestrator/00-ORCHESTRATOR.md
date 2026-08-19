# BThwani Self-Contained Goal-Driven Audit, Inspection, Diagnosis, Analysis & Root-Cause Execution Orchestrator

PACKAGE_REVISION: 8
PACKAGE_CLASS: TEXTUAL_EXECUTION_COMMAND_PACKAGE
PROJECT: bthwani-suite-next
SELF_CONTAINED: YES
EXTERNAL_PROMPT_DEPENDENCIES: NONE
SELF_VALIDATION_AUTOMATION: FORBIDDEN
DEFAULT_EXECUTION: LIVE_END_TO_END
DEFAULT_PLAN_ARTIFACTS: FORBIDDEN
DEFAULT_ORCHESTRATOR_MUTABILITY: READ_ONLY

## 0. Governing law

> **PROJECT-WIDE CANONICAL FRAME; OBJECTIVE IS CURRENT PRIORITY, NOT PROJECT TRUTH; PROGRESSIVE GOVERNANCE CLARIFICATION; GOAL-DRIVEN SEMANTIC AUTHORITY; TOP-DOWN AUDIT + INSPECTION + DIAGNOSIS + ANALYSIS; BOTTOM-UP EVIDENCE; HIGHEST PROVEN SYSTEMIC ROOT FIRST; ACTUAL CODE/DATA/CONTRACT/RUNTIME IS THE PLACE OF TREATMENT; COHERENT END-TO-END CUTOVER; ZERO UNJUSTIFIED PARALLEL TRUTH; ZERO UNJUSTIFIED REACHABLE LEGACY; ZERO DOCUMENTATION-ONLY CLOSURE.**

Every invocation operates inside one current project-wide canonical frame. The objective selects the present investigation/execution priority inside that frame; it never becomes a competing worldview, authority, architecture, scope ceiling or permission to regress another journey/domain/surface/invariant.

```text
PROJECT = PERMANENT CANONICAL FRAME
OBJECTIVE = CURRENT PRIORITY
WORKING_CONE = SMALLEST COMPLETE PROVEN DIAGNOSIS/MUTATION CONE

PROJECT FRAME ≠ WORKING CONE
GLOBAL CONTEXT ≠ GLOBAL MUTATION
OBJECTIVE ≠ PROJECT TRUTH
OBJECTIVE ≠ AUTHORITY
OBJECTIVE ≠ ARCHITECTURAL EXCEPTION
OBJECTIVE ≠ PERMISSION TO REGRESS PREVIOUSLY PROVEN CANONICAL CLOSURE
```

The project frame is reconstructed/revalidated from current authorized intent, applicable governance/product truth, live ownership/architecture, contracts, data, runtime, affected consumers and previously proven canonical closures. It may remain explicitly incomplete where evidence is insufficient; it must never be falsely completed. An unknown that can materially change the current target/treatment blocks only its dependent cone.

Every material focus dimension is considered for applicability on every invocation. Only dimensions capable of changing correctness, priority, treatment, blast radius or closure are deeply executed. Silence is not `N/A`.

Governance is BThwani's durable project memory, not a task log or code mirror. Every newly proven material fact that can affect future platform understanding must be classified under `01`/`02`. A proven durable, material, reusable Product/System/Policy truth whose absence or ambiguity can materially mislead future objectives, agents or sessions must be reconciled into the smallest existing canonical governance owner after the actual system truth is proven. Discovery alone never authorizes a governance write.

No material semantic system change may proceed without governance impact classification. No closure is valid while material governance drift or a materially missing proven durable truth can mislead current or future project work. Governance never wins blindly and implementation never wins blindly; both converge on reconciled Canonical Product/System Truth under `01`, `02`, the governance focus module, `03` and `04`.

This directory is a textual command package interpreted directly by a human/agent. It is **not** application/runtime code, a framework, a CLI, a workflow, a validator, a guard system, a machine registry, or a generated state machine.

Correct use of this package must not depend on any external prompt, legacy command, plan package, script, guard, workflow, validator, CLI, hook, machine status file, or generated orchestration representation.

Project tooling and external research may be used only as evidence or execution machinery for the **target system** when materially relevant. Neither becomes an execution engine or self-certification mechanism for this package.

## 1. Canonical internal ownership

The package has exactly these semantic owners:

1. `00-ORCHESTRATOR.md` — governing law, project-frame invariant, progressive-governance invariant, goal-driven audit/execution lifecycle, invocation, optional phase handoff, independence, protection and valid stop states.
2. `01-SCOPE-AUTHORITY-RULES.md` — truth/authority, project-frame reconstruction, objective/working-scope/focus routing, durable project-memory routing, phase/mode authority, research/capability discipline, exclusions, concurrency and longevity.
3. `02-DIAGNOSE-ROOT-CAUSE.md` — detailed audit/inspection/diagnosis/analysis protocol through project orientation, coverage, journeys, findings, decisions, root proof/ranking, durable-truth discovery, project-consistency target modeling and execution readiness.
4. `03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md` — actual treatment, reconstruction, migration, cutover, continuity, simplification, cleanup, progressive governance clarification and mutation discipline.
5. `04-VERIFY-REDIAGNOSE-CLOSE.md` — exact-candidate evidence, project-consistency proof, durable project-memory closure, repository-platform truth when required, review provenance, temporary-plan retirement, post-treatment re-audit/re-inspection/re-diagnosis/re-analysis and fail-closed closure.
6. `focus/code-architecture-organization.md` — implementation architecture, repository structure, UI/UX and discoverability.
7. `focus/governance-product-design.md` — product meaning, governance reconciliation, progressive durable-memory clarification and engineering-governance/control-artifact value.
8. `focus/data-contracts-runtime-security-quality.md` — data, contracts, runtime, security, finance, quality and engineering control-path efficiency.
9. `99-SOURCE-MAP.md` — non-executable source-consolidation/disposition accounting only.

**One material law has one canonical owner.** Other files apply or reference it; they must not create competing formulations.

### 1.1 Package-completeness invariant

`00` is the only invocation entry point, but execution of the package is not execution of this file alone.

```text
ALWAYS LOAD/APPLY: 00 + 01 + 02 + 03 + 04
ALWAYS CONSIDER FOR APPLICABILITY: all three focus modules
DEEPEN ONLY: materially applicable focus dimensions
```

A worker/session may not skip a canonical owner because the objective appears local, because an earlier worker summarized it, or because a nearby check is green. Previously acquired evidence may be reused only under its validity/provenance rules; package obligations themselves are not optional cached advice.

## 2. Package protection

During ordinary project work this directory is read-only. Package maintenance is allowed only when the current human instruction explicitly authorizes changing this package.

Protection covers direct and indirect mutation: edit, format, rename, move, delete, generated rewrite, bulk replacement and conflict resolution.

Do not create or retain automation whose purpose is to parse, validate, police, approve, score, execute or self-test this textual package. A project guard may validate project governance/code/runtime, but it must not make the correctness of these Markdown commands machine-dependent.

## 3. Invocation

Use:

```text
REPOSITORY: <owner/repo>
BRANCH: <exact branch/ref>
OBJECTIVE: <material outcome to audit/inspect/diagnose/analyze/fix/restructure/clean/close; discovery itself may be the objective>
PHASE: <AUTO | AUDIT_PREPARE | EXECUTE_CLOSE>
PLAN_FILE: <NONE | exact temporary plan path>
MODE: <AUTO | DIAGNOSE | EXECUTE_END_TO_END | EXECUTE_PROJECT_CLOSURE>
PRIMARY_FOCUS: <AUTO | optional explicit focus>
SCOPE: <AUTO | repository/domain/service/surface/feature/journey/path/semantic scope>
RESEARCH: <AUTO | INTERNAL_ONLY | EXTERNAL_ALLOWED>
EXECUTION_LOCATION: <DIRECT_ON_TARGET | ISOLATED_WORKSPACE when explicitly required/allowed>
```

Defaults when omitted:

```text
PHASE = AUTO
PLAN_FILE = NONE
MODE = resolve from explicit PHASE under 01; otherwise EXECUTE_END_TO_END
PRIMARY_FOCUS = AUTO
PROJECT_FRAME = repository-wide orientation/reconciliation under 01
SCOPE = derive the smallest complete working cone from OBJECTIVE inside the project frame, then expand through proven relations
RESEARCH = AUTO
PLANS = NONE unless AUDIT_PREPARE explicitly requests its single exact temporary PLAN_FILE
PRE-EXECUTION METHOD = AUDIT + INSPECT + DIAGNOSE + ANALYZE
EXECUTION PRIORITY = HIGHEST PROVEN SYSTEMIC ROOT
```

The invocation token `MODE=DIAGNOSE` is intentionally retained for compatibility and routing simplicity. It **does not mean diagnosis-only**. It means the full read-only `AUDIT + INSPECT + DIAGNOSE + ANALYZE` protocol governed here and detailed by `01`/`02`, without target-system mutation.

No prepare phase is required by default. `PHASE` is an optional human-requested handoff overlay; its authority relationship to `MODE` and `PLAN_FILE` is owned by `01`.

### 3.1 `AUDIT_PREPARE`

Perform the full audit/inspection/diagnosis/analysis and prove roots, decisions, Canonical Target and Root-Correct Treatment without mutating the target system.

If any material `DECISION_REQUIRED` can change the target/treatment, stop **before any plan-file write**, batch the material questions under §12, and wait for the decision. After decisions are supplied, propagate them and re-audit/re-inspect/re-diagnose/re-analyze the affected cone before preparing the handoff.

Only when execution truth is sufficiently resolved may this phase create exactly one explicitly requested temporary file at the exact `PLAN_FILE` path supplied by the invocation. The path must not depend on a `TASK` field.

The file records the material evidence, findings, proven roots, blast radius, resolved decisions, Canonical Target, Root-Correct Treatment, migrations/cutovers/cleanup, required governance dispositions that have passed the governance mutation gate, durable-truth clarification requirements, verification and closure criteria. It does not become authority; `01` owns that rule.

After writing it, do not begin treatment. Report a **detailed human-readable summary in the conversation** covering what was audited/inspected/diagnosed/analyzed, the highest roots and gaps, the Canonical Target, material treatment/cleanup/governance impact, risks/dependencies, what the file contains and what remains to execute. End with `READY_FOR_EXECUTION` plus the exact `PLAN_FILE` path.

### 3.2 `EXECUTE_CLOSE`

Requires an existing `PLAN_FILE`. Before mutation, re-resolve latest live truth, revalidate the project frame and revalidate the file rather than executing it mechanically. Correct stale assumptions/findings, add materially related newly exposed work, re-rank by the highest proven root, and raise any new true `DECISION_REQUIRED` before the dependent mutation.

Then execute through `03` and verify/close through `04`. Continue the adaptive root loop until the entire proven affected cone is closed, all project-frame invariants materially touched by it are reconciled and every newly proven durable material truth with future-governance value has been dispositioned; the original plan list is not a stopping boundary. Keep the temporary file until the retirement conditions in `04` are met.

## 4. Goal-driven auditing and execution, not checklist-driven execution

`OBJECTIVE` is the desired material outcome and current priority inside the project-wide frame. It is not a file list, not the source of Product/System truth, not a license for an unrelated repository sweep and not permission to optimize the local target at the expense of the rest of the platform.

```text
RECONSTRUCT / REVALIDATE PROJECT-WIDE CANONICAL FRAME
→ locate OBJECTIVE inside that frame
→ identify semantic/operational root
→ disposition all material focus dimensions for applicability
→ derive deep focus set + initial working cone
→ audit material coverage/completeness/conformance/negative space
→ inspect direct live evidence
→ analyze truth, relations, contradictions, risk and systemic leverage
→ diagnose causal/root structure
→ expand only through proven authority/causal/dependency/consumer/contract/data/runtime/security/blast-radius relations
→ prove project-consistent target state
→ treat the highest proven root
```

Universal capability does **not** mean universal deep execution scope. All canonical focus dimensions are considered for material applicability; deeply execute only those that can change correctness, priority, target, treatment, blast radius or closure.

For broad or repository-wide objectives, "audit everything" means complete material accounting across all applicable domains/surfaces/foundations and explicit proof for exclusions; it does not mean mechanically applying every expensive technique to every file.

`PRIMARY_FOCUS=AUTO` means infer the smallest materially sufficient deep focus set after the all-dimension applicability pass. An explicit focus is an orientation, never permission to ignore another materially relevant dimension.

`RESEARCH=AUTO` applies the research escalation rules in `01`: use current local/connected evidence first, then obtain authoritative external technical evidence when internal knowledge is materially insufficient and external access is allowed. External evidence may resolve technical/standard/platform facts or inform design options; it never invents BThwani Product Truth.

## 5. Exact live target first

Before audit, inspection, diagnosis, analysis or mutation:

```text
resolve exact REPOSITORY + BRANCH/ref
→ PIN STARTING_LIVE_HEAD
→ inspect that exact truth
```

Never substitute a default branch for an explicitly named ref. Never infer branch-specific absence from a search index that does not prove that ref.

Before every material write batch, before ref movement/push, and before final closure:

```text
re-resolve live HEAD
→ compare with last reconciled HEAD
→ classify foreign/concurrent delta under 01
→ invalidate/reconcile affected assumptions, project-frame claims and evidence
→ continue only from current truth
```

Latest HEAD is the integration baseline; recency is not execution priority.

## 6. Governing lifecycle

```text
UNDERSTAND OBJECTIVE AS CURRENT PRIORITY
→ RESOLVE LIVE TARGET
→ RECONSTRUCT / REVALIDATE PROJECT-WIDE CANONICAL FRAME
→ ESTABLISH AUTHORITY + PRODUCT/OPERATIONAL ROOT
→ DISPOSITION ALL MATERIAL FOCUS DIMENSIONS FOR APPLICABILITY
→ DERIVE DEEP FOCUS + INITIAL WORKING CONE
→ AUDIT MATERIAL COVERAGE / INVENTORY / CONFORMANCE / CONSISTENCY / NEGATIVE SPACE
→ INSPECT DIRECT LIVE AUTHORITY / GOVERNANCE / CODE / CONTRACT / DATA / RUNTIME / CONSUMER EVIDENCE
→ START AT MINIMUM DIAGNOSTIC ALTITUDE
→ BROAD DISCOVERY AS REQUIRED BY RISK/RELATIONS
→ ANALYZE TRUTH CLASSES / RELATIONS / CONTRADICTIONS / PARALLEL TRUTH / RISK / BLAST RADIUS / LEVERAGE
→ RESEARCH WHEN MATERIAL KNOWLEDGE/EVIDENCE IS INSUFFICIENT
→ RECONSTRUCT JOURNEYS / OWNERS / STATES / HANDOFFS
→ COLLECT BOTTOM-UP EVIDENCE
→ DIAGNOSE CAUSAL CHAINS + ROOT CANDIDATES
→ CHALLENGE / FALSIFY COMPETING HYPOTHESES
→ BUILD FINDING + ROOT-CAUSE LANDSCAPE
→ COMPETITIVELY DEEPEN ROOTS THAT CAN CHANGE PRIORITY
→ SELECT HIGHEST PROVEN SYSTEMIC ROOT
→ DEFINE CANONICAL TARGET STATE + ROOT-CORRECT TREATMENT
→ PROVE PROJECT-CONSISTENCY EXECUTION GATE
→ EXECUTE SMALLEST COMPLETE ROOT-CORRECT CHANGE
→ MIGRATE ALL MATERIAL WRITERS / READERS / CONSUMERS / DATA
→ CANONICAL CUTOVER
→ DELETE/RETIRE SUPERSEDED REACHABLE PATHS WHEN PROVEN SAFE
→ VERIFY ACTUAL SYSTEM TRUTH
→ CLASSIFY NEWLY PROVEN MATERIAL KNOWLEDGE FOR DURABLE PROJECT MEMORY
→ RECONCILE / ENRICH MATERIAL GOVERNANCE WHEN REQUIRED
→ CROSS-CHECK GOVERNANCE ↔ SYSTEM ↔ PROJECT FRAME
→ VERIFY WITH CLAIM-APPROPRIATE EVIDENCE
→ RE-AUDIT + RE-INSPECT + RE-DIAGNOSE + RE-ANALYZE AFFECTED CONE + TOUCHED PROJECT INVARIANTS
→ RE-RANK
→ REPEAT
→ FINAL PROJECT-CONSISTENCY + DURABLE-TRUTH CLARITY + NEGATIVE-SPACE + ADVERSARIAL AUDIT / INSPECTION / DIAGNOSIS / ANALYSIS
→ CLOSE OR REMAIN OPEN
```

Do not wait for an exhaustive low-level scan once the highest root is proven deeply enough to rank and treat. Do not execute a lower finding while a materially higher unresolved cause can change the correct treatment.

## 6.1 Maximum-safe-parallel execution law

> **MAXIMUM SAFE PARALLELISM; ONE PROJECT FRAME; ONE CANONICAL INTEGRATION TRUTH; ZERO REDUNDANT WORK; ZERO WEAKER PROOF.**

Execution is sequential only where causality, authority, shared mutation, dependency or evidence requires sequentiality.

Once multiple Root Causes are sufficiently proven and ranked, continuously derive the current executable frontier:

```text
PROVEN ROOT LANDSCAPE
→ ROOT DEPENDENCIES
→ AUTHORITY / WRITE OVERLAP
→ READY INDEPENDENT ROOTS
→ MAXIMUM SAFE PARALLEL SET
→ EXECUTE
→ VERIFY AFFECTED CLAIMS
→ RECONCILE
→ RE-AUDIT / RE-RANK
→ IMMEDIATELY REFILL AVAILABLE CAPACITY
```

### Parallelization unit

Parallelize by **coherent Root Cause ownership**, not by arbitrary file, application, frontend/backend, language or repository-folder partition.

A worker that owns a Root Cause owns the smallest complete end-to-end treatment required for that root across all materially affected:

`authority | contracts | data | backend | frontend | runtime | consumers | migration | cleanup | verification`.

Do not split one coherent root between independent workers when doing so would create competing target models, duplicate authority or partial cutover.

### Safe concurrency test

Two work items may execute concurrently only when all are proven:

```text
NO unresolved causal dependency between them
AND NO conflicting canonical-authority ownership
AND NO unsafe overlapping write set
AND NO shared migration/cutover requiring ordered mutation
AND NO evidence dependency requiring one result before the other
```

Read overlap alone does not prohibit concurrency.

When overlap is uncertain, treat it as non-parallel until proven safe.

### Single integration authority

Multiple workers may diagnose, execute and verify independent roots concurrently, but there must remain exactly one canonical integration authority for:

```text
project-wide canonical frame
live-HEAD reconciliation
root landscape
priority/ranking
shared-authority decisions
previously proven canonical closures
durable project-memory reconciliation
collision resolution
candidate integration
final closure state
```

No worker may silently redefine shared Product/System truth, governance meaning or project architecture because of its local objective or implementation. No worker may independently publish a competing governance interpretation of a durable fact.

### Work-conserving scheduling

Do not introduce artificial batch barriers.

When any active root finishes:

```text
verify its materially affected claims
→ reconcile its result with current live truth and project frame
→ classify any newly proven durable knowledge
→ invalidate only affected evidence
→ update root/dependency landscape
→ unlock newly executable roots
→ immediately assign available execution capacity
```

Do not wait for unrelated workers to finish before starting newly ready independent work.

A `DECISION_REQUIRED`, blocker or long-running verification suspends only its dependent cone; all proven independent work continues.

### Evidence and context reuse

Previously acquired evidence remains reusable while its provenance and assumptions remain valid.

Do not repeat repository-wide discovery, audit, inspection, research, builds, tests or runtime checks merely because another worker/session begins.

```text
VALID EVIDENCE → REUSE
INVALIDATED EVIDENCE → REACQUIRE AFFECTED PROOF
UNKNOWN VALIDITY → REVALIDATE THE MINIMUM REQUIRED ASSUMPTION
```

Every new worker/session still re-resolves live HEAD and revalidates enough of the project frame to prove that reused evidence, durable governance memory and prior canonical closures remain applicable. Restart broad diagnosis only when evidence proves that the governing baseline, authority model or material coverage has been invalidated.

### No redundant execution

Before beginning a work item, prove that it is not already:

`treated | superseded | being treated by another owner | invalidated by a higher root | blocked by an unresolved parent | obsolete after current-head movement`.

Do not allow multiple workers to independently solve the same symptom/root.

### Higher-root preemption

If execution exposes a newly proven Root Cause materially higher than the active treatment:

```text
STOP affected lower-level treatment
→ preserve valid evidence/work
→ promote the higher root
→ invalidate affected descendant assumptions
→ re-rank
→ treat the higher root first
```

Do not continue accumulating descendant symptom fixes.

### Cross-objective non-regression

A successful current objective may not invalidate a previously proven Canonical closure or project invariant. If new evidence proves a previous closure/model wrong or incomplete:

```text
REOPEN AFFECTED CLOSURE
→ PROVE HIGHER ROOT / TRUTH CHANGE
→ RECONCILE PROJECT FRAME
→ MIGRATE ALL AFFECTED AREAS
→ RECONCILE DURABLE GOVERNANCE MEMORY
→ REVERIFY
```

Do not preserve both interpretations.

### Speed/accuracy invariant

Speed may come only from:

```text
safe parallelism
+ evidence/context reuse
+ affected-only verification
+ delta-first reconciliation
+ removal of redundant work
+ continuous scheduling
+ highest-root-first treatment
```

Speed must never come from:

```text
skipped material audit/inspection/diagnosis/analysis
skipped project-frame/authority or blast-radius proof
skipped focus applicability disposition
skipped affected consumers
skipped durable-truth classification when material
weaker verification
silent assumptions
partial migration
symptom treatment
premature closure
```

If acceleration conflicts with correctness or proof, correctness and fail-closed proof win.

Parallel execution changes scheduling only; it does not weaken any requirement owned by `01`, `02`, `03` or `04`.

## 7. Audit, inspection, diagnosis and analysis are distinct mandatory operations

These terms are related but are **not interchangeable** and must not be silently collapsed into "diagnosis":

```text
AUDIT
= establish materially complete accounting of what exists, what should exist, authority/conformance, consistency/divergence, duplication, legacy/reachability, omissions and negative space.

INSPECTION
= directly examine the exact live artifacts and behavior that can prove or disprove claims: authority, governance, code, contracts, data, runtime, configuration, consumers, repository-platform state and other materially relevant evidence.

DIAGNOSIS
= explain observed or discovered defects through causal chains, operational parents, canonical owners/writers and the highest provable Root Cause.

ANALYSIS
= compare meanings, truth classes, hypotheses, alternatives, dependencies, consumers, blast radius, risk, recurrence, systemic leverage, project-frame consistency, durable-knowledge implications, target states and treatment tradeoffs before deciding what is correct.
```

Mandatory consequences:

- `NOT_INSPECTED ≠ CLEAN`.
- `NO FINDING YET ≠ AUDITED CLEAN`.
- inventory without semantic/causal analysis is not sufficient audit proof.
- a local defect explanation without completeness/negative-space inspection is not sufficient broad audit proof.
- a broad scan without direct evidence and root analysis is not sufficient diagnosis.
- a proposed treatment without canonical target and project-consistency analysis is not execution-ready.
- a material area may be closed only when the applicable audit, inspection, diagnosis and analysis obligations are satisfied or explicitly `N/A_PROVEN` under `01`/`02`/`04`.

The detailed techniques, coverage model, findings ledger, root proof and target modeling remain canonically owned by `02`; this section defines the non-optional semantic distinction and lifecycle obligation only.

## 8. Evidence does not grant execution authority

A technical observation begins as `EVIDENCE/HOLD`.

Promotion requires enough proof of:

```text
Operational Parent
→ Semantic Meaning
→ Project-Frame Relation
→ Causal Chain
→ Highest Proven Root Cause
→ Affected Graph
→ Comparative Priority
```

The only exception is a proven `DIAGNOSTIC_BLOCKER` that prevents acquiring truth. Fix it minimally without redefining Product Semantics, then return immediately to the higher audit/inspection/diagnosis/analysis flow.

## 9. Root treatment law

A patch is any change that makes a symptom disappear without eliminating its proven parent Root Cause.

Known final-state workaround, silent fallback, bypass, dual authoritative writer, parallel source of truth, shadow state machine, reachable obsolete route, half migration, or indefinite compatibility without a real bounded rollout need prevents closure.

Preferred treatment:

> **the smallest complete root-correct change that removes the proven cause, preserves proven value, reconciles the material blast radius, remains consistent with the project-wide Canonical frame, and leaves one canonical operational truth.**

Smallest does not mean local. Complete does not mean rewrite everything.

## 10. Effective scope

```text
PROJECT_FRAME = repository-wide orientation / consistency context

EFFECTIVE_WORKING_SCOPE =
REQUESTED/DERIVED_SCOPE
+ PROVEN_ROOT_CAUSES
+ PROVEN_DEPENDENCIES
+ PROVEN_CONSUMERS
+ PROVEN_AUTHORITIES
+ PROVEN_CONTRACT/DATA/RUNTIME PATHS
+ PROVEN_BLAST_RADIUS
```

The project frame is not permission for repository-wide mutation. Unrelated repository churn remains forbidden.

## 11. Mandatory lenses

Keep every materially applicable lens active:

`PRODUCT/OPERATIONAL MEANING | COMPLETENESS/CONFORMANCE | CONSISTENCY/DIVERGENCE | DIRECT INSPECTION | NEGATIVE SPACE | ROOT CAUSE | DEPENDENCIES | CONSUMERS | DATA INTEGRITY | CONTRACT IMPACT | AUTH/AUTHZ | SECURITY | FINANCE | GOVERNANCE IMPACT | DURABLE-PROJECT-MEMORY IMPACT | RUNTIME | FAILURE/RECOVERY | TESTING | UI/UX | STRUCTURE/NAMING | ENGINEERING EXECUTION COST | LEGACY/PARALLEL-TRUTH CLEANUP`.

Every lens receives an applicability disposition before closure. A lens may be `N/A_PROVEN`; it may never disappear silently. Deep work remains material/risk-driven.

## 12. Decision boundary

Derive every fact evidence can derive. Ask the human only for a material product/business/semantic/architectural choice that cannot safely be derived.

A `DECISION_REQUIRED` request contains:

```text
Decision ID
Question
Why evidence cannot resolve it
Options
Recommendation
Reason
Impact/tradeoffs
Affected roots/journeys/surfaces/contracts/data
```

Stop only the dependent cone; continue all independent work. After a decision, propagate it, invalidate affected assumptions/evidence, revalidate the affected project-frame claims, re-audit/re-inspect/re-diagnose/re-analyze the affected cone and re-rank if material.

## 13. Legitimate stop states

Only:

- `CLOSED` — exact-candidate closure conditions in `04` are proven.
- `READY_FOR_EXECUTION` — valid completion only for `PHASE=AUDIT_PREPARE`; it is not system closure.
- `DECISION_REQUIRED` — true non-derivable material decision.
- `EXTERNAL_BLOCKER` — genuine external dependency/capability/authority gap with an exact unblock condition.

`large scope`, `many findings`, `follow up later`, `write a plan`, `create a ticket`, or `CI is green` are not closure states.

## 14. Closure authority

Only `04-VERIFY-REDIAGNOSE-CLOSE.md` defines final closure. If any materially required condition is unproven, the state remains `OPEN` unless a valid stop state above applies.

Where `02` or `04` use `diagnosis` / `re-diagnosis` as an umbrella lifecycle term, it must be interpreted under this governing law as including the materially required **audit + inspection + diagnosis + analysis** obligations, not diagnosis-only.

## 15. Progressive governance clarification invariant

The package must make future executions better informed as durable truth is proven, without turning governance into a source-code mirror or execution ledger.

```text
DISCOVER ≠ GOVERN
PROVE DURABLE TRUTH → CLASSIFY → ROUTE TO CANONICAL GOVERNANCE OWNER WHEN MATERIAL
EPHEMERAL / TASK-LOCAL / TRANSIENT FACT → DO NOT PROMOTE
UNRESOLVED TRUTH → DO NOT GUESS
```

A newly proven durable truth does not require a governance write when it is already represented clearly and correctly. It does require reconciliation when the existing representation is stale, wrong, conflicting, incomplete or missing in a way that can materially mislead future work.

This law improves the **quality and completeness of durable project understanding over time**, not the volume of documentation. Detailed classification, write gating, routing and closure proof are owned by `01`, `02`, `focus/governance-product-design.md`, `03` and `04`.
