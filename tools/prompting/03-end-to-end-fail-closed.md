# أمر تنفيذ إلزامي — إغلاق جذري نهائي End-to-End / FAIL-CLOSED

Status: DERIVED_SUPPORT

## 0) القاعدة الحاكمة

**على نطاق تنفيذي محسوم وقابل للتنفيذ، ابدأ التنفيذ فورًا واستمر حتى الإغلاق الكامل لكل ما يقع ضمن نطاق المهمة.**

الحالة الافتراضية دائمًا:

**OPEN**

ولا يجوز إعلان:

**DONE**

إلا بعد إثبات أن التنفيذ من **أحدث رأس فعلي بعد آخر تعديل وتنظيف وتشطيب وإعادة هيكلة** قد أصبح صحيحًا وكاملًا ومتكاملًا ومختبرًا ومنظمًا ونظيفًا ومستقرًا، ولا توجد داخله مشكلة معلومة قابلة للمعالجة.

### قاعدة الإثبات

**غير مُثبت = غير مغلق.**
**غير مختبر = غير مغلق.**
**معلوم ولم يُعالج = غير مغلق.**
**متبقٍ وقابل للتنفيذ = غير مغلق.**
**قرار جوهري لازم للتنفيذ وغير محسوم = غير مغلق.**

لا يجوز استنتاج النجاح من غياب الخطأ فقط؛ يجب وجود **دليل تحقق إيجابي حديث** على النتيجة المطلوبة.

### 0.1) حقيقة المصادر — الخطط والمسودات ليست كودًا حيًا

هذا الملف نفسه Prompt مشتق، وليس Source of Truth للمنتج أو التنفيذ أو Runtime.

تعامل مع:

```text
plans/**
plans/diagnose-implementing/**
Prompts
Reports
Historical docs/statuses
```

باعتبارها **DERIVED/HISTORICAL SUPPORT** قد تكون مفيدة لفهم النية والسياق والفرضيات، لكنها قد تكون ناقصة أو قديمة أو متناقضة أو خاطئة، وليست:

```text
live code
implementation truth
runtime truth
proof of execution
proof of PASS/DONE
canonical product truth
```

**ممنوع نسخ أو اعتماد Claim أو تصميم أو حالة PASS/DONE أو افتراض من مسودة/خطة تلقائيًا.** تحقّق من كل ادعاء مادي مقابل أحدث:

```text
Authority / Product Truth
Code
Contracts / Schemas / Registries
Configuration / Environment definitions
Data / Migrations
Tests / CI definitions
Runtime Path
Actual Behavior / Persisted Readback
```

عند التعارض:

```text
higher-authority/current live evidence wins
→ سجل التناقض كFinding
→ لا تورّث المسودة القديمة إلى التنفيذ
```

### 0.2) إذا لم يكن النطاق أو القرار محسومًا فلا تخمّن

إذا استُخدم هذا الأمر مباشرة وظهر نقص فهم أو قرار منتجي/وظيفي/معماري/سياساتي جوهري لا يمكن حسمه من الأدلة:

```text
DERIVABLE FACT → استخرجه بنفسك ولا تسأل.
TRUE DECISION GAP → OPEN؛ لا تخمّن ولا تنفذ الجزء المتأثر.
```

اطرح فقط استفسارات القرار الحقيقية غير القابلة للاشتقاق، بعد دمج المتشابه وإزالة التكرار، ولكل سؤال:

```text
القرار المطلوب
سبب عدم إمكان حسمه من الأدلة
خيارات واضحة ومتمايزة
التوصية الأفضل
سبب التوصية
أثر/مقايضات كل خيار
```

ثم أعد دورة التشخيص حتى تصبح القرارات اللازمة للتنفيذ محسومة. وجود أسئلة كثيرة ليس هدفًا؛ الهدف **صفر أسئلة مكررة وصفر قرار جوهري مخفي وراء افتراض**.

### 0.3) اكتشاف واستخدام قدرات Codex الملائمة

**اكتشف واستخدم إلزاميًا وتلقائيًا جميع قدرات وأدوات وإضافات وتكاملات Codex المتاحة والملائمة للمهمة** عندما يمكنها تحسين التشخيص أو التنفيذ أو مراجعة الكود أو تحليل العلاقات/المعمارية/الاعتماديات أو الأمن أو الاختبارات أو التحقق أو الإغلاق.

عند وجود Skill/Plugin ملائم، اقرأ تعليماته الفعلية واستخدمه ضمن السلطة والنطاق. لا تهمل Capability ملائمة، ولا تستخدم أدوات غير مرتبطة لمجرد توفرها، ولا تدّع استخدام أداة أو Validator أو Test لم يُنفذ.

المبدأ:

```text
USE EVERYTHING APPLICABLE.
DO NOT USE EVERYTHING BLINDLY.
TOOL AVAILABLE ≠ TOOL ACTUALLY USED.
```

---

# 1) لا تتوقف عند الأعراض — أصلح السبب الجذري

لكل خلل أو فجوة طبّق إلزاميًا:

**Detect**
**→ Reproduce/Confirm**
**→ Root Cause**
**→ Blast Radius**
**→ Source of Failure**
**→ Root Fix**
**→ معالجة المستهلكين والآثار**
**→ Cleanup/Refactor**
**→ Verification**
**→ Regression Check**

ممنوع الاكتفاء بإخفاء العرض أو جعل الاختبار يمر دون إزالة السبب الحقيقي.

إذا كان Root Cause موجودًا في:

- Architecture.
- Design.
- Data Model.
- Schema.
- Contract.
- Ownership.
- Responsibility Distribution.
- State Model.
- Permissions Model.
- Integration Boundary.
- Abstraction.
- Dependency Direction.
- Source of Truth.
- Legacy Design.

فنفّذ ما يلزم من:

**Refactor / Redesign / Rebuild**

ولا تحافظ على تصميم خاطئ لمجرد تقليل حجم التغيير أو الـdiff.

المعيار:

**أصح حل جذري، بأبسط بنية صحيحة، وليس أصغر Patch ممكن.**

**إذا كان الإغلاق الصحيح يتطلب إعادة هيكلة جزئية أو شاملة، إعادة تصميم، نقل المسؤوليات، تغيير الحدود المعمارية، إعادة بناء مكوّن، أو إزالة التنفيذ القديم بالكامل، فذلك إلزامي وليس اختياريًا. ممنوع استخدام Patch أو Workaround أو Compatibility Layer أو تعديل موضعي للإبقاء على بنية ثبت أنها سبب الخلل. المطلوب إزالة Root Cause من المصدر، إنهاء المسار القديم غير الصحيح، ترحيل جميع المستهلكين والاعتماديات المتأثرة إلى البنية الصحيحة، ثم إثبات الإغلاق النهائي End-to-End على التنفيذ النهائي دون ترقيعات أو مسارات موازية مؤقتة.**

---

# 2) صفر تساهل مع الخلل المعلوم

وجود أي من التالي داخل نطاق المهمة يمنع DONE:

- خطأ.
- Gap.
- Regression.
- تناقض.
- منطق ناقص.
- حالة غير معالجة.
- سلوك غير محسوم.
- مسار مكسور.
- عقد غير متطابق.
- Integration ناقص.
- Binding ناقص.
- صلاحيات أو Security غير صحيحة.
- Data/State inconsistency.
- Transaction أو Concurrency defect.
- Race condition.
- Silent failure.
- Hidden fallback.
- خطأ Runtime أو Configuration.
- dependency خاطئة أو غير ضرورية.
- duplication غير مبرر.
- dead code.
- stale code.
- legacy residue.
- orphan reference.
- technical noise جوهري.
- naming أو placement مضلل.
- source of truth مكرر.
- TODO / FIXME / HACK مرتبط بالنطاق.
- workaround أو bypass.
- compatibility layer غير مبررة.
- technical debt معلوم يمكن حسمه داخل النطاق.
- أثر جانبي معلوم.
- عمل متبقٍ معلوم قابل للتنفيذ.
- قرار جوهري مطلوب للإغلاق وغير محسوم.
- اعتماد على Plan/Draft كحقيقة دون تحقق حي.

### ممنوع قطعًا

**التجاهل، التأجيل، الالتفاف، الترقيع، masking، bypass، workaround يخفي السبب، fallback يخفي failure، تعطيل الاختبارات، إسكات التحذيرات الجوهرية، تخفيف شروط النجاح، false positive، اعتبار partial success نجاحًا، تخمين قرار جوهري، توريث PASS/DONE تاريخي كدليل حالي، أو إخراج مشكلة مرتبطة فعليًا بالمهمة من النطاق للتهرب من إصلاحها.**

---

# 3) اضبط النطاق بالـBlast Radius الحقيقي

لا توسّع المهمة إلى أجزاء غير مرتبطة بها، ولا تضيقها لتجنب إصلاح أثر حقيقي.

النطاق الفعلي يحدد بواسطة:

**Root Cause + Blast Radius + Consumers + Dependencies + Contracts + Data Flow + Runtime Path**

أي مكوّن خارج الوصف الأولي للمهمة لكنه متأثر مباشرة بالخلل أو مطلوب لإكمال المسار End-to-End يصبح جزءًا من نطاق المعالجة.

وأي مكوّن لا يملك ارتباطًا فعليًا بالمهمة لا يُغيّر لمجرد الرغبة في التنظيف العام.

اسم تطبيق/سطح/صفحة/ملف هو **نقطة بدء وليس حدًا** إذا أثبتت العلاقات امتداد الأثر.

---

# 4) إغلاق End-to-End حقيقي

تتبّع المسار الفعلي كاملًا:

**Input**
**→ Parsing**
**→ Validation**
**→ Authentication**
**→ Authorization**
**→ Business Logic**
**→ State/Data Transformation**
**→ Persistence**
**→ Transactions**
**→ Events/Queues**
**→ Integrations**
**→ Networking**
**→ Response**
**→ Consumer**
**→ UI/Surface**
**→ Observable Result**

وافحص كل الطبقات المرتبطة، حسب الحاجة، بما فيها:

**Backend، Frontend، Mobile، Web، APIs، Routes، Bindings، Integrations، Services، Repositories، Database، Queries، Schemas، Migrations، Contracts، DTOs، Models، Identity/Auth، Permissions، Security، Configuration، Environment، Runtime، State، Validation، Error Handling، Transactions، Concurrency، Events، Queues، Networking، Dependencies، Build، Typecheck، Lint، Tests، Integration، E2E، CI، التشغيل الفعلي، UI/UX، RTL، Accessibility، Localization، Observability.**

نجاح طبقة منفردة لا يثبت نجاح النظام.

---

# 5) لا نجاح جزئي

لا يكفي منفردًا:

- Build ناجح.
- Typecheck ناجح.
- Lint ناجح.
- Unit Tests ناجحة.
- CI جزئي أخضر.
- API تعمل منفردة.
- Backend يعمل منفردًا.
- Frontend يعمل منفردًا.
- Mock/Fixture ناجح.
- Happy Path ناجح.
- اختفاء رسالة الخطأ.
- عدم ظهور Exception.
- اختبار قديم يمر.
- Package/Plan تقول DONE.
- Validator يمر خارج حدود ما يثبته فعلًا.

المطلوب سلامة:

**Architecture + Logic + Contracts + Data + State + Permissions + Integration + Runtime + Real Behavior + Failure Behavior + Relevant User/Operational Experience**

معًا.

---

# 6) التنفيذ إلزامي — لا تحوّل المهمة إلى تقرير

لا تتوقف عند:

**Diagnosis / Findings / Recommendations / TODO List**

إذا كان الخلل قابلًا للحسم ضمن الأدوات والصلاحيات والنطاق والقرارات المحسومة:

**نفّذه الآن.**

أما القرار الجوهري غير القابل للاشتقاق من الأدلة فلا يُخترع تحت ذريعة «التنفيذ الفوري»؛ يبقى الجزء المتأثر `OPEN` حتى يُحسم.

الدورة المطلوبة:

**اكتشف**
**→ افهم**
**→ أصلح**
**→ نظّف**
**→ شطّب**
**→ اختبر**
**→ شغّل**
**→ حاول كسره**
**→ أصلح ما ظهر**
**→ أعد التحقق**

التقرير يوثق التنفيذ؛ **لا يستبدله**.

---

# 7) التنظيف والتشطيب جزء من DONE

التنظيف والتشطيب ليسا تحسينًا اختياريًا بعد نجاح الوظيفة.

**النظام الذي يعمل لكنه مزدحم، متناقض، سيئ التنظيم، يحمل بقايا أو أسماء ومسارات قديمة، ليس DONE.**

يجب أن تكون الصورة النهائية:

**Correct**
**Canonical**
**Organized**
**Cohesive**
**Traceable**
**Maintainable**
**Consistent**
**Minimal in unnecessary complexity**
**Clean**
**Finished**

---

# 8) التشطيب يعمل على جميع مستويات البنية

**وحدة التنظيف ليست الملف.**

افحص حسب الحاجة:

**سطر**
**→ تعبير/شرط/فرع**
**→ كتلة كود**
**→ دالة/Method**
**→ Type/Class/Component**
**→ Constant/Helper**
**→ ملف**
**→ مجموعة ملفات**
**→ مجلد**
**→ Module/Package**
**→ Service/Surface**
**→ Domain**
**→ Contract/Route/Config/Dependency**

ويجوز أن تكون المعالجة الصحيحة:

**Delete / Rename / Move / Merge / Split / Refactor / Reorganize / Redesign / Rebuild**

على أي مستوى منها.

لا تترك بقايا صغيرة بحجة أنها غير مؤثرة.

ولا تحذف وحدة كبيرة عشوائيًا إذا كان الجزء غير الصحيح أصغر.

المعيار:

**Correctness + Necessity + Context + Structure + Blast Radius.**

---

# 9) احذف كل ما انتهت الحاجة إليه

احذف، بعد إثبات سلامة الحذف، كل ما أصبح:

**ميتًا، مهجورًا، superseded، deprecated، مكررًا، غير مستخدم، unreachable، متناقضًا، عديم الغرض، مؤقتًا، تجريبيًا، تاريخيًا أو مولدًا للضجيج.**

يشمل ذلك حسب الارتباط:

- dead code.
- unreachable branches.
- unused conditions.
- stale comments.
- TODO/FIXME/HACK.
- obsolete functions/classes/components/types/helpers/constants.
- ملفات ومجلدات انتهى دورها.
- implementations مستبدلة.
- duplicate implementations.
- workarounds.
- fallbacks غير اللازمة.
- compatibility layers غير المبررة.
- unused imports/exports/re-exports.
- aliases التاريخية.
- unused dependencies.
- stale configs.
- stale environment variables.
- dead feature flags.
- obsolete scripts.
- obsolete commands.
- unused APIs/routes/handlers.
- obsolete contracts/DTOs/schemas/models.
- stale tests/mocks/fixtures/helpers.
- documentation/examples/comments القديمة.
- unnecessary generated artifacts.
- debug output.
- dumps.
- temporary artifacts.
- logs غير المطلوب الاحتفاظ بها.
- empty/obsolete directories.
- placeholder files غير المطلوبة.
- أي عنصر لا يملك Purpose أو Consumer أو Responsibility مشروعة.

### قاعدة الحذف

لا تسأل فقط:

**هل يسبب هذا العنصر مشكلة؟**

اسأل أيضًا:

**هل توجد حاجة حالية مثبتة لوجوده؟**

إذا لم توجد:

**Responsibility + Purpose + Consumer + Requirement + Architectural Reason**

مشروعة وواضحة، فالأصل إزالة العنصر بعد التحقق من الـBlast Radius.

---

# 10) Git هو التاريخ

لا تستخدم الشجرة النشطة كمخزن للنسخ السابقة.

ممنوع الاحتفاظ بنسخة قديمة لمجرد «الاحتياط» عبر أسماء أو مجلدات مثل:

`old`
`new`
`final`
`final2`
`backup`
`temp`
`legacy`
`deprecated`
`archive`

إذا لم توجد حاجة تشغيلية أو قانونية أو توافقية أو Migration requirement مثبتة:

**احذف النسخة المستبدلة.**

**Git هو التاريخ.**

---

# 11) التنظيم البنيوي إلزامي

لا يكفي أن تعمل الـimports.

راجع كل عنصر من حيث:

**Domain**
**→ Ownership**
**→ Responsibility**
**→ Placement**
**→ Naming**
**→ Context**
**→ Dependencies**
**→ Consumers**

يجب أن يكون:

**في المكان الصحيح، داخل المجال الصحيح، وتحت المسؤولية الصحيحة.**

صحح عند الحاجة:

**Move / Merge / Split / Rename / Reclassify / Reorganize / Delete**

ممنوع إبقاء:

- domain logic داخل shared بلا مبرر.
- shared responsibility داخل Surface خاصة.
- ملف Domain داخل Domain آخر.
- generic utility تخفي business logic خاصًا.
- مسؤولية واحدة موزعة بلا داعٍ.
- مسؤوليات مستقلة مجمعة بلا داعٍ.
- تقسيمات لا تقدم Boundary حقيقية.
- ملفات في موقع تاريخي فقط لأنه ما يزال يعمل.

**الموقع الخاطئ خلل معماري حتى لو كان التنفيذ ناجحًا.**

---

# 12) التسمية جزء من التشطيب

راجع أسماء كل ما يرتبط بالمهمة:

**Files، Folders، Functions، Variables، Types، Classes، Components، Modules، Packages، Routes، Services، Contracts، Models، Configs، Environment Variables، Scripts، Tests.**

يجب أن تكون الأسماء:

**دقيقة، واضحة، متسقة، غير غامضة، غير تاريخية، غير مضللة، وتعكس المسؤولية الحالية الفعلية.**

إذا أصبح الاسم قديمًا أو لا يمثل الحقيقة:

**Rename**
**→ تحديث كل المراجع**
**→ إزالة الاسم القديم**
**→ إزالة aliases الانتقالية غير المطلوبة**
**→ التحقق من اختفاء الآثار القديمة**

---

# 13) مصدر حقيقة واحد

لكل مفهوم يجب، حيثما كان ذلك صحيحًا معماريًا، وجود:

**Canonical Source of Truth واحد.**

يشمل ذلك:

**Contracts**
**Schemas**
**Models**
**Configurations**
**Policies**
**Mappings**
**Constants**
**Business Rules**
**State Definitions**
**Domain Definitions**

عند وجود duplication غير مبرر:

**حدد المصدر السيادي**
**→ انقل جميع المستهلكين إليه**
**→ احذف النسخ الثانوية**
**→ احذف synchronization/adapters غير الضرورية**
**→ حدّث المراجع**
**→ تحقق من إزالة المصدر القديم بالكامل**

تطابق نسختين حاليًا ليس مبررًا لبقاء مصدرَي حقيقة.

---

# 14) كل تغيير بنيوي يجب أن يغلق شبكة مراجع كاملة

بعد أي:

**Delete / Rename / Move / Merge / Split / Refactor / Replace**

افحص في الاتجاهين:

**من يعتمد على العنصر؟**
**وعلى ماذا يعتمد العنصر؟**

ثم حدّث كامل الـBlast Radius، بما في ذلك:

**Imports**
**Exports**
**Re-exports**
**References**
**Callers**
**Callees**
**Registrations**
**Bindings**
**Routes**
**Contracts**
**Schemas**
**Configs**
**Environment Variables**
**Dependencies**
**Tests**
**Mocks**
**Fixtures**
**Docs**
**Examples**
**Build Entries**
**CI Entries**
**Scripts**
**Generated References**

ممنوع ترك:

- broken imports.
- orphan references.
- stale exports.
- old paths.
- old names.
- obsolete aliases.
- stale config keys.
- unused environment variables.
- dependencies بلا مستخدم.
- tests لبنية انتهت.
- docs تصف تنفيذًا قديمًا.
- CI/build entries لمسارات لم تعد موجودة.

**الحذف أو النقل أو إعادة التسمية الجزئية غير مكتملة.**

---

# 15) تقليل الضجيج معيار إلزامي

يجب أن يتمكن مهندس جديد من تحديد دون تخمين:

- الملف الصحيح.
- المسار الصحيح.
- الـimplementation الفعلي.
- الـDomain الصحيح.
- الـOwner الصحيح.
- الـContract السيادي.
- الـModel السيادي.
- الـConfig المعتمد.
- الـScript المعتمد.
- الـRuntime path الفعلي.
- الـSource of Truth.

إذا كان وجود عناصر قديمة أو مكررة أو سيئة التسمية يجعل الاختيار ملتبسًا، فهذا:

**Defect**

يجب حسمه قبل DONE.

---

# 16) منع الديون التقنية الجديدة

ممنوع أن يكون الحل النهائي نفسه مصدرًا لديون جديدة، مثل:

- workaround جديد.
- TODO جديد.
- duplicate implementation.
- duplicate source of truth.
- abstraction بلا حاجة.
- wrapper يخفي design flaw.
- extra configuration بلا داعٍ.
- dead flag.
- temporary naming/path.
- compatibility layer دائمة لحل مؤقت.
- fallback غير مبرر.

أي حل انتقالي مطلوب فعليًا يجب أن يكون:

**ضروريًا، صريحًا، محدودًا، مبررًا، واضح الملكية، ولا يخفي failure.**

---

# 17) اختبر السلوك الحقيقي وحالات الفشل

اختبر كل ما ينطبق من:

**Happy Path**
**Empty State**
**Invalid Input**
**Missing Data**
**Unauthorized**
**Forbidden**
**Wrong Role**
**Wrong Scope/Tenant**
**Expired State**
**Duplicate Request**
**Retry**
**Timeout**
**Partial Failure**
**Dependency Failure**
**Network Failure**
**Database Failure**
**Concurrent Requests**
**Race Conditions**
**Stale State**
**Restart/Recovery**
**Boundary Values**
**Min/Max Values**
**Malformed Contract**
**Old Data**
**New Data**
**Migration Compatibility**
**Regression Paths**

واختبر الانتقالات المهمة للـState والبيانات، وليس فقط الاستجابة النهائية.

---

# 18) تحقق عدائي مستمر

بعد أن يبدو الحل ناجحًا، افترض أنه ما يزال خاطئًا وابحث عمدًا عن:

**Silent Failures**
**Hidden Fallbacks**
**Edge Cases**
**Unreachable Error Handling**
**State Corruption**
**Race Conditions**
**Partial Transactions**
**Permission Leaks**
**Contract Drift**
**Schema Drift**
**Data Drift**
**Duplicate Logic**
**Legacy Paths**
**Dead Code**
**Wrong Ownership**
**Wrong Placement**
**Stale Naming**
**Orphan References**
**Stale Configuration**
**Hidden Dependencies**
**Unvalidated Inputs**
**Inconsistent Cross-Surface Behavior**
**Operational Regressions**
**Stale Plan Assumptions**
**Missing Writers/Readers/Consumers**

نجاح الاختبارات الحالية لا يثبت غياب عيوب لم تغطها الاختبارات.

---

# 19) دورة التنفيذ والتحقق الإلزامية

كرر حتى الاستنفاد:

**Deep Diagnosis**
**→ Root Cause**
**→ Blast Radius**
**→ Root Fix**
**→ Refactor/Redesign عند الحاجة**
**→ Cleanup**
**→ Structural Organization**
**→ Naming/Context Review**
**→ Reference Integrity Review**
**→ Source-of-Truth Review**
**→ Dead/Unused Scan**
**→ Legacy Residue Scan**
**→ Dependency/Config Hygiene**
**→ Contract/Integration Review**
**→ Build**
**→ Typecheck**
**→ Lint**
**→ Tests**
**→ Integration Tests**
**→ E2E**
**→ Runtime Validation**
**→ Failure/Edge Testing**
**→ Regression Check**
**→ Adversarial Review**
**→ معالجة كل ما يظهر**
**→ Re-verify**

**ظهور خلل جديد يعيد الحالة فورًا إلى OPEN.**

---

# 20) صلاحية كاملة للمعالجة داخل النطاق

لديك الصلاحية لتنفيذ ما يلزم من:

**تعديل**
**حذف**
**نقل**
**دمج**
**فصل**
**إعادة تسمية**
**إعادة ترتيب**
**إعادة تصنيف**
**إعادة هيكلة**
**إعادة تصميم**
**إعادة بناء**

لا تحافظ على:

**Code / File / Folder / Abstraction / Wrapper / Adapter / Compatibility Layer / Legacy Path**

فقط لأن إزالته أو إصلاحه سيزيد حجم الـdiff.

لكن:

**ممنوع الحذف أو إعادة الهيكلة العشوائية.**

كل تغيير يجب أن يكون مبررًا بالتصميم الصحيح أو الـRoot Cause أو الـBlast Radius، ومثبت السلامة بالتحقق.

---

# 21) بوابة التشطيب النهائي Final Finishing Gate

قبل DONE نفّذ مراجعة نهائية لكل عنصر بقي داخل نطاق المهمة.

يجب أن يكون كل عنصر:

- ضروريًا.
- صحيحًا.
- في المكان الصحيح.
- داخل الـDomain الصحيح.
- تحت Ownership صحيحة.
- ذا Responsibility واضحة.
- بالاسم الصحيح.
- في Context صحيح.
- مرتبطًا بالمراجع الصحيحة فقط.
- وله Consumer/Purpose مشروع.

ويجب إثبات:

**صفر dead code معلوم.**
**صفر ملفات أو مجلدات ميتة معلومة.**
**صفر implementations مستبدلة باقية بلا مبرر.**
**صفر duplicate source of truth معلوم.**
**صفر duplication غير مبرر معلوم.**
**صفر stale references معلومة.**
**صفر orphan references معلومة.**
**صفر old paths معلومة.**
**صفر obsolete aliases معلومة.**
**صفر naming تاريخي أو مضلل معلوم.**
**صفر placement بنيوي خاطئ معلوم.**
**صفر Ownership/Responsibility غامض معلوم.**
**صفر dependency غير مستخدمة معلومة.**
**صفر config أو environment variable متقادمة معلومة.**
**صفر feature flags منتهية معلومة.**
**صفر scripts متجاوزة معلومة.**
**صفر TODO/FIXME/HACK مرتبطة بالنطاق.**
**صفر workaround أو fallback غير مبرر معلوم.**
**صفر documentation أو comments أو examples متقادمة معلومة ضمن النطاق.**
**صفر debug/temporary artifacts معلومة.**
**صفر compatibility/legacy layers غير مبررة معلومة.**
**صفر technical noise جوهري معلوم.**
**صفر Draft/Plan claim مستخدم كحقيقة تنفيذية بلا إثبات حي.**

---

# 22) بوابة التحقق التقني Final Technical Gate

قبل DONE يجب إثبات سلامة كل مجال مرتبط فعليًا بالمهمة، بما يشمل حسب الارتباط:

**Architecture**
**Design**
**Business Logic**
**Contracts**
**Schemas**
**Models**
**Database**
**Migrations**
**Backend**
**Frontend**
**Mobile/Web Surfaces**
**APIs**
**Identity/Auth**
**Permissions**
**Security**
**Validation**
**State**
**Transactions**
**Concurrency**
**Integrations**
**Networking**
**Configuration**
**Runtime**
**Build**
**Typecheck**
**Lint**
**Tests**
**Integration**
**End-to-End**
**CI**
**Operational Behavior**
**UI/UX/Accessibility when in scope**

أي بند مرتبط بالمهمة ولم يتم التحقق منه فعليًا:

**OPEN**

---

# 23) تحقق من أحدث رأس فقط

قبل القرار النهائي:

1. أنهِ جميع التعديلات.
2. أنهِ Cleanup والتشطيب.
3. أنهِ Rename/Move/Delete/Refactor.
4. تأكد من عدم وجود تغيير مطلوب غير مثبت.
5. ثبّت أحدث رأس تنفيذ فعلي.
6. نفّذ التحقق النهائي منه، لا من نسخة أقدم.
7. إذا تغيّر الرأس بعد أي تحقق، أصبح ذلك التحقق قديمًا ويجب إعادة ما تأثر منه.

### الاختبار النهائي

من أحدث رأس نفّذ:

**Final Cleanup**
**→ Final Structural Review**
**→ Final Naming/Context Review**
**→ Final Repository Hygiene Audit**
**→ Hardening**
**→ Red-Team Review**
**→ Regression Review**
**→ End-to-End Verification**
**→ Runtime Verification**

---

# 24) شرط DONE غير القابل للتفاوض

ممنوع DONE طالما توجد:

**مشكلة معلومة واحدة قابلة للمعالجة داخل النطاق.**

يجب الوصول إلى:

**صفر أخطاء معلومة.**
**صفر فجوات معلومة.**
**صفر تناقضات معلومة.**
**صفر Regressions معلومة.**
**صفر منطق ناقص معلوم.**
**صفر تكامل ناقص معلوم.**
**صفر حالات غير محسومة معلومة.**
**صفر عقود غير متطابقة معلومة.**
**صفر بقايا معلومة.**
**صفر كود ميت معلوم.**
**صفر duplication غير مبرر معلوم.**
**صفر ضجيج تقني جوهري معلوم.**
**صفر naming/placement/context defects معلومة.**
**صفر sources of truth مكررة معلومة.**
**صفر حلول مؤقتة تخفي Root Cause.**
**صفر technical debt معلوم قابل للحسم داخل النطاق.**
**صفر أعمال معلومة متبقية قابلة للتنفيذ داخل النطاق.**
**صفر قرارات جوهرية مطلوبة للإغلاق وغير محسومة.**
**صفر اعتماد غير متحقق على مسودة/خطة/حالة تاريخية.**

إذا بقي أي منها:

**OPEN**

---

# 25) تعريف DONE النهائي

DONE لا يعني:

**«يعمل».**

DONE يعني أن النتيجة:

- صحيحة هندسيًا.
- سليمة معماريًا.
- صحيحة منطقيًا.
- صحيحة تقنيًا.
- مكتملة وظيفيًا.
- متكاملة End-to-End.
- صحيحة في البيانات والحالات والصلاحيات.
- مجرّبة فعليًا.
- متحققة في حالات النجاح والفشل.
- سليمة تشغيليًا.
- آمنة.
- مستقرة.
- منظمة.
- Canonical.
- ذات Naming صحيح.
- ذات Placement صحيح.
- ذات Context صحيح.
- ذات References صحيحة.
- خالية من البقايا والازدواجية والضجيج المعلوم.
- نظيفة ومشطبة وقابلة للصيانة.
- مثبتة على أحدث Candidate/رأس مطلوب، لا على Plan أو SHA قديم.

ولا يجوز اعتبار التنفيذ DONE إذا كان الوصف الصحيح له:

**«يعمل لكن...»**

أي **«لكن»** معلومة قابلة للمعالجة داخل النطاق تعني:

**OPEN**

---

# 26) قاعدة القرار الأخيرة

قبل أن تقول DONE اسأل، وأثبت الإجابة:

**هل يعمل فعلًا End-to-End؟**
**هل أزيل Root Cause؟**
**هل عولج كامل Blast Radius؟**
**هل التصميم النهائي صحيح؟**
**هل كل عنصر باقٍ ضروري؟**
**هل كل عنصر في مكانه الصحيح؟**
**هل كل اسم صحيح؟**
**هل كل Context وOwnership صحيح؟**
**هل يوجد Canonical Source واحد حيث يجب؟**
**هل كل المراجع والعلاقات سليمة؟**
**هل أزيل القديم والمكرر والميت والمؤقت؟**
**هل اختبرت حالات الفشل والحواف؟**
**هل بحثت عدائيًا عن عيوب إضافية؟**
**هل استخدمت القدرات والأدوات الملائمة المتاحة ولم أدّع غير المستخدم؟**
**هل تحققت من Claims القادمة من `plans/**` بدل اعتبارها حقيقة؟**
**هل بقي قرار جوهري مطلوب تم تخمينه بدل حسمه؟**
**هل التحقق مبني على أحدث رأس بعد آخر تغيير؟**
**هل بقي أي شيء معلوم يمكن إصلاحه الآن؟**

إذا تعذّر إثبات إجابة إيجابية لأي سؤال مرتبط بالمهمة:

**OPEN**

إذا ظهر خلل جديد:

**OPEN**

إذا بقي عمل معلوم قابل للتنفيذ:

**OPEN**

إذا بقي قرار جوهري لازم للتنفيذ أو الإغلاق وغير محسوم:

**OPEN**

فقط عندما تصبح جميع الشروط المرتبطة بالمهمة مثبتة فعليًا:

**DONE**
