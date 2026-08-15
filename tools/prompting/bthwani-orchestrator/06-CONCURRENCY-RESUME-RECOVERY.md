# 06 — Concurrency, Resume & Recovery

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/06-CONCURRENCY-RESUME-RECOVERY.md`

هذا الملف يملك قواعد تعدد الوكلاء، تحرك الفرع، الاستئناف، إعادة الأساس، الكتابات الذرية، والدفع الآمن.

## 1) القاعدة العامة

```text
PARALLEL DISCOVERY/ANALYSIS MAY BE ALLOWED.
PARALLEL PUSH ASSUMPTIONS ARE NOT.
ONE FINAL PUSH OWNER AT A TIME.
```

لا يفترض أي وكيل أن HEAD الذي بدأ منه ما يزال Push baseline صالحًا.

## 2) Isolated Workspace

محليًا، الأفضل:

```text
ONE WRITING AGENT = ONE ISOLATED WORKTREE/CLONE/WORKSPACE
```

قبل أول تعديل سجل:

```text
workspace identity
current branch/ref
pre-existing tracked/untracked changes
intended owned paths/symbols/hunks
```

حتى نفس الملف قد يحتوي hunk لوكيل آخر؛ path ownership وحده غير كافٍ.

## 3) Remote Reconciliation Before Writes

قبل كل logical write/final commit/push:

```text
resolve LATEST_REMOTE_SHA
→ compare WORK_BASE_SHA → LATEST_REMOTE_SHA
→ inspect affected paths/symbols/contracts/schema/migrations/generated clients/truth owners
→ classify delta
```

التصنيف:

```text
DISJOINT
RELATED_NON_CONFLICTING
SEMANTIC_OVERLAP
DIRECT_CONFLICT
AUTHORITY_OR_TRUTH_CHANGE
```

المعالجة:

```text
DISJOINT
→ carry forward on latest head; rerun only invalidated evidence.

RELATED_NON_CONFLICTING
→ reconcile assumptions + affected checks.

SEMANTIC_OVERLAP
→ re-diagnose owner/readers/writers/contracts/state
→ rebuild delta on latest head
→ reverify.

DIRECT_CONFLICT
→ no push
→ intentional resolution on latest head
→ new candidate.

AUTHORITY_OR_TRUTH_CHANGE
→ reread authority/Product Truth/contracts
→ re-diagnose before write.
```

Git textual mergeability لا يساوي semantic safety.

## 4) Push Serialization

```text
many agents may prepare independently
→ one writer reconciles latest head
→ candidate parent = latest reconciled head
→ re-resolve immediately before push/ref update
→ fast-forward-safe update only
→ re-resolve immediately after push
```

إذا تحرك الفرع بين verification والدفع:

```text
DO NOT PUSH STALE CANDIDATE
→ reconcile movement
→ rebuild candidate
→ rerun invalidated evidence
```

## 5) Atomic GitHub/API Writes

لـmulti-file logical/final write فضّل عند توفره:

```text
resolve latest head
→ create blobs
→ create tree against exact base tree
→ create commit with exact expected parent
→ re-resolve target ref
→ non-force fast-forward update_ref
```

إذا تحرك الفرع قبل `update_ref`، لا Force؛ أعد reconciliation وابنِ commit جديدًا على latest head.

استخدم Contents API لكل ملف فقط عندما لا تتوفر الذرية أو التغيير محدود ومخاطره مقبولة. Partial multi-file write ليس نجاحًا نهائيًا.

## 6) Resume Semantics

عند `continue/resume`:

```text
recover exact task identity
recover current package path
recover last proven head/candidate
recover still-valid findings/decisions/evidence
re-resolve current remote head
classify drift
resume from exact invalidated gate
```

ممنوع إعادة المهمة من الصفر بلا سبب، وممنوع الحفاظ على Evidence أصبح stale لمجرد توفير الوقت.

## 7) Package Rebaseline

إذا drift محدود:

```text
reconcile affected paths/contracts/owners only
```

إذا تغيرت authority/framework/schema/root cause materially أو drift واسع وغير قابل للحد بأمان:

```text
mark affected assumptions/evidence stale
→ re-diagnose target against latest head
→ rewrite derived package as needed
→ preserve history through Git
```

لا replay ميكانيكي لمئات commits أو metadata تاريخية.

## 8) Collision Policy

```text
package path exists + same task identity
→ RESUME_AND_RECONCILE

package path exists + different identity
→ COLLISION
→ do not overwrite
→ choose distinct safe TASK_NAME
```

نفس القاعدة لأي output path حساس.

## 9) Candidate / Branch Race

أثناء CI أو review، evidence تبقى مرتبطة بالSHA الأصلي. إذا تحرك branch:

```text
running evidence remains bound to original SHA
→ do not relabel it for new head
→ classify movement
→ rerun only scopes invalidated for the required final head/candidate
```

قبل final decision:

```text
HEAD_AT_DECISION = live re-resolved head
```

إذا المطلوب إغلاق الرأس الحالي ولم يساو Candidate أو لم تكن العلاقة مثبتة، لا Closure.

## 10) Foreign Change Discipline

```text
foreign/pre-existing change ≠ this task's change
```

قبل commit/push:

```text
inventory workspace
→ allowlist owned paths/hunks
→ inspect diff
→ stage exact owned changes
→ inspect staged diff
→ verify no foreign delta claimed
```

لا reset/clean/overwrite تغييرات أجنبية بلا سلطة صريحة.

## 11) Evidence Preservation

عند الاستئناف لا تعِد كل شيء تلقائيًا. لكل Evidence:

```text
still valid on current candidate/context? → retain
invalidated by changed path/contract/schema/runtime/config/authority? → stale + rerun
proven unrelated movement? → retain with provenance
```

## 12) Recovery from Partial Failure

إذا حدثت كتابة جزئية أو فشل وسط logical batch:

```text
stop further writes
→ inspect remote/current tree
→ identify committed vs missing pieces
→ classify semantic safety
→ complete coherently on latest head OR intentionally revert/repair when authorized
→ never call partial state DONE
```

## 13) Retention

Prompt package وTask packages = `DERIVED_SUPPORT`.

طبّق repository retention policy الحالية:

```text
actively consumed → retain while needed
task-temporary/superseded/unconsumed/reproducible → remove when authorized and safe
Git history = default archive
```

لا تستخدم active tree كأرشيف `old/final2/backup/temp` بلا Requirement.

إذا حذف Task Package جزء من final desired branch state، نفذ الحذف قبل Final Freeze ثم أعد evidence المرتبط بالSHA النهائي.

## 14) Exact Resume Point

عند Blocker أو interruption، اترك Resume Point واحدًا واضحًا:

```text
TASK_ID
BRANCH
LATEST_OBSERVED_SHA
CURRENT_STATE
LAST_PASSED_GATE
OPEN_FINDINGS/DECISIONS/BLOCKERS
INVALIDATED_EVIDENCE
NEXT_SINGLE_ACTION
```

الهدف أن يتابع الوكيل التالي من الحقيقة الحالية لا من الذاكرة أو التخمين.