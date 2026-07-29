# 14 — إزالة الضجيج والـNamespaces الوهمية

## الهدف

تقليل المستودع دون حذف الحماية أو الأساس التشغيلي. القرار على المسؤولية والمستهلك، لا على عدد الملفات.

## الجذر

يفحص كل ملف جذري وفق:

```text
ACTIVE_ENTRYPOINT
CANONICAL_CONFIG
HUMAN_RUNBOOK
STALE_AUDIT
LOCAL_MACHINE_ARTIFACT
PARALLEL_TRUTH
```

مرشحات المعالجة:

- تقارير التدقيق التاريخية في الجذر: استخراج القرارات الحية إلى ADR/manifest ثم الحذف.
- ملفات Pasted/نسخ/backup: حذف بعد إثبات عدم الاستهلاك.
- `.node-version` و`.nvmrc`: اختيار مصدر إصدار واحد أو توليد أحدهما من الآخر مع gate.
- `.aiexclude` و`.cursorignore`: مصدر ignore مركزي أو إثبات الحاجة لاختلافهما؛ النسخ المتطابقة لا تُدار يدويًا مرتين.

## المجلدات الفارغة

87 ملفًا فارغًا ليست 87 مشكلة مستقلة؛ هي مؤشرات على تصميم وهمي أو placeholders.

### قاعدة الاحتفاظ

يُحتفظ بـ`.gitkeep` فقط عندما:

- الأداة الخارجية تتطلب المجلد قبل التشغيل.
- يوجد Runbook أو generator يملؤه.
- المجلد ليس تمثيلًا لخدمة أو capability غير موجودة.

وإلا يحذف المجلد كاملًا.

### الأولويات

1. `services/<code>/.gitkeep` لخدمات بلا عقد وRuntime.
2. `apps/webapp` و`apps/website` إن كانا سطحًا واحدًا مكررًا.
3. `apps/*/shell` الفارغة.
4. أقسام control-panel الفارغة بجوار تنفيذ حي في مسار آخر.
5. `infra/data-plane/*` غير المرتبطة بـCompose أو backup policy.
6. `.gitkeep` داخل مجلدات تحتوي ملفات فعلية ولا تحتاج marker.

## الخدمات المستقبلية

لا تُحجز بخدمة فارغة. تستخدم Registry واحدة:

```json
{
  "capability": "...",
  "state": "DEFERRED",
  "owner": "...",
  "activationPrerequisites": [],
  "targetService": null
}
```

عند بدء التنفيذ يُنشأ service root. قبل ذلك لا namespace ولا package ولا `.gitkeep`.

## أدوات بلا مستهلك

47 مرشحًا تحتاج classification آليًا ويدويًا.

### مصادر الاستهلاك

```text
package scripts
workflow run commands
PowerShell call operator
Node import/require
documented operator command
postinstall/prebuild hooks
CLI bin exports
```

### القرارات

- `KEEP_REGISTERED`: أداة فعلية؛ تضاف إلى registry واختبار help/dry-run.
- `MERGE`: نفس الوظيفة في أكثر من script.
- `ONE_TIME_CODEMOD`: يحذف من الشجرة بعد انتهاء الهجرة.
- `DELETE_DEAD`: لا مستهلك ولا وظيفة حاكمة.

## Aliases

16 مجموعة أسماء لأوامر متطابقة.

المعيار:

```yaml
canonical_name: required
compatibility_alias: max 1
alias_expiry: required
alias_consumer: required
```

لا Alias بلا telemetry أو search proof لمستهلكه.

## نسخ إعدادات Mobile

الملفات app-local المطلوبة من Expo/EAS تبقى، لكن ملكيتها تصبح:

```text
tools/mobile/templates
→ generator
→ app runtime files
→ drift verification
```

لا symlink لأن Windows وEAS قد لا يتعاملان معه بصورة موحدة.

### الأصول

الأيقونات الـ16 المتطابقة لا تعتبر branding مكتملًا. القرارات:

- أصل مركزي مؤقت يولد أحجامًا متعددة مع marker `PLACEHOLDER_DEV_ONLY` وتاريخ إزالة.
- أو أصول فعلية لكل تطبيق.

لا يسمح بإطلاق production بأصل placeholder صامت.

## المسارات المطلقة

21 ملفًا. الإصلاح حسب الفئة:

### كود

```text
C:\bthwani-suite-next
→ repo root discovery / environment variable
```

### Runbook

```text
<REPO_ROOT>
<LOCAL_SECRETS_ROOT>
```

### اختبارات

استخدم fixture اصطناعيًا مثل:

```text
C:\example\repo
```

ولا تثبت مسار المستخدم الحقيقي.

### Evidence قديم

استخراج القرار ثم الحذف؛ لا يبقى لأنه يحتوي مسار جهاز بعينه.

## ملفات الخرائط والمخرجات الملتزمة

`.map` وbuild outputs تخضع لقرار package publishing:

- إن كانت package تنشر JS مبنيًا من المستودع: تثبت pipeline وprovenance.
- إن كانت monorepo يستهلك TS source: تُنقل build outputs إلى CI artifact ولا تلتزم.

## بوابات الإغلاق

```yaml
unknown_empty_namespaces: 0
unregistered_tools: 0
one_time_codemods_in_active_tree: 0
unowned_script_aliases: 0
absolute_machine_paths_in_runtime: 0
stale_root_reports: 0
parallel_ignore_sources: 0
unproven_build_outputs: 0
placeholder_services: 0
```
