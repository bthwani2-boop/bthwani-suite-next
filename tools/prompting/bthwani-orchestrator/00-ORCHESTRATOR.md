# BThwani Root-Cause Orchestrator

PACKAGE_REVISION: 15
PACKAGE_CLASS: UNIFIED_ROOT_CAUSE_EXECUTION_PACKAGE
PROJECT: bthwani-suite-next
SELF_CONTAINED: YES
DEFAULT_ORCHESTRATOR_MUTABILITY: READ_ONLY_UNLESS_CURRENT_HUMAN_INTENT_AUTHORIZES_MUTATION
SEMANTIC_SELF_CERTIFICATION: FORBIDDEN
NON_AUTHORITATIVE_STRUCTURAL_LINT: ALLOWED
NON_AUTHORITATIVE_BEHAVIORAL_EVALS: ALLOWED

## 0. Governing law

> **ONE PROJECT FRAME; ONE CANONICAL TRUTH PER MATERIAL CONCEPT; HIGHEST PROVEN EXECUTABLE ROOT FIRST; ACTUAL SOURCE-OF-DEFECT IS THE PLACE OF TREATMENT; FULL AFFECTED-CONE MIGRATION/CUTOVER/CLEANUP; EXACT-CANDIDATE EVIDENCE; ZERO COSMETIC CLOSURE; ZERO PARALLEL AUTHORITY; ZERO KNOWN MATERIAL RESIDUE TIED TO THE ROOT.**

```text
PROJECT_FRAME = durable project-wide orientation / consistency context
OBJECTIVE = current priority, not Product/System Truth
WORKING_CONE = smallest complete proven diagnosis/mutation cone
CLOSURE_UNIT = smallest complete causally cohesive root-correct execution unit
ACTIVE_WORKSET = human-declared coordination constraints for concurrent work

PROJECT_FRAME != WORKING_CONE
OBJECTIVE != AUTHORITY
OBJECTIVE != ARCHITECTURAL EXCEPTION
ACTIVE_WORKSET != PROJECT TRUTH
WORKTREE/EXECUTOR/MODEL != AUTHORITY
PLAN != AUTHORITY
GREEN != CLOSED
WORKING != JUSTIFIED
VISIBLE IMPROVEMENT != ROOT CORRECTION
```

Every material truth/decision/state/data authority must have one canonical Owner and one canonical writer/write path. Derived/read models may exist only when subordinate, reconstructable and unable to independently redefine truth.

## 1. Canonical package ownership

Exactly nine files are semantic owners in this package:

1. `00-ORCHESTRATOR.md` — governing invariants, unified invocation/intent resolution, Branch/PR lifecycle, stop states.
2. `01-SCOPE-AUTHORITY-RULES.md` — truth/authority, scope, precedence, capabilities, concurrency, ACTIVE_WORKSET and repository topology.
3. `02-DIAGNOSE-ROOT-CAUSE.md` — evidence, findings, root proof, Source-of-Fix and internal execution-readiness gate.
4. `03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md` — live mutation, migration, cutover, restructuring, cleanup/deletion and finishing.
5. `04-VERIFY-REDIAGNOSE-CLOSE.md` — exact-candidate evidence, repository-platform proof, re-diagnosis and fail-closed closure.
6. `05-OBJECTIVES-PLAYBOOK.md` — objective discovery, decomposition, portable pre-execution declaration and cross-window collision selection.
7. `focus/code-architecture-organization.md` — code/architecture/structure/UI implementation quality.
8. `focus/governance-product-design.md` — Product/System meaning, UX semantics and durable governance reconciliation.
9. `focus/data-contracts-runtime-security-quality.md` — data/contracts/runtime/security/quality/tools/CI evidence.

One material law has one owner. Other files reference/apply it; they do not restate competing versions.

`PRIMARY_COORDINATOR` loads all six core owners (`00`–`05`) and evaluates all focus modules for applicability. A `SUBAGENT` receives only its bounded delegation contract plus materially relevant owners/focus modules; it may not redefine project truth, root ranking, integration refs, collision status, execution readiness or closure.

## 2. Package protection and validation

Ordinary project work treats this directory as read-only. Editing/deleting/restructuring it requires explicit current human authorization.

`SEMANTIC SELF_CERTIFICATION = FORBIDDEN`: no script/check may declare these instructions semantically correct or `CLOSED`.

Non-authoritative structural lint/evals may detect broken references, stale paths, duplicate headings, dangling anchors and scenario regressions. Their pass never equals semantic correctness or closure.

## 3. Unified invocation and intent resolution

Preferred invocation inputs are intentionally small:

```text
REPOSITORY: <owner/repo>
BRANCH: <exact existing branch/ref when target is branch-bound>
OBJECTIVE: <explicit objective | AUTO/NEXT>
ACTIVE_WORKSET: <NONE | complete human-known active objective snapshot>
PRIMARY_FOCUS: <AUTO | explicit focus>
SCOPE: <AUTO | REPOSITORY | DOMAIN | SERVICE | SURFACE | FEATURE | JOURNEY | PATH | SEMANTIC_SCOPE>
RESEARCH: <AUTO | INTERNAL_ONLY | EXTERNAL_ALLOWED>
EXECUTION_LOCATION: <DIRECT_ON_TARGET | existing explicitly human-authorized isolated workspace>
```

There is **one normal root-closure operating loop**, not separate audit/preparation and execution phases.

Intent resolution:

```text
explicit select/recommend/extract-next-objective-only intent
-> read-only discovery/selection under 05
-> emit portable SELECTED CLOSURE OBJECTIVE
-> no mutation

explicit audit/inspect/diagnose/analyze/report/read-only intent
-> perform the same live diagnosis/root proof needed by 02
-> report current roots/readiness/evidence limits
-> no mutation

explicit execute/fix/change/restructure/clean/close intent
OR explicit select-and-execute intent
-> run the unified close loop below

mutation authority not established
-> remain read-only; do not infer write authorization merely from an analytical request
```

Read-only selection/audit are **intent boundaries**, not lifecycle phases and not prerequisites for later execution. A later execution invocation re-resolves live truth and does not require a separate preparation cycle.

### 3.1 Unified close loop

When mutation is authorized:

```text
RESOLVE / REVALIDATE LIVE TARGET + PR + HEAD
-> INGEST ACTIVE_WORKSET + VISIBLE CONCURRENT DELTA
-> PROJECT-FRAME ORIENTATION
-> AUDIT + INSPECT + DIAGNOSE + ANALYZE
-> FINDINGS + ROOT GRAPH
-> RANK HIGHEST PROVEN EXECUTABLE ROOTS
-> IF OBJECTIVE AUTO/NEXT OR BROAD: SELECT SESSION-SIZED CLOSURE UNIT UNDER 05
-> PROVE CANONICAL TARGET + SOURCE-OF-FIX + MATERIAL WORKING CONE
-> PROVE COLLISION DISPOSITION AGAINST EVERY ACTIVE OBJECTIVE
-> EMIT ONE CONCISE PORTABLE SELECTED CLOSURE OBJECTIVE BEFORE FIRST MATERIAL MUTATION
-> JUST-IN-TIME PLAN IN MEMORY OR OPTIONAL TASK-LOCAL ARTIFACT
-> TREAT ACTUAL SOURCE-OF-DEFECT
-> MIGRATE WRITERS/READERS/CONSUMERS/DATA/CONTRACTS
-> CANONICAL CUTOVER
-> RESTRUCTURE + MANDATORY CLEANUP/DELETION
-> VERIFY NEAREST INVALIDATED CLAIMS
-> INGEST ALL NEW TOOL/RUNTIME/REVIEW EVIDENCE
-> RE-DIAGNOSE + RE-RANK
-> CONTINUE ROOT-CORRECT TREATMENT INSIDE THE SELECTED CLOSURE UNIT
-> FINAL FINISHING + NEGATIVE-SPACE + ADVERSARIAL AUDIT
-> EXACT FINAL CANDIDATE
-> CLOSED ONLY UNDER 04
```

The pre-execution Objective declaration is a coordination checkpoint, not an approval gate. If current human intent already authorizes execution, emit it and continue immediately unless a legitimate stop state applies.

If the human supplied an explicit objective, treat it as current intent/priority. If it is too broad for one honest execution window, use `05` to select the smallest complete Closure Unit inside it and declare that unit before mutation. Never shrink the causal cone merely to fit context.

If no objective is supplied or the human asks for the next objective, `05-OBJECTIVES-PLAYBOOK.md` is mandatory selection authority.

### 3.2 Planning is just-in-time and non-authoritative

Planning is part of the unified loop, not a separate phase and not a mandatory persisted handoff.

```text
DEFAULT_PLAN_ARTIFACT = NONE
MANDATORY plans/diagnose-implementing = NO
PLAN FILE REQUIRED FOR EXECUTION = NO
```

The coordinator/agent may plan in memory or create a temporary task-local planning/evidence artifact **only when it materially improves correctness, coordination or recoverability**. It may choose the suitable local/worktree path supported by its execution environment.

Any such artifact:

- is not Product/System truth, project authority or progress authority;
- must not become a shadow findings/status/closure registry;
- must not be required merely because an older orchestration version used a fixed path;
- if created inside the repository, must obey repository hygiene and must not be committed as durable project truth unless a proven canonical owner/write gate requires that durable record;
- should be removed/ignored after its task-local value expires.

A supplied historical plan is evidence/context only. Re-resolve live truth before using it.

## 4. Objective declaration and concurrent-work law

When concurrent sessions/worktrees/providers exist, the human SHOULD pass the complete known `ACTIVE_WORKSET`. Provider names such as ChatGPT, Claude, Manus, Codex or others are optional coordination labels only.

Before selecting a new concurrently executable Closure Unit, compare every candidate against **every** active objective using `01`/`05`.

Concurrent mutation is allowed only when the candidate is proven `PARALLEL_SAFE` against the complete active workset. A separate worktree alone is not proof of independence.

If a higher-ranked root collides with active work, classify the collision and choose the next highest proven executable `PARALLEL_SAFE` root. Do not artificially split or weaken the colliding root merely to create parallelism.

## 5. Branch/PR lifecycle law — branch-agnostic

No source-branch name may define system semantics.

```text
BRANCH NAME = target-resolution input only
NO source-branch hard-coding in orchestration semantics
```

Branch/worktree creation is human-only:

```text
BRANCH_CREATION_AUTHORITY = HUMAN_ONLY
AGENT_AUTOMATIC_BRANCH_CREATION = FORBIDDEN
WORKTREE_CREATION_AUTHORITY = HUMAN_ONLY
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
NEW HEAD_SHA -> same PR; affected old evidence becomes SUPERSEDED
DIFFERENT PR -> context only; never current-PR closure evidence
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

All PR-scoped claims/reviews/runs/artifacts/findings must prove `PR_NUMBER + CURRENT_HEAD_SHA`. Same branch/workflow/tool is insufficient. Synthetic merge refs remain distinct from the PR head candidate.

Push ownership:

```text
source branch with open PR -> PR event owns PR verification; suppress duplicate branch analysis
source branch without PR -> branch-development evidence only; no PR claim
canonical trunk push -> post-merge baseline evidence
workflow_dispatch -> explicit target only
schedule -> baseline/maintenance only; no inferred PR claim
```

Merge readiness requires the exact verified final PR head SHA. After merge, source-branch retirement follows repository policy; another lifecycle begins only from a human-authorized branch/workspace.

## 6. Root-cause closure continuity

Any materially related cleanup, deletion, deduplication, reference repair, legacy removal, migration, cutover or structural correction discovered during diagnosis or execution belongs to the same root closure.

```text
PROVEN OBSOLETE/SUPERSEDED/DEAD + prerequisites satisfied -> DELETE
UNCLASSIFIED MATERIAL RELATED RESIDUE -> ROOT OPEN
UNEXECUTED DELETE_REQUIRED -> ROOT OPEN
UNVERIFIED CLEANUP -> ROOT OPEN
```

No "later cleanup" is allowed for known material residue tied to the root.

A newly exposed **independent** root does not silently expand the current Closure Unit; it enters reranking unless it is a higher causal parent that invalidates the current treatment.

## 7. Evidence/failure self-driving law

Tool/runtime/review failures are evidence, not automatic stop states.

```text
FAILURE
-> provenance
-> classification under 02/04
-> map/cluster to root
-> if executable: treat actual Source-of-Fix
-> rerun invalidated proof
-> continue
```

Do not return to the human merely because CI/Sonar/CodeQL/Semgrep/runtime/review produced a failure. New invalidating evidence stops only the affected cone and triggers in-memory re-diagnosis/re-ranking.

## 8. Governing lifecycle

```text
RESOLVE LIVE TARGET / PR IDENTITY
-> INGEST ACTIVE WORKSET / CONCURRENT DELTA
-> PROJECT-FRAME ORIENTATION
-> AUDIT + INSPECT + DIAGNOSE + ANALYZE
-> FINDINGS + ROOT GRAPH
-> HIGHEST PROVEN EXECUTABLE SYSTEMIC ROOT
-> SESSION-SIZED CLOSURE UNIT SELECTION WHEN NEEDED
-> PORTABLE OBJECTIVE DECLARATION
-> CANONICAL TARGET + SOURCE-OF-FIX
-> JIT PLANNING AS NEEDED
-> ROOT-CORRECT TREATMENT
-> FULL AFFECTED-CONE MIGRATION/CUTOVER
-> FORCED STRUCTURAL CLEANUP
-> TOOL/RUNTIME/REVIEW EVIDENCE INGESTION
-> RE-DIAGNOSE / RE-RANK / REPEAT WITHIN CURRENT CLOSURE
-> GOVERNANCE RECONCILIATION WHEN MATERIALLY REQUIRED
-> FINAL REPOSITORY FINISHING PASS FOR AFFECTED CONE
-> EXACT FINAL CANDIDATE
-> NEGATIVE-SPACE + ADVERSARIAL AUDIT
-> CLOSED OR LEGITIMATE STOP
```

## 9. Legitimate stop/output states

Only:

- `CLOSED` — `04` proves exact-candidate closure.
- `OBJECTIVE_SELECTED` — the human requested selection/recommendation only; portable objective emitted, no mutation authorized.
- `AUDIT_COMPLETE` — the human explicitly requested read-only audit/reporting; report roots, proof limits and executable next treatment without mutation.
- `DECISION_REQUIRED` — non-derivable material Product/System/architecture decision.
- `HUMAN_ACTION_REQUIRED` — human-only topology/repository action such as creating/selecting a required branch/worktree.
- `AUTHORIZATION_REQUIRED` — missing permission/secret/authorization that cannot be acquired by the agent.
- `EXTERNAL_UNAVAILABLE` — required external authority/service genuinely unavailable and no sufficient alternative evidence exists.
- `UNSAFE_TO_PROCEED` — continuing would violate safety/legal/irreversible-operation boundaries.

The following are **not** stop states by themselves:

`CI failed | Sonar failed | scanner failed | many findings | large scope | no persisted plan | no plans/diagnose-implementing directory | work is complex | green checks`.

## 10. Closure invariant

If a deep post-treatment audit can still reasonably discover a material related cleanup, structural, ownership, duplication, legacy, reference, contract, data, runtime, governance or assurance defect that should have been closed with the selected root, that root was never closed.

If another active objective owns an independent cone, do not absorb it merely to make the current objective look comprehensive. Closure means the selected root is complete **and** concurrent boundaries remain consistent, not that one window owns the whole repository.