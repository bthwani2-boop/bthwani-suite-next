# Scope, Authority, Project Frame, Capabilities, Concurrency and Repository Topology

## 1. Truth model

Never treat one representation as automatic truth:

```text
GOVERNANCE != AUTOMATIC TRUTH
CODE != AUTOMATIC TRUTH
RUNTIME != AUTOMATIC TRUTH
TESTS != AUTOMATIC TRUTH
PLAN/PR BODY != AUTOMATIC CURRENT TRUTH
TOOL FINDING != AUTOMATIC ROOT CAUSE
TOOL GREEN != SYSTEM CORRECTNESS
OBJECTIVE != PROJECT TRUTH
```

Keep truth classes distinct:

`AUTHORITY_TRUTH | PRODUCT/SEMANTIC_TRUTH | IMPLEMENTATION_TRUTH | DATA_TRUTH | RUNTIME_TRUTH | REPOSITORY_PLATFORM_TRUTH | EXTERNAL_TECHNICAL_EVIDENCE | DERIVED/HISTORICAL_SUPPORT`.

Reconcile from the strongest current combination of authorized intent, applicable governance, canonical ownership, live code/contracts/data/runtime, exact-candidate repository evidence, affected consumers and authoritative external technical evidence where needed.

## 2. Precedence and invariant waiver

Precedence:

1. safety/legal/repository permission/irreversible boundaries;
2. explicit current human instruction;
3. stable package invariants;
4. reconciled Product/System authority;
5. focus-specific rules;
6. live implementation/data/runtime/repository evidence;
7. authoritative external technical evidence;
8. historical/derived support.

An ordinary task objective such as “make CI green”, “fix this file” or “close this PR” is not an invariant waiver.

```text
ORDINARY OBJECTIVE/TASK WORDING != PACKAGE INVARIANT WAIVER
```

Only an explicit human instruction materially addressing the invariant can override it, subject to higher safety/legal/repository boundaries.

## 3. Project frame and dual-scope law

```text
PROJECT_FRAME = project-wide orientation / consistency context
WORKING_SCOPE = smallest complete proven cone needed to prove/treat current root
```

A project-wide frame does not authorize repository-wide mutation. A narrow working scope does not authorize a narrow worldview.

Frame assertions may be:

`PROVEN | UNKNOWN | CONFLICTING | STALE | DECISION_REQUIRED | N/A_PROVEN`.

Unknown outside the affected cone does not block independent work. Unknown that can materially change the dependent root/target/treatment blocks that dependent cone only.

## 4. Scope/focus routing

Supported scope roots:

`REPOSITORY | DOMAIN | SERVICE | SURFACE | FEATURE | JOURNEY | PATH | SEMANTIC_SCOPE`.

Focus vocabulary:

`ALL | PRODUCT | GOVERNANCE | CODE | STRUCTURE | DESIGN | DATA | CONTRACTS | RUNTIME | SECURITY | QUALITY | OPERATIONS`.

Routing:

```text
CODE | STRUCTURE
-> focus/code-architecture-organization.md

PRODUCT | GOVERNANCE
-> focus/governance-product-design.md

DESIGN
-> focus/governance-product-design.md for product meaning, actors, journeys, IA and handoffs
-> focus/code-architecture-organization.md for UI/component/layout/accessibility/design-system implementation

DATA | CONTRACTS | RUNTIME | SECURITY | QUALITY | OPERATIONS
-> focus/data-contracts-runtime-security-quality.md

ALL
-> all three focus modules
```

Every focus family receives an applicability disposition before closure. Explicit focus is a starting lens, never a closure ceiling.

## 5. Repository target topology

Source-branch names are semantically opaque. Resolve repository topology live.

```text
TARGET_KIND = pull_request | branch | commit/post_merge
TARGET_REF = exact existing ref when applicable
CANONICAL_TRUNK = live repository policy / explicit authorized integration target
```

For PR work, GitHub/repository platform is the Source of Truth for current PR identity. Do not create local registries such as `current-pr.json`, `active-pr.txt` or branch-to-PR shadow maps.

PR resolution rules are owned by `00` and applied here as authority constraints:

```text
EXACT HEAD BRANCH + CANONICAL BASE -> query open PR
0 -> PR may be created after first material change if authorized
1 -> canonical PR
>1 -> identity conflict; do not guess
```

PR body, issue text, comments and old plans are historical/context evidence only. They cannot override live PR API identity/current head.

## 6. Branch/workspace authority

```text
BRANCH_CREATION_AUTHORITY = HUMAN_ONLY
AGENT_AUTOMATIC_BRANCH_CREATION = FORBIDDEN
WORKTREE_CREATION_AUTHORITY = HUMAN_ONLY
AGENT_AUTOMATIC_WORKTREE_CREATION = FORBIDDEN
```

An existing explicitly selected branch is the invocation target unless the human changes it. Do not silently switch to default branch or another existing branch.

If correct execution requires a branch/workspace that does not exist or was not human-authorized, emit `HUMAN_ACTION_REQUIRED` for only that dependent cone and continue independent read-only work.

Never force-push, blindly hard-reset newer work, discard foreign changes or overwrite concurrent truth.

## 7. Capability-to-evidence discipline

For every material claim:

```text
CLAIM
-> REQUIRED EVIDENCE
-> CAPABILITY
-> AVAILABLE?
-> APPLICABLE?
-> PROOF LIMIT
-> TOOL CONDITION under 02
```

Use every materially applicable capability needed to establish root/target/treatment safely. Do not run everything blindly.

```text
AVAILABLE != APPLICABLE
LISTED != ENABLED
TOOL FAILURE != AUTOMATIC EXECUTION BLOCKER
MISSING REQUIRED CLOSURE EVIDENCE != PASS
```

### 7.1 AUDIT_PREPARE capability semantics

The preparation objective is **decision-quality and execution determinism**, not “all tools green”. Classify plausible capabilities as:

`REQUIRED_FOR_DIAGNOSIS | SUPPORTING | CLOSURE_REQUIRED_LATER | N/A_PROVEN | UNAVAILABLE`.

A capability is `REQUIRED_FOR_DIAGNOSIS` only when no sufficient alternative evidence can establish a material root/target/Source-of-Fix safely. Its unavailability may become a `DIAGNOSIS_BLOCKER` under `02`.

A broken tool/workflow whose defect is itself diagnosable and treatable is normally an `EXECUTION_FINDING`, not a readiness blocker.

A capability required only to prove the final state is `CLOSURE_REQUIRED_LATER`; its failure does not prevent execution when the next root-correct treatment is already proven.

Preparation deepening stops when further available evidence is not reasonably capable of changing the highest actionable roots, Canonical Target, Source-of-Fix, materially complete working cone, execution frontier or verification contract.

## 8. Hierarchical agent authority

There is one `PRIMARY_COORDINATOR` per invocation.

The coordinator exclusively owns:

`project-frame reconciliation | Product/System authority decisions | root landscape/ranking | Source-of-Fix acceptance | task decomposition | shared write-set/collision resolution | target/PR/HEAD reconciliation | integration/ref movement | readiness | final closure`.

A subagent may inspect, run tools, reconstruct traces, search negative space, inventory consumers/artifacts, challenge hypotheses, verify claims or perform explicitly delegated non-overlapping mutation. It returns provenance, findings, contradictions, proof limits and write set.

A subagent may not independently create/switch branches/worktrees, infer a competing PR, redefine Product/System truth, migration/cutover semantics, integration refs, readiness or closure.

The coordinator loads all core owners. Subagents receive the settled bounded contract plus relevant owners; requiring every subagent to reload all package text is unnecessary context duplication.

## 9. Maximum-safe parallelism

Parallelize by coherent root ownership, not arbitrary files/languages/frontends/backends.

Two units may execute concurrently only when proven:

```text
NO causal dependency
AND NO conflicting canonical authority
AND NO unsafe overlapping write set
AND NO shared migration/cutover ordering requirement
AND NO evidence dependency requiring serialization
```

When uncertain, serialize mutation. Read-only evidence work may be highly parallel.

No artificial batch barriers: when one unit finishes, reconcile its evidence, invalidate only affected assumptions, rerank and immediately refill safe capacity.

## 10. Foreign/concurrent delta

Before each material write batch, ref movement and final closure, re-resolve live target/PR HEAD and classify delta:

`UNRELATED | RELATED_NON_BLOCKING | UPSTREAM_OR_ROOT_CHANGING | SEMANTIC_OVERLAP | DIRECT_CONFLICT | AUTHORITY_OR_TRUTH_CHANGE`.

Treatment:

```text
UNRELATED -> preserve; continue; rerun only invalidated proof
RELATED_NON_BLOCKING -> reconcile affected assumptions/checks
UPSTREAM_OR_ROOT_CHANGING -> stop affected descendant work; re-diagnose/re-rank
SEMANTIC_OVERLAP -> re-prove owner/contracts/state; rebuild affected delta
DIRECT_CONFLICT -> intentional resolution on latest truth; no blind overwrite
AUTHORITY_OR_TRUTH_CHANGE -> reconcile Product/System frame before write
```

Recency never outranks causality.

## 11. Protected/irreversible actions

Before production data mutation, destructive backfill, secret/key rotation, external financial/provider mutation, deploy/release/merge/tag or infrastructure destruction, prove exact authority, target/environment, candidate binding and rollback/compensation when possible.

Ordinary repository file deletion inside the authorized working cone is not a protected action once `02` proves `DELETE_REQUIRED` and prerequisites are satisfied.

## 12. Research

`AUTO`: use current internal/connected evidence first; research authoritative external technical/platform facts when local evidence is materially insufficient.

`INTERNAL_ONLY`: do not browse; unavailable required external truth remains an explicit evidence gap.

`EXTERNAL_ALLOWED`: external research may materially improve technical correctness.

External evidence may establish platform/library/standard/security facts; it may not invent BThwani Product/System behavior.

## 13. Durable project-memory routing

New facts are classified:

`EPHEMERAL_IMPLEMENTATION_FACT | CURRENT_RUNTIME_FACT | TASK_LOCAL_FACT | DURABLE_PROJECT_TRUTH | DURABLE_POLICY_INVARIANT | DECISION_REQUIRED`.

Only proven durable reusable truth whose absence/ambiguity can materially mislead future work is routed to the smallest live canonical governance owner. Expected governance paths must always be verified live before mutation; never recreate a stale path merely because this package historically named it.

## 14. Anti-bloat

- one material concept -> one package owner;
- reference owners instead of repeating laws;
- no task-specific rule accumulation;
- no new registry/file merely to restate package semantics;
- package remains materially simpler than the system it governs;
- mutable tool/product names are implementation choices, not eternal semantic authorities.
