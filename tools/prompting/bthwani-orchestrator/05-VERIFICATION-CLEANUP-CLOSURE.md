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

## 2) Candidate / Branch Roles

```text
INTEGRATION_TARGET = target branch named by BRANCH
TASK_BRANCH = isolated working branch for this package
TASK_BRANCH_BASE_SHA = exact target SHA from which isolated work began/rebased
WORK_BASE_SHA = latest target truth reconciled into task work
IMPLEMENTATION_SHA = task-branch implementation commit(s)
FINAL_CANDIDATE_SHA = exact immutable Integration Target commit after final integration
HEAD_AT_REVIEW_START = live Integration Target head at final review start
HEAD_AT_DECISION = live Integration Target head immediately before final decision
```

Task-branch green is not target-branch closure.

## 3) Latest-Target Reconciliation

Before every semantic write/integration and before final judgment:

```text
resolve latest INTEGRATION_TARGET
→ compare target movement against reconciled target SHA
→ classify foreign delta
→ retain proven-unrelated evidence
→ invalidate affected graph/evidence/landscape-priority cone
→ rebase/rebuild task delta semantically when required
```

Git textual mergeability is not semantic safety.

## 4) Task-Isolation Verification

Before live writes prove:

```text
TASK_CONTEXT_POLICY=ISOLATED_CURRENT_TASK_ONLY
FOREIGN_DELTA_POLICY=INPUT_NOT_INSTRUCTION
TASK_BRANCH != INTEGRATION_TARGET
TASK_BRANCH_READY=YES
WORKSPACE_ISOLATION_READY=YES
DIRECT_INTEGRATION_TARGET_WRITES=FORBIDDEN_EXCEPT_INTEGRATION_OWNER
```

Local mode requires actual current branch/worktree proof.
Remote/API mode requires every write to explicitly target TASK_BRANCH.

## 5) Target Landscape / Root-Cause Priority Verification

Before first live write, after any material causal reprioritization, and before final handoff/closure prove:

```text
TARGET_LANDSCAPE_COMPLETE=YES
LANDSCAPE_RECONCILED_SHA=LATEST_RECONCILED_SHA
ROOT_CAUSE_CLUSTERING_COMPLETE=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
PRIORITY_MODEL_COMPLETE=YES
PRIORITY_DERIVATION_SOURCE=ROOT_CAUSE_LANDSCAPE
UNRANKED_MATERIAL_CLUSTERS=0
PRIMARY_FRONTIER_JUSTIFIED=YES
LANDSCAPE_ADVERSARIAL_PASS=YES
PRIORITY_POLICY=HIGHEST_PROVEN_SYSTEMIC_LEVERAGE
```

Verification must challenge not only whether a fix passes, but whether the chosen frontier was still justified after new evidence. A newly proven upstream/foundation root cause, cluster split/merge, authority change, or material change in dependency/blocking/blast-radius/risk/unlock value invalidates the affected priority model.

`MOST_FINDINGS`, recency, easiest fix, changed-file count, last session, and Sequence number are not valid priority proof.

## 6) Package Bookkeeping / Freeze

Do not freeze on an unintegrated task branch or stale priority model.

```text
finish task-branch package/product/governance bookkeeping
→ finish cleanup writes
→ verify task branch
→ reconcile affected root-cause landscape/priority
→ resolve latest Integration Target
→ Integration Owner reconciles/rebuilds task delta on latest target
→ rerun invalidated checks
→ integrate safely/non-force
→ set INTEGRATION_COMPLETE=YES
→ re-resolve Integration Target
→ reconcile affected landscape/priority again if integration movement changed truth
→ finish final target bookkeeping if needed
→ FREEZE WRITES
→ FINAL_CANDIDATE_SHA = exact Integration Target commit
```

Any write after Freeze invalidates candidate and affected evidence.

## 7) Evidence Routing / Failure Classification

For each evidence scope record source, exact candidate, environment/profile, result, proof limit, required capability, approval binding and invalidation trigger.

Allowed outcomes include `PASS / FAIL / MISSING / STALE / BLOCKED / CANCELLED_OR_SUPERSEDED / NOT_APPLICABLE_WITH_PROOF`.

```text
DETERMINISTIC_PRODUCT or TEST/CONTRACT → first causal failure → root fix → NEW SHA
INFRA/PROVIDER → prove cause → targeted rerun
FLAKY → defect until controlled/proven
CANCELLED/SUPERSEDED → not PASS
STALE → cannot prove current candidate
```

No blind rerun to force green.

## 8) Proof Limits

```text
task branch green ≠ Integration Target green
priority model complete ≠ no undiscovered defect exists
most findings in a cluster ≠ cluster has highest systemic leverage
Sonar scan completed ≠ Sonar Quality Gate passed
migration apply PASS ≠ idempotency/schema/readback/restart proof
static/build/typecheck/lint/unit/mock green ≠ runtime/E2E proof
UI hidden/disabled ≠ server-side authorization proof
scanner green ≠ permission to suppress a known finding
```

Finance/security/identity/isolation/data migrations raise evidence/authority strength automatically.

## 9) Runtime Freshness / Real Scenario

Before runtime/E2E prove source/artifact/process/container/schema/seed/config/network freshness. Then, where claimed:

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

Stateful tests capture pre-state, use unique run identity, isolate/clean safe test data and prove post-state from the canonical owner.

## 10) Domain Gates

Security: auth/session/revocation/role/permission/trusted context/object auth/IDOR/cross-scope/service auth/input-output/injection/SSRF/path/upload/PII/secrets/signature/replay/rate-limit/audit.

Finance: canonical financial owner, idempotency/correlation/state constraints/provider outcome/readback/unknown-result reconciliation/compensation/restart/replay.

Data/PostgreSQL: deterministic migration/schema/constraints/indexes/fresh+non-empty/drift/orphans/duplicates/lock/concurrency/idempotency/restart/compatibility/rollback/roll-forward.

Mobile/Control Panel: permissions/deep-links/push/maps/location/SecureStore/offline/build/OTA/EAS/env; route/object auth/trusted scope/search isolation/bulk/audit/session/error/readback/responsive/RTL/localization/accessibility as claimed.

Supply chain/CI: lockfile/dependency/CVE/CodeQL/secrets/workflow policy/pinning as affected.

## 11) Evidence / Priority Invalidation Cone

Every mutation, upstream dependency fix, reopened sequence, target movement or authority/truth change maps to affected graph nodes/evidence/root-cause clusters/priority:

```text
contract/schema → consumers/generation/integration evidence stale
migration/data owner → DB/runtime/readback stale
runtime/config/network → runtime/E2E stale
security/auth/permission → negative isolation/security stale
shared owner/library → affected consumer cone stale
new upstream root / cluster split-merge / authority shift → affected priority model stale
proven unrelated movement → retain with provenance
```

Integration itself may invalidate task-branch evidence or priority if target movement changes semantics; reacquire/re-rank the minimum sufficient affected set unless policy/risk requires broader proof.

## 12) Repository-Platform Truth

When closure relies on repository-hosted enforcement, verify live **Integration Target candidate-specific** state: workflow runs/jobs/first real failure, required checks/context names, cancelled/superseded/stale runs, reviews/threads, live rulesets/protection, base/head relation/mergeability, Sonar Quality Gate, CodeQL/dependency/security checks when applicable.

Tracked workflow/ruleset files alone do not prove live enforcement. Pending/missing/stale/cancelled required evidence is not PASS.

## 13) Approval / Independent Review

For each protected approval record domain, reason, allowed authority/reviewer, actual provenance, exact candidate binding and result.

`SELF_REVIEW ≠ INDEPENDENT_REVIEW`. If reviewer changes candidate, re-establish required independence.

For multi-agent work, independent verifier/adversarial agents may challenge executor claims, but identity/provenance must be explicit when policy requires independence.

For the landscape phase, independent/adversarial review should attempt to find missing upstream roots, hidden writers/readers, falsely local symptoms, unclustered findings and priority inversions.

## 14) Claim / Diff / Test Review

Review claimed outcome, not only changed files: actors/surfaces/owners/states/scopes/permissions/contracts/persistence/providers/readbacks/failure/recovery/UX/evidence/approvals.

Review complete owned range for foreign delta, generated/lockfile drift, missing consumer migration, reachable legacy paths, stale package assumptions, stale priority assumptions and cross-sequence effects.

For changed Test/Guard ask what claim it can falsify and whether it can still pass with the defect present. Weakening/skipping/mocking/non-blocking changes cannot manufacture green.

## 15) Cleanup = Part of DONE

Local cleanup during every root fix + final global sweep. Cover proven-related:

```text
dead/unreachable/stale/legacy/superseded code
unused files/folders/imports/exports/re-exports/dependencies
obsolete routes/contracts/DTOs/schemas/models
stale configs/env/flags/scripts/commands/tests/docs/comments/examples
fallbacks/workarounds/TODO/FIXME/HACK
unnecessary compatibility layers
old paths/names/aliases/orphan references
wrong ownership/responsibility/placement/naming/context
parallel business logic/state machines/data writers
duplicate source of truth
temporary/debug/generated noise
files/folders without Purpose/Consumer/Responsibility
```

Never delete blindly:

```text
DISCOVER → CLASSIFY → TRACE CONSUMERS → PROVE OBSOLETE/WRONG/DUPLICATE
→ REMOVE/MERGE/MOVE/RENAME/REFACTOR/REDESIGN/REBUILD
→ REPAIR REFERENCES → REVERIFY
```

Cleanup applies from line/expression/block → symbol/component/type → file/folder/module/package → service/surface/domain → contract/route/config/dependency.

## 16) Canonical Source / Reference Integrity

For concepts needing one authority, inspect Contracts/Schemas/Models/Configs/Policies/Mappings/Constants/Business Rules/State/Domain definitions.

When duplication is unjustified: identify canonical owner → map writers/readers/consumers → migrate → remove secondary truth/residue → verify canonical readback.

After delete/rename/move/merge/split/refactor inspect imports/exports/callers/callees/registrations/routes/contracts/schemas/config/env/dependencies/tests/mocks/fixtures/docs/build/CI/generated references.

## 17) Final Cleanup Gate

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

Cleanup writes invalidate affected evidence and may invalidate cluster/priority assumptions when they reveal deeper ownership/structural truth.

## 18) Accounting Gate — No Silent Loss

Before handoff/closure prove:

```text
FINDINGS_ACCOUNTED=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
UNRANKED_MATERIAL_CLUSTERS=0
SCOPE_DELTAS_ACCOUNTED=YES
DECISIONS_ACCOUNTED=YES
CONSUMERS_ACCOUNTED=YES
EVIDENCE_ACCOUNTED=YES
CLEANUP_ACCOUNTED=YES
ACCOUNTING_COMPLETE=YES
```

This requires every material discovery to be ID-addressable and dispositioned. `ZERO known findings` alone is insufficient; independent adversarial/negative-space discovery must attempt to find untracked graph nodes, hidden writers/readers, stale paths, missing consumers, missing root-cause clusters and priority inversions.

## 19) Governance Reconciliation

All durable decisions classified → required governance promotions complete or explicitly blocking → machine counterpart synchronized where applicable → governance ↔ Product Truth ↔ contracts/registries ↔ code/consumers ↔ runtime compared.

No closure with durable truth only in task artifacts.

## 20) Final Integration / Fresh Head

Before final review and decision:

```text
ACTIVE_EXECUTION_FRONTIER = NONE
no unresolved material suspended/reopened/blocked sequence
TASK_BRANCH_READY=YES
WORKSPACE_ISOLATION_READY=YES
TARGET_LANDSCAPE_COMPLETE=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
PRIORITY_MODEL_COMPLETE=YES
UNRANKED_MATERIAL_CLUSTERS=0
LANDSCAPE_ADVERSARIAL_PASS=YES
INTEGRATION_OWNER assigned
INTEGRATION_COMPLETE=YES
HEAD_AT_REVIEW_START = live Integration Target head
HEAD_AT_DECISION = live Integration Target head immediately before decision
```

Branch-head closure requires `HEAD_AT_DECISION == FINAL_CANDIDATE_SHA`. If not, classify movement, rebuild/reconcile candidate, rerun invalidated evidence and re-rank affected landscape before judgment.

## 21) Final Adversarial Completeness

Try to disprove closure via alternate entry points: hidden writers/readers, parallel/stale truth, missing consumers, contract/binding mismatch, permission bypass, retry/replay/concurrency, unknown-result/recovery, partial failure/restart, runtime-only defects, stale process/data/config, weak/flaky guards, missing audit/observability, foreign delta, reachable legacy, PII/secrets, neighboring regression, wrong ownership/placement/naming/context, unnecessary residue, unclustered findings, wrongly merged/split root-cause clusters, high-risk low-frequency roots and priority inversions.

Any material Finding requiring write cancels Freeze and reopens the affected graph/landscape cone.

## 22) Final Read-Only Verification

On exact final **Integration Target** candidate only: required checks, generated consistency without mutation, exact diff/scope/foreign-change review, canonical readbacks, runtime/E2E where claimed, security/data/finance scopes, edge/adversarial behavior, test effectiveness, artifact provenance, repository-platform evidence, approvals and current root-cause/priority accounting.

No `--fix`, formatter/generator write, lockfile/migration mutation, package/source mutation, commit/push/merge or swallowed exit.

## 23) Lifecycle vs Canonical Decision

`LIFECYCLE_STATE` is internal derived state. `FINAL_DECISION` must be an ID from current `governance/contracts/decision-vocabulary.json`. Do not invent decision aliases.

## 24) Final Closure Equation

```text
DISCOVERY_COMPLETE
AND DIAGNOSIS_COMPLETE
AND DECISION_COMPLETE
AND COVERAGE_COMPLETE
AND TARGET_LANDSCAPE_COMPLETE
AND ROOT_CAUSE_CLUSTERING_COMPLETE
AND ROOT_CAUSE_CLUSTERS_ACCOUNTED
AND UNCLUSTERED_MATERIAL_FINDINGS = 0
AND PRIORITY_MODEL_COMPLETE
AND UNRANKED_MATERIAL_CLUSTERS = 0
AND LANDSCAPE_ADVERSARIAL_PASS
AND ACCOUNTING_COMPLETE
AND PACKAGE_READY
AND IMPLEMENTATION_COMPLETE
AND CLEANUP_COMPLETE
AND EVIDENCE_COMPLETE
AND GOVERNANCE_SYNC_COMPLETE
AND INTEGRATION_COMPLETE
AND FRESH_HEAD_VALID
AND FINAL_ADVERSARIAL_PASS
AND ACTIVE_EXECUTION_FRONTIER = NONE
```

Plus zero known fixable defect, undispositioned Finding/Root-Cause Cluster/Scope Delta/Decision/Consumer/Cleanup item, unverified fix, required missing/stale/pending/cancelled evidence, missing required approval, duplicate truth, reachable obsolete path, unresolved material suspended/reopened sequence, stale priority model, structural/reference residue, or durable truth left only in derived artifacts.

Final branch-head closure requires:

```text
LIFECYCLE_STATE = CLOSED
FINAL_DECISION = current decision-vocabulary.closureRules.closedDecision
HEAD_AT_DECISION = FINAL_CANDIDATE_SHA
FINAL_CANDIDATE_SHA is an Integration Target commit after completed task integration
all applicable evidence/approval scopes satisfied on same immutable candidate
root-cause landscape/priority provenance current on the same final truth
```

Anything less is not closure.
