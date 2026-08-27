# Diagnose, Findings, Root Proof, Source-of-Fix and Internal Execution Gate

## 1. Purpose

Diagnosis exists to choose and prove the correct treatment, not to generate a report or enumerate every low-level defect before useful execution can begin.

```text
DISCOVER
-> MODEL
-> HYPOTHESIZE
-> CROSS-CHECK
-> CHALLENGE
-> PROVE / DISPROVE
-> NORMALIZE FINDINGS
-> CLUSTER
-> RANK ROOTS
-> DEFINE CANONICAL TARGET
-> PROVE SOURCE-OF-FIX
-> SELECT/DECLARE CLOSURE UNIT WHEN NEEDED UNDER 05
-> EXECUTE WHEN INTERNALLY READY
-> RE-DIAGNOSE
```

Diagnosis is part of the unified close loop owned by `00`. It is not a separate mandatory phase and does not require a persisted plan before treatment.

## 2. Mandatory diagnostic altitude

Start high enough to avoid repairing a lower representation before its parent meaning is settled:

`Product/Operational Outcome -> Actor/Authority/Responsibility -> Capability/Journey -> State/Transition/Invariant/Handoff -> Canonical Ownership -> Contract/Data -> Service/Surface -> Runtime/Implementation/Test/Tool`.

Bottom-up inspection is evidence acquisition, not automatic bottom-up execution authority.

## 3. Material coverage

Material nodes progress conceptually through:

`UNKNOWN -> DISCOVERED -> INSPECTED -> MODELED -> FINDINGS_MAPPED -> ROOTS_PROVEN -> TARGET_DEFINED -> FIXED -> VERIFIED -> CLOSED`

or `N/A_PROVEN`.

Inspect materially applicable: Product meaning, actors/roles/permissions, journeys/states, owners/writers/readers/consumers, frontend/backend binding, contracts/events, data/migrations, runtime/config/providers, security/finance, testing/CI/tooling, structure/naming/duplication/dead/legacy residue, governance consistency, active/concurrent work boundaries and prior canonical closures.

`COVERAGE_COMPLETE != CLOSURE_COMPLETE`.

## 4. Findings Ledger — total accounting

Every material finding is addressable and traceable. Minimum conceptual fields:

```text
FINDING_ID
ORIGIN = code/runtime/test/tool/review/CI/governance/etc.
ORIGINAL_FINDING_ID(S) / RUN / JOB / ARTIFACT when applicable
EXACT PR_NUMBER + CANDIDATE_SHA when PR-scoped
CATEGORY / SEVERITY / RISK
RAW EVIDENCE / PROOF LIMIT
PATH / SYMBOL / JOURNEY / SURFACE
COMPETING HYPOTHESES CHECKED
ROOT CANDIDATE / MISSING PROOF
CANONICAL OWNER / WRITE PATH
WRITERS / READERS / CONSUMERS
BLAST RADIUS
CURRENT STATE
CANONICAL TARGET
REQUIRED TREATMENT / VERIFICATION
DISPOSITION
STATUS
REOPEN TRIGGER
```

Statuses:

`OPEN | EVIDENCE_HOLD | FIXED_PENDING_VERIFY | PROVEN_CLOSED | N/A_PROVEN`.

The ledger may exist in memory, tool output or a task-local artifact. A repository status registry is not required and must not become a parallel source of truth.

### 4.1 Raw tool finding invariant

Every material raw finding emitted by Sonar/CodeQL/Semgrep/OpenCodeReview/CodeRabbit/CI/tests/scanners/reviews or equivalent receives exactly one traceable disposition:

```text
MAPPED_TO_FINDING
DUPLICATE_OF
FALSE_POSITIVE_PROVEN
AUTHORIZED_INTENTIONAL_CONDITION
TOOL_LIMITATION_PROVEN
STALE_OR_SUPERSEDED_WITH_PROOF
N/A_PROVEN
```

```text
UNMAPPED != RESOLVED
DISAPPEARED_FROM_LATER_RUN != RESOLVED
GREEN_TOOL != ALL_FINDINGS_DISPOSITIONED
```

A finding does not disappear because a later log omits it.

### 4.2 Tool execution/coverage conditions

A tool can fail independently of code findings. Classify each material condition as exactly one of:

```text
DIAGNOSIS_BLOCKER
EXECUTION_FINDING
DEGRADED_EVIDENCE
NOT_APPLICABLE
EVIDENCE_AVAILABLE
```

Definitions:

`DIAGNOSIS_BLOCKER` — without this evidence and without sufficient alternative evidence, a material root/target/Source-of-Fix cannot be safely determined.

`EXECUTION_FINDING` — the broken tool/workflow/config/execution chain is itself diagnosable/treatable or is a normal defect to close during execution. It does **not** block the unified loop from treating another sufficiently proven root.

`DEGRADED_EVIDENCE` — evidence is incomplete/unavailable, but sufficient independent evidence exists to begin the proven treatment. Required missing proof remains a closure obligation.

`NOT_APPLICABLE` — proven irrelevant to the current claim/risk.

`EVIDENCE_AVAILABLE` — trustworthy evidence exists with explicit proof limit.

Only a proven `DIAGNOSIS_BLOCKER` can block the dependent treatment frontier solely because of a tool/capability condition.

## 5. Root-cause proof and clustering

Cluster symptoms under the highest proven common causes. Never prioritize by discovery order, easiest fix, file count, latest commit or first CI failure.

For each root candidate establish:

```text
violated Product/Operational outcome
exact evidence
competing hypotheses/falsification
causal parent
canonical owner/write path
writers/readers/consumers
blast radius / recurrence / risk
canonical target truth
proof treatment removes cause rather than symptom
proof treatment does not create conflicting project truth
```

Prefer by material leverage:

`upstream depth -> blocking power -> canonical importance -> blast radius -> user/operational/security/data/finance risk -> recurrence -> structural multiplier -> cosmetic impact`.

High-leverage root signals include:

`PARALLEL_TRUTH | DUPLICATE_AUTHORITATIVE_WRITER | SHADOW_STATE | DUPLICATE_CONTRACT_AUTHORITY | DUPLICATE_CONFIG_AUTHORITY | LEGACY_CANONICAL_PATH | DUPLICATE_DECISION_RULE`.

When concurrent objectives exist, leverage ranking and collision safety are both required: the highest root that is not safe to mutate concurrently remains high priority but is not selected for an independent parallel Closure Unit.

## 6. Semantic duplication

Do not limit duplication to textual clones. Inspect:

`TEXT_DUPLICATION | SEMANTIC_DUPLICATION | DECISION_RULE_DUPLICATION | STATE_MAPPING_DUPLICATION | CONTRACT/DTO_DUPLICATION | VALIDATION_DUPLICATION | AUTHORIZATION_DUPLICATION | CONFIG_AUTHORITY_DUPLICATION | RUNTIME_ROUTING_DUPLICATION | WRITE_PATH_DUPLICATION`.

Duplicate authority/business decisions/writers have higher priority than cosmetic textual duplication.

## 7. Source-of-Fix readiness

Before treating a material root identify:

```text
ROOT_CAUSE_ID
ACTUAL_SOURCE_OF_DEFECT
REQUIRED_SOURCE_OF_FIX
CANONICAL_TARGET_STATE
CANONICAL_OWNER / WRITE PATH
AFFECTED_IMPLEMENTATION_COMPONENTS
AFFECTED_WRITERS / READERS / CONSUMERS
AFFECTED_SURFACES/JOURNEYS
CONTRACT/DATA/MIGRATION/RUNTIME/CONFIG IMPACT
GOVERNANCE IMPACT
OBSOLETE IMPLEMENTATION TO REMOVE
REQUIRED VERIFICATION
ACTIVE_WORKSET COLLISION IMPACT when concurrent work exists
```

If code/runtime/data/contract/schema/config mutation is required but the actual Source-of-Defect remains unknown, that root is not executable yet.

A root may be proven but temporarily unavailable for parallel mutation because it collides with `ACTIVE_WORKSET`; route that selection decision through `01`/`05` rather than weakening the root.

### 7.1 Generated-output law

```text
GENERATED_OUTPUT != DEFAULT_SOURCE_OF_FIX
```

When an artifact is generated:

```text
trace generator/schema/template/authoritative input
-> fix canonical source
-> regenerate
-> verify generated output + consumers
```

Directly edit generated output only when evidence proves that output is itself authoritative by design.

## 8. Current-behavior classification

Do not preserve existing behavior blindly. Classify materially affected behavior:

```text
REQUIRED_CORRECT -> preserve
WRONG -> replace
LEGACY_REQUIRED_TEMPORARILY -> bounded migration with removal condition
UNKNOWN -> do not assume
```

Existing != canonical. Old != delete. New != better.

## 9. Artifact and structural disposition

Every material affected artifact whose existence/placement matters to root closure receives one disposition:

```text
KEEP_PROVEN
HARDEN_REQUIRED
REFACTOR_REQUIRED
MOVE_REQUIRED
RENAME_REQUIRED
MERGE_REQUIRED
SPLIT_REQUIRED
REWRITE_REQUIRED
REGENERATE_REQUIRED
DELETE_REQUIRED
RETIRE_AFTER_CUTOVER
BLOCKED_WITH_REASON
```

Every remaining material artifact must justify:

`Necessary Purpose + Canonical Owner + Single Clear Responsibility + Real Consumer + Correct Layer + Correct Dependency Direction + Proven Value + Correct Placement + Unambiguous Name + No Duplicated Authority + No Superseded Implementation`.

For `DELETE_REQUIRED` / `RETIRE_AFTER_CUTOVER`, record enough evidence of obsolescence/supersession, consumers/references, replacement/cutover prerequisites, reference/config/test/generated repair, deletion order and verification.

A proven `DELETE_REQUIRED` item is an execution obligation after prerequisites are satisfied.

## 10. Directory-level audit

Audit structure at the level required by the root:

`symbol -> function -> type/component -> file -> file family -> directory -> package/module -> service/surface -> domain`.

A material directory should have a defensible owner, responsibility, allowed contents, public boundary, dependency direction, real consumers, generated/runtime relation and reason to exist.

Generic containers such as `misc`, `old`, `legacy`, `temp`, `backup`, `common`, `shared`, `utils`, `helpers`, `stuff`, `archive` are not auto-delete by name. Mixed/unowned generic containers are high-priority structural findings requiring split/reownership/merge/delete as proven.

## 11. Decision taxonomy

```text
DERIVABLE_FACT
= derive from evidence; do not ask.

TRUE_DECISION_GAP
= multiple materially valid Product/System/architectural behaviors remain and evidence cannot choose; DECISION_REQUIRED.

EXTERNAL_EVIDENCE_GAP
= external evidence is needed; classify as DIAGNOSIS_BLOCKER only if no sufficient alternative evidence can establish safe treatment.
```

Do not turn ordinary execution complexity, tool failure, planning preference or a large working cone into a human decision request.

## 12. Patch-loop breaker

When work becomes:

`local error -> local fix -> new related error -> compatibility/fallback/workaround -> another symptom`, stop descendant patching, cluster symptoms, reconstruct the shared parent, prove/disprove a common root, rerank and treat the root.

A local fix is valid only when the local issue is itself the highest relevant root or a minimal diagnostic blocker.

## 13. Treatment adequacy gate

Before accepting a material write as root progress, answer:

```text
WHAT ROOT DOES THIS WRITE TREAT?
WHAT EXACT SOURCE-OF-DEFECT DOES IT CHANGE?
WHY IS THIS THE HIGHEST CORRECT OWNER?
WHAT CAUSAL LINK PROVES THIS REMOVES THE CAUSE?
WHICH DESCENDANT FINDINGS SHOULD DISAPPEAR?
WHAT OLD IMPLEMENTATION BECOMES OBSOLETE?
WHAT MUST NOW BE DELETED/RESTRUCTURED?
IF THIS WRITE WERE REMOVED, WOULD THE ROOT STILL EXIST?
```

If the root would remain, reject the write as patch/workaround/cosmetic/local compensation unless it is a necessary bounded step in a proven migration/cutover.

## 14. Internal execution-readiness gate

Readiness is an internal gate inside the unified loop, not a phase, stop state or required handoff:

```text
TARGET_READY
DIAGNOSIS_READY
SOURCE_OF_FIX_READY
COLLISION_READY
MUTATION_AUTHORIZED
REMOTE_EVIDENCE_COMPLETE
FINAL_VERIFICATION_READY
CLOSURE_READY
```

The first treatment may begin when materially:

```text
TARGET_READY
AND DIAGNOSIS_READY
AND SOURCE_OF_FIX_READY
AND highest actionable root(s) proven enough to rank/treat
AND canonical target sufficiently fixed
AND materially complete writer/reader/consumer + working-cone understanding
AND relevant artifact/cleanup dispositions known enough for the frontier
AND migration/cutover semantics known where required
AND no unresolved TRUE_DECISION_GAP can change the first treatment
AND no DIAGNOSIS_BLOCKER blocks the first treatment
AND ACTIVE_WORKSET collision disposition permits the selected mutation when concurrency exists
AND current human intent authorizes mutation
AND verification/closure obligations are defined enough to avoid blind treatment
```

It does **not** require every closure tool to be green or even runnable before treatment when failures are execution findings/degraded evidence.

When this gate is satisfied, do not stop merely to say “ready”. Under mutation-authorized intent:

`declare the selected Closure Unit under 05 -> execute immediately under 03`.

## 15. Planning and handoff semantics

There is no mandatory preparation handoff and no canonical `plans/diagnose-implementing` requirement.

Planning follows `00`:

```text
DEFAULT = in-memory / just-in-time
OPTIONAL = task-local artifact only when materially useful
FIXED 3-FILE HANDOFF = NOT REQUIRED
PLAN ARTIFACT = NON-AUTHORITATIVE
```

If an agent/provider chooses to persist a task-local plan, it chooses an appropriate path supported by its own authorized workspace and repository hygiene. Do not create a new canonical plan/status/evidence registry to represent execution state.

A plan may summarize evidence, root hypotheses, Source-of-Fix, treatment frontier and verification obligations, but live code/data/runtime/repository evidence always outrank it. Material target movement invalidates affected plan assumptions exactly as it invalidates other stale evidence.

When the human requests read-only audit or objective selection only, report the same decision-quality conclusions in the conversation without manufacturing a repository plan file.

## 16. Independent challenge, state-space and trust-boundary modeling

Before accepting a high-impact root/target/treatment as sufficiently proven, perform an **independent challenger pass** whose objective is to falsify the favored explanation rather than confirm it. Logical independence is required; a different agent/model is optional.

Challenge at least the materially plausible questions:

```text
IS THIS ROOT ACTUALLY A SYMPTOM?
WHAT COMPETING CAUSAL PARENT FITS THE EVIDENCE?
WHAT EVIDENCE WOULD DISPROVE THE TARGET?
WHAT WRITER/CONSUMER/HANDOFF COULD BE MISSING?
WHAT STALE STATE, RACE, RETRY, RESTART OR LOST RESPONSE BREAKS THE MODEL?
WHAT OLD AUTHORITY COULD STILL BE REACHABLE?
WHAT DATA/RUNTIME READBACK WOULD CONTRADICT THE CLAIMED CUTOVER?
```

A challenge that exposes a higher causal parent reopens ranking immediately. Challenger output is evidence, not a second authority.

For materially stateful roots, model enough state space to reason about legality and completeness:

```text
STATE
EVENT / COMMAND
ACTOR
GUARD / PRECONDITION
CANONICAL DECISION OWNER
EXPECTED NEXT STATE
FORBIDDEN TRANSITIONS
TERMINALITY
RETRY / DUPLICATE / REPLAY SEMANTICS
CONCURRENCY / ORDERING CONDITION
FAILURE / RECOVERY CONDITION
```

Use the model to expose missing transitions, terminal-state escapes, stale commands, repeated transitions and cross-service disagreement; verification technique selection remains owned by `04`.

For every material security/privacy/trust boundary, model enough of:

```text
ASSETS
ACTORS / SERVICE IDENTITIES
ENTRY POINTS
TRUSTED VS UNTRUSTED INPUTS
PRIVILEGES / OBJECT SCOPES
DATA FLOW
ABUSE / MISUSE CASES
REPLAY / CONFUSED-DEPUTY / CROSS-SCOPE CONDITIONS
FAILURE IMPACT
CANONICAL MITIGATION OWNER
REQUIRED FALSIFICATION EVIDENCE
```

Scanners may support this model but never substitute for it. When a service boundary itself is ambiguous, use a task-local live `SERVICE PASSPORT` view — owner, purpose, owned state/data, contracts/events, dependencies, consumers, trust/failure boundaries — as diagnostic structure only; do not create a persistent registry.

## 17. Human-experience root diagnosis and design-evidence discipline

When a material root affects a user-facing journey or surface, diagnose at the highest relevant human-experience altitude before patching presentation:

```text
USER / ACTOR NEED
-> JOURNEY / TASK
-> INFORMATION ARCHITECTURE
-> INTERACTION / FEEDBACK / RECOVERY
-> CONTENT / TERMINOLOGY
-> BRAND / VISUAL-LANGUAGE AUTHORITY
-> DESIGN TOKENS / COMPONENT / PATTERN AUTHORITY
-> SURFACE COMPOSITION
-> RENDERED BEHAVIOR
-> USABILITY / ACCESSIBILITY / PERCEIVED-PERFORMANCE EVIDENCE
```

High-leverage experience-root signals include competing design sources, unjustified local token/style overrides, duplicate component/pattern authority, inconsistent state or error semantics, missing material component states, cross-surface divergence without Product reason, rendered-only defects and high-risk usability assumptions presented as fact.

When internal authority does not determine the design/interaction choice and `01` permits external research, evaluate current authoritative or high-quality open evidence by source authority, recency, platform/context applicability, accessibility implications and licensing/provenance when assets are involved. Extract and compare principles/patterns; do not import another product's identity or use external practice to invent BThwani Product behavior.

For a design root, Source-of-Fix may be Product/Brand governance, semantic tokens, canonical component/pattern, content terminology, surface composition or platform adaptation. A screenshot-local style patch is not root treatment when a higher canonical source is wrong or missing.

`DESIGNER/AGENT CONFIDENCE != USABILITY EVIDENCE`. When a material claim depends on real-user comprehension or task success and cannot be derived from existing evidence, convert the assumption into a falsifiable usability/research obligation rather than self-certifying it.