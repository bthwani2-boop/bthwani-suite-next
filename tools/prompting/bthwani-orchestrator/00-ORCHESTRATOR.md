# BThwani Live End-to-End Root-Cause Execution Orchestrator

PACKAGE_REVISION: 1
PACKAGE_CLASS: PROTECTED_ENGINEERING_CONTROL_PLANE
PROJECT: bthwani-suite-next
DEFAULT_EXECUTION: LIVE_END_TO_END
DEFAULT_PLAN_ARTIFACTS: FORBIDDEN
DEFAULT_ORCHESTRATOR_MUTABILITY: READ_ONLY

## 0. Governing law

> **TOP-DOWN SEMANTIC AUTHORITY; BOTTOM-UP EVIDENCE; HIGHEST PROVEN SYSTEMIC ROOT FIRST; LIVE ROOT-CORRECT EXECUTION; COHERENT END-TO-END CUTOVER; ZERO PARALLEL TRUTH; ZERO UNJUSTIFIED LEGACY; ZERO DOCUMENTATION-ONLY CLOSURE.**

This package governs how live project truth is discovered, diagnosed, executed, restructured, verified and closed. It is not Product Truth and it is not Runtime/Product code.

`tools/prompting/bthwani-orchestrator/**` is a protected engineering control plane. During normal project work it is **read-only**. No agent may create, modify, move, rename, delete, reformat, regenerate or indirectly alter this package unless the human explicitly authorizes that package change in the current invocation. Repository-wide execution, cleanup, `FOCUS: ALL`, or a previous authorization is not such authorization.

If this package itself appears defective during normal project execution: prove/report the defect; continue unaffected work when safe; use `DECISION_REQUIRED` only if the defect materially blocks correct execution; **do not self-repair**.

## 1. Canonical package surface

Executable orchestration semantics live only in these files:

1. `00-ORCHESTRATOR.md` — routing, lifecycle and governing invariants.
2. `01-SCOPE-AUTHORITY-RULES.md` — scope, authority, project anchors, exclusions and longevity.
3. `02-DIAGNOSE-ROOT-CAUSE.md` — coverage, semantic/operational diagnosis and root-cause proof.
4. `03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md` — live treatment, restructuring, migration, cutover and cleanup.
5. `04-VERIFY-REDIAGNOSE-CLOSE.md` — proof, re-diagnosis and closure.
6. `focus/code-architecture-organization.md` — code, architecture, repository organization, naming, UI/UX implementation.
7. `focus/governance-product-design.md` — product semantics, governance, policies and reconciliation.
8. `focus/data-contracts-runtime-security-quality.md` — data, contracts, runtime, security, finance and quality.
9. `99-SOURCE-MAP.md` — migration/traceability record for the command corpus; never runtime authority.

No old prompt, command, plan, report, package, historical branch or prior session is executable authority merely because it exists.

## 2. Invocation

Preferred form:

```text
BRANCH: <exact branch/ref>
MODE: <DIAGNOSE | EXECUTE_END_TO_END | EXECUTE_PROJECT_CLOSURE>
PRIMARY_FOCUS: <optional; default ALL for project closure>
SCOPE: <optional; default REPOSITORY for project closure>
```

`PRIMARY_FOCUS` is the starting diagnostic lens, not a closure boundary.

`SCOPE` is the requested orientation root, not the maximum allowed reach.

For `EXECUTE_PROJECT_CLOSURE`:

```text
PRIMARY_FOCUS = ALL
SCOPE = REPOSITORY
```

unless the human explicitly narrows either.

There is no default planning/package phase. If planning is useful, it is internal execution reasoning, not a repository artifact.

## 3. Plans are outside the default execution flow

`plans/**` and `plans/diagnose-implementing/**` are optional historical/user-requested records only.

During normal execution:

- do not create or update `plans/**`;
- do not create diagnosis packages or execution packages;
- do not create speculative execution sequences;
- do not use plan state as authority, current truth, implementation evidence or DONE evidence.

Writing a plan is allowed only when the human explicitly requests planning/documentation work.

## 4. Exact live target first

Before diagnosis or mutation:

```text
resolve exact repository + branch/ref
→ pin current live HEAD
→ inspect from that exact truth
```

Never substitute the default branch when a branch/ref is specified. Never infer repository-wide absence from default-branch search.

Before each material write batch and before final closure:

```text
re-resolve live HEAD
→ classify concurrent/foreign delta
→ reconcile affected assumptions and evidence
→ continue only from current truth
```

Recency never sets work priority. Latest HEAD is truth/integration baseline, not execution authority.

## 5. Execution lifecycle

```text
RESOLVE LIVE TARGET
→ ESTABLISH AUTHORITY + PROJECT ANCHORS
→ BUILD MATERIAL COVERAGE
→ START AT MINIMUM DIAGNOSTIC ALTITUDE
→ DISCOVER / MODEL
→ PROVE ROOT-CAUSE LANDSCAPE
→ COMPETITIVELY DEEPEN ROOTS THAT CAN CHANGE PRIORITY
→ SELECT HIGHEST PROVEN SYSTEMIC ROOT
→ EXECUTE THE SMALLEST COMPLETE ROOT-CORRECT CHANGE
→ MIGRATE ALL MATERIAL WRITERS/READERS/CONSUMERS
→ CANONICAL CUTOVER
→ DELETE/RETIRE SUPERSEDED PATHS WHEN PROVEN SAFE
→ VERIFY AT CLAIM-APPROPRIATE RISK LEVEL
→ RE-DIAGNOSE AFFECTED SYSTEM
→ SELECT NEXT HIGHEST ROOT
→ REPEAT
→ FINAL NEGATIVE-SPACE + ADVERSARIAL RE-DIAGNOSIS
→ CLOSE OR REMAIN OPEN
```

Do not wait for exhaustive low-level scanning when the highest root is already proven deeply enough to rank and treat. Do not execute a low-level finding while a materially higher unresolved cause can change its correct treatment.

## 6. Root treatment, not symptom treatment

A technical observation is initially evidence:

```text
EVIDENCE/HOLD
→ PROMOTED only after operational parent + causal chain + root + affected graph are proven
→ or DISPOSITIONED with proof
```

A patch is any change that suppresses a symptom without eliminating its proven parent Root Cause.

Known workaround/fallback/bypass/parallel source of truth/half migration cannot be final closure.

The correct change is not the largest possible rewrite. It is:

> **the smallest complete root-correct change that removes the proven cause and reconciles its material blast radius.**

## 7. Effective scope

```text
EFFECTIVE_SCOPE
=
REQUESTED_SCOPE
+ PROVEN_ROOT_CAUSES
+ PROVEN_DEPENDENCIES
+ PROVEN_CONSUMERS
+ PROVEN_AUTHORITIES
+ PROVEN_BLAST_RADIUS
```

A narrow request may therefore require changes outside the named surface/path. This is required when necessary for correct closure; unrelated scope expansion is forbidden.

## 8. Project-specific but live-verified

This orchestrator is intentionally specific to bthwani-suite-next. Stable names may be used as discovery anchors, but their current meaning/ownership must still be proven live.

Known anchors and classification rules are in `01-SCOPE-AUTHORITY-RULES.md`.

Principle:

> **PROJECT-SPECIFIC NAMES MAY BE STABLE; PROJECT-SPECIFIC MEANING MUST STILL BE VERIFIED LIVE.**

## 9. Mandatory lenses

Regardless of focus, keep these materially applicable lenses on:

`ROOT CAUSE | DEPENDENCIES | CONSUMERS | DATA INTEGRITY | CONTRACT IMPACT | SECURITY | GOVERNANCE IMPACT | TESTING | RUNTIME PROOF | LEGACY/PARALLEL TRUTH CLEANUP`

A lens may be `N/A_PROVEN`; it may never disappear silently.

## 10. Decision boundary

Derive what evidence can derive. Ask the human only for a material product/business/semantic choice that cannot be derived safely.

A `DECISION_REQUIRED` request must contain:

`question | options | recommendation | reason | impact/blast radius | migration consequences`

Continue independent work that does not depend on that decision.

## 11. Legitimate stop states

Only:

- `CLOSED` — closure gate proven.
- `DECISION_REQUIRED` — true non-derivable material decision.
- `EXTERNAL_BLOCKER` — genuine external dependency not resolvable from repository/runtime capabilities.

`too many findings`, `large scope`, `follow up later`, `create ticket`, or `write a plan` are not closure states.

## 12. Final closure authority

Closure is governed by `04-VERIFY-REDIAGNOSE-CLOSE.md` and is fail-closed.

At minimum, final closure requires no known material open root/finding, no silent exclusion, no unresolved decision, no unaccounted affected consumer, no unjustified parallel truth/legacy path, no proven governance drift left in scope, no unverified material claim, reconciliation with the latest exact HEAD, and a passing final adversarial re-diagnosis.

If any required condition is not proven, the state is `OPEN`.