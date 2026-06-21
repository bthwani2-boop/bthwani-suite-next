# machine-readable/dsh-wlt — دليل الاستخدام

## الغرض

هذا المجلد هو **مصدر الحقيقة الرسمي** لخطة إغلاق DSH/WLT بالكامل.  
كل ملف فيه هو وثيقة تشغيلية قابلة للقراءة الآلية، وليس تقريرًا نصيًا.

**النطاق:** DSH و WLT فقط.  
**خارج النطاق:** knz / arb / amn / esf / mrf / snd / kwd  

---

## الملفات وأدوارها

| الملف | الدور |
|-------|-------|
| `dsh_wlt_master_plan.md` | الخطة التنفيذية الكاملة — يُقرأ أولًا قبل أي تنفيذ |
| `dsh_wlt_slice_master_matrix.json` | مرجع التنفيذ الرسمي لكل شريحة — يُستشار عند تنفيذ كل DSH |
| `dsh_wlt_slice_execution_matrix.csv` | جدول التتبع القابل للتنفيذ — يُحدَّث status بعد كل شريحة |
| `dsh_wlt_extraction_matrix.csv` | قرار كل ملف/ميزة من المانح: ADOPT / ADAPT / REJECT |
| `dsh_wlt_gates.json` | بوابات القبول — يجب اجتيازها قبل وبعد كل شريحة |
| `dsh_wlt_status.json` | الحالة الرقمية الحالية لكل مكوّن |
| `dsh_wlt_runtime_ports.json` | المنافذ المعتمدة فقط — مرجع لا يتغير |
| `dsh_wlt_docker_runtime.json` | تكوين Docker الكامل مع أوامر التشغيل |

---

## كيف يستخدم الوكيل هذه الملفات

### قبل بدء أي تنفيذ:
1. اقرأ `dsh_wlt_master_plan.md` — فهم النطاق والحدود
2. اقرأ `dsh_wlt_gates.json` — تعرّف على بوابات القبول
3. نفّذ PRE-SLICE gates وتحقق من اجتيازها
4. ابحث عن الشريحة المستهدفة في `dsh_wlt_slice_master_matrix.json`
5. تحقق من `donor_sources_allowed` و `donor_sources_rejected` قبل النسخ

### أثناء التنفيذ:
- لكل ملف من المانح: راجع `dsh_wlt_extraction_matrix.csv` أولًا
- تحقق من `dsh_wlt_runtime_ports.json` قبل كتابة أي port
- تحقق من `wlt_boundary_rule` في الشريحة قبل أي كود مالي

### بعد التنفيذ:
- حدّث `status` في `dsh_wlt_slice_execution_matrix.csv`
- حدّث `dsh_wlt_status.json`
- احفظ evidence في `services/dsh/evidence/{SLICE_ID}/`

---

## ما يمنع التنفيذ

لا يجوز البدء بتنفيذ أي شريحة إذا كان أيٌّ مما يلي صحيحًا:

- [ ] `foundation:gate` لم يمر
- [ ] `contracts:lint` لم يمر
- [ ] `guard:matrix:v3` لم يمر
- [ ] `guard:no-financial-mutation-outside-wlt` لم يمر
- [ ] وُجد port قديم (8080/8081/8082/8083/8084/3000) كـ host port
- [ ] وُجد mock/demo/preview data في runtime paths
- [ ] وُجد memory repository بدلًا من Postgres
- [ ] Docker لا يعمل على المنافذ الصحيحة

---

## ما يسمح ببدء DSH-000 (PRE-DSH-GATE)

```powershell
Set-Location "C:\bthwani-suite-next"
pnpm run foundation:gate
pnpm contracts:lint
pnpm run guard:matrix:v3
pnpm runtime:all
pnpm runtime:status
```

جميع هذه الأوامر يجب أن تعود بنتيجة PASS أو exit 0.

---

## لماذا لا يُنفَّذ في هذه المرحلة

هذا المجلد أُنشئ في **مرحلة التخطيط فقط**.  
الهدف هو: خطة دقيقة + ملف شرائح مرجعي + مصفوفات الاستخراج.  
التنفيذ الفعلي يبدأ بعد مراجعة وموافقة صريحة على كل شريحة.

**القاعدة:** لا تُعلن أي شريحة CLOSED إلا بعد أدلة تشغيلية حية.

---

## المنافذ المعتمدة (لا تستخدم غيرها)

```
DSH_API      = 58080
POSTGRES     = 55432
MINIO_API    = 59000
MINIO_CONSOLE = 59001
APP_CLIENT   = 18101
APP_PARTNER  = 18102
APP_CAPTAIN  = 18103
APP_FIELD    = 18104
CONTROL_PANEL = 13000
```

---

## WLT — تذكير الحدود

DSH يُخزّن/يعرض من WLT: `paymentSessionId` | `paymentStatus` | `financialReference` | `settlementStatus` (قراءة فقط)

كل ما عدا ذلك يبقى في WLT ولا ينتقل إلى DSH أبدًا.
