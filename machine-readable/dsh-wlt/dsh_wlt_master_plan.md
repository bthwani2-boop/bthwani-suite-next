# DSH_WLT_DONOR_EXTRACTION_AND_CLOSURE_PLAN

> **تاريخ الإنشاء:** 2026-06-21  
> **الفرع:** starting-implementing-slices @ a55dd95  
> **المانح:** C:\bthwani-suite @ realtest @ e5080831  
> **المبدأ:** لا PASS بدون أدلة تشغيلية حية. لا إعلان CLOSED قبل دليل.

---

## 1. القرار التنفيذي

**ابدأ تنفيذ DSH-003 فورًا** بعد التحقق من PRE-DSH-GATE.

الوضع الحالي:
- DSH-001 Store Discovery: **RUNTIME_VERIFIED** ✓
- DSH-002 Home Discovery: **RUNTIME_VERIFIED** ✓ (app-client فقط)
- DSH-003 إلى DSH-010: **NOT_STARTED**
- control-panel: **فارغ تمامًا** — أعلى أولوية بعد app-client
- WLT: **CONTRACT_ONLY** — لا runtime حتى يُفعَّل بقرار موثق

**الأولوية المطلقة:** إغلاق control-panel لـ DSH-001 و DSH-002 أولًا، ثم DSH-003.

---

## 2. نطاق DSH

DSH يملك:
- `stores` — القائمة والتفاصيل
- `catalog` — الفئات والمنتجات والخيارات
- `cart` — السلة والكميات والصلاحية
- `checkout-intent` — نية الطلب فقط (بدون حساب مالي)
- `orders` — إنشاء وتتبع الطلبات
- `delivery lifecycle` — تتبع الكابتن والتسليم
- `partner readiness` — جاهزية الشريك وإدارة الكتالوج
- `captain execution` — تنفيذ الطلبات والتوصيل
- `field readiness/onboarding` — إعداد المتاجر ميدانيًا
- `support/operations visibility` — دعم العمليات
- `media references` — مراجع الوسائط عبر MinIO

DSH يُسمح له **فقط** بتخزين/عرض من WLT:
- `paymentSessionId`
- `paymentStatus`
- `financialReference`
- `settlementStatus` (قراءة فقط)

---

## 3. حدود WLT — القاعدة غير القابلة للتفاوض

WLT يملك **حصريًا**:
- `wallet` — المحفظة
- `payment` — الدفع
- `refund` — الاسترداد
- `settlement` — التسوية
- `payout` — الصرف
- `commission` — العمولة
- `COD` — الدفع نقدًا عند التسليم
- `ledger` — دفتر الحسابات
- `reconciliation` — المطابقة المالية
- `financial audit` — التدقيق المالي

**أي كود في DSH يحسب أو يطفر أيًا من هذه = REJECT_FINANCE_BOUNDARY_VIOLATION فوري.**

---

## 4. ما يُؤخذ من المانح

### ADOPT_AS_IS
| المصدر | الهدف | السبب |
|--------|--------|--------|
| dsh/backend/internal/store/ | services/dsh/backend/internal/store/ | مُطبَّق بالفعل في DSH-001 — المانح هو المصدر الأصلي |
| dsh/backend/internal/homediscovery/ | services/dsh/backend/internal/homediscovery/ | مُطبَّق في DSH-002 |
| tools/guards/no-financial-mutation-outside-wlt.mjs | نفسه في الهدف | موجود ومُفعَّل |

### ADAPT_NORMALIZE
| المصدر | ما يحتاج تطبيعًا |
|--------|-----------------|
| dsh/backend/internal/http/server.go | التحقق من CORS — يجب ألا يكون wildcard (*) في غير المحلي. إضافة HTTP timeouts |
| dsh/backend/database/migrations/ | مرجع فقط — لا تُعد تشغيل الـ migrations |
| dsh/backend/database/seeds/local/ | تطبيع معرفات المتاجر وروابط MinIO |
| dsh/frontend/screens/store-discovery/ | استبدال Tamagui المباشر بـ ui-kit |
| dsh/frontend/screens/home-discovery/ | إزالة mock banner data، استخدام client مولَّد |
| control-panel/runtime/src/stores/ | تطبيع API URL إلى 58080، استخدام client مولَّد |
| control-panel/runtime/src/orders/ | إزالة أي mutation مالية، الحالة فقط |
| app-captain/runtime/src/delivery/ | إزالة أي COD UI — الكابتن يرى حالة التسليم فقط |
| app-field/runtime/src/readiness/ | تطبيع للـ ui-kit |
| docker/ (compose files) | تعيين host port 58080 ← container 8080 |

### REFERENCE_ONLY (للاستخدام كمرجع بصري فقط)
| المصدر | الاستخدام |
|--------|----------|
| dsh/frontend/screens/catalog/ | تصميم شاشات DSH-003 |
| control-panel/runtime/src/catalog/ | تصميم DSH-003 control-panel |
| control-panel/runtime/src/home-discovery-admin/ | تصميم DSH-002 control-panel |
| wlt/backend/ | فهم بنية WLT للـ boundary |
| dsh/frontend/screens/checkout/ | تصميم DSH-005 shell فقط |
| control-panel/runtime/src/finance/ | تصميم DSH-010 (قراءة فقط) |
| app-captain/runtime/src/ | مرجع بصري لـ DSH-007 |
| app-field/runtime/src/ | مرجع بصري لـ DSH-008 |

---

## 5. ما يُرفض من المانح

### REJECT_FINANCE_BOUNDARY_VIOLATION
- أي checkout code يحسب إجمالي الدفع أو يستدعي WLT مباشرة من DSH
- أي صفحة finance في control-panel تتضمن mutation (ليس read-only)
- أي handler في DSH يُنشئ أو يعدل ledger/payout/commission
- أي COD collection UI في app-captain
- أي cart total يُعتبر حقيقة مالية

### REJECT_RUNTIME_RISK
- أي compose file يستخدم in-memory data store
- أي service بدون HTTP timeouts
- أي CORS wildcard في non-local environment
- أي fake actor IDs في runtime code

### REJECT_NOISE
- preview/demo/mock runtime data
- أي ملفات doc قديمة لا تخدم DSH/WLT مباشرة
- أي old port (8080-8084, 3000) كـ host port
- governance files قديمة غير مرتبطة بـ DSH/WLT

---

## 6. ترتيب التنفيذ

```
PRE-DSH-GATE [RUNTIME_VERIFIED ✓]
    ↓
DSH-001 app-client [RUNTIME_VERIFIED ✓]
DSH-002 app-client [RUNTIME_VERIFIED ✓]
    ↓
NEXT → DSH-001 control-panel    ← HIGHEST PRIORITY
NEXT → DSH-002 control-panel    ← HIGHEST PRIORITY
    ↓
DSH-003 Catalog (app-client + app-partner + control-panel)
    ↓
DSH-004 Cart + Serviceability (app-client + control-panel)
    ↓
DSH-005 Checkout Intent + WLT Boundary [يتطلب WLT activation]
    ↓
DSH-006 Order Creation + Partner Acceptance
    ↓
DSH-007 Captain Assignment + Delivery Lifecycle
    ↓
DSH-008 Field Readiness + Store Onboarding
    ↓
DSH-009 Support + Operations Room
    ↓
DSH-010 Finance Visibility [يتطلب WLT settlement endpoint]
```

---

## 7. بوابات القبول

### قبل أي شريحة (PRE-SLICE)
```powershell
Set-Location "C:\bthwani-suite-next"
git --no-pager status --short
git diff --check
pnpm run foundation:gate
pnpm contracts:lint
pnpm run guard:matrix:v3
pnpm run guard:no-financial-mutation-outside-wlt
```

### Docker Runtime
```powershell
pnpm runtime:all
pnpm runtime:status
```

### DSH API Smoke
```powershell
Invoke-RestMethod "http://localhost:58080/dsh/health"
Invoke-RestMethod "http://localhost:58080/dsh/readiness"
Invoke-RestMethod "http://localhost:58080/dsh/stores?limit=10&offset=0"
Invoke-RestMethod "http://localhost:58080/dsh/home-discovery"
```

### Android ADB
```powershell
$Adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $Adb devices
& $Adb reverse tcp:58080 tcp:58080
& $Adb reverse --list
```

---

## 8. أوامر تشغيل الأسطح

### app-client (port 18101)
```powershell
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
pnpm --dir apps/app-client/runtime exec expo start --dev-client --host localhost --port 18101 --android --clear
```

### app-partner (port 18102)
```powershell
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
pnpm --dir apps/app-partner/runtime exec expo start --dev-client --host localhost --port 18102 --android --clear
```

### app-captain (port 18103)
```powershell
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
pnpm --dir apps/app-captain/runtime exec expo start --dev-client --host localhost --port 18103 --android --clear
```

### app-field (port 18104)
```powershell
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
pnpm --dir apps/app-field/runtime exec expo start --dev-client --host localhost --port 18104 --android --clear
```

### control-panel (port 13000)
```powershell
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://localhost:58080"
pnpm --dir apps/control-panel/runtime dev --port 13000
```

---

## 9. معيار الإغلاق النهائي لـ DSH

لا يعتبر DSH مغلقًا إلا إذا تحقق **كل** التالي:

| المعيار | الحالة |
|---------|--------|
| machine-readable DSH/WLT محدث | ✓ مكتمل الآن |
| DSH-001 RUNTIME_VERIFIED (app-client) | ✓ |
| DSH-001 RUNTIME_VERIFIED (control-panel) | ✗ |
| DSH-002 RUNTIME_VERIFIED (app-client) | ✓ |
| DSH-002 RUNTIME_VERIFIED (control-panel) | ✗ |
| DSH-003 إلى DSH-010 مكتملة أو مستبعدة بقرار | ✗ |
| app-client: discovery+catalog+cart+checkout+tracking | جزئي |
| app-partner: orders+catalog+readiness | ✗ |
| app-captain: assignment+delivery | ✗ |
| app-field: readiness+onboarding | ✗ |
| control-panel: stores+catalog+orders+ops+support+finance | ✗ |
| WLT boundary مثبت (guard PASS) | ✓ |
| لا financial mutation خارج WLT | ✓ |
| لا old ports | ✓ |
| لا mock/demo/preview runtime | ✓ |
| Docker: postgres+dsh-api+minio تعمل | ✓ |
| runtime smoke بيانات حقيقية | ✓ |
| tests > 0 وليست وهمية | ✓ (7 ملفات) |
| screenshots للأسطح المتأثرة | جزئي (DSH-001, DSH-002) |
| git diff --check PASS | ✓ |
| foundation:gate PASS | ✓ |
| slice gates PASS | جزئي |

---

## 10. المخاطر المتبقية

| الخطر | الاحتمال | الأثر | الإجراء |
|-------|----------|-------|---------|
| control-panel فارغ تمامًا | مؤكد | عالٍ | أولوية قصوى في الخطوة التالية |
| DSH-005 يتطلب WLT activation | متوسط | عالٍ | لا تبدأ DSH-005 حتى WLT runtime يعمل |
| DSH-010 يتطلب WLT settlement API | متوسط | متوسط | DSH-010 آخر شريحة |
| donor checkout screens قد تخلط DSH/WLT | عالٍ | عالٍ | REJECT_FINANCE_BOUNDARY_VIOLATION — لا تنقل |
| donor CORS wildcard | متوسط | متوسط | ADAPT_NORMALIZE — تحقق قبل النقل |
| app-partner/captain/field فارغة | مؤكد | متوسط | مغطاة في DSH-003 إلى DSH-008 |

---

## 11. القرار: هل نبدأ PRE-DSH-GATE؟

**نعم. PRE-DSH-GATE حالته RUNTIME_VERIFIED.**

الخطوة التالية المقترحة:
```
إغلاق DSH-001 + DSH-002 في control-panel
ثم الموافقة على DSH-003
```

> ممنوع إعلان DSH CLOSED أو 100% قبل تشغيل الأدلة الحية لكل شريحة في كل سطح.
