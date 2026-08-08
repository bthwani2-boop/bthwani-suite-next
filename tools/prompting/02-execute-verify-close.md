# الأمر 2 — التنفيذ والتحقق والمراجعة والإغلاق حتى أعلى قرار مثبت

Status: DERIVED_SUPPORT

استخدم هذا الأمر لكل ما يأتي **بعد التشخيص/الخطة**: تنفيذ حزمة، تنفيذ مهمة مباشرة محدودة، أو مراجعة Candidate مثبت دون كتابة. الهدف هو إصلاح السبب الجذري، إثبات النتيجة على Candidate محدد، ثم إصدار أعلى قرار تسمح به السلطة والأدلة الفعلية دون نجاح شكلي.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <branch-or-ref>

MODE:
<EXECUTE_PACKAGE | EXECUTE_DIRECT | REVIEW_CANDIDATE>

PACKAGE_PATH:
<plans/diagnose-implementing/<task> | N/A>

TASK:
<direct task when MODE=EXECUTE_DIRECT | N/A>

CANDIDATE_SHA:
<AUTO | exact-40-sha>

BASE_SHA_OR_RANGE:
<AUTO | base-sha | commit-range>

CLAIMED_OUTCOME:
<AUTO_FROM_PACKAGE | explicit measurable outcome>

DELIVERY:
<LOCAL_ONLY | COMMIT | COMMIT_AND_PUSH>
```

### قواعد الأوضاع

```text
EXECUTE_PACKAGE
= اقرأ حزمة صالحة، صالح أي drift، نفّذ concerns، تحقق، جمّد الكتابة، ثم راجع واحكم.

EXECUTE_DIRECT
= نفّذ مهمة محدودة واضحة؛ إذا اتضح أنها تحتاج عدة concerns/owners/foundation/migrations فأنشئ حزمة بالأمر 1 ثم انتقل إلى EXECUTE_PACKAGE.

REVIEW_CANDIDATE
= مراجعة read-only لـCandidate immutable. ممنوع تعديل المصدر أو Commit أو Push مهما كانت قيمة DELIVERY.
```

## 1. السلطة وتثبيت الحقيقة

اتبع ترتيب السلطة الحاكم الحالي من المرجع نفسه:

```text
current authorized task/review
→ governance/authority/authority-precedence.json
→ governance/GOVERNANCE.md
→ governance/product/PRD.md
→ applicable engineering/security/delivery policy
→ applicable capability Product Truth + machine contracts
→ exact pinned implementation/runtime/repository-platform evidence
```

لا تجعل Prompt أو Package أو Report أو Fixture أو Historical evidence سلطة أعلى من المصادر الحاكمة الحالية.

استخدم `CODE_BASED_LEAN` و`AFFECTED_PLUS_RISK_EXPANSION`: أصلح أو راجع أصغر نطاق جذري كامل، ووسّع فقط بسبب مثبت.

قبل أي كتابة في أوضاع التنفيذ، وقبل أي حكم في وضع المراجعة، ثبّت:

```text
STARTING_REMOTE_SHA
CURRENT_REMOTE_SHA
CANDIDATE_SHA عند المراجعة/الإغلاق
CAN_READ_REPOSITORY
CAN_WRITE_REPOSITORY
CAN_EXECUTE_SHELL
CAN_RUN_NODE
CAN_RUN_DATABASE
CAN_RUN_RUNTIME
CAN_COMMIT
CAN_PUSH
```

أعد حل رأس الفرع قبل كل دفعة كتابة وبعد كل Push/آخر كتابة. إذا تحرك الرأس، أوقف الكتابة وصالح التغير الدلالي. لا تستبدل الفرع، ولا Force Push/Reset/history rewrite، ولا PR/Merge/Release/Production دون تفويض المهمة الحالية.

إذا كانت القدرة غير متاحة للمضيف، لا تدّع تنفيذها. غياب Shell/Test/Runtime/CI evidence ليس PASS.

## 2. تهيئة الوضع

### EXECUTE_PACKAGE

اقرأ بالترتيب:

```text
START-HERE.md
→ MANIFEST.json
→ GLOBAL-DIAGNOSIS.md
→ COVERAGE.json
→ EXECUTION-ORDER.json
→ current unit DIAGNOSIS/EXECUTION/VERIFICATION/RESULT
```

عند توفر Shell شغّل:

```powershell
node plans/diagnose-implementing/validate-package.mjs <PACKAGE_PATH> --strict
```

إذا فشل strict بسبب الخطة، أصلح الحزمة أولًا دون تخفيف الهدف أو acceptance criteria. إذا تحرك الفرع منذ baseline الحزمة، نفّذ impact reconciliation على paths/symbols/contracts/generated clients/schema/migrations/owners/dependencies/journeys/verifications المتأثرة فقط ثم أعد strict.

لا تبدأ وحدة تعتمد على dependency غير `DONE`، ولا تسمح بأكثر من وحدة كتابة `IN_PROGRESS`.

### EXECUTE_DIRECT

ابدأ مباشرة فقط إذا كانت الملكية والنطاق والنتيجة واضحة ومحدودة. قبل التعديل أثبت على الأقل:

```text
root cause
canonical truth/write owner
affected paths/symbols
writers/readers/consumers
affected surfaces/readbacks
required verification
```

إذا ظهرت عدة Root Causes مستقلة، أو multi-domain/multi-surface foundation، أو migration/contract migration واسعة، أو صار التنفيذ يحتاج ذاكرة تخطيط خارجية، أنشئ حزمة بالأمر 1 بدل إدارة الخطة في المحادثة.

### REVIEW_CANDIDATE

ثبّت `CANDIDATE_SHA` immutable، وحدد `BASE_SHA_OR_RANGE` الذي يبرر الادعاء. لا تعدّل المصدر. إذا ظهر إصلاح مطلوب، أصدر Finding وارجع إلى وضع تنفيذ على Candidate جديد لاحقًا.

## PHASE A — EXECUTE_AND_VERIFY

هذه المرحلة تعمل فقط في `EXECUTE_PACKAGE` و`EXECUTE_DIRECT`.

## 3. قاعدة الاستمرار وإيقاف Patch loops

أي خلل داخلي مرتبط وقابل للإصلاح هو دليل جديد، لا سبب للتوقف:

```text
FAILURE
→ classify evidence
→ re-diagnose root cause/owner
→ fix canonical owner
→ targeted verify
→ affected verify
→ continue
```

لا تكرر الأمر الفاشل بلا فرضية جديدة. إذا تكررت محاولات متشابهة بلا تقدم:

```text
STOP PATCH LOOP
→ re-check ownership/assumptions
→ split the problem
→ identify new root cause or true external blocker
```

## 4. Foundation Gate عند ثبوت الحاجة

في Journey/Application/Surface/Feature عابرة للأسطح، لا تبدأ وحدات تابعة إذا بقي concern تأسيسي مثبت يمنعها.

نفّذ فقط `FOUNDATION`/`MIGRATION`/shared prerequisite اللازمة، ثم بوابة التحقق المخططة. لا تجعل Foundation مسحًا شاملاً بلا دليل.

إذا ظهر Foundation defect أثناء Journey:

```text
stop affected path safely
→ capture evidence
→ reopen/create owning foundation unit
→ invalidate dependent evidence
→ recompute order
→ fix foundation
→ rerun affected foundation checks
→ resume from last valid checkpoint
```

## 5. إصلاح السبب الجذري والمالك الحاكم

لكل concern:

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

ممنوع:

```text
temporary patch / silent fallback
parallel truth / permanent dual-write
handwritten parallel contract/type/client
business logic duplicated into surface/shared UI
runtime mock/fixture as truth
fake control with no persisted effect
UI-only authorization
test weakening / guard disabling
rewriting applied migration
manual state mutation to bypass state machine
financial retry with a new identity before resolving unknown outcome
legacy path left reachable after cutover
acceptance-criteria weakening after failure
```

## 6. Full-Stack Multi-Surface closure

اسم التطبيق/السطح/الصفحة/الرحلة نقطة البداية فقط. أغلق كل علاقة مثبتة:

```text
Product Truth
→ Actor / Service Identity
→ Session/Device
→ Trusted Platform/Operator/Partner/Store/Assignment scope
→ Role/Permission/Object authorization
→ Surface/Route/Screen/Control
→ shared controller/adapter
→ generated client/canonical contract
→ API/handler/domain/state machine
→ transaction/database
→ cache/idempotency
→ events/jobs/providers/WLT when applicable
→ persisted canonical readback
→ every required affected surface
→ audit/observability
```

لا تعتبر السطح الأول مغلقًا إذا كانت النتيجة يجب أن تظهر أو تُستهلك في سطح آخر.

غطِّ بقدر الخطر:

```text
success
invalid input
denied/forbidden/wrong scope
forbidden state
duplicate/replay
race/concurrency
timeout/unknown result
offline/reconnect
retry/backoff
partial failure/restart
stale client/mixed version
compensation/reconciliation
```

## 7. Compatibility وRollout

عند تغيير API/Schema/Contract/Mobile-facing behavior، أثبت ما ينطبق:

```text
old mobile + new backend
new mobile + old backend عند الحاجة
current control-panel + new backend
generated-client/event/cache compatibility
mixed-version runtime
feature-flag safe default عند وجوده
rollback/roll-forward
compatibility window: owner + expiry + removal trigger + monitoring/tests
```

لا تفترض تحديث كل تطبيقات الهاتف لحظيًا. Compatibility المؤقتة لا تتحول إلى fallback أو dual-write دائم.

## 8. الأمن والهوية والنطاق

عند الانطباق تحقق إيجابيًا وسلبيًا من:

```text
authentication/session/device/revocation
role + permission
trusted Platform/Operator context
Partner/Store/Actor/Assignment scope
object authorization / IDOR
cross-scope leakage / privilege escalation
service authentication
PII/secrets/logging
provider signature/replay/rate limits
negative paths
```

Client-controlled IDs محددات موارد وليست إثبات صلاحية.

## 9. DSH / WLT

أعد إثبات الحدود من Product Truth والعقود الحالية. عند الأثر المالي:

- WLT يبقى مالك ledger/balance/payment/refund/settlement/payout/commission/reconciliation truth.
- DSH/surfaces لا تنشئ حقيقة مالية موازية.
- تحقق من idempotency/correlation/state constraints/readback/reconciliation/compensation.
- timeout/unknown provider outcome يبقى reconcilable ولا يتحول إلى نجاح محلي أو retry عشوائي عبر مزود آخر.
- لا تعتبر mock/local provider success دليل production/finance.

## 10. PostgreSQL والأنظمة الموزعة

أي Schema/data change يجب أن يستخدم forward ordered deterministic migration، مع transaction عند الإمكان، constraints/indexes/FKs/checks حسب invariant، compatibility/backfill/writer-reader transition، واختبار PostgreSQL فعلي عندما يتطلب الادعاء ذلك.

تحقق حسب الأثر من:

```text
fresh + non-empty upgrade
conflicting/orphan/duplicate data
locks/versioning/concurrency/idempotency
partial failure/restart
rollback or roll-forward/compensation
cleanup only after consumer/data proof
```

لا تعدّل applied migration history ولا تستخدم `IF NOT EXISTS` لإخفاء Drift معروف.

عند Events/Jobs/Providers اختبر حسب الأثر:

```text
stable identity / duplicate delivery / out-of-order/replay
transactional outbox/inbox
retry/backoff / DLQ/lease
timeout / partial failure / unknown result
provider auth/signature/replay protection
reconciliation / compensation / restart recovery
```

## 11. UI/UX + Mobile + Control Panel

لكل Surface مطلوب افحص control/route/screen والنتيجة الحقيقية، مع الحالات المنطبقة:

```text
loading / empty / partial / success / error
forbidden / blocked / conflict / stale
offline / unknown-result / retry / recovery
canonical persisted readback
```

وتحقق من RTL/localization/accessibility/focus/large text/responsive/device/network عند تأثرها.

عند Mobile افحص navigation/deep links/native permissions/push/maps/SecureStore/offline/native rebuild/OTA/EAS/signing/runtime env؛ نجاح Metro لا يثبت Native build.

عند Control Panel افحص route/object authorization، server/client boundary، trusted scope selection، pagination/filter/search isolation، bulk/destructive actions، audit، session expiry، error mapping، optimistic rollback/readback، cross-surface readback.

## 12. التحقق والأدوات — Affected First

اقرأ الأوامر الفعلية من manifests/scripts/registries الحالية؛ لا تخترع commands.

```text
nearest targeted check
→ root-cause regression test
→ unit/package test
→ related integration
→ affected typecheck/lint/test/build
→ contract/generated client/db/security/isolation checks
→ runtime health/readiness/smoke/readback when claimed
→ cross-surface E2E/manual visual-operational acceptance when claimed
→ full workspace/runtime only when impact or policy requires it
```

Tool ladder:

```text
direct scoped inspection
→ focused search/existing command
→ targeted registered guard
→ small idempotent helper for proven repetition
→ Nx affected
→ LeanCTX only if it materially reduces repeated reads/noise
→ Graphify only if ownership/dependency/duplication/dead-code remains unresolved
→ OpenCodeReview for bounded diff/commit/range
→ runtime tooling only for runtime-changing/claimed work
```

لا تدّع Guard/Build/Test/Review/Runtime لم يُنفذ.

## 13. Manual acceptance وEvidence invalidation

Runtime/Visual/Operational claims تحتاج عند الانطباق actor حقيقيًا إلى persisted effect/readback، لا screenshot أو static success فقط. اختبر success/denied/wrong-scope/conflict/stale/slow-network/offline/duplicate/reconnect/restart بقدر الخطر.

أي relevant write لاحق في canonical truth/auth/authz/contract/generated client/schema/shared state/runtime foundation يبطل الأدلة السابقة المتأثرة. حددها وأعدها؛ لا تستخدم PASS أقدم من mutation أبطل معناه.

## 14. أقصى تقدم والعوائق

`BLOCKED_EXTERNAL` ليس اختصارًا لأي فشل داخلي. إذا حُجب مسار واحد خارجيًا:

1. جمّد المسار المتأثر فقط.
2. نفّذ كل العمل الداخلي المستقل الممكن.
3. وثّق blocker owner/evidence/attempts/minimum unblock action/resume point.

استخدم القرار الحالي المناسب من القاموس الحاكم؛ لا تخترع حالة. التنفيذ المحتمل مع دليل مفقود يختلف عن عيب داخلي ما زال قابلًا للإصلاح.

## 15. تحديث الحزمة

في `EXECUTE_PACKAGE` حدّث Schema الحالي بالحقيقة الفعلية فقط:

```text
RESULT.json = actual status/baselineSha/resultingSha/completed tasks/modified paths/check results/blockers/deviations/decision
EXECUTION.json + EXECUTION-ORDER.json = actual state; max one IN_PROGRESS
COVERAGE.json = only when impact assessment changed
MANIFEST.json = latest observed SHA + actual implementation/verification/decision state allowed by schema
```

لا تجعل `PASS/DONE` مع required check فاشل/غير منفذ أو blocker/deviation مفتوح.

## 16. Commit وPush

في أوضاع التنفيذ فقط، نفّذ Commit عند حد concern منطقي وبعد الفحوص اللازمة لذلك الحد:

```text
LOCAL_ONLY      = no commit / no push
COMMIT          = commit only
COMMIT_AND_PUSH = commit + push to TARGET_REF
```

لا PR/Merge/Release/Production دون طلب صريح منفصل. بعد Push أعد تثبيت الرأس وصالح أي حركة أحدث قبل كتابة جديدة.

## PHASE B — FREEZE_AND_FINAL_VERIFY

تعمل هذه المرحلة بعد آخر كتابة في أوضاع التنفيذ. في `REVIEW_CANDIDATE` يكون Candidate مجمدًا أصلًا.

## 17. جولة إغلاق عدائية ذاتية

قبل تجميد الكتابة، راجع الـdiff والمسار كخصم وابحث عن:

```text
unfixed root cause
parallel truth / stale contract / legacy route
hidden writer/reader/consumer
missing migration/compatibility consumer
journey/surface/control gap
security bypass / missing negative path
retry/recovery/unknown-result gap
runtime-only defect
stale evidence
observability/audit gap
out-of-scope diff
```

أي خلل داخلي جديد يعيد `DIAGNOSE → FIX → VERIFY`. هذه الجولة **Self Review وليست Independent Review** ولا تسمح للمنفذ باعتماد نفسه.

## 18. Read-only final verification

بعد آخر كتابة:

```text
FREEZE WRITES
→ pin final candidate SHA
→ run required final checks read-only
→ confirm generated outputs clean
→ confirm no unexpected/out-of-scope diff
→ confirm required canonical readbacks
→ confirm evidence belongs to final candidate SHA
→ enter review/decision phase
```

يُمنع في التحقق النهائي أي أمر يغير المصدر أو الدليل الذي يثبته، بما في ذلك `--fix`, formatter, generation, cleanup apply, lockfile/migration mutation, commit, push, merge أو ابتلاع exit code. إذا غيّر التحقق المصدر، عد إلى التنفيذ ثم أعد Final Verification من Candidate جديد.

## PHASE C — REVIEW_AND_DECIDE

تعمل هذه المرحلة في جميع الأوضاع. في `REVIEW_CANDIDATE` هي المرحلة الرئيسية ويظل المصدر read-only طوالها.

## 19. استقلال المراجع

```text
SELF_REVIEW ≠ INDEPENDENT_REVIEW
```

حدّد من provenance الفعلي هل المراجع كتب Candidate؛ لا تثق بمجرد label إدخال.

إذا كان نفس الوكيل/الفاعل قد كتب التغيير:

- يجوز له adversarial self-review وfinal read-only verification وتصنيف الأدلة؛
- لا يجوز له وصف ذلك Independent Review؛
- لا يمنح نفسه Product/QA/Security/Finance/Isolation/Release/Production/final-closure approval محميًا.

إذا كانت الحوكمة تتطلب مراجعة مستقلة أو approval محميًا لم يتحقق، أصدر أعلى قرار يسمح به القاموس الحالي ولا تدّع Final Closure.

في `REVIEW_CANDIDATE` عندما يكون المراجع مستقلًا فعليًا، لا يصلح الكود ثم يراجع إصلاحه في الدورة نفسها. أي Fix يعاد إلى منفذ ويحتاج Candidate جديدًا.

## 20. راجع الادعاء لا الملفات فقط

ابدأ من `CLAIMED_OUTCOME` أو استخرجه من الحزمة، وحدد:

```text
actors/service identities
required/excluded surfaces
canonical truth/write owners
legal states/transitions
trusted scopes + permissions + object authorization
contracts/generated clients
persistence/events/jobs/providers
financial ownership when applicable
canonical readbacks
failure/retry/offline/recovery behavior
compatibility/mixed-version obligations
required evidence scopes + protected approvals
```

ثم تحقق أن Candidate يحقق النتيجة بلا side path أو parallel truth غير مراجع.

## 21. Diff integrity وScope drift

راجع `BASE_SHA_OR_RANGE → CANDIDATE_SHA`:

```text
changed files + commits
unexpected generated or lockfile changes
out-of-scope paths
unrelated cleanup mixed into fix
missing consumer migration
legacy path still reachable
unreviewed migration/contract/runtime side effect
```

أي تغيير خارج النطاق بلا سبب مثبت Finding، وأي dependency لازمة غير موجودة في الـdiff Finding أيضًا.

## 22. Root-Cause وCanonical-Ownership review

لكل تغيير جوهري اسأل:

```text
هل عولج المالك الحاكم أم العرض فقط؟
هل بقي write/read path قديم يناقض الجديد؟
هل نُسخ business logic/state machine إلى Surface/shared code؟
هل Generated contract/client ما زال من المصدر الحاكم؟
هل migration/invariant يحمي الحقيقة عند concurrency/retry؟
هل success UI يقرأ persisted/canonical state؟
هل rollback/recovery يعيد invariant لا مجرد الواجهة؟
هل أزيل fallback/dual-write بعد اكتمال migration؟
```

أي workaround يخفي السبب دون إزالته = Finding.

## 23. فعالية الاختبارات

لا تكتفِ بأن الاختبار أخضر. لكل Test/Guard مهم اسأل:

```text
what exact claim does it falsify?
can it pass while the product remains broken?
does it exercise the real contract/database/runtime path?
does it cover negative/retry/concurrency/recovery risk where applicable?
was it weakened, mocked, skipped, redirected, or made non-blocking to pass?
is there a root-cause regression test when the defect is regressable?
```

اختبار لا يستطيع كشف رجوع Root Cause لا يثبت إغلاقه.

## 24. Evidence Matrix على Candidate نفسه

ابنِ المصفوفة من `governance/contracts/decision-vocabulary.json` وDelivery policy الحاليين، ولا تحفظ قائمة كأنها ثابتة إذا تغير العقد. افحص كل Evidence scope منطبق، ومن أمثلتها الحالية:

```text
static
product
runtime
visual
qa
security
finance
isolation
governance
ci
release
production
```

لكل scope سجّل:

```text
APPLICABLE | NOT_APPLICABLE_WITH_REASON
PASS | FAIL | MISSING | STALE | BLOCKED
source/command/run/artifact
candidate_sha
proof_limit
required approval owner when applicable
```

لا Scope يثبت Scope آخر. أي دليل أقدم من mutation يؤثر على claim يصبح Historical/Stale.

## 25. GitHub/CI وRepository-Platform truth

عندما يعتمد الادعاء عليها، تحقق حيًا من Candidate نفسه:

```text
candidate/head SHA
workflow runs + required checks
cancelled/superseded/older runs
review threads/reviews
branch protection/rulesets/required reviewers
merge conflicts/base/head relationship
```

CI يجب أن يخص `CANDIDATE_SHA` نفسه. tracked ruleset/workflow config يصف المرغوب ولا يثبت enforcement الحي. لا تعِد تشغيل Job فاشلًا كبديل عن تشخيص Root Cause أو Flakiness.

## 26. Protected approvals

افصل التنفيذ التقني عن الاعتمادات المنطبقة. لا يمنح المنفذ أو المراجع نفسه سلطة غير مسجلة. نجاح Validator أو CI أو Test لا يخلق Product/QA/Security/Finance/Isolation/Release/Production approval.

إذا كانت التقنية سليمة لكن approval مستقل/محميًا مفقودًا، لا تصدر `CLOSED_WITH_EVIDENCE`.

## 27. Findings

لكل Finding سجّل:

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

لا تحول تفضيل style غير مؤثر إلى Blocker.

في أوضاع التنفيذ، Finding داخلي قابل للإصلاح قبل Freeze يعيد التنفيذ. بعد Freeze أو في `REVIEW_CANDIDATE`، أي Finding يحتاج كتابة يتطلب Candidate جديدًا ولا يُصلح داخل مرحلة المراجعة.

## 28. Package closure

عند وجود `PACKAGE_PATH`، لا تعتمد كتابة `DONE/PASS` داخل الحزمة كدليل مستقل. قارن الخطة بما نُفذ فعليًا وتحقق من changed paths/resulting SHA/check results/blockers/deviations.

لا تغلق قبل ثبوت ما ينطبق:

```text
all in-scope units DONE
all required checks PASS on valid candidate-bound evidence
root causes removed
no relevant parallel truth
owners/contracts/clients/migrations aligned
writers/readers/consumers migrated
required journeys/surfaces/readbacks closed
security/negative/retry/recovery evidence when applicable
no stale evidence
no fixable in-scope defect
```

وعند توفر Shell وشروط الحزمة:

```powershell
node plans/diagnose-implementing/validate-package.mjs <PACKAGE_PATH> --strict --closure
```

Validator PASS يثبت تماسك الحزمة ضمن ما يفحصه، ولا يخلق approval محميًا.

## 29. القرار النهائي

استخدم **فقط** `governance/contracts/decision-vocabulary.json` الحالي على Candidate. لا تخترع قرارًا ولا تستخدم alias قديمًا كحقيقة جديدة.

قواعد القرار العامة:

- Scope PASS لا يعني Final Closure.
- عيب داخلي مفتوح يمنع إغلاق claim المتأثر.
- دليل مفقود أو stale لا يتحول إلى PASS.
- مانع خارجي حقيقي لا يمحو الأدلة التي نجحت في Scopes أخرى، لكنه يمنع القرار الأعلى الذي يعتمد عليه.
- `CLOSED_WITH_EVIDENCE` لا يصدر إلا عندما تنجح كل Evidence scopes والموافقات المنطبقة على **نفس immutable Candidate** بلا fail/blocked/pending وفق القاموس والسياسة الحاليين.

## 30. التقرير النهائي

```text
repository / target_ref
mode
starting_sha / candidate_sha / reviewed_range
package_or_direct_task
claimed_outcome
root_causes_fixed_or_reviewed
changed/removed/moved paths + out-of-scope diff assessment
contracts/clients/migrations/data changes
surfaces/journeys/canonical readbacks
checks with actual results + proof limits
test-effectiveness assessment
runtime/security/finance/isolation/manual evidence
Evidence Matrix + candidate binding
invalidated evidence rerun
same-candidate GitHub/CI/repository-platform evidence
findings_by_severity
commits/push result when execution mode
package strict/closure validation when applicable
remaining external blocker or missing evidence + resume point
required independent/protected reviews
final decision
```

لا تصدر ادعاء أوسع من الأدلة الفعلية. في `REVIEW_CANDIDATE` لا تعدّل المصدر مطلقًا؛ وفي أوضاع التنفيذ لا تعتبر self-review بديلًا عن independent/protected review عندما تتطلبه الحوكمة.
