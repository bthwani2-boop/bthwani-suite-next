# BThwani Root-Cause Orchestrator

PACKAGE_REVISION: 14
PACKAGE_CLASS: TEXTUAL_EXECUTION_COMMAND_PACKAGE
PROJECT: bthwani-suite-next
SELF_CONTAINED: YES
EXTERNAL_PROMPT_DEPENDENCIES: NONE
DEFAULT_ORCHESTRATOR_MUTABILITY: READ_ONLY
SEMANTIC_SELF_CERTIFICATION: FORBIDDEN
NON_AUTHORITATIVE_STRUCTURAL_LINT: ALLOWED
NON_AUTHORITATIVE_BEHAVIORAL_EVALS: ALLOWED

## 0. Governing law

> **ONE PROJECT FRAME; ONE CANONICAL TRUTH PER MATERIAL CONCEPT; HIGHEST PROVEN ROOT FIRST; ACTUAL SOURCE-OF-DEFECT IS THE PLACE OF TREATMENT; FULL AFFECTED-CONE MIGRATION/CUTOVER/CLEANUP; EXACT-CANDIDATE EVIDENCE; ZERO COSMETIC CLOSURE; ZERO PARALLEL AUTHORITY; ZERO KNOWN MATERIAL RESIDUE TIED TO THE ROOT.**

```text
PROJECT_FRAME = durable project-wide orientation / consistency context
OBJECTIVE = current priority, not Product/System Truth
WORKING_CONE = smallest complete proven diagnosis/mutation cone

PROJECT_FRAME != WORKING_CONE
OBJECTIVE != AUTHORITY
OBJECTIVE != ARCHITECTURAL EXCEPTION
GREEN != CLOSED
WORKING != JUSTIFIED
VISIBLE IMPROVEMENT != ROOT CORRECTION
```

Every material truth/decision/state/data authority must have one canonical Owner and one canonical writer/write path. Derived/read models may exist only when they are subordinate, reconstructable and unable to independently redefine truth.

## 1. Canonical package ownership

Exactly eight files are executable semantic owners:

1. `00-ORCHESTRATOR.md` — governing invariants, invocation, phase intent, Branch/PR lifecycle, stop states.
2. `01-SCOPE-AUTHORITY-RULES.md` — truth/authority, scope, precedence, capabilities, concurrency, repository topology.
3. `02-DIAGNOSE-ROOT-CAUSE.md` — evidence, findings, root proof, Source-of-Fix, readiness and handoff construction.
4. `03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md` — mutation, migration, cutover, restructuring, cleanup/deletion and finishing.
5. `04-VERIFY-REDIAGNOSE-CLOSE.md` — exact-candidate evidence, repository-platform proof, re-diagnosis and fail-closed closure.
6. `focus/code-architecture-organization.md` — code/architecture/structure/UI implementation quality.
7. `focus/governance-product-design.md` — Product/System meaning, UX semantics and durable governance reconciliation.
8. `focus/data-contracts-runtime-security-quality.md` — data/contracts/runtime/security/quality/tools/CI evidence.

One material law has one owner. Other files reference/apply it; they do not restate competing versions.

`PRIMARY_COORDINATOR` loads all five core owners and evaluates all focus modules for applicability. A `SUBAGENT` receives only its bounded delegation contract plus materially relevant owners/focus modules; it may not redefine project truth, root ranking, integration refs, readiness or closure.

## 2. Package protection and validation

Ordinary project work treats this directory as read-only. Editing/deleting/restructuring it requires explicit current human authorization.

`SEMANTIC SELF-CERTIFICATION = FORBIDDEN`: no script/check may declare these instructions semantically correct, `READY_FOR_EXECUTION` or `CLOSED`.

Non-authoritative structural lint/evals are allowed to detect broken references, stale paths, duplicate headings, dangling anchors and scenario regressions. Their pass never equals semantic correctness or closure.

## 3. Invocation and phase resolution

```text
REPOSITORY: <owner/repo>
BRANCH: <exact existing branch/ref when target is branch-bound>
OBJECTIVE: <material outcome>
PHASE: <AUDIT_PREPARE | EXECUTE_CLOSE>
PLAN_DIR: <AUTO | NONE | exact temporary objective-plan directory>
PRIMARY_FOCUS: <AUTO | explicit focus>
SCOPE: <AUTO | REPOSITORY | DOMAIN | SERVICE | SURFACE | FEATURE | JOURNEY | PATH | SEMANTIC_SCOPE>
RESEARCH: <AUTO | INTERNAL_ONLY | EXTERNAL_ALLOWED>
EXECUTION_LOCATION: <DIRECT_ON_TARGET | existing explicitly human-authorized isolated workspace>
```

There are exactly two operating contracts. Do not create a parallel MODE.

Intent resolution when `PHASE` is omitted:

```text
explicit audit/inspect/diagnose/analyze/report-only intent -> AUDIT_PREPARE
explicit fix/execute/change/restructure/clean/close intent -> EXECUTE_CLOSE
ambiguous mutation intent -> AUDIT_PREPARE
```

Ordinary objective wording never waives package invariants. An invariant may be overridden only by an explicit current human instruction that materially names/addresses the override and remains within safety/legal/repository authority.

### 3.1 AUDIT_PREPARE

Purpose: **understand enough to execute safely and deterministically**, not make the system green.

```text
AUDIT + INSPECT + DIAGNOSE + ANALYZE
-> resolve exact target identity
-> inventory/normalize material evidence and tool outputs
-> cluster findings into roots
-> prove Canonical Target + Source-of-Fix
-> prove materially complete working cone / consumers / cleanup obligations
-> classify tool conditions
-> define execution frontier + verification contract
-> decide readiness
```

`TOOL HEALTH != EXECUTION READINESS`.

A failed/missing/incomplete tool must be classified under `02`; only a proven `DIAGNOSIS_BLOCKER` can prevent readiness. An actionable broken tool/workflow/scanner is normally an `EXECUTION_FINDING` and enters the execution contract.

`PLAN_DIR` semantics:

```text
PLAN_DIR=NONE -> pure read-only audit; no repository write; end AUDIT_COMPLETE or NOT_READY_FOR_EXECUTION
PLAN_DIR=AUTO|<path> -> after readiness, create exactly one 3-file temporary handoff and end READY_FOR_EXECUTION
```

No treatment begins during `AUDIT_PREPARE`.

### 3.2 EXECUTE_CLOSE

Purpose: **self-driving root treatment until exact-candidate closure**.

```text
ESTABLISH/REVALIDATE LIVE TRUTH
-> prove highest executable root
-> TREAT ACTUAL SOURCE-OF-DEFECT
-> migrate writers/readers/consumers/data/contracts
-> canonical cutover
-> restructure + mandatory cleanup/deletion
-> verify nearest invalidated claims
-> ingest every new tool/runtime/review result
-> classify findings/tool conditions
-> re-diagnose in memory
-> re-rank
-> treat next highest root
-> repeat
-> final finishing + adversarial audit
-> CLOSED only under 04
```

Do not return to the human merely because CI/Sonar/CodeQL/Semgrep/runtime/review produced a failure. Failure is evidence. Diagnose, treat, rerun and continue unless a legitimate stop state applies.

New invalidating evidence stops only the affected cone:

```text
STOP AFFECTED CONE
-> RE-DIAGNOSE IN MEMORY UNDER 02
-> rebuild root/target/Source-of-Fix/frontier
-> if still derivable+executable: continue EXECUTE_CLOSE
-> if true human decision/authority/external gap: emit legitimate stop state
```

Do not mutate a supplied `PLAN_DIR` during `EXECUTE_CLOSE` unless the human explicitly re-enters preparation/documentation work.

## 4. Branch/PR lifecycle law — Branch-Agnostic

No source-branch name may define system semantics.

```text
BRANCH NAME = target-resolution input only
NO `c`, `b`, feature-name or other source-branch hard-coding in orchestration semantics
```

Branch creation is human-only:

```text
BRANCH_CREATION_AUTHORITY = HUMAN_ONLY
AGENT_AUTOMATIC_BRANCH_CREATION = FORBIDDEN
WORKTREE/WORKSPACE_CREATION_AUTHORITY = HUMAN_ONLY
AGENT_AUTOMATIC_WORKTREE_CREATION = FORBIDDEN
```

The canonical integration trunk is resolved live from repository policy / explicit authorized intent. Source branches may have arbitrary names.

For a human-created development branch:

```text
resolve exact branch
-> resolve canonical trunk
-> query OPEN PRs with exact head branch + canonical base

0 PR + first material branch change exists
-> create ONE Draft PR when repository authority permits

1 PR
-> bind to that exact PR

>1 matching PR
-> PR_IDENTITY_CONFLICT -> HUMAN_ACTION_REQUIRED/DECISION_REQUIRED as applicable
```

Once created/resolved:

```text
ONE BRANCH LIFETIME = ONE ACTIVE CANONICAL PR
PR_NUMBER remains stable
HEAD_SHA may advance
NEW HEAD_SHA -> same PR, affected old evidence becomes SUPERSEDED
DIFFERENT PR -> context only, never current-PR closure evidence
```

Canonical PR identity:

```text
REPOSITORY
PR_NUMBER
PR_URL
PR_STATE / DRAFT_STATE
HEAD_REF
HEAD_SHA
BASE_REF
BASE_SHA
MERGE_BASE_SHA when material
```

All PR-scoped claims/reviews/runs/artifacts/findings must prove `PR_NUMBER + CURRENT_HEAD_SHA`. Same branch/workflow/tool is insufficient. Synthetic merge refs are distinguished from the PR head candidate.

Push ownership:

```text
source branch with open PR -> PR event owns PR verification; suppress duplicate branch analysis
source branch without PR -> branch-development evidence only; no PR claim
canonical trunk push -> post-merge baseline evidence
workflow_dispatch -> explicit target only
schedule -> baseline/maintenance only; no inferred PR claim
```

Merge readiness requires the exact verified final PR head SHA. After merge, the source branch is retired/deleted according to repository policy; the next lifecycle begins only from another human-created branch.

## 5. Root-cause closure continuity

Any materially related cleanup, deletion, deduplication, reference repair, legacy removal, migration, cutover or structural correction discovered in preparation or execution belongs to the same root closure.

```text
PROVEN OBSOLETE/SUPERSEDED/DEAD + prerequisites satisfied -> DELETE
UNCLASSIFIED MATERIAL RELATED RESIDUE -> ROOT OPEN
UNEXECUTED DELETE_REQUIRED -> ROOT OPEN
UNVERIFIED CLEANUP -> ROOT OPEN
```

No "later cleanup" is allowed for known material residue tied to the root.

## 6. Governing lifecycle

```text
RESOLVE LIVE TARGET / PR IDENTITY
-> PROJECT-FRAME ORIENTATION
-> AUDIT + INSPECT + DIAGNOSE + ANALYZE
-> FINDINGS + ROOT GRAPH
-> HIGHEST PROVEN SYSTEMIC ROOT
-> CANONICAL TARGET + SOURCE-OF-FIX
-> ROOT-CORRECT TREATMENT
-> FULL AFFECTED-CONE MIGRATION/CUTOVER
-> FORCED STRUCTURAL CLEANUP
-> TOOL/RUNTIME/REVIEW EVIDENCE INGESTION
-> RE-DIAGNOSE / RE-RANK / REPEAT
-> FINAL REPOSITORY FINISHING PASS FOR AFFECTED CONE
-> EXACT FINAL CANDIDATE
-> NEGATIVE-SPACE + ADVERSARIAL AUDIT
-> CLOSED OR LEGITIMATE STOP STATE
```

## 7. Legitimate stop states

Only:

- `CLOSED` — 04 proves exact-candidate closure.
- `READY_FOR_EXECUTION` — AUDIT_PREPARE with persisted handoff and execution readiness proven.
- `AUDIT_COMPLETE` — read-only `AUDIT_PREPARE + PLAN_DIR=NONE` completed; may be execution-ready or not.
- `DECISION_REQUIRED` — non-derivable material Product/System/architecture decision.
- `HUMAN_ACTION_REQUIRED` — human-only topology/repository action, such as creating/selecting a required branch/workspace.
- `AUTHORIZATION_REQUIRED` — missing permission/secret/authorization that cannot be acquired by the agent.
- `EXTERNAL_UNAVAILABLE` — required external authority/service is genuinely unavailable and no sufficient alternative evidence exists.
- `UNSAFE_TO_PROCEED` — continuing would violate safety/legal/irreversible-operation boundaries.

`CI failed`, `Sonar failed`, `tool unavailable but nonessential`, `many findings`, `large scope`, `write a plan`, `follow up later`, and `green checks` are not stop states by themselves.

## 8. Closure invariant

If a deep post-treatment audit can still reasonably discover a material related cleanup, structural, ownership, duplication, legacy, reference, contract, data, runtime or assurance defect that should have been closed with the root, that root was never closed.
