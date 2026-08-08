# الأمر 2 — التنفيذ والتحقق والمراجعة والإغلاق حتى أعلى قرار مثبت

Status: DERIVED_SUPPORT

استخدم هذا الأمر لكل ما يأتي **بعد التشخيص/الخطة**: تنفيذ حزمة، تنفيذ مهمة مباشرة محدودة، أو مراجعة Candidate مثبت دون كتابة. الهدف إصلاح السبب الجذري، بناء Candidate واضح فوق أحدث حقيقة ريموت، إثبات النتيجة عليه، ثم إصدار أعلى قرار تسمح به السلطة والأدلة الفعلية.

> هذا Prompt مساعد مشتق. اقرأ الـenums والـflags والـapproval/evidence contracts من المصادر الحاكمة الحالية على الـSHA المثبت. لا تجعل أي قائمة هنا سلطة ثابتة إذا تغير العقد.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <branch-or-ref>
MODE: <EXECUTE_PACKAGE | EXECUTE_DIRECT | REVIEW_CANDIDATE>
PACKAGE_PATH: <plans/diagnose-implementing/<task> | N/A>
TASK: <direct task when MODE=EXECUTE_DIRECT | N/A>
CANDIDATE_SHA: <AUTO | exact-40-sha>
BASE_SHA_OR_RANGE: <AUTO | base-sha | commit-range>
CLAIMED_OUTCOME: <AUTO_FROM_PACKAGE | explicit measurable outcome>
DELIVERY: <LOCAL_ONLY | COMMIT | COMMIT_AND_PUSH>
```

## 1. قواعد الأوضاع

```text
EXECUTE_PACKAGE
= اقرأ الحزمة الحالية، صالح drift، نفّذ concerns، ابنِ Candidate، جمّد الكتابة، تحقق، راجع واحكم.

EXECUTE_DIRECT
= مهمة صغيرة منخفضة/محدودة المخاطر فقط. إذا احتاجت ذاكرة تخطيط أو كانت protected/high-risk أو متعددة المالكين/المجالات فحوّلها إلى Package.

REVIEW_CANDIDATE
= مراجعة read-only لـCandidate immutable. ممنوع تعديل المصدر/الحزمة/Commit/Push مهما كانت DELIVERY.
```

## 2. السلطة والحقيقة

اتبع ترتيب السلطة الحاكم الحالي:

```text
current authorized task/review
→ governance/authority/authority-precedence.json
→ governance/GOVERNANCE.md
→ governance/product/PRD.md
→ applicable engineering/security/delivery policy
→ applicable capability Product Truth + machine contracts
→ exact pinned implementation/runtime/repository-platform evidence
```

استخدم `CODE_BASED_LEAN` و`AFFECTED_PLUS_RISK_EXPANSION`. لا تجعل Prompt/Package/Report/Fixture/Historical evidence سلطة أعلى من المصادر الحاكمة.

## 3. SHA Model — لا تستخدم كلمة Candidate بمعانٍ متعددة

استخدم المصطلحات التالية:

```text
STARTING_REMOTE_SHA
= رأس TARGET_REF عند بدء المهمة.

WORK_BASE_SHA
= الرأس الذي بُني عليه delta الخاص بهذا المنفذ بعد آخر reconciliation.

IMPLEMENTATION_SHA
= Commit منطقي يحتوي تغييرًا تنفيذيًا محددًا؛ قد يوجد أكثر من واحد.

BOOKKEEPING_SHA
= Commit اختياري يغير ملفات الحزمة/التوثيق المشتق فقط.

FINAL_CANDIDATE_SHA
= آخر Commit سيبقى مرشح القرار بعد انتهاء كل الكتابات المسموح بها.

LATEST_REMOTE_SHA
= رأس TARGET_REF عند آخر re-resolve.
```

أي كتابة بعد `FINAL_CANDIDATE_SHA` تعني أن الاسم كان خاطئًا: المرشح الجديد هو الـCommit الأحدث، وتُعاد الأدلة التي أبطلها التغيير.

### Package bookkeeping paradox

الحزمة مشتقة وليست Product Truth. لا تدخل في حلقة لا نهائية من:

```text
run evidence
→ write evidence result into package
→ new SHA
→ evidence stale
→ run evidence again
→ write again
```

القاعدة:

1. أكمل كل كتابة تنفيذية وكل bookkeeping مطلوب **قبل** تثبيت `FINAL_CANDIDATE_SHA`.
2. بعد Freeze لا تكتب نتيجة التحقق النهائي مرة أخرى داخل الحزمة أو المصدر.
3. القرار النهائي/الـEvidence Matrix النهائية يمكن أن تكون مخرجات read-only مرتبطة بـ`FINAL_CANDIDATE_SHA` ولا يلزم تحويلها إلى Commit مشتق.
4. `validate-package --strict --closure` — عندما يدعمه الإطار — يثبت فقط تماسك حالة الحزمة التي يفحصها؛ لا يثبت same-commit Evidence Matrix ولا approvals. إذا كان تشغيله يتطلب أولًا Commit يغير حالة الحزمة، يصبح ذلك الـCommit Candidate جديدًا ويجب إثباته دون كتابة لاحقة.
5. لا تستخدم Package state كبديل عن final evidence/approval truth.

## 4. حل AUTO خوارزميًا

لا تترك `AUTO` عائمًا بعد التهيئة.

### EXECUTE_PACKAGE

```text
STARTING_REMOTE_SHA = current TARGET_REF head
WORK_BASE_SHA = latest safe TARGET_REF head after package drift reconciliation
BASE_SHA_OR_RANGE when AUTO = package pinnedStartSha .. FINAL_CANDIDATE_SHA for total task review,
  مع إمكانية مراجعة logical concern subranges عند الحاجة.
CANDIDATE_SHA when AUTO = FINAL_CANDIDATE_SHA بعد Freeze فقط.
```

إذا كانت الحزمة بدأت قبل تغييرات أجنبية، لا تستخدم pinnedStartSha كـpush baseline؛ استخدمه فقط لتشخيص drift/total task history.

### EXECUTE_DIRECT

```text
STARTING_REMOTE_SHA = current TARGET_REF head before first task write
WORK_BASE_SHA = latest reconciled head before applying this task delta
BASE_SHA_OR_RANGE when AUTO = STARTING_REMOTE_SHA .. FINAL_CANDIDATE_SHA
CANDIDATE_SHA when AUTO = FINAL_CANDIDATE_SHA after Freeze
```

### REVIEW_CANDIDATE

```text
CANDIDATE_SHA=AUTO
→ resolve TARGET_REF once to a full 40-SHA
→ freeze that value for the review; do not follow later head movement silently.

BASE_SHA_OR_RANGE=AUTO
→ derive only from explicit package baseline/task provenance/review intent.
→ never guess default branch or arbitrary parent merely to produce a diff.
```

إذا تعذر اشتقاق Base بلا تخمين، القرار المناسب هو evidence gap وفق القاموس الحالي، لا اختراع range.

## 5. Candidate existence / reachability / head relation

قبل الحكم أثبت:

```text
candidate exists in REPOSITORY
candidate full SHA is immutable
candidate relationship to TARGET_REF is known
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
HEAD_AT_DECISION == CANDIDATE_SHA ? YES/NO
candidate reachable from TARGET_REF ? YES/NO/NOT_REQUIRED_WITH_REASON
```

يمكن مراجعة Candidate غير موجود حاليًا كرأس الفرع إذا كان ذلك مقصودًا ومثبتًا، لكن لا تقل “الفرع مغلق على Candidate” عندما `HEAD_AT_DECISION != CANDIDATE_SHA`.

## 6. Capability Preflight ديناميكي

سجّل الأساس ثم أضف القدرات المطلوبة للأدلة المنطبقة:

```text
CAN_READ_REPOSITORY
CAN_WRITE_REPOSITORY
CAN_QUERY_LIVE_GITHUB
CAN_EXECUTE_SHELL
CAN_RUN_NODE
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

لكل evidence scope منطبق: `required capability → available? → acquisition path → proof limit`.

لا تدّع Guard/Build/Test/Review/Runtime/CI/Approval لم يُنفذ. قدرة مطلوبة غير متاحة لا تصبح PASS.

## 7. Concurrent-Agent Isolation

```text
PARALLEL AGENTS ARE ALLOWED.
PARALLEL PUSH ASSUMPTIONS ARE NOT.
```

الأفضل محليًا:

```text
ONE WRITING AGENT = ONE ISOLATED WORKSPACE/WORKTREE/CLONE
```

إذا كان العزل غير ممكن، تعامل مع كل تغيير غير مُنشأ ومُثبت بواسطة هذه المهمة كـforeign/pre-existing change.

قبل أول كتابة محلية سجّل:

```text
LOCAL_WORKSPACE_ID
STARTING_REMOTE_SHA
PRE_EXISTING_LOCAL_CHANGES
INTENDED_PATHS
INTENDED_SYMBOLS
INTENDED_CONCERNS
```

لا تحذف أو تستعد أو تلتقط تغييرًا موجودًا مسبقًا لأنك وجدته في working tree.

### أوامر جماعية ممنوعة افتراضيًا في workspace مشترك/غير نظيف

```text
git add .
git add -A
git commit -a
git checkout -- .
git restore .
git reset --hard
git clean -fd
```

ولا تستخدم ما يعادلها من أدوات IDE/API بطريقة تلتقط تغييرات أجنبية بلا فحص.

بدلًا منها:

```text
inventory
→ classify pre-existing/foreign delta
→ edit intended concern
→ stage explicit intended paths/hunks
→ inspect staged diff
→ compare staged paths/symbols with intended delta
→ commit only owned/reconciled changes
```

حتى path صريح قد يحتوي تعديل وكيل آخر؛ افحص symbol/hunk semantics لا اسم الملف فقط.

## 8. Atomic repository writes

### GitHub Remote/API

لـlogical concern واحد، فضّل عندما تدعمه الأداة:

```text
resolve latest head
→ build blobs/tree against that base
→ create one commit with expected parent
→ re-resolve head
→ fast-forward/conditional ref update only
```

إذا تحرك `TARGET_REF` قبل ref update، لا Force. أعد Latest-Head reconciliation وابنِ Commit جديدًا على الرأس الأحدث إذا بقي التغيير صالحًا.

إذا لم تدعم الأداة atomic tree write، استخدم أقل عدد ممكن من conditional current-file/current-branch-SHA writes، وأعد التثبيت بين الدفعات. لا تعتبر partial multi-file write نجاحًا.

### Local Git

كل logical commit يجب أن يكون قابلًا للمراجعة ومحصورًا في delta المقصود. لا stash/reset/rebase تلقائيًا لتجاوز foreign changes دون فهمها.

## 9. Latest-Head Semantic Reconciliation Gate

قبل أي logical write batch، وخصوصًا قبل final commit/push:

```text
resolve LATEST_REMOTE_SHA
→ compare WORK_BASE_SHA/STARTING_REMOTE_SHA → LATEST_REMOTE_SHA
→ inspect concurrent changed paths + symbols + contracts + schema + migrations + generated clients + truth owners + journeys
→ classify concurrent delta
```

التصنيف التشغيلي النصي:

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
→ carry forward onto latest head
→ rerun only evidence invalidated by shared foundation if any.

RELATED_NON_CONFLICTING
→ reconcile integration assumptions
→ apply onto latest head
→ rerun affected checks.

SEMANTIC_OVERLAP
→ do not blindly merge/push
→ re-diagnose owner/writers/readers/contracts/state
→ rebuild delta on latest truth
→ rerun invalidated evidence.

DIRECT_CONFLICT
→ no push
→ resolve intentionally on latest head
→ new candidate + reverify.

AUTHORITY_OR_TRUTH_CHANGE
→ reread governing source/Product Truth/machine contract
→ invalidate affected planning assumptions
→ re-diagnose before write.
```

Git merge success لا يثبت semantic compatibility.

## 10. Optimistic single-push gate

لا تدّع وجود distributed lock ما لم توجد آلية حقيقية. استخدم **optimistic serialization**:

```text
many agents may prepare work
→ each final writer re-resolves latest head
→ candidate commit parent must be the latest reconciled head
→ immediately before push/ref update re-resolve again
→ update only if fast-forward/expected-parent assumptions still hold
```

إذا تحرك الفرع بين final verification والدفع:

```text
DO NOT PUSH STALE CANDIDATE
→ compare candidate base → new latest head
→ reconcile semantic impact
→ rebuild candidate on latest head
→ rerun invalidated final evidence
```

## 11. تهيئة EXECUTE_PACKAGE

اقرأ الحزمة حسب الإطار الحالي، بما فيه Manifest/Diagnosis/Coverage/Order/Units/Closure. عند توفر Shell شغّل strict validator الفعلي.

إذا تحرك الفرع منذ package baseline:

```text
reconcile paths/symbols/contracts/generated clients/schema/migrations/owners/dependencies/journeys/verifications
→ update plan only where impact changed
→ strict validate again when executable
```

Seeded Coverage هو assessment ledger، وليس أمر deep scan لكل المستودع.

إذا فشل strict بسبب الحزمة، أصلح الحزمة أولًا دون تخفيف الهدف أو acceptance criteria.

## 12. تهيئة EXECUTE_DIRECT — Risk Gate

DIRECT مسموح فقط عندما يمكن إثبات أن المهمة محدودة، بمالك/Root Cause واضحين، ولا تحتاج ذاكرة تخطيط متعددة الوحدات.

تحوّل إلزاميًا إلى Package عند أي من الآتي ما لم يكن العقد الحالي يثبت مسارًا أبسط صراحة:

```text
multiple independent root causes/owners
multi-domain or multi-surface foundation
contract/schema migration affecting multiple consumers
cross-domain transactional change
protected/high-risk domain:
  authentication/authorization/sessions
  PII/privacy/secrets/credentials
  operator/context isolation
  finance/financial control
  migrations/production data
  CI/infrastructure/release/production
```

قبل أي direct write أثبت root cause، canonical owner، paths/symbols، writers/readers/consumers، surfaces/readbacks، verification/evidence/approval plan.

## 13. تهيئة REVIEW_CANDIDATE

ثبّت Candidate وBase/range حسب القسم 4. يبقى المصدر read-only. إذا ظهر Fix، سجّل Finding؛ لا تصلحه داخل نفس دورة المراجعة المستقلة.

## PHASE A — EXECUTE_AND_VERIFY

تعمل فقط في أوضاع التنفيذ.

## 14. قاعدة الاستمرار

```text
FAILURE
→ classify evidence
→ re-diagnose root cause/owner
→ fix canonical owner
→ targeted verify
→ affected verify
→ continue
```

لا تكرر نفس Patch loop بلا فرضية جديدة. إذا لم يوجد تقدم: أعد فحص الملكية والافتراضات، قسّم المشكلة، أو أثبت blocker خارجيًا حقيقيًا.

## 15. Foundation Gate

نفّذ فقط FOUNDATION/MIGRATION/shared prerequisite المثبتة. إذا ظهر foundation defect أثناء Journey:

```text
stop affected path safely
→ evidence
→ reopen/create owning unit
→ invalidate dependent evidence
→ recompute order
→ fix foundation
→ rerun affected checks
→ resume
```

## 16. إصلاح السبب الجذري

```text
symptom
→ authoritative truth/write owner
→ proven root cause
→ canonical target state
→ central fix
→ migrate every affected writer/reader/consumer
→ regenerate derivatives when required
→ remove obsolete/parallel path after migration
→ persisted/canonical readback
→ affected verification
```

ممنوع: temporary patch/silent fallback/parallel truth/permanent dual-write/handwritten parallel client/business logic in surface/runtime fixture as truth/fake control/UI-only auth/test weakening/applied-migration rewrite/state-machine bypass/new financial retry identity before unknown-result reconciliation/legacy path left reachable/acceptance weakening.

## 17. Full-Stack Multi-Surface closure

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

غطِّ success/invalid/denied/wrong-scope/forbidden-state/duplicate/replay/race/concurrency/timeout/unknown-result/offline/reconnect/retry/partial-failure/restart/mixed-version/compensation/reconciliation بحسب الخطر.

## 18. Compatibility / Security / Finance / Data / Distributed systems

### Compatibility
أثبت ما ينطبق: old-mobile+new-backend، new-mobile+old-backend عند الحاجة، current-control-panel+new-backend، generated client/event/cache compatibility، mixed version، feature flag safe default، rollback/roll-forward، compatibility owner/expiry/removal trigger.

### Security
تحقق إيجابيًا وسلبيًا من auth/session/revocation/role/permission/trusted context/object auth/IDOR/cross-scope/service auth/PII/secrets/provider signature/replay/rate-limit حسب الأثر. Client-controlled IDs ليست authority.

### DSH/WLT
WLT يبقى المالك المالي الحاكم. لا financial truth موازية. أثبت idempotency/correlation/state constraints/readback/reconciliation/compensation/unknown provider outcome. Mock/local success لا يثبت finance/production.

### PostgreSQL
Forward deterministic migration فقط؛ compatibility/backfill/writer-reader transition، constraints/indexes/FKs/checks، fresh/non-empty، conflicting/orphan/duplicate data، locks/concurrency/idempotency، restart/partial failure، rollback/roll-forward. لا applied-history rewrite ولا `IF NOT EXISTS` لإخفاء Drift معروف.

### Events/Jobs/Providers
stable identity، duplicate/out-of-order/replay، outbox/inbox، retry/backoff/DLQ/lease، timeout/partial/unknown result، provider auth، reconciliation/compensation/restart recovery.

## 19. UI/UX + Mobile + Control Panel

افحص الحالات المنطبقة: loading/empty/partial/success/error/forbidden/blocked/conflict/stale/offline/unknown/retry/recovery + canonical readback وRTL/localization/accessibility/responsive/device/network.

Mobile: navigation/deep-links/native permissions/push/maps/SecureStore/offline/native rebuild/OTA/EAS/signing/runtime env. Metro لا يثبت Native build.

Control Panel: route/object auth، server/client boundary، trusted scope، pagination/filter/search isolation، bulk/destructive actions، audit، session expiry، error mapping، optimistic rollback/readback، cross-surface readback.

## 20. Verification — Affected First

اقرأ الأوامر الفعلية من manifests/scripts/registries:

```text
nearest root-cause regression check
→ unit/package test
→ related integration
→ affected typecheck/lint/test/build
→ contract/generated client/db/security/isolation checks
→ runtime health/readiness/smoke/readback when claimed
→ cross-surface E2E/manual visual acceptance when claimed
→ full workspace/runtime only when impact/policy requires
```

كل Check يذكر claim/proof limit. لا Scope يثبت Scope آخر.

## 21. Evidence invalidation

أي relevant mutation في canonical truth/auth/authz/contract/generated client/schema/shared state/runtime foundation أو concurrent change مرتبط يبطل الأدلة السابقة المتأثرة. سجّل ما بطل وأعده بعد المرشح الجديد.

## 22. أقصى تقدم والعوائق

`BLOCKED_EXTERNAL` ليس اختصارًا للفشل الداخلي. جمّد المسار المحجوب فقط، أكمل العمل الداخلي المستقل، وسجّل owner/evidence/attempts/minimum unblock/resume point. استخدم القاموس الحالي ولا تخترع status.

## 23. Package bookkeeping قبل Freeze

في `EXECUTE_PACKAGE` حدّث Schema الحالي بالحقيقة الفعلية أثناء التنفيذ فقط. قبل Freeze:

```text
unit results/checks/deviations/blockers up to pre-freeze evidence
execution/order actual states
coverage only when impact changed
manifest latest observed/task states allowed by schema
closure planning/summary if useful
```

لا تكتب `CLOSED_WITH_EVIDENCE` استباقيًا لمجرد أن التنفيذ انتهى. إذا كان framework الحالي يتطلب committed final-closure state كي ينجح `--closure`، اعتبر ذلك consistency mechanism منفصلًا عن final decision ولا تدخله في حلقة post-evidence writes.

## 24. Final latest-head integration before Freeze

قبل إنشاء `FINAL_CANDIDATE_SHA`:

```text
inventory exact owned delta
→ resolve latest TARGET_REF
→ semantic reconciliation gate
→ rebuild/apply task delta onto latest safe head
→ inspect exact diff
→ package bookkeeping required before freeze
→ create final logical commit(s)
→ re-resolve TARGET_REF
```

إذا كان هناك agent آخر دفع في هذه النافذة، أعد reconciliation قبل تسمية أي SHA Final Candidate.

## PHASE B — FREEZE_AND_FINAL_VERIFY

## 25. تثبيت FINAL_CANDIDATE_SHA

بعد انتهاء **كل** الكتابات:

```text
FREEZE WRITES
→ FINAL_CANDIDATE_SHA = exact last candidate commit
→ verify candidate exists/reachability/head relation
→ no source/package/format/generation/commit/push mutation during evidence collection
```

أي تعديل لاحق يعيدك إلى Phase A ويولد Candidate جديدًا.

## 26. جولة إغلاق عدائية

ابحث عن: unfixed root cause، parallel truth، stale contract، hidden writer/reader، missing migration/consumer، surface gap، security bypass، retry/unknown/recovery gap، runtime-only defect، stale evidence، audit gap، out-of-scope diff، foreign change accidentally included.

إذا احتاج Finding كتابة: Freeze انتهى؛ ارجع إلى Phase A ثم Candidate جديد.

## 27. Read-only final verification

على `FINAL_CANDIDATE_SHA`:

```text
required final checks read-only
→ generated outputs consistency without mutation
→ exact diff/out-of-scope/foreign-change review
→ canonical readbacks
→ candidate-bound evidence
→ test effectiveness
```

ممنوع `--fix`, formatter/generator write, cleanup apply, lockfile/migration mutation, commit/push/merge أو ابتلاع exit code. إذا tool verification يغير المصدر، ليس final verification صالحًا.

## 28. Branch-race gate قبل القرار وقبل Push

### قبل Push في COMMIT_AND_PUSH

إذا Candidate محلي/غير مدفوع:

```text
re-resolve TARGET_REF immediately
→ if head != candidate parent/latest reconciled base: DO NOT PUSH
→ reconcile → new candidate → reverify
→ push only fast-forward-safe
→ re-resolve after push
```

### قبل القرار النهائي

دائمًا:

```text
HEAD_AT_DECISION = re-resolve TARGET_REF
compare HEAD_AT_DECISION with FINAL_CANDIDATE_SHA
```

إذا تغير الرأس بعد Candidate:
- Evidence على Candidate قد تبقى صحيحة لذلك الـCandidate.
- لكن لا تدّع أن **الرأس الحالي للفرع** هو المرشح المغلق.
- إذا المطلوب إغلاق الفرع الحالي، صالح الحركة وابنِ/تحقق Candidate جديدًا.

## PHASE C — REVIEW_AND_DECIDE

## 29. استقلال المراجع

```text
SELF_REVIEW ≠ INDEPENDENT_REVIEW
```

Git author/account وحده لا يثبت أن وكيلًا مستقلًا راجع التغيير. سجّل provenance القابل للإثبات.

```text
independent reviewer identity/provenance proven? YES/NO
```

إذا `NO` فحالة الاستقلال = `UNPROVEN` نصيًا؛ لا ترقي self-review إلى Independent Review بسبب محادثة/Prompt مختلف فقط.

المنفذ يجوز له adversarial self-review وتصنيف الأدلة، ولا يجوز له impersonate owner أو self-grant protected approval. المراجع المستقل لا يصلح Candidate ثم يعتمد إصلاحه في نفس دورة المراجعة.

## 30. راجع الادعاء والـDiff

ابدأ من `CLAIMED_OUTCOME` وحدد actors/identities/surfaces/owners/states/scopes/permissions/contracts/persistence/providers/finance/readbacks/failure-recovery/compatibility/evidence/approvals.

راجع `BASE_SHA_OR_RANGE → FINAL_CANDIDATE_SHA`:

```text
changed files + commits
unexpected generated/lockfile changes
foreign/pre-existing delta accidentally included
out-of-scope paths
unrelated cleanup
missing consumer migration
legacy path reachable
unreviewed contract/schema/runtime effect
```

## 31. Test effectiveness

لكل Test/Guard مهم:

```text
what exact claim does it falsify?
can it pass while product remains broken?
does it exercise real contract/db/runtime path?
does it cover negative/retry/concurrency/recovery risk?
was it weakened/mocked/skipped/redirected/non-blocking?
is there a root-cause regression test when regressable?
```

## 32. Evidence Matrix

استخرج scopes الحالية من decision vocabulary/delivery policy. لكل scope:

```text
applicable? + reason
state: PASS | FAIL | MISSING | STALE | BLOCKED
source/command/run/artifact
candidate_sha
proof_limit
required capability
required approval domain/owner
```

لا Scope يثبت Scope آخر. `validate-package --closure`, CI, Build أو Test لا يثبت بمفرده completeness للمصفوفة ولا الموافقات.

## 33. Approval Matrix

حل authority من العقود الحالية، ولا تعتمد blanket historical authorization كـoutcome acceptance.

```text
approval_domain
required? + why
allowed approver identity/role
protected? YES/NO
actual approver/provenance
exact candidate SHA bound?
evidence/audit source
state: SATISFIED | MISSING | UNPROVEN | NOT_APPLICABLE
```

إذا لا يمكن إثبات identity/provenance أو exact candidate binding، approval غير مثبت.

## 34. GitHub/CI Repository-Platform truth

عندما يعتمد الادعاء عليها، تحقق حيًا من Candidate نفسه: workflow runs/required checks/cancelled/superseded runs/reviews/threads/live protection/rulesets/merge relation. Config tracked يصف المطلوب ولا يثبت enforcement الحي.

## 35. Findings

لكل Finding:

```text
severity: BLOCKER | HIGH | MEDIUM | LOW
category: PRODUCT | ARCHITECTURE | SECURITY | FINANCE | DATA | CONTRACT | RUNTIME | UI_UX | QA | CI | GOVERNANCE
claim_affected
exact_path_or_evidence
why_it_is_wrong
root_cause_or_missing_proof
required_owner
required_fix_or_evidence
```

لا تحول style preference إلى Blocker.

## 36. Package validation / closure semantics

عند Package:
- قارن الخطة بما نُفذ فعليًا.
- لا تعتمد `DONE/PASS` داخل package كدليل مستقل.
- شغّل `--strict` و/أو `--strict --closure` فقط إذا كانت متاحة ومناسبة للحالة الحالية.
- نجاح Validator يثبت فقط ما يفحصه.
- **ممنوع** استخدام `--closure PASS` كدليل على Evidence Matrix completeness أو Protected approvals أو Final Closure.
- إذا تطلب `--closure` mutation بعد Final Evidence، لا تنفذ تلك mutation داخل نفس frozen candidate؛ إما أن تسبق Freeze وتصبح جزءًا من Candidate ثم تعاد الأدلة، أو تبقى final closure decision خارج package mutation.

## 37. Retention بعد الإغلاق

الحزم `DERIVED_SUPPORT`. بعد انتهاء الحاجة، طبق repository-retention policy الحالية. إذا كانت task-temporary/superseded/unconsumed/reproducible وكان حذفها مفوضًا وآمنًا ولا يعتمد عليها runtime/build/ci/migration/governance/operations، احذفها؛ Git history هو الأرشيف الافتراضي. الحذف نفسه Candidate mutation ويحتاج دورة تحقق مناسبة لما يدعيه القرار بعده.

## 38. القرار النهائي

استخدم فقط `governance/contracts/decision-vocabulary.json` الحالي.

قواعد ثابتة:
- Scope PASS ليس Final Closure.
- عيب داخلي مفتوح يمنع claim المتأثر.
- missing/stale evidence ليست PASS.
- external blocker لا يمحو scopes الناجحة لكنه يمنع القرار الأعلى المعتمد عليه.
- `CLOSED_WITH_EVIDENCE` فقط عندما كل scopes والموافقات المنطبقة مثبتة على **نفس immutable FINAL_CANDIDATE_SHA** بلا fail/blocked/pending، ومع وضوح علاقة Candidate بالرأس الحالي.

## 39. التقرير النهائي

```text
repository / target_ref / mode
starting_remote_sha / work_base_sha / final_candidate_sha
head_at_decision / candidate_head_relation
base_or_reviewed_range
package_or_direct_task / claimed_outcome
concurrent_remote_movements + classifications + reconciliations
pre-existing/foreign change handling
root_causes_fixed_or_reviewed
changed/removed/moved paths + scope assessment
contracts/clients/migrations/data changes
surfaces/journeys/canonical readbacks
checks + proof limits + invalidated evidence rerun
test-effectiveness assessment
Evidence Matrix
Approval Matrix
same-candidate GitHub/CI evidence
independent-review provenance state
package validation result + explicit proof limit
commits/push result
remaining blocker/missing evidence + resume point
retention action when applicable
final decision
```

لا تصدر ادعاء أوسع من الأدلة، ولا تعتبر branch head القديم أساس Push بعد أن تحرك الريموت، ولا تكتب بعد Freeze ثم تحتفظ بأدلة Candidate السابق.