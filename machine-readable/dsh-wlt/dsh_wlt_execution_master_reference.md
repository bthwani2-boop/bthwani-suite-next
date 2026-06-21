# dsh_wlt_execution_master_reference — المرجع الأعلى للتنفيذ

> **تاريخ الإنشاء:** 2026-06-21  
> **الفرع:** starting-implementing-slices @ a55dd95  
> **المانح:** C:\bthwani-suite @ realtest @ e5080831  
> **ملف JSON:** machine-readable/dsh-wlt/dsh_wlt_execution_master_reference.json

---

## ما هذا الملف؟

هذا الملف هو الشرح البشري للملف الجامع `dsh_wlt_execution_master_reference.json`.  
عند تنفيذ أي شريحة، يجب قراءة الـ JSON أولًا. هذا الملف يشرح كيفية الاستخدام.

---

## هيكل الملفات (من الأعلى للأسفل)

```
dsh_wlt_execution_master_reference.json   ← المرجع الأعلى (THIS)
dsh_wlt_slice_master_matrix.json          ← تفاصيل كل شريحة
dsh_wlt_master_plan.md                    ← الخطة البشرية
dsh_wlt_gates.json                        ← بوابات القبول
dsh_wlt_status.json                       ← الحالة الحالية
dsh_wlt_runtime_ports.json               ← المنافذ الكانونية
dsh_wlt_docker_runtime.json              ← تكوين Docker
dsh_wlt_extraction_matrix.csv            ← قرارات الاستخراج من المانح
dsh_wlt_slice_execution_matrix.csv       ← جدول التتبع
```

**مصادر الإدخال (لا تُنفَّذ منها مباشرة):**
```
machine-readable/slice_execution_master_matrix_v3.csv
machine-readable/dsh_wlt_logic_coverage_matrix.csv
machine-readable/mobile_ux_journey_matrix.csv
machine-readable/screen_state_coverage_matrix.csv
machine-readable/control_panel_coverage_matrix.csv
machine-readable/donor_control_panel_alias_matrix.csv
machine-readable/extraction_matrix.csv
```

---

## ملخص الحالة الرقمية (2026-06-21)

| المكوّن | الحالة |
|---------|--------|
| DSH-000 Foundation | RUNTIME_VERIFIED ✓ |
| DSH-001 app-client | RUNTIME_VERIFIED ✓ |
| DSH-001 control-panel | NOT_STARTED ✗ |
| DSH-002 app-client | RUNTIME_VERIFIED ✓ |
| DSH-002 control-panel | NOT_STARTED ✗ |
| DSH-003 إلى DSH-010 | NOT_STARTED ✗ |
| WLT runtime | CONTRACT_ONLY ✗ |
| control-panel src/ | EMPTY ✗ |
| Pre-slice gates | ALL PASS ✓ |

**الأولوية الفورية:** إغلاق DSH-001 + DSH-002 في control-panel

---

## كيف يستخدم الوكيل هذا الملف

### قبل بدء شريحة:
1. اقرأ `execution_master_reference.json` → قسم `slices` للشريحة المستهدفة
2. تحقق من `blocking_rules` — هل هناك blockers؟
3. نفّذ جميع `pre_slice_gates`
4. اقرأ الشريحة التفصيلية في `dsh_wlt_slice_master_matrix.json`
5. راجع `extraction_decisions` لكل ملف من المانح

### أثناء التنفيذ:
- **Backend:** ابدأ بتوسيع العقد في `dsh.openapi.yaml` أولًا
- **Client:** أعد توليد typed client بعد كل تغيير في العقد
- **Frontend:** استخدم `shared/ui-kit` فقط — لا Tamagui مباشر
- **Ports:** تحقق دائمًا من `runtime_ports.json` — لا 8080-8084/3000 كـ host
- **Finance:** تحقق من `dsh_wlt_boundary` — كل financial mutation يجب أن يكون في WLT

### بعد الانتهاء:
- احفظ evidence في `services/dsh/evidence/{SLICE_ID}/`
- حدّث `dsh_wlt_status.json`
- حدّث `status` في `dsh_wlt_slice_execution_matrix.csv`

---

## نتائج تحليل المانح (ملخص)

### ما هو نظيف ويُؤخذ كما هو (ADOPT_AS_IS):
- **28 عنصرًا** — repos postgres الخاصة بـ DSH وWLT، migrations (32+7)، domain types، frontend screens الخالية من مخالفات

### ما يحتاج تطبيعًا (ADAPT_NORMALIZE):
- **18 عنصرًا** — أهمها:
  - **14 handler DSH:** إزالة `Access-Control-Allow-Origin: *`
  - **wlt/backend/cmd/wlt-api/main.go:** إزالة CORS wildcard
  - **wlt-dsh-client.ts:** إزالة `http://localhost:8083` الـ hardcoded
  - **docker-compose files:** إعادة تعيين المنافذ إلى spec جديد
  - **DshCaptainFinanceScreen.tsx:** إزالة نص "preview فقط" العربي

### ما يُرفض (REJECT):
- **3 memory repositories** — REJECT_RUNTIME_RISK
- **0 finance boundary violations** — المانح نظيف مالياً
- **SQLite dev artifact** — REJECT_NOISE

---

## الحدود المالية (ملخص تنفيذي)

```
DSH يخزن/يعرض فقط:
  ✓ paymentSessionId
  ✓ paymentStatus
  ✓ financialReference
  ✓ settlementStatus (قراءة فقط)

DSH ممنوع عليه:
  ✗ حساب مبالغ الدفع
  ✗ إنشاء ledger entries
  ✗ تشغيل payouts
  ✗ حساب عمولات
  ✗ معالجة COD
  ✗ تشغيل reconciliation
  ✗ أي financial mutation

WLT يملك كل ما تبقى.
```

**Guard نشط:** `pnpm run guard:no-financial-mutation-outside-wlt` → 0 violations ✓

---

## المنافذ (لا تستخدم غيرها)

```
DSH API      = 58080    (container 8080 → host 58080)
POSTGRES     = 55432
MINIO API    = 59000
MINIO CONSOLE = 59001
APP_CLIENT   = 18101
APP_PARTNER  = 18102
APP_CAPTAIN  = 18103
APP_FIELD    = 18104
CONTROL_PANEL = 13000

محظور: 8080/8081/8082/8083/8084/3000 كـ host ports
```

---

## قاعدة عدم الإغلاق

> لا يجوز إعلان أي شريحة CLOSED أو RUNTIME_VERIFIED إلا بعد:
> - أدلة تشغيلية حية لكل backend handler
> - API smoke يعود بيانات حقيقية (ليست mock)
> - screenshots للأسطح المتأثرة
> - جميع gate scripts تعود exit 0
> - **جميع الأسطح** المرتبطة بالشريحة مكتملة (app-client **و** control-panel معًا)
