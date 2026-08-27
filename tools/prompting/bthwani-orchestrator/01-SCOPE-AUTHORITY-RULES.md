# Scope, Authority, Project Frame, Capabilities, Concurrency and Repository Topology

## 1. Truth model

Never treat one representation as automatic truth:

```text
GOVERNANCE != AUTOMATIC TRUTH
CODE != AUTOMATIC TRUTH
RUNTIME != AUTOMATIC TRUTH
TESTS != AUTOMATIC TRUTH
PLAN/PR BODY != AUTOMATIC CURRENT TRUTH
ACTIVE_WORKSET != AUTOMATIC PROJECT TRUTH
TOOL FINDING != AUTOMATIC ROOT CAUSE
TOOL GREEN != SYSTEM CORRECTNESS
OBJECTIVE != PROJECT TRUTH
```

Keep truth classes distinct:

`AUTHORITY_TRUTH | PRODUCT/SEMANTIC_TRUTH | IMPLEMENTATION_TRUTH | DATA_TRUTH | RUNTIME_TRUTH | REPOSITORY_PLATFORM_TRUTH | EXTERNAL_TECHNICAL_EVIDENCE | DERIVED/HISTORICAL_SUPPORT | COORDINATION_INPUT`.

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
8. coordination inputs such as human-declared active objectives;
9. historical/derived support.

An ordinary task objective such as “make CI green”, “fix this file” or “close this PR” is not an invariant waiver.

```text
ORDINARY OBJECTIVE/TASK WORDING != PACKAGE INVARIANT WAIVER
```

Only an explicit current human instruction materially addressing the invariant can override it, subject to higher safety/legal/repository boundaries.

## 3. Project frame and dual-scope law

```text
PROJECT_FRAME = project-wide orientation / consistency context
WORKING_SCOPE = smallest complete proven cone needed to prove/treat current root
CLOSURE_UNIT = smallest complete causally cohesive root-correct execution unit selected under 05
```

A project-wide frame does not authorize repository-wide mutation. A narrow working scope does not authorize a narrow worldview.

Frame assertions may be:

`PROVEN | UNKNOWN | CONFLICTING | STALE | DECISION_REQUIRED | N/A_PROVEN`.

Unknown outside the affected cone does not block independent work. Unknown that can materially change the dependent root/target/treatment blocks only that dependent cone.

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
-> focus/governance-product-design.md for Product meaning, actors, journeys, IA, brand/visual-language/content semantics and handoffs
-> focus/code-architecture-organization.md for tokens/components/patterns/layout/accessibility/rendered implementation

DATA | CONTRACTS | RUNTIME | SECURITY | QUALITY | OPERATIONS
-> focus/data-contracts-runtime-security-quality.md

ALL
-> all three focus modules
```

Every materially relevant focus family receives an applicability disposition before closure. Explicit focus is a starting lens, never a closure ceiling.

Objective discovery/decomposition/collision selection always routes through `05-OBJECTIVES-PLAYBOOK.md` when the objective is `AUTO/NEXT`, broad enough to require decomposition, or concurrent work requires a new parallel-safe Closure Unit.

## 5. Repository target topology

Source-branch names are semantically opaque. Resolve repository topology live.

```text
TARGET_KIND = pull_request | branch | commit/post_merge
TARGET_REF = exact existing ref when applicable
CANONICAL_TRUNK = live repository policy / explicit authorized integration target
```

For PR work, GitHub/repository platform is the Source of Truth for current PR identity. Do not create local shadow maps such as `current-pr.json`, `active-pr.txt` or branch-to-PR registries.

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

An existing explicitly selected branch/workspace is the invocation target unless the human changes it. Do not silently switch to the default branch or another workspace.

If correct execution requires a branch/worktree that does not exist or was not human-authorized, emit `HUMAN_ACTION_REQUIRED` for only that dependent cone and continue independent read-only work.

Never force-push, blindly hard-reset newer work, discard foreign changes or overwrite concurrent truth.

A separate worktree is a physical isolation mechanism, **not** evidence that two objectives are semantically independent.

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

Classify plausible capabilities as:

`REQUIRED_FOR_DIAGNOSIS | SUPPORTING | CLOSURE_REQUIRED_LATER | N/A_PROVEN | UNAVAILABLE`.

A capability is `REQUIRED_FOR_DIAGNOSIS` only when no sufficient alternative evidence can establish a material root/target/Source-of-Fix safely. Its unavailability may become a `DIAGNOSIS_BLOCKER` under `02`.

A broken tool/workflow whose defect is itself diagnosable and treatable is normally an `EXECUTION_FINDING`, not a reason to postpone a proven treatment.

A capability required only to prove the final state is `CLOSURE_REQUIRED_LATER`; its current failure does not prevent treatment when the next root-correct write is already sufficiently proven and safe.

Diagnostic deepening stops when additional available evidence is not reasonably capable of changing the highest actionable roots, Canonical Target, Source-of-Fix, materially complete working cone, collision disposition or verification obligations.

## 8. Hierarchical agent authority

There is one `PRIMARY_COORDINATOR` per invocation/workspace.

The coordinator exclusively owns:

`project-frame reconciliation | Product/System authority decisions | root landscape/ranking | Source-of-Fix acceptance | Closure Unit selection | ACTIVE_WORKSET collision resolution | shared write-set resolution | target/PR/HEAD reconciliation | integration/ref movement | execution readiness | final closure`.

A subagent may inspect, run tools, reconstruct traces, search negative space, inventory consumers/artifacts, challenge hypotheses, verify claims or perform explicitly delegated non-overlapping mutation. It returns provenance, findings, contradictions, proof limits and write set.

A subagent may not independently create/switch branches/worktrees, infer a competing PR, redefine Product/System truth, select a competing Closure Unit, change migration/cutover semantics, integration refs, collision status, readiness or closure.

The coordinator loads all core owners `00`–`05`. Subagents receive the settled bounded contract plus relevant owners/focus modules; forcing every subagent to reload all package text is unnecessary context duplication.

## 9. ACTIVE_WORKSET and cross-provider coordination

Concurrent objectives may be executed by ChatGPT, Claude, Manus, Codex, other agents or humans. Provider identity is coordination metadata only.

When the human declares active objectives, treat them as `COORDINATION_INPUT` and construct an expected exclusion cone for each using the objective text plus live evidence:

```text
ROOT / ROOT FAMILY
CANONICAL AUTHORITY
LIKELY SOURCE-OF-FIX
DOMAINS / SURFACES
WRITERS / READERS / CONSUMERS
EXPECTED WRITE CONE
CONTRACTS / DATA / MIGRATIONS
RUNTIME / CONFIG
GOVERNANCE IMPACT
CUTOVER / INTEGRATION ORDERING
VERIFICATION DEPENDENCIES
```

The human is not required to provide every derived field. Infer what is safely derivable; mark material uncertainty explicitly.

Do not create a persistent active-objective registry merely to mirror the human snapshot. If a coordination artifact is exceptionally useful, it remains task-local/non-authoritative and may not become Project Truth.

## 10. Maximum-safe parallelism

Parallelize by coherent root ownership, not arbitrary files/languages/frontends/backends or provider count.

Compare every candidate Closure Unit against **every** active objective. Use these collision dispositions:

```text
PARALLEL_SAFE
DEPENDENT
OVERLAPPING_AUTHORITY
OVERLAPPING_WRITE_SET
SHARED_CUTOVER
EVIDENCE_DEPENDENT
DIRECT_CONFLICT
UNKNOWN_COLLISION
```

Independent concurrent mutation is permitted only when the candidate is `PARALLEL_SAFE` against the complete `ACTIVE_WORKSET` and satisfies:

```text
NO causal dependency
AND NO conflicting canonical authority
AND NO unsafe overlapping write set
AND NO shared migration/cutover ordering requirement
AND NO evidence dependency requiring serialization
```

`UNKNOWN_COLLISION` is not permission to guess. Serialize mutation until independence is proven.

If the highest-ranked root collides with active work, preserve its integrity, classify the collision, and select the next highest proven executable `PARALLEL_SAFE` root under `05`. Do not shrink or split the root merely to manufacture concurrency.

Read-only evidence work may be highly parallel even when mutation must serialize.

No artificial batch barriers: when one unit finishes, reconcile its evidence, visible delta and affected assumptions, rerank immediately and refill safe capacity.

## 11. Foreign/concurrent delta

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

A human-declared active objective that is not yet visible in the target branch still constrains selection. Live repository absence does not prove it is not being changed elsewhere.

Recency never outranks causality.

## 12. Protected/irreversible actions

Before production data mutation, destructive backfill, secret/key rotation, external financial/provider mutation, deploy/release/merge/tag or infrastructure destruction, prove exact authority, target/environment, candidate binding and rollback/compensation when possible.

Ordinary repository file deletion inside the authorized working cone is not a protected action once `02` proves `DELETE_REQUIRED` and prerequisites are satisfied.

## 13. Research

`AUTO`: use current internal/connected evidence first; research current authoritative external technical/platform/design/accessibility/research-method evidence when local evidence is materially insufficient.

`INTERNAL_ONLY`: do not browse; unavailable required external truth remains an explicit evidence gap.

`EXTERNAL_ALLOWED`: external research may materially improve technical, design or assurance correctness.

External evidence may establish technical/platform/standard/security/accessibility/design-system/research-method facts and support pattern evaluation; it may not invent BThwani Product/System/Brand behavior.

## 14. Durable project-memory routing

New facts are classified:

`EPHEMERAL_IMPLEMENTATION_FACT | CURRENT_RUNTIME_FACT | TASK_LOCAL_FACT | COORDINATION_INPUT | DURABLE_PROJECT_TRUTH | DURABLE_POLICY_INVARIANT | DECISION_REQUIRED`.

Only proven durable reusable truth whose absence/ambiguity can materially mislead future work is routed to the smallest live canonical governance owner. Expected governance paths must always be verified live before mutation; never recreate a stale path merely because this package historically named it.

Active objective IDs, executor names, worktree labels, temporary root queues and task plans are normally `COORDINATION_INPUT` or `TASK_LOCAL_FACT`, not durable governance.

## 15. Anti-bloat

- one material concept -> one package owner;
- reference owners instead of repeating laws;
- no task-specific rule accumulation;
- no fixed planning-directory requirement;
- no new registry/file merely to restate package semantics;
- no provider-specific semantic forks;
- package remains materially simpler than the system it governs;
- mutable tool/product names are implementation choices, not eternal semantic authorities.

## 16. Live system topology and material coverage matrix

System completeness is established from **live discovered topology**, not from a hard-coded list of historical services, applications or surfaces.

For each selected Closure Unit, discover broadly enough to identify every dimension that can materially carry, consume, enforce, transform, persist, display or invalidate the root:

```text
DOMAINS
SERVICES
APPLICATIONS
SURFACES
ACTORS
CAPABILITIES / JOURNEYS
STATES
TRANSITIONS
HANDOFFS
WRITERS
READERS / CONSUMERS
CONTRACTS / EVENTS
GENERATED BINDINGS
DATA / DATABASE / MIGRATIONS
JOBS / ASYNC PROCESSING
RUNTIME / INTEGRATIONS / PROVIDERS
AUTHORIZATION / SECURITY / PRIVACY
FAILURE / RECOVERY / IDEMPOTENCY / CONCURRENCY
PERFORMANCE / RESOURCE BEHAVIOR
TESTS / ASSURANCE
LEGACY / NEGATIVE SPACE
DURABLE GOVERNANCE when materially touched
```

For every material discovered node, assign an explicit disposition from the smallest applicable set:

```text
AFFECTED_AND_TREATED
AFFECTED_PENDING_TREATMENT
UPSTREAM_DEPENDENCY
DOWNSTREAM_CONSUMER
CONTRACT_CONSUMER
DATA_CONSUMER
RUNTIME_DEPENDENT
DERIVED_ONLY
VERIFICATION_ONLY
VERIFIED_UNCHANGED
N/A_PROVEN
DECISION_REQUIRED
BLOCKED
UNKNOWN_MATERIAL
```

`COMPLETE COVERAGE` means **100% material applicability disposition**, not 100% execution of every repository component.

```text
DISCOVER BROADLY.
EXECUTE NARROWLY.
VERIFY COMPLETELY.
```

A service/surface/application that is proven independent may be `N/A_PROVEN`; it need not be scanned or executed merely to make a matrix look complete. Conversely, an unclassified plausible consumer cannot be silently omitted.

Before any Closure Unit can be closed under `04`:

```text
UNKNOWN_MATERIAL = 0
AFFECTED_PENDING_TREATMENT = 0
UNCLASSIFIED MATERIAL NODES = 0
```

`BLOCKED` or `DECISION_REQUIRED` remain legitimate only when they map to a legitimate `00` stop state for the dependent cone; they never count as successful closure.

### 16.1 Live service topology

For each materially implicated service, resolve enough live truth to establish:

```text
SERVICE
-> CANONICAL OWNER
-> UNIQUE RESPONSIBILITIES
-> INBOUND CONTRACTS / EVENTS
-> OUTBOUND CONTRACTS / EVENTS
-> OWNED DATA / STATES
-> ALLOWED WRITE AUTHORITY
-> CALLERS
-> DOWNSTREAM CONSUMERS
-> EXTERNAL DEPENDENCIES
-> RUNTIME / JOBS
-> AUTHORIZATION / TRUST BOUNDARY
-> FAILURE / RECOVERY BOUNDARY
```

A directory name is not proof of service ownership. A service that works in isolation is not sufficient when its handoffs or consumers remain inconsistent.

### 16.2 Surface/application discovery

Surface discovery is always live. For every materially related application/surface prove one of:

```text
AFFECTED_AND_TREATED
DOWNSTREAM_CONSUMER
VERIFIED_UNCHANGED
N/A_PROVEN
```

Do not encode a fixed application list as eternal package truth. New or renamed surfaces must become discoverable without changing this invariant.

## 17. Expert-lens applicability and extended completeness dimensions

Expert lenses are **inspection/falsification perspectives**, not new authorities. The coordinator may execute them sequentially or delegate read-only/non-overlapping work in parallel, but all results return to the single root/authority model owned by `00`–`05`.

For every selected root and for every materially plausible lens, assign one explicit state:

```text
AFFECTED
VERIFICATION_REQUIRED
VERIFIED_UNCHANGED
N/A_PROVEN
```

Material lenses may not remain `NOT_INSPECTED`, `FORGOTTEN`, `PROBABLY_FINE` or implicit. Applicability must be proven, not assumed from file type or current directory.

The minimum lens families to consider are:

```text
PRODUCT / SYSTEM / UX MEANING
DOMAIN / ARCHITECTURE / OWNERSHIP
BACKEND / TRANSACTIONS / ERROR SEMANTICS
FRONTEND / STATE BINDING / CLIENT RESILIENCE
API / CONTRACTS / GENERATED BINDINGS
DATA / MIGRATION / RECONCILIATION
DISTRIBUTED HANDOFFS / ORDERING / PARTIAL FAILURE
CONCURRENCY / IDEMPOTENCY / REPLAY
SECURITY / TRUST / ABUSE / PRIVACY
MOBILE / PLATFORM / APP LIFECYCLE
ACCESSIBILITY / LOCALIZATION / RTL
PERFORMANCE / CAPACITY / RESOURCE LIFECYCLE
RELIABILITY / RECOVERY / OBSERVABILITY
TESTING / FALSIFIABILITY
BUILD / REPRODUCIBILITY / SUPPLY CHAIN / PROVENANCE
RELEASE / ROLLBACK / OPERATIONS
SIMPLIFICATION / NEGATIVE SPACE
INDEPENDENT ADVERSARIAL CHALLENGE
```

Extend the material coverage matrix, when applicable, with:

```text
OBSERVABILITY / TELEMETRY / CORRELATION
ACCESSIBILITY
LOCALIZATION / RTL
PRIVACY / DATA LIFECYCLE / RETENTION / REDACTION
BACKUP / RESTORE / DISASTER RECOVERY
RESOURCE / CAPACITY / QUOTAS / BACKPRESSURE
BUILD / CLEAN REPRODUCIBILITY
SUPPLY CHAIN / ARTIFACT PROVENANCE
RELEASE / ROLLBACK / PROMOTION
MOBILE APP LIFECYCLE / PROCESS DEATH
OFFLINE / WEAK OR INTERMITTENT NETWORK
BACKGROUND / RESUME
DEEP LINKS / PUSH / PLATFORM PERMISSIONS
OPERATOR / SUPPORT / ADMIN FLOWS
DATA RECONCILIATION / DRIFT DETECTION
```

`COMPLETE COVERAGE` therefore means both topology disposition and lens disposition are complete for the claimed cone. The package must discover broadly enough that a material cross-service, cross-surface or operational dependency cannot disappear merely because no currently edited file names it.

## 18. Human-experience applicability and design-source disposition

When a root can materially affect a user-facing surface or journey, extend the §17 lens law to the smallest applicable human-experience set:

```text
USER / ACTOR NEED
JOURNEY / TASK COMPLETION
INFORMATION ARCHITECTURE / NAVIGATION
INTERACTION MODEL / FEEDBACK / RECOVERY
BRAND / VISUAL LANGUAGE
CONTENT / TERMINOLOGY / MICROCOPY
DESIGN TOKENS
COMPONENT / PATTERN STATE COVERAGE
RESPONSIVE / DEVICE / PLATFORM ADAPTATION
ACCESSIBILITY / INPUT MODE / TEXT SCALE / REDUCED MOTION
LOCALIZATION / RTL
RENDERED VISUAL / INTERACTION STATE
CROSS-SURFACE EXPERIENCE CONSISTENCY
USABILITY EVIDENCE
USER-PERCEIVED PERFORMANCE
DESIGN-SOURCE RECONCILIATION
ASSET / LICENSE PROVENANCE
EXPERIMENT / FEATURE-FLAG EXPERIENCE DIVERGENCE
EXPERIENCE TELEMETRY / PRIVACY
```

Each materially plausible item receives `AFFECTED | VERIFICATION_REQUIRED | VERIFIED_UNCHANGED | N/A_PROVEN`; implicit omission is forbidden.

Design representations are not automatic authority. A design file, prototype, token source, component library, implementation and rendered screen may each be authoritative, derived or evidentiary for different concepts. Resolve the canonical owner/source for the material design concept before mutation and prevent competing design truths from surviving the cutover.

Human-experience completeness is a sparse applicability projection, not a Cartesian demand to test every device/state combination. `04` owns selection of the rendered scenarios capable of falsifying the actual claim.