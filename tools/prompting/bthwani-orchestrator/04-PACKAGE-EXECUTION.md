# 04 — Package & Execution

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/04-PACKAGE-EXECUTION.md`

## 1) Package V2

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
├── 001-<sequence>.md
├── 002-<sequence>.md
└── ...
```

Sequence numbers = creation/identity order, not a forced linear execution chain.

## 2) Overview Ownership

يمتلك فقط: task identity/SHA، Macro Graph، `ACTIVE_EXECUTION_FRONTIER`, Integration Owner، Sequence Registry، suspension/reopen references، global decisions/blockers، accounting gates، global closure metadata.

## 3) Sequence Ownership

كل Sequence تجمع Scope/Diagnosis/Findings/Root Cause/Blast Radius/Decisions/Re-Diagnosis/Target State/Treatment/Consumers-Governance/Cleanup/Verification/Evidence/Exit-Reopen.

وتسجل Machine fields إضافية:

```text
RECONCILED_HEAD_SHA
CONFLICT_DOMAIN
EXECUTION_OWNER
PARALLEL_SAFETY
SUSPENDED_BY
RESUME_AFTER
INVALIDATES
DECISION_IMPACT_PROPAGATED
FINDINGS_DISPOSITIONED
DEPENDENCIES_DISPOSITIONED
```

## 4) No Mega Package / No Fragmentation

ممنوع giant target file، pre-created future sequences، one file per app/folder، split by line count، أو merge unrelated root causes. قسّم فقط عند Closure Boundary مثبت.

## 5) JIT Creation + Backtracking

Normal creation:

```text
prove boundary → create sequence → register graph/frontier
```

Backtrack creation مسموح بينما Sequence حالية غير terminal فقط إذا الحالية صراحةً `SUSPENDED_BY_DEPENDENCY`، ويتم دفعها إلى Suspension Stack/graph ثم جعل upstream dependency هو focus الجديد.

لا تنشئ future speculative sequence لمجرد توقعها.

## 6) Root-Cause / Finding Correlation

```text
symptoms/findings
→ correlate
→ first causal failure
→ canonical owner
→ full impact propagation
→ coherent cutover
```

إذا 20 Finding من Root Cause واحدة، لا تتحول تلقائيًا إلى 20 Sequences. إذا Finding مستقلة ولا تمنع cutover الحالي، تسجل في graph وتوضع في Frontier لاحق/مستقل بدليل.

## 7) PREPARE_ONLY

```text
diagnose → decide → propagate → re-diagnose
→ exact target/cutover → consumers/governance/cleanup/verification
→ dispose findings/dependencies
→ PREPARED
```

لا live mutation.

## 8) EXECUTE_END_TO_END Write Gate

قبل live write:

```text
SEQUENCE_STATUS=READY_TO_EXECUTE | REOPENED
ROOT_CAUSE_PROVEN=YES
DECISIONS_RESOLVED=YES
DECISION_IMPACT_PROPAGATED=YES
REDIAGNOSIS_COMPLETE=YES
IMPACT_MAPPED=YES
FINDINGS_DISPOSITIONED=YES
DEPENDENCIES_DISPOSITIONED=YES
VERIFICATION_DEFINED=YES
SOLUTION_READY=YES
RECONCILED_HEAD_SHA = latest reconciled head
CONFLICT_DOMAIN != UNCLASSIFIED
EXECUTION_OWNER != UNASSIGNED
```

ثم root fix/refactor/redesign/rebuild → all required consumer migration → contract/data/generated sync → obsolete/parallel path removal → local cleanup → verification/runtime readback → COMPLETE.

## 9) Coherent Cutover Rule

لا `COMPLETE` مع known affected consumer أو contradictory truth أو required migration أو reachable obsolete path أو temporary workaround أو unclassified scope delta لازم لصحة التغيير.

## 10) Multi-Agent Execution

يسمح بعدة Workers على Frontiers مستقلة فقط. لكل Worker isolated workspace وConflict Domain وowned scope. يمكن لعدة Sequences أن تكون في execution frontier إذا ثبت الاستقلال، لكن:

```text
ONE EXECUTION OWNER PER CONFLICT DOMAIN
ONE TARGET-BRANCH INTEGRATION OWNER AT A TIME
```

Integration Owner يعيد بناء/دمج delta على latest head بدل دفع stale candidate.

## 11) Sequence Completion / Resume

بعد complete/prepare dependency:

```text
update graph
→ identify suspended/reopened descendants
→ invalidate affected evidence
→ resume highest-priority unblocked node
→ re-diagnose before live write
```

## 12) Cleanup

داخل كل Sequence: remove obsolete/compatibility/workaround/debug/temp residue، repair imports/routes/contracts/bindings/references، normalize naming/ownership/placement. Final global sweep يبقى إلزاميًا.

## 13) Global Completion

```text
all material graph nodes dispositioned
+ all sequence records terminal/unblocked for MODE
+ accounting complete
→ global reconciliation
→ duplicate truth search
→ final cleanup
→ final evidence/fresh-head/adversarial gates
```
