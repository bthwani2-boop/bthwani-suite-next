@GitHub

**PLAN_FILE:** `<المسار الدقيق للخطة الجاهزة>`

# ABSOLUTE PURPOSE

هذا أمر تنفيذ وإغلاق فعلي فقط.

`EXECUTE_CLOSE = IMPLEMENT + MIGRATE + CUTOVER + CLEANUP + VERIFY + CLOSE`.

**هذا ليس أمر Audit/Planning جديدًا.**

الـPLAN_FILE تم إعدادها سابقًا في `AUDIT_PREPARE`.

لا تعيد بناء الخطة من الصفر.
لا تنشئ خطة بديلة.
لا تؤجل التنفيذ لإجراء Repository-Wide Audit جديد.
لا تحول EXECUTE_CLOSE إلى AUDIT_PREPARE.

القانون المطلق:

`PROVEN ACTIONABLE ROOT`
+
`KNOWN CANONICAL TARGET`
+
`KNOWN ROOT-CORRECT TREATMENT`
+
`NO MATERIAL DECISION_REQUIRED`
=
# `EXECUTE IMMEDIATELY`

الخطة هي:

`EXECUTION RECORD + PRIOR EVIDENCE + KNOWN WORK`

وليست Source of Truth ولا مكان العلاج.

> `DOCUMENTATION RECORDS THE FIX; IT MUST NEVER SUBSTITUTE FOR THE FIX.`

العلاج يجب أن يقع فعليًا في:

`Code / Contracts / Data / DB / Runtime / Config / APIs / Jobs / Events / Packages / Generated Artifacts / Infrastructure / Consumers / Surfaces / Governance when authorized`.

---

# GOVERNING AUTHORITY

استخدم حصريًا:

`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`

على **أحدث HEAD الحقيقي** للفرع المحدد.

طبّق كامل Goal-Driven FAIL-CLOSED وجميع الملفات والـFocus modules المادية التابعة له حسب الحاجة، مع أولوية التنفيذ والإغلاق.

تعامل مع:

`tools/prompting/bthwani-orchestrator/**`

كـRead-Only أثناء عمل المشروع ما لم أطلب صراحةً تعديل الـOrchestrator نفسه.

القانون:

`HIGHEST PROVEN SYSTEMIC ROOT FIRST`
+
`ACTUAL SYSTEM IS THE PLACE OF TREATMENT`
+
`COHERENT END-TO-END CUTOVER`
+
`ZERO PATCH`
+
`ZERO WORKAROUND`
+
`ZERO SILENT FALLBACK`
+
`ZERO HALF MIGRATION`
+
`ZERO UNJUSTIFIED PARALLEL TRUTH`
+
`ZERO UNJUSTIFIED REACHABLE LEGACY`
+
`ZERO DOCUMENTATION-ONLY CLOSURE`
+
`ZERO UNJUSTIFIED COMPLEXITY`.

---

# EXECUTE_CLOSE IS NOT AUDIT_PREPARE

ممنوع منعًا باتًا:

`Restart AUDIT_PREPARE`
`Rebuild the plan from zero`
`Create another master plan before executing`
`Broad repository replanning`
`Repeat already-valid discovery`
`Repeat already-valid evidence`
`Delay actionable Root merely to discover more Findings`
`Rewrite the entire Root Landscape before every treatment`
`Treat HEAD movement as automatic reason for full re-audit`
`Treat a new Finding as automatic reason to stop execution`
`Use PLAN_FILE editing as treatment`.

لا يوجد داخل EXECUTE_CLOSE:

`READY_FOR_EXECUTION`.

نحن **جاهزون للتنفيذ أصلًا** ما لم يثبت أن حقيقة حديثة أبطلت علاجًا محددًا.

---

# EXACT LIVE HEAD / DELTA-FIRST RECONCILIATION

قبل أول كتابة:

`RESOLVE EXACT REPOSITORY`
→ `RESOLVE EXACT BRANCH`
→ `FETCH LATEST HEAD`
→ `PIN EXECUTION_BASELINE`
→ `COMPARE AGAINST PLAN BASELINE`.

القانون:

`FOREIGN_DELTA = INPUT, NOT INSTRUCTION`.

إذا تغير HEAD:

لا تعيد التخطيط.

نفّذ فقط:

`DELTA`
→ `WHAT ASSUMPTION DID IT CHANGE?`
→ `WHAT ROOT/TARGET/TREATMENT/CONSUMER DOES IT AFFECT?`
→ `REVALIDATE ONLY THAT AFFECTED CONE`.

إذا لم يغير الـdelta:

`Canonical Target`
أو
`Root`
أو
`Treatment`
أو
`Blast Radius`

فابدأ التنفيذ فورًا.

إذا أثبت أنه غيّر جزءًا:
صحح الجزء المتأثر فقط ثم نفذ.

لا تعكس تغييرًا حديثًا صحيحًا.
لا تكتب فوق Foreign Work.
لا تعيد تنفيذ عمل أصبح منجزًا.
لا تعتبر Latest Commit أكثر صحة لمجرد حداثته.

---


# WORKSPACE / WRITE-OWNERSHIP HYGIENE

إذا كان التنفيذ يمر عبر Working Tree محلي، سجّل قبل أول mutation:

`Current branch/ref`
`Pre-existing tracked changes`
`Untracked changes`
`Foreign/concurrent ownership`
`Exact intended paths/symbols/hunks`.

Foreign/pre-existing change ليس ملكًا لهذا التنفيذ لمجرد وجوده في نفس الملف.

ممنوع افتراضيًا أي أمر قد يلتقط/يمسح عملًا غير مملوك، ومنها:

`git add .`
`git add -A`
`git commit -a`
`git checkout -- .`
`git restore .`
`git reset --hard`
`git clean -fd`.

الملكية تكون للـexact intended paths/hunks، لا للمجلد فقط.

# PLAN CONSUMPTION LAW

اقرأ PLAN_FILE مرة واحدة كمرجع بداية واستخرج منها:

`Known Roots`
`Ranking`
`Dependencies`
`Canonical Targets`
`Treatments`
`Blast Radii`
`Consumers`
`Migrations`
`Cutovers`
`Cleanup`
`Verification`
`Decisions`.

ثم حدد:

`HIGHEST ACTIONABLE PROVEN ROOT`.

لا تجعل تحديث PLAN_FILE شرطًا سابقًا للتنفيذ.

إذا كانت بعض صياغاتها stale بسبب أحدث HEAD:
صحح الحقيقة التنفيذية المتأثرة، ولا تعيد مرحلة التخطيط.

PLAN_FILE يمكن تحديثها أثناء التنفيذ فقط كـ:

`Execution Accounting`
`Evidence`
`Traceability`
`Root Status Record`

ولا يجوز أن يصبح تحديثها بديلًا عن التنفيذ الفعلي.

---


# CLAIM REVALIDATION — WITHOUT REPLANNING

الـOrchestrator يتطلب أن تكون الـmaterial claims المستخدمة في التنفيذ current، لكن هذا **ليس ترخيصًا لإعادة AUDIT_PREPARE**.

أعد التحقق من claims بطريقتين فقط:

1. `DELTA-INVALIDATED`: إذا غيّر HEAD/Runtime/Data/Contract assumption مادية.
2. `JUST-IN-TIME`: قبل mutation تعتمد مباشرة على claim عالية المخاطر لم يثبت بقاؤها current.

لكل claim:

`PLAN CLAIM`
→ `CURRENT EVIDENCE CHECK`
→ `VALID → REUSE`
→ `STALE/CHANGED → CORRECT AFFECTED EXECUTION ASSUMPTION`
→ `EXECUTE`.

ممنوع تحويل claim revalidation إلى Repository-Wide Replanning أو إعادة بناء الخطة من الصفر.

# IMMEDIATE EXECUTION BARRIER

بمجرد أن تكون Root:

`PROVEN`
+
`ACTIONABLE`
+
`CANONICAL TARGET KNOWN`
+
`ROOT-CORRECT TREATMENT KNOWN`
+
`NO DECISION_REQUIRED`

يُمنع مواصلة Broad Audit قبل تنفيذها.

يسمح فقط بـ:

`Minimum Necessary Evidence`

اللازمة لجعل الـwrite الحالي آمنًا وكاملًا.

القانون:

# `PROVEN ROOT = EXECUTION BARRIER`.

---

# MANDATORY ROOT EXECUTION LOOP

نفّذ تلقائيًا:

`HIGHEST ACTIONABLE PROVEN ROOT`
→ `CONFIRM CANONICAL TARGET`
→ **`IMPLEMENT ROOT-CORRECT TREATMENT NOW`**
→ `MIGRATE ALL MATERIAL WRITERS`
→ `MIGRATE ALL MATERIAL READERS`
→ `MIGRATE ALL MATERIAL CONSUMERS`
→ `MIGRATE CONTRACTS`
→ `MIGRATE DATA/DB`
→ `MIGRATE GENERATED ARTIFACTS`
→ `MIGRATE CONFIG/RUNTIME`
→ `CANONICAL CUTOVER`
→ `REMOVE SUPERSEDED PATHS`
→ `CLEANUP/DELETE`
→ `TARGETED VERIFICATION`
→ `SYSTEM/JOURNEY VERIFICATION AS REQUIRED`
→ `PIN CANDIDATE`
→ `AFFECTED-CONE RECHECK`
→ `CLASSIFY NEW EVIDENCE`
→ `RE-RANK EXECUTABLE ROOTS`
→ `NEXT ROOT`
→ `REPEAT`
→ `FINAL EXACT-CANDIDATE VERIFICATION`
→ `FINAL NEGATIVE-SPACE + ADVERSARIAL CHECK`
→ `CLOSE`.

لا تتوقف لأن:
`PLAN_FILE انتهت`
أو
`Build نجح`
أو
`Test نجح`
أو
`العرض اختفى`
أو
`Commit تم`.

استمر حتى الإغلاق الحقيقي.

---

# NEW FINDINGS DURING EXECUTION

Finding جديدة لا تعني عودة إلى التخطيط.

صنفها فورًا:

## A. `DESCENDANT / SAME ROOT`

إذا كانت نتيجة أو descendant للجذر الحالي:

→ ضمها إلى نفس Root treatment
→ عالجها الآن
→ لا تغلق Root قبلها.

## B. `MISSING CONSUMER / MIGRATION / CLEANUP`

إذا كشفت Consumer أو Writer أو Reader أو Contract أو Data migration أو cleanup مفقودًا:

→ هذا جزء من Blast Radius الحالي
→ نفذه الآن.

## C. `INDEPENDENT ROOT`

إذا كانت Root مستقلة:

→ سجلها
→ Rank
→ نفذها عند وصولها لأعلى executable priority.

لا توقف Root الحالية بلا dependency حقيقية.

## D. `HIGHER PARENT ROOT`

إذا أثبتت Finding جديدة Root أعلى تجعل العلاج الحالي خاطئًا أو ناقصًا جذريًا:

→ STOP affected lower cone only
→ preserve valid work/evidence
→ promote higher Root
→ execute it
→ migrate/cutover/verify
→ resume descendants.

## E. `TRUE DECISION_REQUIRED`

إذا ظهر قرار Product/Business/Semantic/Architectural غير قابل للاشتقاق:

→ أوقف dependent cone فقط.

اعرض:

`المشكلة`
+
`ما الذي يحتاج حسمًا`
+
`الخيارات`
+
`توصيتك`
+
`السبب`
+
`أثر/مخاطر كل خيار`.

ثم استمر في كل Root مستقلة لا تعتمد على القرار.

ممنوع:

`NEW FINDING → NEW AUDIT_PREPARE → NEW MASTER PLAN`.

---

# HIGHEST ROOT / PREEMPTION LAW

لا تعالج symptoms متسلسلة إذا أثبتت Root أعلى.

إذا بدأت تظهر أخطاء متعددة ذات causal parent مشترك:

`STOP DESCENDANT PATCHING`
→ `PROMOTE PARENT ROOT`
→ `CORRECT OWNER/TARGET`
→ `EXECUTE ROOT`
→ `LET DESCENDANTS COLLAPSE`
→ `VERIFY`.

لكن لا تستخدم احتمال وجود Root أعلى كذريعة لعدم تنفيذ Root مثبتة.

يجب أن يكون Higher Root **مثبتًا بأدلة** ويمكنه تغيير العلاج الحالي.

---

# MAXIMUM-SAFE PARALLEL EXECUTION

استخدم أقصى توازي آمن.

قسّم التوازي حسب **Coherent Root Cause** لا حسب الملفات أو اللغات أو frontend/backend.

كل worker يملك Root كاملة عبر ما يلزم من:

`Authority`
`Contracts`
`Data`
`Backend`
`Frontend`
`Runtime`
`Consumers`
`Migration`
`Cleanup`
`Verification`.

يجوز تنفيذ Rootين بالتوازي فقط إذا ثبت:

`NO unresolved causal dependency`
AND
`NO conflicting canonical authority`
AND
`NO unsafe write overlap`
AND
`NO ordered shared migration/cutover`
AND
`NO evidence dependency requiring sequence`.

يجب أن تبقى:

`ONE CANONICAL INTEGRATION AUTHORITY`

لـ:

`Live HEAD`
`Root Landscape`
`Ranking`
`Shared Authority`
`Collision Resolution`
`Integration`
`Candidates`
`Closure`.

عند انتهاء Root:

`VERIFY`
→ `RECONCILE`
→ `UPDATE EXECUTABLE FRONTIER`
→ `IMMEDIATELY REFILL SAFE CAPACITY`.

ممنوع انتظار Workers غير مرتبطة.

ممنوع duplicated work.

`VALID EVIDENCE → REUSE`.
`INVALIDATED EVIDENCE → RECHECK AFFECTED PART ONLY`.

---

# ROOT-CORRECTNESS

لكل Root نفذ العلاج عند **صاحب الحقيقة الحقيقي**.

أثبت قبل mutation:

`Observed Failure`
→ `Causal Chain`
→ `Highest Proven Root`
→ `Correct Owner`
→ `Canonical Target`
→ `Treatment`
→ `Blast Radius`.

القوانين:

`ONE DURABLE FACT = ONE CANONICAL OWNER`
`ONE AUTHORITATIVE WRITE PATH`
`PROJECTION ≠ AUTHORITY`
`CACHE ≠ AUTHORITY`
`FRONTEND STATE ≠ BUSINESS AUTHORITY`
`CURRENT CODE ≠ PRODUCT TRUTH`
`LOCAL FIX ≠ SYSTEM FIX`
`ONE SURFACE PASS ≠ END-TO-END PASS`.

ممنوع إنشاء Source of Truth ثانية.

---

# EFFECTIVE BLAST RADIUS

كل معالجة يجب أن تصل حسب الحاجة إلى كامل:

`Owners`
`Writers`
`Readers`
`Consumers`
`States`
`Transitions`
`Invariants`
`Contracts`
`APIs`
`Events`
`Jobs`
`Data`
`DB`
`Migrations`
`Runtime`
`Config`
`Packages`
`Exports`
`Generated Artifacts`
`Infrastructure`
`CI`
`Security Boundaries`
`Surfaces`
`Governance Impact`.

لا تحذف القديم قبل ترحيل كل material consumer.

`CANONICAL CHANGE WITHOUT ALL MATERIAL CONSUMERS MIGRATED = INCOMPLETE`.

تعطل App/Service/Journey متأثرة يعني أن Root ما زالت `OPEN`.

---

# ABSOLUTELY FORBIDDEN TREATMENTS

ممنوع:

`Patch`
`Workaround`
`Silent Fallback`
`Symptom Fix`
`Half Migration`
`Partial Cutover`
`Dual Write`
`Dual Authority`
`Parallel Truth`
`Permanent Compatibility Shim`
`Implicit First-Match`
`First Store/User/Provider Fallback`
`Swallowing Errors`
`Unavailable → Blocked conversion`
`Legacy preservation without proven requirement`
`Comment/Doc-only Fix`
`Status-file-only Closure`
`Test-only Fix`
`Guard-only Fix when source remains wrong`.

إذا كان الاختبار أو guard يعكس Architecture قديمة:
صحح Architecture والاختبار/guard، لا تعيد Architecture القديمة فقط لإرضائه.

---


# TEMPORARY COMPATIBILITY — ONLY WHEN PROVEN NECESSARY

الـPermanent Compatibility Shim غير مبرر ممنوع، لكن compatibility مؤقتة قد تكون صحيحة فقط عند **حاجة mixed-version/rollout حقيقية مثبتة**.

عندها يجب أن يكون لها:

`ONE semantic authority`
`Explicit scope`
`Owner`
`Consumer list`
`Observability`
`Negative/failure behavior`
`Expiry/removal condition`
`Cutover proof`.

Convenience أو الخوف من الحذف ليسا Compatibility Requirement.
عند انتهاء الشرط، أزل المسار المؤقت ضمن نفس closure lifecycle.

# ROOT-CORRECTNESS + SIMPLICITY + CONTINUITY

اختر **أبسط تصميم مثبت الصحة** الذي يحافظ على:

`Product Semantics`
`Invariants`
`Security`
`Authorization`
`Isolation`
`Reliability`
`Data Integrity`
`Financial Integrity`
`Performance`
`Operational Continuity`.

القوانين:

`WORKING ≠ JUSTIFIED`
`COMPLEX ≠ ROBUST`
`MORE ABSTRACTION ≠ MORE CORRECT`
`MORE FILES ≠ MORE MAINTAINABLE`.

بسّط/ادمج/انقل/احذف:

`Layers`
`Wrappers`
`Aliases`
`States`
`Configs`
`Packages`
`Dependencies`
`Scripts`
`Files`
`Folders`

إذا لم يكن لها:

`Necessary Purpose`
+
`Correct Owner`
+
`Real Consumer`
+
`Current Requirement`
+
`Proven Value`
+
`Correct Placement`.

التبسيط لا يبرر Regression أو Partial Migration.

---

# GOVERNANCE FAIL-CLOSED

أدخل:

`governance/**`

دائمًا في Impact Analysis عندما يكون مرتبطًا بالنطاق.

لكن:

`GOVERNANCE ≠ AUTOMATIC TRUTH`
`CURRENT CODE ≠ GOVERNANCE UPDATE AUTHORITY`
`UNCERTAINTY = NO GOVERNANCE WRITE`.

ممنوع:

`UPDATE`
`ADD`
`DELETE`
`MERGE`
`MOVE`
`RENAME`
`RESTRUCTURE`

Governance قبل إثبات:

`Canonical Product/System Truth`
+
`Root Cause`
+
`Impact`
+
`Blast Radius`
+
`No material DECISION_REQUIRED`.

وإلا:

`EVIDENCE/HOLD`
أو
`DECISION_REQUIRED`.

لا تعدّل Governance فقط لتطابق implementation موجودة.


عندما يثبت أن العلاج يغيّر Product/System semantics أو authority/journey/state/data/API ownership، الترتيب الصحيح هو:

`IMPLEMENT SYSTEM CHANGE`
→ `PROVE BEHAVIOR/RUNTIME`
→ `ANALYZE GOVERNANCE IMPACT`
→ `RECONCILE ONLY AUTHORIZED AFFECTED GOVERNANCE`
→ `CROSS-CHECK GOVERNANCE ↔ SYSTEM`.

ممنوع تحديث Governance لوصف ideal لم يُنفذ بعد.

---

# CLEANUP & FINISHING — ZERO TOLERANCE

Cleanup جزء من العلاج الحالي، وليس backlog لاحقًا.

نفذ التشطيب عبر:

`line`
→ `branch`
→ `function`
→ `symbol`
→ `file`
→ `file-group`
→ `folder`
→ `module/package`
→ `service/surface`
→ `domain`
→ `affected system cone`.

لا تترك داخل الـBlast Radius:

`Dead`
`Stale`
`Duplicate`
`Legacy`
`Unused`
`Orphan`
`Misplaced`
`Incorrectly Named`
`Deprecated`
`Shadow Authority`
`Parallel Path`
`Old Import`
`Old Export`
`Old Reference`
`Alias without value`
`TODO`
`FIXME`
`HACK`
`Fallback`
`Workaround`
`Temporary Compatibility`
`Obsolete Config`
`Obsolete Script`
`Unused Dependency`
`Stale Doc`
`Orphan File`
`Orphan Folder`.

كل عنصر متأثر يجب أن يثبت:

`Necessary Purpose + Correct Owner + Real Consumer + Current Requirement + Proven Value + Correct Placement`.

وإلا:

`SIMPLIFY / MERGE / MOVE / RENAME / REPLACE / DELETE`

بعد إثبات الأثر.

ممنوع:
`cleanup later`.

---


# PROTECTED / IRREVERSIBLE ACTION GATE

قبل أي عملية مادية غير قابلة للعكس أو عالية الخطورة مثل:

`Production data mutation`
`Destructive backfill`
`Secret/key rotation`
`External financial/provider mutation`
`Release/Deploy/Merge/Tag`
`Infrastructure destruction`

أثبت أولًا:

`Current authority`
`Exact target/environment`
`Exact scope`
`Candidate/change binding`
`Rollback/compensation where possible`
`Post-action verification/readback`
`Required human/safety authorization`.

لا تنفذ destructive/high-risk action اعتمادًا على plan قديمة أو environment مفترضة.

# DATA / DB / MIGRATION CLOSURE

إذا كانت Root تمس Data/DB:

لا يكفي تعديل code.

أثبت:

`Schema`
`Migration ordering`
`Historical data`
`Backfill/reconciliation`
`Idempotency`
`Constraints`
`Writer ownership`
`Reader migration`
`Rollback/compensation semantics where relevant`
`No orphan records`
`No duplicate truth`
`No unintended data loss`.

للمالية خاصةً:
لا إغلاق دون إثبات:

`Single financial authority`
`Ledger integrity`
`No legacy financial writer`
`No double posting`
`No orphan/unreconciled financial state`
`Correct reversal/refund/settlement semantics`

بقدر ما يقع ضمن الـRoot.

---

# CONTRACT / GENERATED GRAPH CLOSURE

إذا تغير Contract:

يجب أن تتقارب في نفس cutover:

`Runtime behavior`
`OpenAPI/schema`
`Types`
`Generated clients`
`Package exports`
`Package dependencies`
`Lockfile`
`Consumers`
`Tests`
`Capability maps`
`Contract guards`.

ممنوع ترك runtime صحيح وcontract قديم، أو manifest صحيح وlockfile قديم.

---

# SECURITY / AUTHORIZATION / ISOLATION

أي Root تمس identity/permissions/scopes/context/security يجب التحقق من:

`Authentication`
`Authoritative Identity Context`
`Authorization`
`Role`
`Permission`
`Actor/Tenant isolation`
`Object ownership`
`IDOR`
`Caller-supplied authority spoofing`
`Privilege escalation`
`Cross-context leakage`
`Failure closed semantics`.

لا تستخدم caller-supplied headers كAuthority إذا كانت الحقيقة يجب أن تأتي من session/Identity.

---

# FAILURE / UNAVAILABLE / RECOVERY

فرّق بوضوح بين:

`BUSINESS BLOCKED`
`DEPENDENCY UNAVAILABLE`
`SYSTEM ERROR`
`NOT CONFIGURED`
`NOT AUTHORIZED`.

Dependency outage لا يصبح Business Block.

لا تخفِ failure خلف fallback صامت.

إذا كانت UI/consumer متأثرة:
أثبت:

`Loading`
`Success`
`Business denial`
`Unavailable`
`Malformed response`
`Stale state`
`Retry`
`Recovery`

بحسب الحاجة.

---

# VERIFICATION — CLAIM-APPROPRIATE

لا تستخدم اختبارًا واحدًا كإغلاق شامل.

طبّق حسب الـRoot:

`Focused Tests`
`Unit`
`Integration`
`Contract`
`Generated Drift`
`Typecheck`
`Build`
`DB`
`Migration`
`Runtime`
`Smoke`
`Journey`
`Positive`
`Negative`
`Failure`
`Recovery`
`Security`
`Authorization`
`IDOR`
`Isolation`
`Adversarial`
`Negative Space`
`CI`
`Native/Device evidence`.

كل Claim تحتاج evidence تناسبها.

`BUILD PASS ≠ SYSTEM PASS`
`TEST PASS ≠ ROOT CLOSED`
`COMMIT EXISTS ≠ VERIFIED CANDIDATE`.

أي verification غير ممكن بسبب environment/external dependency:
سجله بصدق ولا تختلق PASS.

---


# TEST / GUARD / FIXTURE INTEGRITY

Tests/guards يجب أن تثبت الـCanonical Semantics، لا أن تعيد تعريفها لتجعل التنفيذ أخضر.

ممنوع:

`Weaken/remove valid test`
`Change expected behavior to match wrong implementation`
`Skip/disable/silence required failure`
`Treat mock/fixture as final proof of real runtime claim`
`Restore obsolete architecture solely to satisfy stale test/guard`.

الصحيح:

`PROVE SEMANTICS`
→ `FIX IMPLEMENTATION`
→ `UPDATE/ADD REGRESSION EVIDENCE`
→ `IF TEST/GUARD CHANGED, PROVE IT STILL FALSIFIES THE BROKEN BEHAVIOR`.

# EXECUTION PERFORMANCE

التنفيذ العميق لا يعني البطء غير المبرر.

استخدم:

`Delta-first reconciliation`
`Evidence reuse`
`Affected-cone rechecks`
`Maximum-safe parallelism`
`No duplicate build`
`No duplicate runtime bootstrap`
`No duplicate audit`
`No duplicate worker`
`Continuous scheduling`
`Highest-root-first`
`Minimum Necessary Complexity`.

السرعة لا تأتي عبر:

`Skipped consumers`
`Weaker proof`
`Partial migration`
`Symptom fix`.

لكن أيضًا لا تكرر build/runtime/audit مكلفًا إذا كان لديك دليل صالح لم تتغير assumptions الخاصة به.


إذا كانت الـRoot نفسها Performance/CI/Tooling/Orchestration root، فلا يكفي أن يصبح الكود أقصر أو command تبدو أسرع. أثبت:

`COMPARABLE BASELINE BEFORE`
→ `TRACE COST ROOT / FAN-OUT / I/O / NETWORK / BUILDS / SCANS`
→ `TREAT ROOT`
→ `VERIFY REQUIRED ASSURANCE WAS NOT WEAKENED`
→ `MEASURE SAME SCENARIO AFTER`
→ `PROVE COST WAS NOT MERELY SHIFTED ELSEWHERE`.

---


# ATOMIC GITHUB / MULTI-FILE WRITE + BRANCH-RACE SAFETY

عند الكتابة عبر GitHub/API لعدة ملفات مرتبطة في Root واحدة، لا تعتمد على per-file content SHA كأنه branch-head compare-and-swap.

فضّل عند توفر capability:

`RESOLVE LATEST HEAD`
→ `CREATE BLOBS/TREE AGAINST EXACT BASE TREE`
→ `CREATE ONE COHERENT COMMIT WITH EXACT EXPECTED PARENT`
→ `RE-RESOLVE TARGET REF`
→ `NON-FORCE FAST-FORWARD REF UPDATE`.

إذا تحرك target ref:

`DO NOT OVERWRITE`
→ `RE-RESOLVE`
→ `CLASSIFY FOREIGN DELTA`
→ `RECONCILE`
→ `REBUILD ONLY AFFECTED CANDIDATE`
→ `REVERIFY INVALIDATED EVIDENCE`.

لا تستخدم Force لإجبار Candidate قديمة فوق HEAD أحدث.
Partial multi-file write ليس Closure؛ أكمله أو reconcile بأمان.

# COMMIT / CANDIDATE DISCIPLINE

لا تترك Root معالجة فعليًا في Working Tree بلا تثبيت مناسب دون سبب.

بعد إغلاق Root أو coherent root-set:

`RE-PIN LIVE HEAD`
→ `RECONCILE FOREIGN DELTA`
→ `INSPECT EXACT DIFF`
→ `VERIFY INTENDED FILE INVENTORY`
→ `COMMIT COHERENT CHANGE`
→ `PIN IMPLEMENTATION CANDIDATE`.

ممنوع:

`git add .`

بصورة عمياء.

اعرف ما يتم تثبيته:

`Implementation`
`Contracts`
`Generated`
`Migration`
`Cleanup deletion`
`Tests`
`Record-only changes`.

لا تخلط تغييرات unrelated في Candidate واحدة دون سبب.

Commit existence ليس Closure.

---

# AFFECTED-CONE RECHECK — NOT REPLANNING

بعد كل Root:

نفّذ:

`RE-AUDIT`
`RE-INSPECT`
`RE-DIAGNOSE`
`RE-ANALYZE`

**للـaffected cone فقط** بالقدر الذي يثبت:

1. العلاج أغلق Root.
2. لا يوجد Missing Consumer.
3. لا توجد Parallel Truth.
4. لا يوجد Regression.
5. لم يظهر Higher Root يغير العلاج.
6. Cleanup مكتمل.

هذا Recheck للتحقق والتكيف، **وليس إعادة AUDIT_PREPARE**.

إذا ظهرت Root جديدة:
صنفها وفق قانون New Findings ثم نفذها.

---


# RUNTIME FRESHNESS / PROVENANCE

أي Runtime proof غير صالح إذا كان stale process/code/data يمكن أن يكون مصدره.

أثبت بحسب الحاجة:

`Source/Candidate identity`
`Artifact/Image/Bundle identity`
`Process/Container freshness`
`Schema/Migration level`
`Seed/Fixture provenance`
`Endpoint/Profile/Config`
`Canonical post-state readback`.

Screenshot/API response/smoke بلا provenance كافية لا يثبت Claim عالية المخاطر.

# REPOSITORY-PLATFORM TRUTH + REVIEW PROVENANCE

عندما تعتمد Claim على GitHub/live repository state، تحقق من الحقيقة الحية المرتبطة بالـexact candidate، لا من YAML tracked فقط.

افحص عند الحاجة:

`Workflow runs bound to candidate SHA`
`Required/expected checks + status contexts`
`Pending/missing/failed/cancelled/superseded/stale runs`
`Rulesets / branch protection / repository settings`
`PR reviews / unresolved review threads when policy requires`
`Candidate reachability/base/mergeability when claimed`
`CodeQL/Sonar/dependency/security gates when materially relied upon`.

`TRACKED WORKFLOW CONFIG ≠ LIVE ENFORCEMENT`.
`ABSENCE OF RED ≠ PASS WHEN REQUIRED CHECK IS MISSING/PENDING/STALE`.

`SELF_REVIEW ≠ INDEPENDENT_REVIEW`.
إذا كانت policy/risk تتطلب Independent Review، أثبت reviewer provenance وربطها بالـexact candidate. وإذا غيّر reviewer الـcandidate، فالمراجعة السابقة لا تثبت الـcandidate الجديدة.

# EXTERNAL RESEARCH / CAPABILITY DISCIPLINE DURING EXECUTION

إذا ظهرت أثناء التنفيذ فجوة تقنية/Platform/Library/Protocol/Security material لا يمكن حسمها من الحقيقة الداخلية، استخدم المصادر الرسمية/الأولية المناسبة قبل التخمين أو إنشاء workaround.

External evidence لا تخترع BThwani Product Truth.

لكل claim عالية الأهمية:

`CLAIM → REQUIRED EVIDENCE → REQUIRED CAPABILITY → AVAILABLE? → ACQUIRE → PROOF LIMIT`.

`MISSING REQUIRED CAPABILITY ≠ PASS`.
إذا كانت capability خارجية مطلوبة للإغلاق وغير متاحة، استخدم `EXTERNAL_BLOCKER` مع exact evidence + unblock/acquisition path.

# CLOSURE — FAIL CLOSED

لا تعلن `CLOSED` إذا بقي داخل **النطاق المادي المثبت** أي:

`Root`
`Finding`
`Decision`
`Dependency`
`Writer`
`Reader`
`Consumer`
`Migration`
`Cutover`
`Regression`
`Cleanup`
`Verification`
`Governance Drift`
`Legacy`
`Parallel Truth`
`Unjustified Complexity`
`Security Gap`
`Data Gap`
`Runtime Gap`

غير مغلق أو غير مثبت.

استخدم vocabulary الحالة المتوافقة مع الـOrchestrator:

`OPEN | EVIDENCE/HOLD | FIXED_PENDING_VERIFY | PROVEN_CLOSED | NOT_APPLICABLE_WITH_PROOF`.

ولا يُسمح بالإغلاق النهائي إلا عندما تصبح العناصر المادية `PROVEN_CLOSED` أو `NOT_APPLICABLE_WITH_PROOF`.

وإذا كانت حقيقة مطلوبة لا يمكن إثباتها بسبب dependency خارجية حقيقية:

`EXTERNAL_BLOCKER` مع exact evidence + acquisition/unblock path

ولا تدّع `CLOSED` فوقها إذا كانت Material Closure Gate.

لكن لا تستخدم Closure requirements كسبب لفتح Repository-Wide Planning غير مرتبط بالـOBJECTIVE والـBlast Radius.

---

# FINAL CANDIDATE

بعد آخر Root:

`FINISH ALL MATERIAL MIGRATION`
→ `FINISH ZERO-TOLERANCE CLEANUP`
→ `RE-PIN LATEST HEAD`
→ `VERIFY FINAL DIFF`
→ `PIN FINAL_IMPLEMENTATION_CANDIDATE`
→ `RUN EXACT-CANDIDATE VERIFICATION`.

عندما يكون runtime provenance ماديًا:
أثبت أن:

`Source SHA`
`Runtime`
`Container/Image`
`Migration Ledger`
`Generated Artifacts`
`CI`

تخص الـcandidate الصحيحة.

لا تستخدم Evidence من SHA أقدم لإغلاق SHA أحدث.

---

# PLAN_FILE RETIREMENT

لا تحذف PLAN_FILE أثناء التنفيذ لمجرد أن البنود نُفذت.

احتفظ بها كTemporary Execution Record حتى إثبات الإغلاق الكامل.

بعد أن تصبح جميع Root/Findings المادية:

`PROVEN_CLOSED`
أو
`NOT_APPLICABLE_WITH_PROOF`

ويكتمل exact-candidate verification:

احذف PLAN_FILE كـ**آخر Record cleanup**.

بعد حذفها:

`PIN NEW FINAL CANDIDATE`

لأن الحذف نفسه غير SHA.

ثم نفّذ Final Read-Only على SHA النهائي.

---

# FINAL READ-ONLY CLOSURE GATE

نفّذ أخيرًا:

`Audit`
+
`Inspect`
+
`Diagnose`
+
`Analyze`
+
`Negative Space`
+
`Adversarial Re-check`

على الـFINAL_CANDIDATE.

هذه **بوابة تحقق فقط وليست مرحلة تخطيط جديدة**.

ابحث خصوصًا عن:

`Reachable legacy`
`Parallel writer`
`Parallel truth`
`Missing consumer`
`Stale contract`
`Generated drift`
`Dead leftovers`
`Fallback/workaround`
`Regression`
`Security gap`
`Data/runtime mismatch`.

إذا كشف الـFinal Read-Only بعد حذف PLAN_FILE عن Root مادية جديدة:

→ `CLOSURE REVOKED`
→ أعد إنشاء/استعادة **نفس Temporary Execution Record** كـaccounting/traceability قبل أي mutation لاحقة، وفق lifecycle الـOrchestrator
→ لا تبدأ AUDIT_PREPARE ولا تنشئ Master Plan جديدة
→ صنف Root الجديدة
→ نفذ العلاج مباشرة وفق EXECUTE_CLOSE
→ verify
→ عندما يثبت الإغلاق، احذف Temporary Record مرة أخرى كآخر intended project write
→ pin candidate جديدة
→ repeat final gate.

إعادة الـTemporary Execution Record هنا ليست replanning؛ هي استعادة سجل التنفيذ المطلوب بعد أن أثبت الـfinal gate أن الإغلاق السابق غير صالح.

إذا لم يظهر شيء مادي:

أعلن:

`EXECUTE_CLOSE: CLOSED`
`FINAL_CANDIDATE: <SHA>`
`PLAN_FILE: RETIRED`
`ALL MATERIAL ROOTS: PROVEN_CLOSED | NOT_APPLICABLE_WITH_PROOF`

وقدّم خلاصة نهائية تتضمن:

- ما عولج فعليًا.
- Root Causes التي أغلقت.
- Canonical Cutovers التي تمت.
- Legacy/Parallel paths التي حُذفت.
- Migrations/Data work.
- Consumers migrated.
- Cleanup.
- Verification evidence.
- Runtime/DB/CI/Native disposition.
- Final SHA.
- أي External evidence غير مادية للإغلاق إن وجدت.

ولا تستخدم كلمة `CLOSED` إلا إذا أثبتت ذلك فعليًا.
