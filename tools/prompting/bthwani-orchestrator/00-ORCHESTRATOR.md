# BThwani Goal-Driven Root-Cause Orchestrator

PACKAGE_REVISION: 5
PACKAGE_CLASS: TEXTUAL_EXECUTION_COMMAND
PROJECT: bthwani-suite-next
SELF_CONTAINED: YES
EXTERNAL_PROMPT_DEPENDENCIES: NONE
DEFAULT_EXECUTION: LIVE_END_TO_END
DEFAULT_PLAN_ARTIFACTS: NONE

## Governing law

> GOAL-DRIVEN SEMANTIC AUTHORITY; TOP-DOWN DIAGNOSIS; BOTTOM-UP EVIDENCE; HIGHEST PROVEN ROOT FIRST; SMALLEST COMPLETE ROOT-CORRECT CHANGE; ONE CANONICAL TRUTH; ZERO UNJUSTIFIED LEGACY; ZERO DOCUMENTATION-ONLY CLOSURE.

This file is the only prompting/orchestration entry point. It is interpreted directly by a human or agent. It is not a runtime framework, registry, validator, guard, workflow, state machine, generated plan, or self-certification mechanism.

## Invocation

```text
REPOSITORY: <owner/repo>
BRANCH: <exact branch/ref>
OBJECTIVE: <material outcome>
MODE: <DIAGNOSE | EXECUTE_END_TO_END | EXECUTE_PROJECT_CLOSURE>
SCOPE: <AUTO | explicit semantic scope>
RESEARCH: <AUTO | INTERNAL_ONLY | EXTERNAL_ALLOWED>
EXECUTION_LOCATION: <DIRECT_ON_TARGET | ISOLATED_WORKSPACE when explicitly requested>
```

Defaults:

```text
SCOPE = smallest complete semantic scope proven by the objective and evidence
RESEARCH = AUTO
PLANS = NONE
EXECUTION_PRIORITY = highest proven systemic root
```

## Execution model

1. Resolve the exact repository and requested branch/ref. Pin the live HEAD before diagnosis and before every material write batch.
2. Start from product/operational meaning, ownership, states, transitions, invariants and canonical truth. Technical findings begin as evidence, not execution authority.
3. Derive the smallest complete scope. Expand only through proven causal, authority, dependency, consumer, contract, data, runtime, security or blast-radius relations.
4. Diagnose deeply enough to prove and rank the highest material root. Do not wait for an unrelated exhaustive repository sweep once the treatment is determined.
5. Ask the human only for a material product/business/semantic/architectural decision that cannot safely be derived. A decision blocks only its dependent cone; independent work continues.
6. Execute the smallest complete root-correct change in the actual code/data/contracts/runtime. A symptom patch, silent fallback, duplicate writer, parallel truth or indefinite legacy path is not closure.
7. Migrate every materially affected writer, reader and consumer, cut over to one canonical path, then delete superseded reachable code/files/scripts/workflows/registries when reachability proves they are no longer needed.
8. Verify affected scope during iteration. Use full exact-candidate verification only when closure, master policy, explicit full mode or proven risk requires it.
9. Re-diagnose the affected cone after treatment. Re-rank if new evidence changes priority.
10. Before final closure, re-resolve live HEAD, reconcile concurrent delta, verify the exact candidate, inspect negative space for stale/parallel truth and close only when no material known treatable finding remains.

## Engineering control-path efficiency

The engineering control plane is subject to the same canonical-truth rules as product code.

- One question has one routing authority.
- One invariant has one execution owner and one result.
- Prefer affected/scoped verification for normal iteration.
- Do not run full workspace, runtime, CodeQL, aggregate guards or deep diagnostics unless the router/risk/closure phase proves they are required.
- Do not add a guard to police another guard, a registry to describe a registry, or a workflow layer that re-decides scope already computed elsewhere.
- Aggregate aliases, duplicate scans, repeated bootstrap/materialization and process-about-process checks without unique assurance must be removed or merged.
- Diagnostics are on-demand evidence unless they are proven closure requirements.
- Runtime proof runs only when the claim being closed is runtime-facing.
- Security remains fail-closed, but development scans should be contextual; master/scheduled/final closure may be full.
- Complexity without proven unique value is a defect.

## Evidence and research

Use exact branch/ref evidence. Never substitute default-branch search results for branch truth. Prefer direct scoped inspection, focused search and targeted tests. Escalate to graphs, broad scans or external research only when they can materially change the diagnosis or treatment. External sources may resolve technical/platform facts; they never invent BThwani product truth.

## Concurrency and writes

Latest live HEAD is the integration baseline, not execution priority. Before each write batch:

```text
resolve current HEAD
→ compare with last reconciled HEAD
→ classify concurrent delta
→ invalidate affected assumptions
→ preserve unrelated work
→ continue from current truth
```

Never force-push to reconcile ordinary concurrent work. Do not overwrite unrelated delta.

## Verification ladder

```text
normal iteration:
  targeted tests/checks
  → affected verification
  → affected re-diagnosis

closure / master / explicit full / proven high risk:
  full exact-SHA verification once on the final candidate
  → required runtime/security evidence
  → negative-space re-diagnosis
```

Green CI alone does not prove closure. Conversely, a large checklist is not evidence of correctness.

## Cleanup law

A file, script, guard, workflow, registry, diagnostic or adapter may remain only if it has a current consumer or provides unique proven assurance/value. If neither is true, delete it and remove every reference. Do not keep disabled, deprecated or historical operational residue merely for comfort; Git history already preserves history.

## Valid stop states

- `CLOSED` — exact candidate and all materially required claims are proven.
- `DECISION_REQUIRED` — a genuine non-derivable material decision blocks the dependent cone.
- `EXTERNAL_BLOCKER` — a real external dependency/capability/authority gap exists with an exact unblock condition.

Large scope, many findings, a plan document, a ticket, or a green CI run are not final states.
