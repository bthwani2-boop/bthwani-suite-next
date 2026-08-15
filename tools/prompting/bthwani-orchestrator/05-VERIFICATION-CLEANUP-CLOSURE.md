# 05 — Verification, Cleanup & Closure

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: evidence, candidate freshness, runtime/E2E, cleanup, governance reconciliation and final closure.

## 1) Verification starts at root altitude

Verify the claim at the semantic altitude where the root was proven, then descend:

```text
operational outcome / authority / journey / state / handoff
→ canonical owner / contract / data
→ implementation
→ runtime/readback/consumers
→ failure/edge/adversarial
```

Use everything applicable, not everything blindly. Static/test green ≠ runtime/operational proof.

## 2) Candidate roles

```text
INTEGRATION_TARGET = target branch
TASK_BRANCH = isolated work branch
TASK_BRANCH_BASE_SHA = target SHA used to start/reconcile work
IMPLEMENTATION_SHA = task branch implementation candidate
FINAL_CANDIDATE_SHA = exact Integration Target commit after integration
HEAD_AT_REVIEW_START / HEAD_AT_DECISION = live target heads at those gates
```

## 3) Fresh target reconciliation

Before semantic write/integration/final judgment:

```text
resolve latest target
→ classify foreign delta
→ retain proven-unrelated evidence
→ invalidate affected operational/root/priority/evidence cone
→ semantic rebase/rebuild when required
```

Textual mergeability ≠ semantic safety.

## 4) Machine proof before write and closure

Required on current reconciled SHA:

```text
TASK ISOLATION PASS
ROOT ANCHOR PASS
OPERATIONAL ROOT PASS
ROOT-CAUSE PRIORITY PASS
FRONTIER DERIVATION PASS
```

For closure, Operational Root requires zero material lower-layer `HOLD`; Root-Cause Priority requires no unresolved material RC; Frontier gate requires empty active frontier.

## 5) Evidence routing

لكل Evidence: claim, source/check, exact candidate, environment/profile, result, proof limit, capability/approval requirements, invalidation trigger.

Allowed: `PASS / FAIL / MISSING / STALE / BLOCKED / CANCELLED_OR_SUPERSEDED / NOT_APPLICABLE_WITH_PROOF`.

```text
DETERMINISTIC_PRODUCT/TEST/CONTRACT failure → first causal failure → root fix → NEW SHA
INFRA/PROVIDER → prove cause → targeted rerun
FLAKY → defect until controlled/proven
CANCELLED/SUPERSEDED/STALE → not PASS
```

No blind rerun to manufacture green.

## 6) Runtime / real scenario

Prove source/artifact/process/container/schema/seed/config/network freshness, then where claimed:

```text
Actor/Identity/Scope
→ Surface Action
→ Contract/API
→ Domain Transition
→ Transaction/Persistence
→ Event/Integration
→ Canonical Readback
→ Required Consumers
→ Observable Operational Result
```

Stateful tests capture pre/post state and unique run identity.

## 7) Risk-sensitive gates

Security: auth/session/revocation/roles/permissions/object auth/IDOR/cross-scope/input-output/injection/SSRF/upload/PII/secrets/replay/rate-limit/audit.

Finance: canonical owner/idempotency/correlation/state/provider outcome/readback/unknown-result reconciliation/compensation/restart/replay.

Data: deterministic migrations/schema/constraints/indexes/drift/orphans/duplicates/locks/concurrency/idempotency/restart/compatibility/rollback/roll-forward.

Mobile/Control Panel: permissions/deeplink/push/maps/location/SecureStore/offline/build/OTA/env; route/object auth/scope/search isolation/bulk/audit/session/error/readback/responsive/RTL/localization/accessibility as affected.

Supply chain/CI: lockfile/dependency/CVE/CodeQL/secrets/workflow policy/pinning as affected.

## 8) Repository-platform truth

When closure relies on hosted enforcement, verify candidate-specific workflows/jobs/required checks/cancelled or stale runs/reviews/rulesets/protection/base-head relation/Sonar/CodeQL/security as applicable. Tracked workflow files alone do not prove live enforcement.

## 9) Independent/adversarial review

`SELF_REVIEW ≠ INDEPENDENT_REVIEW` when policy requires independence. Bind reviewer/approval to exact candidate. Adversarial review attempts to find missing operational roots, hidden writers/readers, false local symptoms, cluster errors, priority inversion, permission/retry/concurrency/recovery/runtime-only defects and stale evidence.

## 10) Cleanup = DONE

Cover proven-related:

```text
dead/unreachable/stale/legacy/superseded code
unused files/folders/imports/exports/dependencies
obsolete routes/contracts/DTOs/schemas/models
stale config/env/flags/scripts/tests/docs/comments/examples
fallbacks/workarounds/TODO/FIXME/HACK
unnecessary compatibility
old paths/names/aliases/orphan references
wrong ownership/responsibility/placement/naming/context
parallel business logic/state/data writers
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

## 11) Canonical source integrity

عند duplicate truth: identify canonical owner → map writers/readers/consumers → migrate → remove secondary truth/residue → verify canonical readback. بعد move/delete/rename inspect all imports/registrations/routes/contracts/config/tests/generated refs.

## 12) Cleanup gate

Zero known in closure cone: dead code, stale reachable path, unjustified duplicate truth/logic, orphan refs, unused affected dependency/config/script, misleading ownership/naming/placement, workaround/fallback, unjustified compatibility, scope TODO/FIXME/HACK, structural contradiction, cleanup finding unresolved.

## 13) Governance reconciliation

Durable decisions must be promoted to authoritative owners when required. Compare governance ↔ Product Truth ↔ contracts/registries ↔ code/consumers ↔ runtime. No closure with durable truth only in task artifacts.

## 14) Freeze / final candidate

```text
finish task work/package/cleanup
→ verify task branch
→ reconcile operational/RC/priority
→ latest target reconciliation
→ Integration Owner integrates safely
→ INTEGRATION_COMPLETE=YES
→ reconcile target truth again
→ FREEZE WRITES
→ FINAL_CANDIDATE_SHA = exact target HEAD
→ final read-only verification
```

Any write after freeze invalidates candidate/evidence.

## 15) Final accounting

```text
OPERATIONAL MACHINE PASS
ROOT-CAUSE MACHINE PASS
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

## 16) Final closure equation

```text
DISCOVERY_COMPLETE
AND DIAGNOSIS_COMPLETE
AND DECISION_COMPLETE
AND COVERAGE_COMPLETE
AND OPERATIONAL_ROOT_MACHINE_PASS
AND ROOT_CAUSE_PRIORITY_MACHINE_PASS
AND FRONTIER_DERIVATION_CLOSURE_PASS
AND ACCOUNTING_COMPLETE
AND PACKAGE_READY
AND IMPLEMENTATION_COMPLETE (EXECUTE mode)
AND CLEANUP_COMPLETE
AND EVIDENCE_COMPLETE
AND GOVERNANCE_SYNC_COMPLETE
AND INTEGRATION_COMPLETE
AND FRESH_HEAD_VALID
AND FINAL_ADVERSARIAL_PASS
AND ACTIVE_EXECUTION_FRONTIER=NONE
```

Plus zero known fixable defect/undispositioned material item/missing required evidence/duplicate truth/reachable obsolete path/unresolved suspended or reopened material sequence/stale operational or priority provenance.

Final branch closure requires `LIFECYCLE_STATE=CLOSED`, canonical `FINAL_DECISION`, `HEAD_AT_DECISION=FINAL_CANDIDATE_SHA`, and all applicable evidence/approvals on the same immutable target candidate.
