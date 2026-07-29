# 09 — الهيكل المستهدف وملكية الحقيقة

## توصيف المنصة

التوصيف الحاكم:

```text
BThwani Unified Multi-Surface B2B2C Commerce,
Delivery and Financial Platform
with deferred Partner SaaS capabilities
```

المنصة ليست SaaS خالصًا، وليس كل Partner أو Store Tenant. `tenant_id` لا يُستخدم كاسم عام لكل نطاق تشغيلي.

## نموذج النطاق

```text
Actor        = هوية ومصادقة وجلسة وصلاحيات
Organization = جهة قانونية أو تشغيلية
Partner      = علاقة تجارية داخل DSH
Store        = وحدة تشغيل وكتالوج وتنفيذ
Assignment   = تكليف Actor على Organization/Store/Area/Role
Tenant       = حد عزل SaaS حقيقي فقط عندما يكون مفعّلًا بعقد وبيانات وسياسة
```

أي حقل `tenant_id` لا يمثل Tenant حقيقيًا يجب أن يخضع لقرار:

```text
KEEP_AS_REAL_TENANT
RENAME_TO_ORGANIZATION_ID
RENAME_TO_PLATFORM_SCOPE_ID
RENAME_TO_PARTNER_ID
RENAME_TO_STORE_ID
REMOVE_AFTER_BACKFILL
```

## ملكية المجالات

### Identity

مالك وحيد لـ:

- Actor ID.
- اسم المستخدم والهاتف السيادي.
- المصادقة والتفعيل.
- الجلسات والأجهزة والتدوير والإبطال.
- الأدوار والصلاحيات الخام وقرارات الوصول المشتركة.
- ربط Actor بسطح دخول مسموح.

لا يملك:

- الملف الوظيفي.
- جاهزية الكابتن أو الميداني.
- تعيين المتجر أو المنطقة.
- الرصيد أو العمولة.

### Workforce

مالك وحيد لـ:

- ملف الشخص المهني أو الوظيفي.
- نوع العلاقة: موظف/مستقل/مزود خدمة.
- الحالة المهنية والجاهزية والوثائق.
- الهيكل الإداري والمدير المباشر والتكليف الوظيفي.
- ملف الكابتن والميداني المهني.

يربط Identity عبر `actor_id` ولا يكرر الهاتف أو بيانات الجلسة.

### DSH

مالك وحيد لـ:

- Partner وStore وعلاقاتهما التشغيلية.
- الكتالوج المركزي والـAssortment.
- السلة وقابلية الخدمة.
- الطلب وحالة التنفيذ.
- التجهيز والإسناد والتوصيل والإثبات والاستثناءات.
- النطاقات التشغيلية للمتجر والمنطقة.
- Outbox للحقائق التشغيلية.

لا يملك:

- دفتر مالي.
- رصيدًا قابلًا للتعديل.
- حقيقة الدفع أو الاسترداد أو التسوية.

### WLT

مالك وحيد لـ:

- Ledger kernel.
- المحافظ والقيود والرصيد المشتق.
- Payment sessions.
- COD custody والـcollections.
- Refunds.
- Commissions.
- Settlements.
- Payout destinations/requests.
- Reconciliation.
- Idempotency المالية ونتائج المزود المجهولة.

DSH يحتفظ فقط بمراجع وحالات قراءة راجعة، لا نسخة مالية موازية.

### Platform Control

مالك فقط لـ:

- التغييرات السيادية المحكومة.
- الموافقة والتطبيق والـrollback.
- Feature flags وprogressive rollout.
- صحة الخدمات ومراجع السياسات السيادية.

لا يتحول إلى نسخة من إدارة DSH أو Workforce أو WLT.

### Providers

مالك لـ:

- تعريف المزود.
- نوعه وقدراته وحالته الصحية.
- مراجع الأسرار لا الأسرار نفسها.
- سياسات الاستدعاء والمهل والـcircuit state.

### Shared frontend brains

```text
services/dsh/frontend/shared
services/wlt/frontend/shared/dsh
```

هما مالكا controllers/adapters/view-models الخاصة بمجاليهما. التطبيقات والأسطح طبقة تركيب وعرض، ولا تملك business rules أو permissions أو enums محلية.

## الهيكل التعاقدي المستهدف

```text
contracts/master.openapi.yaml
├── core/identity/contracts/identity.openapi.yaml
├── core/workforce/contracts/workforce.openapi.yaml
├── core/platform-control/contracts/platform-control.openapi.yaml
├── core/providers/contracts/providers.openapi.yaml
├── services/dsh/contracts/dsh.openapi.yaml
└── services/wlt/contracts/wlt.openapi.yaml
```

داخل كل مجال:

```text
modules/*.openapi.yaml
→ deterministic composer
→ generated/<service>.bundle.openapi.yaml
→ generated client
→ thin adapter
→ shared brain
→ surfaces
```

عقد الدخول لا يكرر عمليات الوحدات يدويًا. إما أن يحيل إليها أو يولد منها.

## الجذر المستهدف

الجذر يجب أن يبقى رقيقًا:

```text
AGENTS.md
README.md
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
nx.json
contracts/
apps/
core/
services/
shared/
infra/
governance/
tools/
.github/
```

أي تقرير تدقيق، ملف Pasted، سجل تنفيذ تاريخي، أو نسخة OpenAPI موازية في الجذر يدمج أو ينقل أو يحذف.

## الخدمات الوهمية أو المؤجلة

المجلدات مثل:

```text
services/amn
services/arb
services/esf
services/knz
services/kwd
services/mrf
services/snd
```

لا تبقى لمجرد حجز اسم. لكل واحد قرار واحد:

```text
ACTIVE_SERVICE
FUTURE_CAPABILITY_REGISTRY_ONLY
MERGE_INTO_EXISTING_OWNER
DELETE_EMPTY_NAMESPACE
```

الخدمة النشطة يجب أن تملك على الأقل:

- مسؤولية مجال واضحة.
- عقد دخول.
- Runtime أو سبب موثق لعدم وجوده.
- بيانات أو مصدر خارجي.
- اختبارات وبوابة صحة.

## منع الترقيعات البنيوية

ممنوع اعتماد أي حل من الأنماط التالية:

```text
write wrong → repair later
contract A - retirement registry
role fallback when permission missing
retry/restart to hide readiness failure
generated filename with handwritten content
entry contract copying module operations
local path embedded as production configuration
empty folders representing imaginary architecture
```

الحل المقبول دائمًا:

```text
canonical owner
→ migrate consumers
→ prove parity
→ delete old path
→ add gate preventing recurrence
```
