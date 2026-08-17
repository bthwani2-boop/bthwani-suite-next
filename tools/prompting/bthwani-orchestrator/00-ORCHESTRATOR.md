# BThwani Self-Contained Live End-to-End Root-Cause Execution Orchestrator

PACKAGE_REVISION: 2
PACKAGE_CLASS: TEXTUAL_EXECUTION_COMMAND_PACKAGE
PROJECT: bthwani-suite-next
SELF_CONTAINED: YES
EXTERNAL_PROMPT_DEPENDENCIES: NONE
SELF_VALIDATION_AUTOMATION: FORBIDDEN
DEFAULT_EXECUTION: LIVE_END_TO_END
DEFAULT_PLAN_ARTIFACTS: FORBIDDEN
DEFAULT_ORCHESTRATOR_MUTABILITY: READ_ONLY

## 0. Governing law

> **TOP-DOWN SEMANTIC AUTHORITY; BOTTOM-UP EVIDENCE; HIGHEST PROVEN SYSTEMIC ROOT FIRST; CODE/RUNTIME IS THE PLACE OF TREATMENT; COHERENT END-TO-END CUTOVER; ZERO PARALLEL TRUTH; ZERO UNJUSTIFIED LEGACY; ZERO DOCUMENTATION-ONLY CLOSURE.**

This package is a set of human/agent execution commands. It is **not application code, runtime code, a framework, a CLI, a validator, a workflow, or a guard system**.

It must remain fully usable by reading this package alone. No external prompt/command file is required to interpret, run, validate, complete, or close this orchestrator.

## 1. Absolute independence boundary

The orchestration method lives only inside this directory and its files listed below.

It is forbidden to make correct use of this package depend on any external:

`prompt | command file | plan package | validator | script | CLI | workflow | GitHub Action | guard | registry | generated state machine | machine status file`.

Do **not** create scripts, guards, workflows, validators, CLIs, hooks, machine registries, or automation whose purpose is to run, validate, police, approve, score, or self-test the orchestrator itself.

Project tooling is different: tests, CI, scanners, runtime commands, migrations and other tooling that belong to the **target project** may be used as evidence when materially relevant to the project claim being diagnosed. They never become an orchestrator self-validation mechanism.

## 2. Protected package surface

Executable orchestration semantics are owned only by:

1. `00-ORCHESTRATOR.md` — routing, lifecycle, independence and governing invariants.
2. `01-SCOPE-AUTHORITY-RULES.md` — authority, scope, project anchors, exclusions, concurrency and longevity.
3. `02-DIAGNOSE-ROOT-CAUSE.md` — coverage, journeys, findings, decisions, root proof and ranking.
4. `03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md` — live treatment, reconstruction, migration, cutover and cleanup.
5. `04-VERIFY-REDIAGNOSE-CLOSE.md` — exact-candidate proof, re-diagnosis and closure.
6. `focus/code-architecture-organization.md` — code, architecture, repository organization and UI/UX implementation.
7. `focus/governance-product-design.md` — governance, product semantics and product design.
8. `focus/data-contracts-runtime-security-quality.md` — data, contracts, runtime, security, finance and quality.
9. `99-SOURCE-MAP.md` — internal semantic ownership/accounting map only; never execution authority.

No prompt, plan, report, old command, prior session, historical branch, README, comment or generated artifact outside this package is executable authority merely because it exists.

During ordinary project execution this package is read-only. A package defect is reported and isolated; the package must not self-repair unless the human explicitly authorizes package maintenance in the current invocation.

## 3. Invocation

Use:

```text
REPOSITORY: <owner/repo>
BRANCH: <exact branch/ref>
MODE: <DIAGNOSE | EXECUTE_END_TO_END | EXECUTE_PROJECT_CLOSURE>
PRIMARY_FOCUS: <optional; default ALL for project closure>
SCOPE: <optional; default REPOSITORY for project closure>
EXECUTION_LOCATION: <DIRECT_ON_TARGET | ISOLATED_WORKSPACE when explicitly required/allowed>
```

`PRIMARY_FOCUS` is a starting diagnostic lens, never a closure boundary.

`SCOPE` is an orientation root, not a ceiling. The real scope is expanded only by proven causal/ownership/dependency/consumer/blast-radius relationships.

For `EXECUTE_PROJECT_CLOSURE`:

```text
PRIMARY_FOCUS = ALL
SCOPE = REPOSITORY
```

unless explicitly narrowed.

There is no mandatory PREPARE/package phase. Planning may exist as internal reasoning, not as a repository artifact. Repository planning/documentation is created only when explicitly requested.

## 4. Exact live target first

Before diagnosis or mutation:

```text
resolve exact REPOSITORY + BRANCH/ref
→ PIN STARTING_LIVE_HEAD
→ inspect from that exact truth
```

Never substitute the default branch when an exact ref is specified. Never infer repository-wide absence from a search index that does not prove the requested ref.

Before every material write batch, before push/ref movement, and before final closure:

```text
re-resolve current live HEAD
→ compare with last reconciled HEAD
→ classify foreign/concurrent delta
→ reconcile affected assumptions/evidence
→ continue only from current truth
```

Latest HEAD is the truth/integration baseline. **Recency is not work priority.**

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
→ MIGRATE ALL MATERIAL WRITERS/READERS/CONSUMERS/DATA
→ CANONICAL CUTOVER
→ DELETE/RETIRE SUPERSEDED REACHABLE PATHS WHEN PROVEN SAFE
→ VERIFY WITH CLAIM-APPROPRIATE EVIDENCE
→ RE-DIAGNOSE AFFECTED CONE
→ RE-RANK
→ REPEAT
→ FINAL NEGATIVE-SPACE + ADVERSARIAL RE-DIAGNOSIS
→ CLOSE OR REMAIN OPEN
```

Do not wait for an exhaustive low-level scan once the highest root is proven deeply enough to rank and treat. Do not execute a low-level finding while a materially higher unresolved cause can change its correct treatment.

## 6. Evidence is not execution authority

A technical observation begins as:

```text
EVIDENCE/HOLD
```

It may be promoted only after enough of the following are proven:

```text
Operational Parent
→ Semantic Meaning
→ Causal Chain
→ Highest Proven Root Cause
→ Affected Graph
→ Comparative Priority
```

or it is dispositioned with proof.

The sole exception is a proven `DIAGNOSTIC_BLOCKER` that prevents acquiring truth. Fix it minimally without redefining Product Semantics, then return immediately to the higher diagnosis.

## 7. Root treatment law

A patch is any change that makes a symptom disappear without eliminating its proven parent Root Cause.

Known final-state workaround, silent fallback, bypass, dual writer, parallel source of truth, shadow state machine, reachable obsolete route, half migration or compatibility layer without a real bounded rollout need prevents closure.

The preferred change is:

> **the smallest complete root-correct change that removes the proven cause, preserves proven value and reconciles the entire material blast radius.**

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

A narrow request may require mutation outside the named path/surface. Unrelated repository churn remains forbidden.

## 9. Mandatory lenses

Keep every materially applicable lens active:

`PRODUCT/OPERATIONAL MEANING | ROOT CAUSE | DEPENDENCIES | CONSUMERS | DATA INTEGRITY | CONTRACT IMPACT | AUTH/AUTHZ | SECURITY | FINANCE | GOVERNANCE IMPACT | RUNTIME | FAILURE/RECOVERY | TESTING | UI/UX | STRUCTURE/NAMING | LEGACY/PARALLEL TRUTH CLEANUP`.

A lens may be `N/A_PROVEN`; it may never disappear silently.

## 10. Decision boundary

Derive every fact the evidence can derive. Ask the human only for a material product/business/semantic/architectural choice that cannot safely be derived.

A `DECISION_REQUIRED` request must contain:

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

Stop only the dependent cone. Continue all independent work.

After the decision:

```text
propagate decision
→ invalidate affected assumptions/evidence
→ re-diagnose affected cone
→ re-rank if material
```

## 11. Legitimate stop states

Only:

- `CLOSED` — exact-candidate closure gate proven.
- `DECISION_REQUIRED` — true non-derivable material decision.
- `EXTERNAL_BLOCKER` — genuine external dependency that cannot be resolved with current authority/capabilities, with exact unblock condition.

`too many findings`, `large scope`, `follow up later`, `create a ticket`, `write a plan`, or `CI is green` are not closure states.

## 12. Closure authority

Closure is fail-closed and governed by `04-VERIFY-REDIAGNOSE-CLOSE.md`.

At minimum, final closure requires zero known material open roots/findings, zero silent exclusions, zero unresolved required decisions, zero unaccounted affected consumers, zero unjustified parallel truth/reachable legacy path, zero unverified material claims, exact reconciliation with the latest required HEAD/candidate, and successful final negative-space plus adversarial re-diagnosis.

If any required condition is unproven, state remains `OPEN`.