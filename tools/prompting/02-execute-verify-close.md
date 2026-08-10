# الأمر 2 — التنفيذ والتحقق والمراجعة والإغلاق حتى أعلى قرار مثبت

Status: DERIVED_SUPPORT

استخدم هذا الأمر بعد التشخيص/الخطة: تنفيذ حزمة، تنفيذ مهمة مباشرة محدودة، أو مراجعة Candidate مثبت read-only. الهدف هو إصلاح السبب الجذري على أحدث حقيقة ريموت، بناء Candidate واضح، إثبات النتيجة عليه، ثم إصدار أعلى قرار تسمح به السلطة والأدلة الفعلية.

> هذا Prompt مساعد مشتق. اقرأ دائمًا enums/flags/approval/evidence/schema من المصادر الحاكمة الحالية على الـSHA المثبت. لا تجعل Package أو Prompt أو Report سلطة أعلى من current governance/Product Truth/implementation/runtime/repository-platform truth.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <branch-or-ref>
MODE: <EXECUTE_PACKAGE | EXECUTE_DIRECT | REVIEW_CANDIDATE>
PACKAGE_PATH: <plans/diagnose-implementing/<task> | N/A>
TASK: <direct task | N/A>
CANDIDATE_SHA: <AUTO | exact-40-sha>
BASE_SHA_OR_RANGE: <AUTO | base-sha | commit-range>
CLAIMED_OUTCOME: <AUTO_FROM_PACKAGE | explicit measurable outcome>
DELIVERY: <LOCAL_ONLY | COMMIT | COMMIT_AND_PUSH>
```

## 1. الأوضاع

```text
EXECUTE_PACKAGE
= current package → drift/schema reconciliation → execute → final candidate → verify/review/decide.

EXECUTE_DIRECT
= small bounded low-risk task only.

REVIEW_CANDIDATE
= immutable read-only candidate review; no source/package/commit/push mutation.
```

`EXECUTE_DIRECT` يتحول إلى Package عند multiple owners/root causes، multi-domain/multi-surface foundation، contract/schema migration affecting multiple consumers، cross-domain transaction، أو protected/high-risk domains مثل auth/authz/sessions, privacy/secrets, isolation, finance, migrations/production data, CI/infrastructure/release/production.

## 2. السلطة والحقيقة

```text
current authorized task/review
→ authority-precedence
→ GOVERNANCE + PRD + applicable policies
→ capability Product Truth
→ current machine contracts/registries
→ exact pinned implementation/runtime/repository-platform evidence
```

استخدم `CODE_BASED_LEAN` و`AFFECTED_PLUS_RISK_EXPANSION` فقط.

## 3. SHA/Candidate model

لا تستخدم كلمة Candidate بمعانٍ متعددة:

```text
STARTING_REMOTE_SHA = TARGET_REF head عند بدء المهمة
WORK_BASE_SHA       = latest reconciled head الذي بُني عليه delta الحالي
IMPLEMENTATION_SHA  = logical implementation commit; قد يوجد أكثر من واحد
BOOKKEEPING_SHA     = optional derived-package/document commit
FINAL_CANDIDATE_SHA = آخر commit بعد انتهاء كل الكتابات المسموح بها
LATEST_REMOTE_SHA   = آخر re-resolved TARGET_REF head
HEAD_AT_DECISION    = TARGET_REF head مباشرة قبل القرار
```

أي write بعد `FINAL_CANDIDATE_SHA` يولد Candidate جديدًا ويعيد الأدلة المتأثرة.

### Package bookkeeping paradox

لا تدخل في حلقة:

```text
verify → write result into package → new SHA → evidence stale → verify → write again
```

القاعدة:

1. كل product/package bookkeeping المطلوب يكتمل **قبل Freeze**.
2. بعد Freeze لا تكتب final evidence/result إلى repo مرة أخرى.
3. Final Evidence Matrix/decision يمكن أن تكون read-only output مرتبطة بالـCandidate ولا يلزم commit جديد.
4. `--strict --closure` يثبت فقط ما يفحصه Validator؛ لا يثبت Evidence Matrix أو approvals أو Final Closure.
5. إذا كان تشغيل closure validator يتطلب package mutation، هذه mutation تسبق Freeze وتصبح جزءًا من Candidate ثم تعاد الأدلة؛ أو يبقى final decision خارج package mutation.

## 4. حل AUTO خوارزميًا

### EXECUTE_PACKAGE

```text
STARTING_REMOTE_SHA = current TARGET_REF head
WORK_BASE_SHA = latest safe head after drift reconciliation
BASE when AUTO = package pinnedStartSha .. FINAL_CANDIDATE_SHA for total task review
CANDIDATE when AUTO = FINAL_CANDIDATE_SHA only after Freeze
```

`pinnedStartSha` ليس push baseline إذا تحرك الفرع؛ هو historical package baseline فقط.

### EXECUTE_DIRECT

```text
STARTING_REMOTE_SHA = head before first task write
WORK_BASE_SHA = latest reconciled head
BASE when AUTO = STARTING_REMOTE_SHA .. FINAL_CANDIDATE_SHA
CANDIDATE when AUTO = FINAL_CANDIDATE_SHA after Freeze
```

### REVIEW_CANDIDATE

```text
CANDIDATE=AUTO → resolve TARGET_REF once to exact 40-SHA and freeze it for review
BASE=AUTO → derive only from explicit package/task provenance or review intent
```

لا تخمن default branch أو arbitrary parent. إذا Base غير قابل للإثبات، سجّل evidence gap وفق القاموس الحالي.

## 5. Candidate existence / reachability / head relation

قبل الحكم أثبت:

```text
candidate exists in repository
candidate full immutable SHA
candidate relation to TARGET_REF
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
HEAD_AT_DECISION == FINAL_CANDIDATE_SHA ?
candidate reachable from TARGET_REF ?
```

يمكن مراجعة commit أقدم مقصودًا، لكن لا تقل إن **الرأس الحالي للفرع** مغلق عليه عندما الرأس مختلف.

## 6. Capability Preflight ديناميكي

سجّل ما ينطبق:

```text
CAN_READ_REPOSITORY
CAN_WRITE_REPOSITORY
CAN_QUERY_LIVE_GITHUB
CAN_EXECUTE_SHELL
CAN_RUN_NODE
CAN_RUN_VALIDATOR
CAN_RUN_DATABASE
CAN_RUN_RUNTIME
CAN_RUN_CI
CAN_RUN_SECURITY_CHECKS
CAN_RUN_E2E
CAN_RUN_VISUAL
CAN_ACCESS_PROVIDER
CAN_VERIFY_PRODUCTION
CAN_COMMIT
CAN_PUSH
```

لكل evidence scope: `required capability → available? → acquisition path → proof limit`.

غياب القدرة المطلوبة لا يصبح PASS.

## 7. EXECUTE_PACKAGE preflight — current-schema projection

اقرأ package/framework/schema/generator/validator الحاليين.

### لا تثق بالحقول القديمة

أي field/metadata موجود في حزمة قديمة وغير معروف للـSchema/Validator الحالي:

```text
DERIVED_LEGACY_METADATA
```

وصف نصي فقط؛ لا يخلق scope/requirement/approval. لا تتبع fixed slices/journeys أو policies قديمة إذا لم تعد حاكمة.

### No-shell structural preflight

إذا لا يوجد Shell:

```text
fetch current framework README + generator + validator
→ fetch every required package root file
→ enumerate registered unit paths
→ fetch every required unit file
→ check JSON/schema/class/status/coverage/order/dependencies/markers/secrets/verification links according to current validator logic as far as provable
```

إذا الحزمة ناقصة داخليًا: لا Product write؛ أصلح الحزمة أو استخدم القرار الحالي المناسب (`FIX_REQUIRED` عادة للعيب الداخلي). إذا المشكلة فقط أن proof المطلوب لا يمكن تنفيذه، لا تدّع strict PASS.

### Stale-package rebaseline

إذا drift محدود: reconcile affected paths/contracts/schema/owners/journeys/verifications فقط.

إذا تغيرت authority/framework/schema ماديًا أو كان drift واسعًا/غير قابل للحد بأمان:

```text
DO NOT replay hundreds of commits mechanically
→ treat affected package assumptions/evidence as stale
→ re-diagnose target against latest head
→ rewrite/rebaseline derived package as needed
→ preserve old history in Git
```

وجود status `IN_PROGRESS/DONE/PASS` قديم لا يسمح بالاستئناف قبل current-truth reconciliation.

Seeded Coverage هو assessment ledger، لا deep scan mandate.

## 8. Concurrent-Agent Isolation

```text
PARALLEL AGENTS ARE ALLOWED.
PARALLEL PUSH ASSUMPTIONS ARE NOT.
```

محليًا الأفضل:

```text
ONE WRITING AGENT = ONE ISOLATED WORKSPACE/WORKTREE/CLONE
```

إذا workspace مشترك/غير نظيف:

```text
record LOCAL_WORKSPACE_ID
record PRE_EXISTING_LOCAL_CHANGES
record INTENDED_PATHS/SYMBOLS/CONCERNS
foreign/pre-existing change ≠ this agent's change
```

ممنوع افتراضيًا عندما قد يلتقط تغييرات أجنبية:

```text
git add .
git add -A
git commit -a
git checkout -- .
git restore .
git reset --hard
git clean -fd
```

Stage explicit paths/hunks وافحص staged diff. حتى نفس الملف قد يحتوي hunk لوكيل آخر؛ افحص semantics لا path فقط.

## 9. Atomic GitHub Remote/API writes

مع تعدد الوكلاء، **Contents API file SHA ليس branch-head Compare-And-Swap**.

لـlogical multi-file/final write فضّل:

```text
resolve latest head
→ create blobs/tree against that base
→ create commit with exact expected parent
→ re-resolve TARGET_REF
→ non-force fast-forward update_ref
```

إذا branch تحرك، update_ref يجب أن يفشل؛ لا Force. أعد reconciliation وابنِ commit جديدًا على latest head.

استخدم per-file Contents API فقط عندما لا يتوفر tree/commit path أو عندما التغيير محدود ومخاطره مقبولة؛ أعد حل الرأس قبل/بين/بعد الدفعات ولا تعتبر file-SHA check ضمانًا للرأس كله.

Partial multi-file API write ليس نجاحًا.

## 10. Latest-Head Semantic Reconciliation Gate

قبل كل logical write، وخصوصًا final commit/push:

```text
resolve LATEST_REMOTE_SHA
→ compare WORK_BASE_SHA/STARTING_REMOTE_SHA → LATEST_REMOTE_SHA
→ inspect changed paths/symbols/contracts/schema/migrations/generated clients/truth owners/journeys
→ classify concurrent delta
```

```text
DISJOINT
RELATED_NON_CONFLICTING
SEMANTIC_OVERLAP
DIRECT_CONFLICT
AUTHORITY_OR_TRUTH_CHANGE
```

المعالجة:

```text
DISJOINT → carry forward on latest head; rerun only invalidated shared evidence.
RELATED_NON_CONFLICTING → reconcile assumptions + affected checks.
SEMANTIC_OVERLAP → re-diagnose owner/readers/writers/contracts/state; rebuild delta + reverify.
DIRECT_CONFLICT → no push; intentional resolution on latest head → new candidate.
AUTHORITY_OR_TRUTH_CHANGE → reread authority/Product Truth/contracts → re-diagnose before write.
```

Sibling commits from the same base that touch the same path/hunk/symbol are at least `SEMANTIC_OVERLAP`; mutually exclusive edits are `DIRECT_CONFLICT`. لا textual auto-merge لمجرد أن Git يستطيع الدمج.

## 11. Optimistic push serialization

لا تدّع distributed lock ما لم توجد آلية حقيقية:

```text
many agents prepare in parallel
→ each final writer re-resolves latest head
→ candidate parent = latest reconciled head
→ re-resolve immediately before push/ref update
→ fast-forward/expected-parent-safe update only
```

إذا تحرك الفرع بين final verification والدفع:

```text
DO NOT PUSH STALE CANDIDATE
→ compare/reconcile latest movement
→ rebuild candidate
→ rerun invalidated final evidence
```

## PHASE A — EXECUTE_AND_VERIFY

## 12. Root-cause execution loop

```text
FAILURE
→ classify evidence
→ re-diagnose owner/root cause
→ fix canonical owner
→ targeted verify
→ affected verify
→ continue
```

لا Patch loop بلا فرضية جديدة.

الإصلاح:

```text
symptom
→ canonical truth/write owner
→ proven root cause
→ target state
→ central fix
→ migrate affected writers/readers/consumers
→ regenerate derivatives when required
→ remove obsolete/parallel path after migration
→ persisted canonical readback
→ affected verification
```

ممنوع temporary patch/silent fallback/parallel truth/permanent dual-write/parallel handwritten client/business logic in surface/runtime fixture as truth/fake control/UI-only auth/test weakening/applied-migration rewrite/state bypass/new financial retry identity before unknown-result reconciliation/legacy path left reachable/acceptance weakening.

نفّذ تنظيفًا شاملًا لكل ما تبقى عبر الـ Backend والـ Frontend والـ APIs وقواعد البيانات، واحذف فورًا كل كود أو مكوّن مكرر، مهجور، أو عديم الفائدة (Dead code/Orphans) لضمان عدم ترك أي ديون تقنية بعد الإصلاح الجذري.

## 13. Full-Stack Multi-Surface closure

تتبع بقدر الانطباق:

```text
Product Truth
→ Actor/Service Identity
→ Session/Device
→ Trusted Scope
→ Role/Permission/Object authorization
→ Surface action
→ shared controller/adapter
→ generated client/canonical contract
→ API/domain/state machine
→ transaction/database
→ cache/idempotency
→ events/jobs/providers/WLT
→ persisted canonical readback
→ every required affected surface
→ audit/observability
```

غطِّ success/invalid/denied/wrong-scope/forbidden-state/duplicate/replay/race/concurrency/timeout/unknown-result/offline/reconnect/retry/partial-failure/restart/mixed-version/compensation/reconciliation حسب الخطر.

## 14. Domain gates

### Compatibility
old-mobile+new-backend، new-mobile+old-backend عند الحاجة، current control-panel+backend، generated client/event/cache، mixed-version، feature flag safe default، rollback/roll-forward، owner/expiry/removal trigger.

### Security
auth/session/revocation/role/permission/trusted context/object auth/IDOR/cross-scope/service auth/PII/secrets/provider signature/replay/rate-limit. Client IDs ليست authority.

### Finance
WLT المالك المالي. لا parallel financial truth. أثبت idempotency/correlation/state constraints/readback/reconciliation/compensation/unknown provider outcome. Mock/local success لا يثبت finance/production.

### PostgreSQL
Forward deterministic migrations، constraints/indexes/FKs/checks، compatibility/backfill/writer-reader transition، fresh/non-empty، drift/orphans/duplicates، locks/concurrency/idempotency، restart/partial failure، rollback/roll-forward. لا applied-history rewrite.

### Events/Jobs/Providers
stable identity، duplicate/out-of-order/replay، outbox/inbox، retry/backoff/DLQ/lease، timeout/unknown result، provider auth، reconciliation/compensation/restart.

### UI/Mobile/Control Panel
loading/empty/partial/success/error/forbidden/conflict/stale/offline/retry/recovery + persisted readback، RTL/localization/accessibility/responsive. Mobile native/deep-links/permissions/push/maps/SecureStore/offline/build/OTA/EAS/env. Control Panel route/object auth/trusted scope/search isolation/bulk/audit/session/error/readback.

## 15. Verification — affected first

اقرأ commands الفعلية:

```text
nearest root-cause regression check
→ unit/package test
→ related integration
→ affected typecheck/lint/test/build
→ contract/generated client/db/security/isolation
→ runtime/readiness/smoke/readback when claimed
→ cross-surface E2E/manual visual when claimed
→ full workspace/runtime only if impact/policy requires
```

كل Check له claim وproof limit. لا Scope يثبت آخر.
يجب أن يشمل الاختبار جميع المسارات والتكاملات والسيناريوهات الفعلية (Actual Scenarios) من البداية للنهاية، ولا تكتفِ بالاختبارات المعزولة (Isolated/Mocked tests) حتى التحقق النهائي من سلامة النظام.

أي related mutation أو concurrent change يبطل الأدلة المتأثرة ويعيدها على Candidate جديد.

## 16. Package bookkeeping قبل Freeze

في Package mode حدّث فقط الحقيقة المتاحة أثناء التنفيذ: results/checks/blockers/deviations/order/coverage/latest observed state وفق Schema الحالي.

لا تكتب `CLOSED_WITH_EVIDENCE` استباقيًا. Package state ليس final approval truth.

## 17. Final latest-head integration

قبل تسمية أي SHA Final Candidate:

```text
inventory exact owned delta
→ latest-head semantic reconciliation
→ apply/rebuild on latest safe head
→ inspect exact diff + foreign/out-of-scope changes
→ complete package bookkeeping required before Freeze
→ create final logical commit(s)
→ re-resolve TARGET_REF
```

إذا agent آخر دفع، أعد البوابة.

## PHASE B — FREEZE_AND_FINAL_VERIFY

## 18. Freeze

```text
FREEZE WRITES
→ FINAL_CANDIDATE_SHA = exact last candidate commit
→ verify existence/reachability/head relation
→ no source/package/format/generation/commit/push mutation during final evidence
```

أي write لاحق = Candidate جديد وعودة إلى Phase A.

## 19. Adversarial closing pass

ابحث عن root cause غير مغلق، parallel/stale truth، hidden writer/reader، missing migration/consumer، surface gap، security bypass، retry/unknown/recovery gap، runtime-only defect، stale evidence، audit gap، foreign/out-of-scope delta، أو أي فجوة أو تناقض (Contradiction) في العقود بين الـ APIs والـ Bindings.

أي Finding يحتاج كتابة يعيد Phase A.

## 20. Final read-only verification

على `FINAL_CANDIDATE_SHA` فقط:

```text
required read-only final checks
→ generated consistency without mutation
→ exact diff/scope/foreign-change review
→ canonical readbacks
→ candidate-bound evidence
→ test effectiveness
```

ممنوع `--fix`/formatter write/generation write/cleanup apply/lockfile or migration mutation/commit/push/merge/swallowed exit code.

## 21. Branch-race gates

### Before push

```text
re-resolve TARGET_REF immediately
→ if head != candidate parent/latest reconciled base: DO NOT PUSH
→ reconcile → new candidate → reverify
→ push fast-forward-safe only
→ re-resolve after push
```

### Before final decision

```text
HEAD_AT_DECISION = re-resolve TARGET_REF
compare HEAD_AT_DECISION with FINAL_CANDIDATE_SHA
```

إذا تغير الرأس، evidence قد تبقى صحيحة للCandidate القديم، لكن لا تدّع إغلاق الرأس الحالي. إذا المطلوب إغلاق branch head، ابنِ/تحقق Candidate جديدًا.

## PHASE C — REVIEW_AND_DECIDE

## 22. Independence provenance

```text
SELF_REVIEW ≠ INDEPENDENT_REVIEW
```

Git author/account وحده لا يثبت independence.

```text
independent reviewer identity/provenance proven? YES/NO
```

إذا لا، independence = `UNPROVEN` وصفيًا. لا self-grant للprotected approvals ولا impersonation للمالك. المراجع المستقل لا يصلح Candidate ثم يعتمد إصلاحه في نفس دورة المراجعة.

## 23. Claim/Diff/Test review

راجع `CLAIMED_OUTCOME` لا الملفات فقط: actors/surfaces/owners/states/scopes/permissions/contracts/persistence/providers/finance/readbacks/failure/compatibility/evidence/approvals.

راجع range:

```text
changed files/commits
foreign/pre-existing delta accidentally included
unexpected generated/lockfile changes
out-of-scope cleanup
missing consumer migration
legacy path reachable
unreviewed contract/schema/runtime effect
```

لكل Test/Guard:

```text
what claim can it falsify?
can it pass while product remains broken?
real contract/db/runtime path?
negative/retry/concurrency/recovery coverage?
weakened/mocked/skipped/redirected/non-blocking?
root-cause regression when regressable?
```

## 24. Evidence Matrix

استخرج current scopes من decision vocabulary/delivery policy. لكل scope:

```text
applicable? + reason
PASS | FAIL | MISSING | STALE | BLOCKED
source/command/run/artifact
candidate_sha
proof_limit
required capability
required approval domain/owner
```

CI/Build/Test/Validator لا يثبت scope آخر تلقائيًا.

## 25. Approval Matrix

حلها من authority contracts الحالية:

```text
approval_domain
required? + why
allowed approver identity/role
protected?
actual approver/provenance
exact candidate SHA bound?
evidence/audit source
SATISFIED | MISSING | UNPROVEN | NOT_APPLICABLE
```

Historical blanket authorization ليس outcome acceptance. إذا identity/provenance/candidate binding غير مثبتة، approval غير مثبت.

## 26. GitHub/CI truth

عند الاعتماد عليها تحقق حيًا من Candidate نفسه: workflow runs/required checks/cancelled/superseded runs/reviews/threads/live rulesets/protection/merge relation. Tracked config لا يثبت live enforcement.

## 27. Package validation semantics

- لا تعتمد DONE/PASS داخل package كدليل مستقل.
- `--strict`/`--closure` فقط إذا أمكن تشغيلهما فعليًا.
- نجاحهما يثبت ما يفحصه Validator فقط.
- **ممنوع** استخدام `--closure PASS` كدليل Evidence Matrix/Protected approvals/Final Closure.
- لا post-evidence package mutation داخل frozen candidate.

## 28. Findings

```text
severity: BLOCKER | HIGH | MEDIUM | LOW
category: PRODUCT | ARCHITECTURE | SECURITY | FINANCE | DATA | CONTRACT | RUNTIME | UI_UX | QA | CI | GOVERNANCE
claim_affected
exact_path_or_evidence
why_wrong
root_cause_or_missing_proof
required_owner
required_fix_or_evidence
```

Style preference غير مؤثر ليس Blocker.

## 29. Retention

Package = `DERIVED_SUPPORT`. بعد انتهاء الحاجة، طبق repository-retention policy. task-temporary/superseded/unconsumed/reproducible package يُحذف عندما يكون الحذف مفوضًا وآمنًا ولا يعتمد عليه runtime/build/ci/migration/governance/operations. Git history هو الأرشيف.

حذف الحزمة نفسه mutation؛ إذا كان جزءًا من final branch state، نفّذه **قبل** تثبيت final candidate النهائي ثم أعد الأدلة التي تتطلب exact final SHA.

## 30. القرار والتقرير

استخدم decision vocabulary الحالي فقط.

`CLOSED_WITH_EVIDENCE` فقط عندما كل evidence scopes والموافقات المنطبقة مثبتة على **نفس immutable FINAL_CANDIDATE_SHA** بلا fail/blocked/pending، مع وضوح علاقة Candidate بالرأس الحالي.

```text
repository / target_ref / mode
starting_remote_sha / work_base_sha / final_candidate_sha
head_at_decision / candidate_head_relation
base_or_reviewed_range
package_or_task / claimed_outcome
concurrent movements + classification + reconciliation
pre-existing/foreign change handling
root causes + owners
changed/removed/moved paths + scope assessment
contracts/clients/migrations/data changes
surfaces/journeys/readbacks
checks + proof limits + invalidated evidence rerun
test-effectiveness
Evidence Matrix
Approval Matrix
same-candidate GitHub/CI evidence
independence provenance
package validation + proof limit
commits/push result
remaining blocker/missing evidence + resume point
retention action
final decision
```

لا تدفع Candidate مبنيًا على رأس قديم، لا تكتب بعد Freeze وتحتفظ بأدلة SHA السابق، ولا تعتبر نجاح Git merge أو Validator دليلًا على صحة دلالية أو إغلاق نهائي.
