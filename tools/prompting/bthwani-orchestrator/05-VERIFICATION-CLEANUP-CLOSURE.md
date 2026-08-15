# 05 — Verification, Cleanup & Closure

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/05-VERIFICATION-CLEANUP-CLOSURE.md`

هذا الملف يملك Candidate/Evidence، CI/runtime/E2E، repository-platform truth، approvals/independence، cleanup/structural hygiene، Source-of-Truth consolidation، Governance Sync، Fresh Head، Adversarial Review وFinal canonical decision.

## 1) Verification Strategy

```text
nearest root-cause regression
→ affected unit/package
→ related integration
→ affected typecheck/lint/test/build
→ contract/generated client
→ DB/data/security/isolation
→ runtime/readiness/smoke/readback
→ cross-surface E2E/visual/manual when claimed
→ failure/edge/adversarial
→ full verification only when policy/risk/blast-radius requires it
```

Use everything applicable, not everything blindly.

## 2) Candidate / Base Resolution and Validity

Deterministic meanings:

```text
STARTING_REMOTE_SHA = diagnosis/task start head
WORK_BASE_SHA = latest safe reconciled head used for current delta
IMPLEMENTATION_SHA = logical implementation commit(s)
BOOKKEEPING_SHA = optional pre-Freeze derived-artifact commit
FINAL_CANDIDATE_SHA = exact immutable commit after every allowed write and cleanup
HEAD_AT_REVIEW_START = live target head at final review start
HEAD_AT_DECISION = live target head immediately before final decision
MERGE_SHA = only if separately authorized merge actually occurs
```

No arbitrary parent/default-branch/base guessing. For total task-range review, use `STARTING_REMOTE_SHA..FINAL_CANDIDATE_SHA` only when ancestry/provenance is valid. `FINAL_CANDIDATE_SHA` is assigned only after Freeze.

Before final judgment prove:

```text
candidate exists
candidate is an exact full immutable SHA
candidate/base ancestry or reviewed range is proven, not guessed
candidate relationship/reachability to TARGET_REF is understood
HEAD_AT_REVIEW_START is live and exact
HEAD_AT_DECISION is live and exact
```

A deliberately reviewed older commit may be valid review evidence, but it cannot close the current branch head unless the required head/candidate relation is proven.

Any write after candidate assignment invalidates Freeze and affected evidence.

## 3) Package Bookkeeping / Freeze

Avoid evidence-write loops:

```text
complete all package/product/governance bookkeeping required in final branch state
→ complete cleanup writes
→ reconcile latest head
→ create final logical commit(s)
→ FREEZE WRITES
→ FINAL_CANDIDATE_SHA
```

After Freeze: no source/package/governance/format/generation/lockfile/migration write or commit/push during final evidence. Any write = return to execution/new candidate.

## 4) CI Topology / Rerun Economy

When applicable:

```text
Before PR → fast/affected verification
PR exists → PR owns heavy verification; pushes use lightweight receipt unless policy requires otherwise
Final Candidate → full closure scopes required by risk/policy
Post-merge target → separate post-merge FAIL-CLOSED verification when merge is authorized/performed
```

Never run heavy CI twice for the same still-valid candidate merely for reassurance. Deterministic fail → fix/new SHA. Proven transient infra/provider fail → targeted rerun only.

## 5) Evidence Sources / Routing

Use current available sources according to claim: GitHub/Actions, repository guards, Sonar/quality gate, CodeQL/security data-flow, dependency/CVE scanners, secrets/workflow-policy tools, DB/schema/readback, runtime/journey, observability, visual/design source, and task systems when they provide relevant context. Names are examples, not hardcoded requirements; actual tool availability and current governance control.

For each evidence scope record source, exact candidate, environment, status, proof limit, required capability and approval binding.

Special proof limits:

```text
Sonar scan completed ≠ Sonar Quality Gate passed
one migration/apply PASS ≠ idempotency/schema/readback/restart proof
static/build/typecheck/lint/unit/mock green ≠ runtime/E2E proof
UI hidden/disabled control ≠ server-side authorization proof
scanner green ≠ permission to suppress a known finding
finance/security/identity/isolation changes automatically raise evidence strength
```

## 6) Failure Classification

```text
DETERMINISTIC_PRODUCT
DETERMINISTIC_TEST_OR_CONTRACT
INFRA_OR_RUNNER
EXTERNAL_PROVIDER
FLAKY_OR_NONDETERMINISTIC
CANCELLED_OR_SUPERSEDED
STALE_RUN
```

Rules:

```text
DETERMINISTIC → first causal failure → root-cause fix → NEW SHA
INFRA/PROVIDER → prove cause → targeted rerun
FLAKY → defect until controlled/proven
CANCELLED/SUPERSEDED → neither PASS nor product FAIL proof
STALE → cannot prove current candidate
```

No blind rerun to force green.

## 7) Runtime Freshness / Real Scenario

Before runtime/E2E prove source/artifact/process/container/schema/seed/config/network profile freshness. Then execute real scenario where claimed:

```text
Actor/identity/session/scope
→ Surface action
→ Contract/API
→ Domain transition
→ Transaction/Persistence
→ Events/Integration
→ canonical readback
→ consuming surfaces
→ observable operational result
```

Where state contamination is possible, capture pre-state, use unique run identity, isolate/clean safe test data, and prove post-state from the canonical owner.

Static/mock green is not runtime proof.

## 8) Domain Gates

Security: auth/session/revocation/role/permission/trusted context/object auth/IDOR/cross-scope/service auth/input-output/injection/SSRF/path/upload/PII/secrets/signature/replay/rate-limit/audit.

Finance: canonical financial owner, idempotency/correlation/state constraints/provider outcome/readback/unknown-result reconciliation/compensation/restart/replay.

Data/PostgreSQL: deterministic migration/schema/constraints/indexes/fresh+non-empty/drift/orphans/duplicates/lock/concurrency/idempotency/restart/compatibility/rollback/roll-forward.

Mobile/Control Panel: permissions/deep-links/push/maps/location/SecureStore/offline/build/OTA/EAS/env; route/object auth/trusted scope/search isolation/bulk/audit/session/error/readback/responsive/RTL/localization/accessibility as claimed.

Supply chain/CI: lockfile/dependency/CVE/CodeQL/secrets/workflow policy/pinning as affected.

## 9) Evidence Invalidation

Map every mutation/branch movement to affected evidence. Examples:

```text
contract/schema change → consumers/generation/integration evidence stale
migration/data owner change → DB/runtime/readback evidence stale
runtime/config/network change → runtime/E2E evidence stale
security/auth/permission change → negative isolation/security evidence stale
shared library/owner change → all proven affected consumers stale
proven unrelated docs-only movement → evidence may remain valid with provenance
```

Reacquire the minimum sufficient invalidated set, except where policy/risk requires broader proof.

## 10) Repository-Platform Truth

When closure relies on repository-hosted enforcement, verify the **live candidate-specific state**, not only tracked configuration:

```text
workflow runs / jobs / first real failed step
required checks and required context names
cancelled / superseded / stale runs
reviews / unresolved review threads when applicable
live rulesets / branch protection
base/head relation and mergeability when merge is in scope
Sonar Quality Gate / CodeQL / dependency / security checks when applicable
```

Tracked workflow/ruleset files do not prove live enforcement. `green` is not “absence of red”: pending, cancelled, missing, stale or superseded required evidence is not PASS.

## 11) Approval / Independent Review

Resolve current protected approvals from authority contracts:

```text
approval domain
required + reason
allowed approver/reviewer identity or role
actual provenance
exact candidate binding
SATISFIED | MISSING | UNPROVEN | NOT_APPLICABLE
```

`SELF_REVIEW ≠ INDEPENDENT_REVIEW`. Git author/account alone does not prove independence. Historical blanket authorization is not candidate-bound protected acceptance unless current governance explicitly permits it. If the reviewer changes the candidate, re-establish any independence required by current policy.

## 12) Claim / Diff / Test Review

Before closure review the claimed outcome, not only changed files:

```text
actors / surfaces / owners / states
scopes / permissions / contracts
persistence / providers / finance
readbacks / failure / recovery / compatibility
UX/design when claimed
evidence / approvals
```

Review the complete owned range for foreign/pre-existing delta, unexpected generated/lockfile changes, out-of-scope cleanup, missing consumer migration, reachable legacy paths, contract/schema/runtime effects and stale plan assumptions.

For each changed Test/Guard ask what claim it can falsify, whether it can still pass with the defect present, whether it covers the real contract/DB/runtime path, and whether it was weakened/skipped/mocked/redirected/non-blocking. Prove a root-cause regression where reasonably regressable.

## 13) Cleanup = Part of DONE

Perform local cleanup during fixes and a final sweep before Freeze/closure. Cover proven-related:

```text
dead/unreachable/stale/legacy/superseded code
unused files/folders/imports/exports/re-exports/dependencies
obsolete routes/contracts/DTOs/schemas/models
stale configs/env/flags/scripts/commands/tests/docs/comments/examples
hidden fallbacks/workarounds/TODO/FIXME/HACK
unnecessary compatibility layers
old paths/names/aliases
orphan/stale references
wrong ownership/responsibility/placement/naming/context
parallel business logic/state machines/data writers
duplicate source of truth
temporary/debug/generated noise
files/folders without proven Purpose/Consumer/Responsibility
```

Never delete blindly:

```text
DISCOVER → CLASSIFY → TRACE CONSUMERS → PROVE OBSOLETE/WRONG/DUPLICATE
→ REMOVE/MERGE/MOVE/RENAME/REFACTOR/REDESIGN/REBUILD
→ REPAIR REFERENCES → REVERIFY
```

## 14) Structural Levels / Keep-or-Delete Proof

Cleanup is not file-only:

```text
line / expression / condition / branch / block
→ function / method / type / class / component / helper / constant
→ file / file group / folder / module / package
→ service / surface / domain
→ contract / route / config / dependency
```

For every questioned element, do not delete because it “looks old” and do not keep because it “does not fail”. Prove:

```text
Responsibility + Purpose + Consumer + Requirement + Architectural Reason
```

Then choose the evidence-backed action: Delete / Rename / Move / Merge / Split / Refactor / Reorganize / Redesign / Rebuild / Keep-with-reason.

## 15) Canonical Source Consolidation / Reference Integrity

For concepts that should have one authoritative owner, examine at least:

```text
Contracts / Schemas / Models / Configurations / Policies
Mappings / Constants / Business Rules / State Definitions / Domain Definitions
```

When duplication is unjustified:

```text
identify canonical owner
→ map writers/readers/consumers
→ migrate them
→ remove secondary truth/synchronization residue when safe
→ verify canonical readback
```

After Delete/Rename/Move/Merge/Split/Refactor/Replace inspect both directions:

```text
Imports / Exports / Re-exports
Callers / Callees
Registrations / Bindings / Routes
Contracts / Schemas / Configs / Env
Dependencies
Tests / Mocks / Fixtures
Docs / Examples
Build / CI / Scripts
Generated References
```

No stale alias or reachable compatibility residue without a proven requirement, owner and removal trigger.

## 16) Final Cleanup Gate

```text
ZERO known dead code/files/folders in scope
ZERO known stale/obsolete reachable path
ZERO known unjustified duplicate truth/logic
ZERO known orphan/stale reference
ZERO known unused affected dependency/config/flag/script
ZERO known misleading naming/placement/context/ownership
ZERO known temporary workaround/fallback
ZERO known unjustified compatibility residue
ZERO known scope-related TODO/FIXME/HACK
ZERO known structural contradiction
ZERO known cleanup finding unresolved
```

Cleanup writes invalidate affected evidence and must be reverified before Freeze.

## 17) Governance Reconciliation

```text
all durable decisions classified
→ required governance promotions complete or explicitly blocking
→ machine counterpart synchronized when applicable
→ governance ↔ Product Truth ↔ contracts/registries ↔ code/consumers ↔ runtime compared
```

No closure with durable truth only in task artifacts or any known semantic contradiction across these layers.

## 18) Fresh Head

```text
HEAD_AT_REVIEW_START = live re-resolved head at final review start
HEAD_AT_DECISION = live re-resolved head immediately before decision
```

For branch-head closure:

```text
HEAD_AT_DECISION == FINAL_CANDIDATE_SHA
```

If not, classify movement, reconcile/rebuild candidate and rerun invalidated evidence.

## 19) Final Adversarial Completeness

Try to disprove closure using alternative entry points: hidden writers/readers, parallel/stale truth, missing consumers, contract/binding mismatch, permission bypass, retry/replay/concurrency, unknown-result/recovery, partial failure/restart, runtime-only defects, stale process/data/config, weak/flaky guards, missing audit/observability, foreign delta, reachable legacy, PII/secrets, neighboring consumer regression, wrong ownership/placement/naming/context and unnecessary residue.

Any material Finding requiring write cancels Freeze and returns to execution.

## 20) Final Read-Only Verification

On exact final candidate only: required checks, generated consistency without mutation, exact diff/scope/foreign-change review, canonical readbacks, runtime/E2E where claimed, security/data/finance scopes, edge/adversarial behavior, test effectiveness, artifact provenance, repository-platform evidence and approvals.

No `--fix`, formatter/generator write, lockfile/migration mutation, source/package mutation, commit/push/merge or swallowed exit during this phase.

## 21) Lifecycle vs Canonical Decision

`LIFECYCLE_STATE` is internal derived state. `FINAL_DECISION` must be an ID from **current** `governance/contracts/decision-vocabulary.json`.

Do not write `OPEN`, `BLOCKED`, `DONE`, or invented aliases as canonical decisions unless current governance defines them. When not closed, choose the canonical evidence-supported decision (`FIX_REQUIRED`, `BLOCKED_EXTERNAL`, `NEEDS_EVIDENCE`, `QA_BLOCK`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, etc.).

## 22) Final Closure Equation

```text
DISCOVERY_COMPLETE
AND DIAGNOSIS_COMPLETE
AND DECISION_COMPLETE
AND COVERAGE_COMPLETE
AND PACKAGE_READY
AND IMPLEMENTATION_COMPLETE
AND CLEANUP_COMPLETE
AND EVIDENCE_COMPLETE
AND GOVERNANCE_SYNC_COMPLETE
AND FRESH_HEAD_VALID
AND FINAL_ADVERSARIAL_PASS
```

Plus zero known fixable defect, unresolved Finding/Decision, unverified fix, required missing/stale/pending/cancelled evidence, required missing/unproven approval, duplicate truth, reachable obsolete path, structural/reference residue, or durable truth left only in derived artifacts.

Final branch-head closure requires:

```text
LIFECYCLE_STATE = CLOSED
FINAL_DECISION = current decision-vocabulary.closureRules.closedDecision
HEAD_AT_DECISION = FINAL_CANDIDATE_SHA
all applicable evidence/approval scopes satisfied on same immutable candidate
```

Anything less is not closure.
