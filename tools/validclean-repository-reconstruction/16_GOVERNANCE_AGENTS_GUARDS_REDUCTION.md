# 16 — تقليص الحوكمة والمهارات والحراس

## الهدف

الحوكمة ليست أرشيفًا لكل قرار سابق، والحارس ليس مصدر حقيقة بديلًا، والـSkill ليست نسخة من الأمر التنفيذي. الهدف طبقة صغيرة قابلة للقراءة آليًا وتطبيقها فعليًا.

## طبقات السلطة

يجب أن توجد سلسلة أسبقية واحدة:

```text
AGENTS.md
→ authority precedence
→ product truth
→ domain ownership
→ decision vocabulary
→ execution/verification policy
```

أي ملف آخر:

- يشرح هذه السلطة دون إعادة تعريفها.
- أو يسجل ADR تاريخيًا.
- أو يحذف بعد استخراج القرار.

## الملفات الحاكمة الدنيا

يجب تثبيت Index واحد يحدد الملفات canonical. لا يبقى ملف حوكمة canonical خارج الـIndex.

كل ملف حاكم يحتاج:

```yaml
id:
owner:
state: ACTIVE | DEFERRED | RETIRED
supersedes:
superseded_by:
machine_readable_source:
acceptance_condition:
retirement_condition:
last_verified_sha:
```

## تقارير الاستخراج والـLedgers التاريخية

ملفات مثل:

```text
MASTER_EXTRACTION_*
MATRIX_NORMALIZATION_*
LEGACY_EXTRACTION_LEDGER
journey evidence reports
```

لا تبقى ACTIVE لأنها تصف عملية استخراج سابقة. المسار:

```text
extract live rules
→ write canonical policy/ADR
→ update references
→ delete report from active tree
```

Git history يحتفظ بالتاريخ.

## Operational Journey package

يجب التفريق بين:

- Protocol حاكم مختصر.
- Journey registry machine-readable.
- Templates.
- Evidence generated خارج Git أو تحت retention واضح.

لا تتكرر أوامر الإغلاق في عدة ملفات طويلة. أمر واحد + schema + examples محدودة.

## `.agents`

### Skill

Skill فعلية فقط إذا:

- لها trigger ونطاق واضح.
- تُستدعى من Registry أو Agent.
- لا تكرر policy كاملة.
- لها tests/frontmatter validation.

### Adapter

رقيق:

```text
input normalization
→ invoke canonical tool/skill
→ return evidence
```

لا يملك domain rules.

### Archive

`.agents/archive` ليس أرشيفًا دائمًا. بعد استخراج أي دليل مطلوب:

```text
delete from active tree
retain in Git history
```

## الحراس

### القاعدة

الحارس يقرأ الحقيقة الحاكمة ولا ينسخها.

خطأ:

```text
guard hardcodes financial operation list
OpenAPI owns another list
runtime owns routes
```

صحيح:

```text
parse canonical contract
→ parse runtime/router
→ compare
```

### Mutation tests

الحراس الحرجة يجب أن تثبت أنها تفشل عند:

- إضافة Master OpenAPI ثانٍ.
- إضافة operationId مصدرية مكررة.
- تعديل generated output يدويًا.
- إضافة Migration خارج Manifest.
- منح Workflow `contents: write`.
- إعادة tenant fallback.
- إضافة financial mutation خارج WLT.
- إضافة raw API call داخل Surface.

اختبار يبحث عن عبارة واحدة ليس كافيًا إذا كان يمكن تجاوزها بتغيير صياغة.

## Workflows

- Actions مثبتة بـSHA.
- `contents: read` افتراضيًا.
- لا commit/push ذاتي من CI.
- لا نتائج من SHA مختلف.
- Workflows المتشابهة تدمج أو تشترك في Composite Action.
- Artifact evidence لا يتحول إلى source truth دائم.

## أداة الجرد الجديدة

```text
tools/validclean-repository-reconstruction/audit-full-repository.mjs
.github/workflows/validclean-full-repository-audit.yml
```

وظيفتها تشخيصية read-only. قبل نهاية المشروع:

- إما نقلها إلى `tools/audit/` كأداة مستودع عامة مع tests.
- أو حذفها بعد دمج منطقها في cleanup/ownership guards.

لا تبقى مرتبطة باسم فرع مؤقت دون قرار.

## بوابات الإغلاق

```yaml
canonical_governance_outside_index: 0
broken_governance_references: 0
conflicting_active_states: 0
historical_reports_marked_active: 0
unregistered_skills: 0
thick_adapters: 0
active_agent_archives: 0
guards_with_parallel_truth_lists: 0
critical_guards_without_mutation_tests: 0
workflows_with_source_write: 0
unpinned_actions: 0
same_sha_evidence_mismatches: 0
```
