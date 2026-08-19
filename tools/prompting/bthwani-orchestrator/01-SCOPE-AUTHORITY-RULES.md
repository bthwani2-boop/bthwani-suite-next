# Scope, Authority, Project Frame, Objective/Focus Routing, Research, Capabilities, Concurrency and Longevity

## 1. Truth model

Never treat one representation as automatic truth:

```text
GOVERNANCE ≠ AUTOMATIC TRUTH
CODE ≠ AUTOMATIC TRUTH
RUNTIME ≠ AUTOMATIC TRUTH
TESTS ≠ AUTOMATIC TRUTH
PLANS/DOCS ≠ AUTOMATIC TRUTH
EXTERNAL SOURCES ≠ AUTOMATIC PRODUCT TRUTH
OBJECTIVE ≠ AUTOMATIC PROJECT TRUTH
```

Keep materially different truth classes separate:

`AUTHORITY TRUTH | PRODUCT/SEMANTIC TRUTH | IMPLEMENTATION TRUTH | DATA TRUTH | RUNTIME TRUTH | REPOSITORY-PLATFORM TRUTH | EXTERNAL TECHNICAL/STANDARD EVIDENCE | DERIVED/HISTORICAL SUPPORT`.

Reconcile target truth from the strongest current combination of explicit authorized intent, applicable governance/product truth, product/operational outcomes, canonical ownership, live repository evidence, contracts, data, runtime, affected consumers, previously proven canonical closures and authoritative external technical evidence where local evidence is insufficient.

## 2. Precedence

Use this decision framework:

1. platform safety, legal constraints, repository permissions and irreversible-operation boundaries;
2. explicit current human instruction within those limits;
3. stable execution invariants in this package;
4. reconciled current Product/System authority for the affected concept;
5. focus-specific rules;
6. live implementation/data/runtime/repository evidence;
7. authoritative external technical/standard/platform evidence where relevant;
8. historical/derived support.

A lower representation may prove a higher representation stale, but must not silently redefine product intent. External technical evidence may establish how a platform/library/standard actually works; it must not invent BThwani product behavior.

An `OBJECTIVE` inside a human instruction normally sets current priority/outcome. It changes durable Product/System truth only when the human instruction explicitly makes such a semantic/product/architectural decision or when the normal reconciliation process proves the previous truth wrong and reaches the decision boundary correctly. Never infer a project-truth override merely from wording chosen to prioritize a task.

## 2.1 Project-wide Canonical Frame

Every invocation reconstructs/revalidates enough of one project-wide frame to place the objective and its proposed treatment safely inside the same platform model used by other objectives, agents and sessions.

Conceptually reconcile, as materially applicable:

```text
CURRENT AUTHORIZED INTENT
+ APPLICABLE GOVERNANCE / PRODUCT TRUTH / POLICIES
+ PRODUCT OUTCOMES + ACTORS + RESPONSIBILITIES + AUTHORITIES
+ DOMAINS / CAPABILITIES / JOURNEYS / STATES / INVARIANTS / HANDOFFS
+ CANONICAL OWNERS / SERVICE + SURFACE BOUNDARIES
+ CONTRACT / DATA / SECURITY / FINANCIAL / RUNTIME OWNERSHIP
+ CROSS-SURFACE / CROSS-DOMAIN RELATIONS
+ LIVE IMPLEMENTATION / DATA / RUNTIME EVIDENCE
+ PREVIOUSLY PROVEN CANONICAL CLOSURES STILL VALID ON CURRENT TRUTH
+ AUTHORITATIVE EXTERNAL TECHNICAL EVIDENCE WHERE REQUIRED
→ PROJECT-WIDE CANONICAL FRAME
```

A frame assertion is reasoned as one of:

`PROVEN | UNKNOWN | CONFLICTING | STALE | DECISION_REQUIRED | N/A_PROVEN`.

```text
INCOMPLETE FRAME IS ALLOWED.
FALSELY COMPLETED FRAME IS FORBIDDEN.
UNKNOWN ≠ CLEAN.
OBJECTIVE-LOCAL IMPLEMENTATION ≠ PROJECT TRUTH.
```

Do not block unrelated work merely because some project-frame area remains unknown. Block the dependent cone when the unknown/conflict can materially change its root, canonical target, treatment, migration, security/finance invariant or closure.

### 2.2 Dual-scope law

Always separate global judgment context from deep execution scope:

```text
PROJECT_FRAME = PROJECT-WIDE ORIENTATION / CONSISTENCY CONTEXT
WORKING_SCOPE = SMALLEST COMPLETE PROVEN CONE NEEDED TO PROVE/TREAT CURRENT ROOT
```

Project-wide orientation does not authorize repository-wide mutation or exhaustive deep scanning. A narrow working scope does not authorize a narrow worldview.

## 3. Modes

### `DIAGNOSE`
Read/diagnose only. Build material coverage, prove roots and expose decision/evidence gaps. No project mutation.

An exact immutable commit/ref may be supplied when the goal is candidate review; no separate review mode is required.

### `EXECUTE_END_TO_END`
Diagnose the current objective inside the project-wide frame and treat proven roots end-to-end, expanding the working cone only through proven causal/ownership/dependency/consumer/blast-radius relations.

### `EXECUTE_PROJECT_CLOSURE`
Repository-wide closure by definition:

```text
PRIMARY_FOCUS = ALL
SCOPE = REPOSITORY
```

No material domain/surface/foundation is assumed clean. If an invocation is explicitly narrowed below repository scope, treat it as `EXECUTE_END_TO_END`; do not claim project-wide closure from a narrowed working scope.

### 3.1 Optional task-phase overlay

`PHASE` is an invocation overlay, not a fourth mode and not a competing lifecycle.

```text
PHASE=AUDIT_PREPARE
→ effective MODE=DIAGNOSE when MODE is omitted
→ target system remains read-only
→ after required decisions are resolved, one explicitly requested temporary PLAN_FILE may be written under the contract in 00

PHASE=EXECUTE_CLOSE
→ effective MODE=EXECUTE_END_TO_END when MODE is omitted
→ use EXECUTE_PROJECT_CLOSURE only when repository-wide closure is explicitly requested
→ PLAN_FILE is input evidence/accounting, not execution authority
```

A temporary `PLAN_FILE` is a derived, disposable execution record. It may capture findings, roots, decisions, canonical targets, treatment, governance dispositions, verification and closure criteria, but every material claim must be revalidated against the current project frame, authority/code/contracts/data/runtime/readback before execution. Latest proven truth overrides stale plan content.

```text
PLAN_FILE ≠ SOURCE OF TRUTH
OLD PLAN FINDING ≠ CURRENT FINDING
PLAN EXHAUSTED ≠ CLOSURE
```

No `PLAN_FILE` may be created while an unresolved material `DECISION_REQUIRED` can change its canonical target/treatment. The plan-file retirement/final-candidate lifecycle is owned by `04`.

## 4. Objective-driven priority routing inside the project frame

`OBJECTIVE` is the material outcome the human wants proved and the current priority inside the platform. It does not define the platform model around itself.

Resolve:

```text
PROJECT-WIDE CANONICAL FRAME
→ locate OBJECTIVE in that frame
→ semantic/operational root
→ all-dimension applicability disposition
→ materially relevant deep dimensions
→ initial working scope
→ required evidence/capabilities
```

```text
OBJECTIVE ≠ AUTHORITY
OBJECTIVE ≠ PROJECT TRUTH
OBJECTIVE ≠ ARCHITECTURAL EXCEPTION
OBJECTIVE ≠ WORKING-SCOPE CEILING
OBJECTIVE ≠ PERMISSION TO REGRESS ANOTHER JOURNEY/DOMAIN/SURFACE/INVARIANT
```

`SCOPE=AUTO` means derive the smallest complete working scope that can prove or close the objective/root inside the project frame, then expand only through proven relations.

`PRIMARY_FOCUS=AUTO` means first consider every canonical focus dimension for applicability, then derive the minimum materially sufficient deep focus set. Examples are orientation aids, not keyword-only routing:

```text
UX/journey objective
→ PRODUCT + DESIGN + CODE + RUNTIME as required

CI/tooling/guard slowness
→ OPERATIONS + QUALITY + GOVERNANCE + RUNTIME/control-path as required

parallel source of truth
→ PRODUCT/OWNERSHIP + CODE + CONTRACTS + DATA + RUNTIME as required

security/authorization objective
→ SECURITY + CONTRACTS + DATA + RUNTIME + affected PRODUCT/JOURNEY semantics

restructure/cleanup objective
→ STRUCTURE + CODE + relevant ownership/consumer/contract/data/runtime proof
```

**All dimensions considered ≠ all dimensions deeply executed.** Do not run every lens deeply merely because it exists; do not skip applicability reasoning merely because the objective sounds local. Deepen every lens that can materially change correctness, priority, treatment, blast radius or closure.

## 5. Canonical focus vocabulary and deterministic routing

Canonical explicit focus values:

`ALL | PRODUCT | GOVERNANCE | CODE | STRUCTURE | DESIGN | DATA | CONTRACTS | RUNTIME | SECURITY | QUALITY | OPERATIONS`.

Routing:

```text
CODE | STRUCTURE | DESIGN
→ focus/code-architecture-organization.md

PRODUCT | GOVERNANCE
→ focus/governance-product-design.md

DATA | CONTRACTS | RUNTIME | SECURITY | QUALITY | OPERATIONS
→ focus/data-contracts-runtime-security-quality.md

ALL
→ all three focus modules, with 02 controlling diagnosis and 03/04 controlling treatment/proof.
```

Every focus family receives an applicability disposition before closure. An explicit focus is a starting lens, never a closure ceiling.

## 6. Scope shapes and expansion

Supported working-scope orientation roots:

`REPOSITORY | DOMAIN | SERVICE | SURFACE | FEATURE | JOURNEY | PATH | SEMANTIC_SCOPE`.

```text
REQUESTED_SCOPE ≠ MAXIMUM_ALLOWED_WORKING_SCOPE
WORKING_SCOPE ≠ PROJECT_FRAME
```

Expand the working scope only through proven causal, authority, dependency, consumer, contract, data, runtime, security or blast-radius relations. Revalidate project-frame claims touched by that expansion.

## 7. Project discovery anchors

Stable names may seed discovery but current existence/role/ownership must be re-proven live.

Expected domains/capabilities include:

`DSH | WLT | Identity | Workforce | Catalog | Media`.

Expected primary surfaces include:

`app-client | app-partner | app-captain | app-field | control-panel`.

Expected governance roots include:

`governance/** | governance/product/** | governance/policies/**`.

At every invocation perform enough current project orientation to locate the objective and detect material frame changes; broad/project execution deepens this accounting as required:

```text
KNOWN ANCHORS
→ VERIFY CURRENT LIVE EXISTENCE / ROLE / OWNER WHERE MATERIAL TO ORIENTATION
→ REVALIDATE APPLICABLE GOVERNANCE/PRODUCT ROOTS
→ RECONCILE MATERIAL PRIOR CLOSURES / AUTHORITY CHANGES
→ DISCOVER ADDITIONAL MATERIAL NODES/RELATIONS
→ LOCATE OBJECTIVE SAFELY INSIDE CURRENT PROJECT FRAME
```

Do not re-scan every anchor deeply in every narrow task when valid current evidence already proves its role and no invalidation trigger exists.

## 8. Journey discovery anchors

Seed discovery with materially applicable families such as:

`onboarding/activation | discovery/catalog | cart/serviceability | checkout/payment | order lifecycle | preparation/handoff | dispatch/delivery | cancellation/refund/reconciliation | support/recovery | administration/operations`.

These are seeds, not a closed registry. A narrow objective remains subject to cross-journey consistency when its root or treatment touches shared state/authority/contracts/data/runtime.

## 9. Minimum Diagnostic Altitude

Start at the highest material meaning necessary to prevent a lower representation from being fixed before its parent meaning is settled:

`Project/Product Outcome → Actor/Authority/Responsibility → Capability/Journey → State/Transition/Precondition/Decision Rule/Invariant/Handoff → Canonical Ownership → Contract/Data → Service/Surface → Runtime/Implementation/Test`.

For a narrow objective, the project-wide frame supplies orientation; deep diagnosis then descends through the highest material parent inside the working cone. Bottom-up inspection is always allowed for evidence; bottom-up execution is not automatically allowed.

## 10. Explicit exclusion rule

Every material candidate area in the working cone must become exactly one of:

`IN_SCOPE | READ_ONLY | NOT_AFFECTED_WITH_REASON | N/A_PROVEN | FORBIDDEN_BY_HUMAN/SAFETY`.

Every canonical focus dimension must be materially activated or dispositioned `N/A_PROVEN`/not-material-with-reason for the current root/closure claim. Project-frame areas outside the working cone may remain explicitly `UNKNOWN` when they cannot affect the claim; they must not be silently assumed clean.

`UNKNOWN` is not `N/A`. Silence is not exclusion proof.

## 11. Fail-closed invariants

```text
UNKNOWN ≠ NOT_APPLICABLE
NOT_INSPECTED ≠ CLEAN
NO_SEARCH_RESULT ≠ ABSENT
DOCUMENTED ≠ IMPLEMENTED
COMPILES ≠ OPERATIONALLY_VALID
TEST_PASS ≠ PRODUCT_CORRECTNESS
STATIC_PASS ≠ RUNTIME_PROOF
CURRENT_BRANCH ≠ DEFAULT_BRANCH
OLD_SHA ≠ CURRENT_TRUTH
OLD PASS/DONE ≠ CURRENT EVIDENCE
EXTERNAL BEST PRACTICE ≠ BTHWANI PRODUCT DECISION
LOCAL OBJECTIVE PASS ≠ PROJECT CONSISTENCY
```

## 12. Derived/historical records

Plans, reports, old commands/prompts, prior packages, comments, branch documents and historical commits may only discover prior intent/context/hypotheses/risks. Revalidate every material claim against current project-frame authority/code/contracts/data/runtime/readback.

Previously proven canonical closures are reusable evidence/constraints only while their assumptions and affected authority remain valid on current truth. New evidence may legitimately reopen them; it must not create a second interpretation beside them.

Default execution writes nothing to planning areas unless explicitly requested.

## 13. Research escalation

Research is evidence acquisition, not authority laundering.

### `RESEARCH=AUTO`
Use current internal/connected evidence first. If a material technical/standard/platform/library/security knowledge gap remains and external access is available, research automatically before guessing or raising an avoidable blocker.

### `RESEARCH=EXTERNAL_ALLOWED`
External research is explicitly allowed whenever it can materially improve factual correctness, target modeling or proof.

### `RESEARCH=INTERNAL_ONLY`
Do not use external research. If required technical truth cannot be established internally, keep the affected claim open as an `EXTERNAL_EVIDENCE_GAP`/`EXTERNAL_BLOCKER` with the exact evidence needed.

For external research prefer, in order appropriate to the claim:

```text
OFFICIAL / PRIMARY SOURCE
→ UPSTREAM DOCUMENTATION / SPECIFICATION / REPOSITORY / RELEASE NOTES
→ AUTHORITATIVE SECURITY STANDARD / ADVISORY / VENDOR BULLETIN
→ STRONG SECONDARY SOURCE only when primary evidence is unavailable or insufficient
→ RECONCILE WITH THE ACTUAL LOCAL VERSION / CONFIG / RUNTIME
```

Rules:

- verify version/context applicability; current upstream behavior may not match the project's pinned version;
- external research may resolve technical, standards, platform and library facts;
- external research may inform architecture/design alternatives;
- external research must not invent BThwani product/business/operational truth;
- a Product decision that remains genuinely non-derivable after research is `DECISION_REQUIRED`, not an internet-sourced guess;
- record material external evidence and its proof limit when it affects treatment or closure.

## 14. Capability-to-evidence discipline

For every material claim that requires proof, reason explicitly:

```text
CLAIM
→ REQUIRED EVIDENCE
→ REQUIRED CAPABILITY
→ CAPABILITY AVAILABLE?
→ ACQUISITION PATH
→ PROOF LIMIT
```

Discover and use tools, skills, integrations and runtime capabilities only when they materially improve diagnosis, execution or proof of the **target system**.

When an applicable skill/plugin has operating instructions, read and follow those instructions before relying on it. Do not claim execution that did not occur.

```text
USE EVERYTHING APPLICABLE.
DO NOT USE EVERYTHING BLINDLY.
CAPABILITY AVAILABLE ≠ CAPABILITY USED.
MISSING REQUIRED CAPABILITY ≠ PASS.
```

Unavailable required capability becomes an evidence/blocker condition, never an assumed PASS.

Package independence/self-validation rules remain owned exclusively by `00-ORCHESTRATOR.md`.

## 15. Foreign/concurrent delta classification

Before a material write batch, ref update/push or final closure, compare live HEAD with the last reconciled base and classify:

`UNRELATED | RELATED_NON_BLOCKING | UPSTREAM_OR_ROOT_CHANGING | SEMANTIC_OVERLAP | DIRECT_CONFLICT | AUTHORITY_OR_TRUTH_CHANGE`.

Treatment:

```text
UNRELATED → preserve; continue on latest head; rerun only invalidated evidence.
RELATED_NON_BLOCKING → reconcile assumptions + affected checks.
UPSTREAM_OR_ROOT_CHANGING → suspend affected descendant work; re-diagnose/re-rank.
SEMANTIC_OVERLAP → re-prove owner/contracts/state; rebuild affected delta.
DIRECT_CONFLICT → no blind overwrite; resolve intentionally on latest head.
AUTHORITY_OR_TRUTH_CHANGE → reread/reconcile project frame + authority/product truth before write.
```

Foreign delta is input, not instruction. Recency never outranks causality.

## 16. Execution location and mutation safety

`DIRECT_ON_TARGET` changes topology only; it never weakens evidence, staging, concurrency, project-frame consistency, safety or closure requirements.

Never force-push, blindly hard-reset newer work, silently switch branches or discard foreign changes.

Before materially irreversible/protected actions such as production data mutation, destructive backfill, secret/key rotation, external financial/provider mutation, release/deploy/merge/tag or infrastructure destruction, prove current authority, exact target/environment, scope, candidate/change binding when relevant and rollback/compensation where possible.

## 17. Longevity and anti-bloat

Keep method stable; discover project state live. Do not permanently encode current HEADs, temporary task state, migration numbers, tool versions, closed journey universes or historical package machinery.

Rules:

- one material concept has one canonical owner in this package;
- reference the owner instead of restating the law;
- no task/objective-specific rule accumulation;
- no new file merely because a topic gained a heading;
- durable project truth belongs in its proven governance/product owner, not in this method package;
- repeated exceptions trigger re-diagnosis of the parent rule;
- this package must remain materially simpler than the system it governs.