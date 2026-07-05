# 01 — الأمر، القالب، النتائج المسموحة

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** `01/11`
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained)
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`
**Scope:** الغرض الحاكم، قالب الاستخدام، الأمر المباشر، والنتائج الوحيدة المسموحة.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` و`11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---
## 0) الغرض الحاكم

هذا الملف ليس ملاحظة، وليس README، وليس قائمة تذكير. هذا **بروتوكول تنفيذ حاكم** يجب استخدامه عند مراجعة أو تنفيذ أو إغلاق أي رحلة تشغيلية أو Topic داخل `bthwani-suite-next`.

الهدف منه أن يمنع الآتي:

- الادعاء بأن العمل مكتمل دون دليل.
- الاعتماد على الذاكرة أو الانطباع أو README قديم.
- فحص واجهة واحدة واعتبار الرحلة مغلقة.
- ترك منطق تشغيلي داخل UI surface.
- السماح بـ direct API داخل surfaces.
- خلط DSH مع WLT في الحقيقة المالية.
- نقل فوضى المانح بدل استخراج القيمة.
- تنفيذ Git/GitHub تغييري دون أمر بشري مستقل.
- تجاهل backend/API/database/runtime عند دخولها في النطاق.
- تجاهل أي سطح أو قسم لوحة تحكم أو طبقة مرتبطة بالرحلة.

أي وكيل ينفذ هذا البروتوكول يجب أن يتعامل معه كقواعد غير قابلة للنقض أو التجاهل. أي مخالفة صريحة أو ضمنية لهذه القواعد تصنف:

```text
PROTOCOL_VIOLATION
```

---

## 1) قالب الاستخدام الإلزامي

املأ القيم التالية قبل إرسال الأمر إلى الوكيل المنفذ:

```text
REPO_REMOTE:
<REPO_REMOTE>

REPO_LOCAL:
<REPO_LOCAL>

LOCAL_BRANCH:
<LOCAL_BRANCH>

REF:
<REF>

BASE_REF:
<اكتب base ref عند مراجعة PR أو الدمج، وإلا اكتب N/A>

DONOR_REMOTE_READ_ONLY:
bthwani2-boop/bthwani-suite

DONOR_LOCAL_READ_ONLY:
C:\bthwani-suite

JOURNEY / TOPIC:
<اسم الرحلة أو التوبك المطلوب مراجعته أو تنفيذه>

TASK:
<المطلوب بدقة: analysis_only أو implementation_or_closure أو merge_review>

OUT_OF_SCOPE:
<كل ما لا يجب لمسه مع سبب الاستبعاد>
```

قواعد تعبئة القالب:

1. `REF` يجب أن يكون ref مباشرًا من GitHub Remote: branch أو tag أو commit.
2. ممنوع استبدال `REF` بفرع مشابه.
3. ممنوع استخدام default branch إذا فشل حل `REF`.
4. `LOCAL_BRANCH` للسياق فقط، وليس إذنًا بأي إجراء Git/GitHub.
5. `OUT_OF_SCOPE` لا يقبل العمومية. كل استبعاد يجب أن يحتوي سببًا ودليل عدم التأثر.

---

## 2) أمر التنفيذ المباشر

انسخ الأمر التالي كما هو، ثم املأ القيم:

```text
نفّذ مراجعة أو تنفيذًا أو إغلاقًا عمليًا وجنائيًا للرحلة المحددة أدناه، من GitHub Remote فقط، وفق بروتوكول الرحلة التشغيلية الموحدة v3-modular.

REPO_REMOTE: <REPO_REMOTE>
REPO_LOCAL: <REPO_LOCAL>
LOCAL_BRANCH: <LOCAL_BRANCH>
REF: <REF>
BASE_REF: <N/A أو base ref>
DONOR_REMOTE_READ_ONLY: bthwani2-boop/bthwani-suite
DONOR_LOCAL_READ_ONLY: C:\bthwani-suite
JOURNEY / TOPIC: <اسم الرحلة أو التوبك>
TASK: <analysis_only | implementation_or_closure | merge_review>
OUT_OF_SCOPE: <ما لا يجب لمسه مع السبب>

القواعد الحاكمة:
1. ابدأ من GitHub Remote فقط.
2. حل REF مباشرة من GitHub Remote قبل أي فحص.
3. لا تعتمد على local branch، ولا default branch، ولا الذاكرة، ولا README غير مثبت، ولا أي ادعاء سابق.
4. اعتبر الحالة الافتراضية FIX_REQUIRED حتى تثبت الأدلة العملية عكس ذلك.
5. لا تعلن ANALYSIS_PASS أو IMPLEMENTATION_PASS أو MERGE_READY إلا عبر evidence matrix كاملة.
6. كل دليل يجب أن يكون من نفس resolved_commit_sha أو diff موثق بين BASE_REF وREF عند مراجعة PR.
7. أي معلومة لا يمكن إثباتها تصنف BLOCKED_NEEDS_EVIDENCE مع سبب ونقص وأمر تحقق.
8. ممنوع استخدام machine-readable كمصدر قرار حاكم.
9. افحص live repository topology والملفات الحية والعقود والباك إند والواجهة وقاعدة البيانات والأسطح والـ runtime والاختبارات والحراس حسب النطاق.
10. shared brains تُفحص قبل UI surfaces.
11. surfaces واجهة فقط؛ لا business logic ولا direct API ولا state machine ولا permission policy ولا process.env ولا raw API mapping داخلها.
12. DSH لا يملك الحقيقة المالية. WLT هو مالك الحقيقة المالية الوحيد.
13. المانح read-only فقط، ويستخدم لاستخراج القيمة لا لنقل البنية أو الكود أو الفوضى.
14. ممنوع إنشاء branch أو commit أو push أو Pull Request أو merge أو tag أو release دون أمر بشري مستقل وصريح.
15. أي تنفيذ محلي مسموح به فقط داخل working tree مع تقرير أدلة وأوامر مقترحة.
16. كل سطح وكل قسم لوحة تحكم وكل طبقة مرتبطة يجب ذكرها في matrices إلزامية.
17. أي matrix ناقصة أو عامة أو بلا verification_command = FIX_REQUIRED.
18. أي فحص مرتبط يفشل = FIX_REQUIRED.
19. CI غير متاح = CI_NOT_CONFIGURED وليس PASS.
20. أخرج نتيجة واحدة فقط من النتائج المسموحة مع تقرير نهائي منظم وblockers قابلة للتنفيذ.
```

---

## 3) النتائج الوحيدة المسموحة

لا يجوز إخراج أي نتيجة خارج القائمة التالية:

```text
ANALYSIS_PASS
IMPLEMENTATION_PASS
FIX_REQUIRED
BLOCKED_NEEDS_EVIDENCE
DO_NOT_MERGE
MERGE_READY
PROTOCOL_VIOLATION
```

### 3.1 معنى كل نتيجة

| النتيجة | متى تستخدم |
|---|---|
| `ANALYSIS_PASS` | في مهمة تحليل فقط عندما تكتمل أدلة التحليل داخل النطاق ولا توجد فجوة مانعة. |
| `IMPLEMENTATION_PASS` | في مهمة تنفيذ/إغلاق عندما يثبت الكود والفحوصات والـ runtime والـ evidence أن الرحلة مكتملة داخل النطاق. |
| `FIX_REQUIRED` | عند وجود خلل مثبت، نقص مثبت، تكرار، تناقض، فحص فاشل، أو دليل ناقص داخل نطاق قابل للإصلاح. |
| `BLOCKED_NEEDS_EVIDENCE` | عند تعذر إثبات معلومة حاكمة أو غياب صلاحية/بيئة/دليل يمنع الحسم. |
| `DO_NOT_MERGE` | عند مراجعة PR أو commit range ووجود blocker يمنع الدمج. |
| `MERGE_READY` | عند مراجعة PR فقط، وبعد ثبوت كل أدلة الدمج. |
| `PROTOCOL_VIOLATION` | عند مخالفة قاعدة حاكمة مثل push تلقائي أو تحليل ref خاطئ أو PASS بلا دليل. |

ممنوع استخدام:

```text
جاهز
مكتمل
تمام
100%
لا توجد مشاكل
غالبًا يعمل
يحتاج متابعة لاحقًا
```

إلا إذا كانت داخل تقرير مفسر ومربوطة بدليل عملي. أي لفظ نجاح غير مدعوم بدليل = `FIX_REQUIRED`.
