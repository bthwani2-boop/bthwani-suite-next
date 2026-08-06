# سجل إزالة الخطط المتعارضة

## القاعدة

الحزمة الحالية هي نقطة التخطيط التنفيذية الوحيدة لـSMSM DSH/WLT. الملفات القديمة لا تحفظ داخل المسار الحي كنسخ احتياطية؛ Git history يحفظها.

| المسار | التصنيف | السبب | البديل |
| --- | --- | --- | --- |
| `14_FULL_SURFACE_CLOSURE_PLAN.md` | OBSOLETE | مربوط بفرع `ala` ويقدم خطة قديمة موازية | هذه الحزمة |
| `15_AUTHORITATIVE_DSH_WLT_FULLSTACK_CLOSURE_PLAN.md` | OBSOLETE | يعلن نفسه مرجعًا ملزمًا على `ala` ويتعارض مع SMSM | هذه الحزمة |
| `16A..16I` القديمة | DUPLICATE_MERGED | جمعت عدة رحلات في ملفات ضخمة ولم تجعل ملفًا مستقلًا لكل رحلة | ملفات J001..J107 |
| `16_SMSM...` القديم | REPLACED_WITH_COMPATIBILITY_ENTRYPOINT | يبقى اسم الدخول فقط ويوجه إلى الحزمة الجديدة | `README.md` |

أي خطة أخرى تكتشف لاحقًا تصنف قبل الحذف إلى `ACTIVE_AUTHORITY | DERIVED_DUPLICATE | HISTORICAL | NOT_APPLICABLE`.
