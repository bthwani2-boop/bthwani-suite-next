# BThwani Self-Contained Live Root-Cause Execution Orchestrator

PACKAGE_REVISION: 3
PACKAGE_CLASS: TEXTUAL_EXECUTION_COMMAND_PACKAGE
PROJECT: bthwani-suite-next
SELF_CONTAINED: YES
EXTERNAL_PROMPT_DEPENDENCIES: NONE
SELF_VALIDATION_AUTOMATION: FORBIDDEN
DEFAULT_EXECUTION: LIVE_END_TO_END
DEFAULT_PLAN_ARTIFACTS: FORBIDDEN
DEFAULT_ORCHESTRATOR_MUTABILITY: READ_ONLY

## 0. Governing law

> **TOP-DOWN SEMANTIC AUTHORITY; BOTTOM-UP EVIDENCE; HIGHEST PROVEN SYSTEMIC ROOT FIRST; ACTUAL CODE/DATA/CONTRACT/RUNTIME IS THE PLACE OF TREATMENT; COHERENT END-TO-END CUTOVER; ZERO UNJUSTIFIED PARALLEL TRUTH; ZERO UNJUSTIFIED REACHABLE LEGACY; ZERO DOCUMENTATION-ONLY CLOSURE.**

This directory is a textual command package interpreted directly by a human/agent. It is **not** application/runtime code, a framework, a CLI, a workflow, a validator, a guard system, a machine registry, or a generated state machine.

Correct use of this package must not depend on any external prompt, legacy command, plan package, script, guard, workflow, validator, CLI, hook, machine status file, or generated orchestration representation.

Project tooling may be used only as evidence or execution machinery for the **target project** when materially relevant. It never becomes an execution engine or self-certification mechanism for this package.

## 1. Canonical internal ownership

The package has exactly these semantic owners:

1. `00-ORCHESTRATOR.md` — governing law, lifecycle, invocation, independence, protection and valid stop states.
2. `01-SCOPE-AUTHORITY-RULES.md` — truth/authority, modes, scope, focus routing, exclusions, concurrency and longevity.
3. `02-DIAGNOSE-ROOT-CAUSE.md` — coverage, journeys, findings, decisions, root proof/ranking and execution readiness.
4. `03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md` — actual treatment, reconstruction, migration, cutover, cleanup and mutation discipline.
5. `04-VERIFY-REDIAGNOSE-CLOSE.md` — exact-candidate evidence, review provenance, re-diagnosis and fail-closed closure.
6. `focus/code-architecture-organization.md` — implementation architecture, repository structure, UI/UX and discoverability.
7. `focus/governance-product-design.md` — product meaning, governance reconciliation and engineering-governance value.
8. `focus/data-contracts-runtime-security-quality.md` — data, contracts, runtime, security, finance, quality and engineering control-path efficiency.
9. `99-SOURCE-MAP.md` — non-executable source-consolidation/disposition accounting only.

**One material law has one canonical owner.** Other files apply or reference it; they must not create competing formulations.

## 2. Package protection

During ordinary project work this directory is read-only. Package maintenance is allowed only when the current human instruction explicitly authorizes changing this package.

Protection covers direct and indirect mutation: edit, format, rename, move, delete, generated rewrite, bulk replacement and conflict resolution.

Do not create or retain automation whose purpose is to parse, validate, police, approve, score, execute or self-test this textual package. A project guard may validate project governance/code/runtime, but it must not make the correctness of these Markdown commands machine-dependent.

## 3. Invocation

Use:

```text
REPOSITORY: <owner/repo>
BRANCH: <exact branch/ref>
MODE: <DIAGNOSE | EXECUTE_END_TO_END | EXECUTE_PROJECT_CLOSURE>
PRIMARY_FOCUS: <optional>
SCOPE: <optional>
EXECUTION_LOCATION: <DIRECT_ON_TARGET | ISOLATED_WORKSPACE when explicitly required/allowed>
```

No `PREPARE` phase or repository plan/package is required. Internal reasoning may plan work; repository planning artifacts are created only when explicitly requested.

## 4. Exact live target first

Before diagnosis or mutation:

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
→ invalidate/reconcile affected assumptions and evidence
→ continue only from current truth
```

Latest HEAD is the integration baseline; recency is not execution priority.

## 5. Governing lifecycle

```text
RESOLVE LIVE TARGET
→ ESTABLISH AUTHORITY + PRODUCT/OPERATIONAL ROOT
→ BUILD MATERIAL COVERAGE
→ START AT MINIMUM DIAGNOSTIC ALTITUDE
→ BROAD DISCOVERY
→ RECONSTRUCT JOURNEYS / OWNERS / STATES / HANDOFFS
→ COLLECT BOTTOM-UP EVIDENCE
→ BUILD FINDING + ROOT-CAUSE LANDSCAPE
→ COMPETITIVELY DEEPEN ROOTS THAT CAN CHANGE PRIORITY
→ SELECT HIGHEST PROVEN SYSTEMIC ROOT
→ DEFINE CANONICAL TARGET STATE
→ EXECUTE SMALLEST COMPLETE ROOT-CORRECT CHANGE
→ MIGRATE ALL MATERIAL WRITERS / READERS / CONSUMERS / DATA
→ CANONICAL CUTOVER
→ DELETE/RETIRE SUPERSEDED REACHABLE PATHS WHEN PROVEN SAFE
→ VERIFY WITH CLAIM-APPROPRIATE EVIDENCE
→ RE-DIAGNOSE AFFECTED CONE
→ RE-RANK
→ REPEAT
→ FINAL NEGATIVE-SPACE + ADVERSARIAL RE-DIAGNOSIS
→ CLOSE OR REMAIN OPEN
```

Do not wait for an exhaustive low-level scan once the highest root is proven deeply enough to rank and treat. Do not execute a lower finding while a materially higher unresolved cause can change the correct treatment.

## 6. Evidence does not grant execution authority

A technical observation begins as `EVIDENCE/HOLD`.

Promotion requires enough proof of:

```text
Operational Parent
→ Semantic Meaning
→ Causal Chain
→ Highest Proven Root Cause
→ Affected Graph
→ Comparative Priority
```

The only exception is a proven `DIAGNOSTIC_BLOCKER` that prevents acquiring truth. Fix it minimally without redefining Product Semantics, then return immediately to the higher diagnosis.

## 7. Root treatment law

A patch is any change that makes a symptom disappear without eliminating its proven parent Root Cause.

Known final-state workaround, silent fallback, bypass, dual authoritative writer, parallel source of truth, shadow state machine, reachable obsolete route, half migration, or indefinite compatibility without a real bounded rollout need prevents closure.

Preferred treatment:

> **the smallest complete root-correct change that removes the proven cause, preserves proven value, reconciles the material blast radius, and leaves one canonical operational truth.**

Smallest does not mean local. Complete does not mean rewrite everything.

## 8. Effective scope

```text
EFFECTIVE_SCOPE =
REQUESTED_SCOPE
+ PROVEN_ROOT_CAUSES
+ PROVEN_DEPENDENCIES
+ PROVEN_CONSUMERS
+ PROVEN_AUTHORITIES
+ PROVEN_CONTRACT/DATA/RUNTIME PATHS
+ PROVEN_BLAST_RADIUS
```

Unrelated repository churn remains forbidden.

## 9. Mandatory lenses

Keep every materially applicable lens active:

`PRODUCT/OPERATIONAL MEANING | ROOT CAUSE | DEPENDENCIES | CONSUMERS | DATA INTEGRITY | CONTRACT IMPACT | AUTH/AUTHZ | SECURITY | FINANCE | GOVERNANCE IMPACT | RUNTIME | FAILURE/RECOVERY | TESTING | UI/UX | STRUCTURE/NAMING | ENGINEERING EXECUTION COST | LEGACY/PARALLEL-TRUTH CLEANUP`.

A lens may be `N/A_PROVEN`; it may never disappear silently.

## 10. Decision boundary

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

Stop only the dependent cone; continue all independent work. After a decision, propagate it, invalidate affected assumptions/evidence, re-diagnose the affected cone and re-rank if material.

## 11. Legitimate stop states

Only:

- `CLOSED` — exact-candidate closure conditions in `04` are proven.
- `DECISION_REQUIRED` — true non-derivable material decision.
- `EXTERNAL_BLOCKER` — genuine external dependency/capability/authority gap with an exact unblock condition.

`large scope`, `many findings`, `follow up later`, `write a plan`, `create a ticket`, or `CI is green` are not closure states.

## 12. Closure authority

Only `04-VERIFY-REDIAGNOSE-CLOSE.md` defines final closure. If any materially required condition is unproven, the state remains `OPEN` unless a valid stop state above applies.
