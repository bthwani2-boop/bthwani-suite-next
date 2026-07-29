# 15 — إغلاق الأسطح والـRuntime من الطرف إلى الطرف

## المبدأ

لا يعتبر وجود Contract أو شاشة أو Route إنجازًا منفصلًا. الإغلاق وحدة رأسية:

```text
business invariant
→ database owner
→ backend transaction
→ OpenAPI operation
→ generated client
→ shared controller/view-model
→ surface state/action
→ readback
→ negative authorization proof
```

## الأسطح الحاكمة

```text
app-client
app-partner
app-captain
app-field
control-panel
public website only if proven active
```

`webapp` و`website` لا يبقيان سطحين متوازيين دون قرار منتج ونشر مختلفين.

## قاعدة العقل المشترك

### DSH

```text
services/dsh/frontend/shared
```

يملك:

- Controllers.
- DSH adapters.
- View models.
- Error/state mapping.
- Capability permissions projection.
- Shared domain presentation rules.

### WLT داخل أسطح DSH

```text
services/wlt/frontend/shared/dsh
```

يملك:

- Financial controllers.
- Wallet/payment/refund/settlement projections.
- Typed financial error mapping.
- Readback and reconciliation states.

ممنوع أن يملك DSH frontend نسخًا مولدة أو `ui_copy` من WLT.

## فحص كل شاشة

لكل Route/Tab/Card/Icon/Action:

```yaml
surface:
route:
capability:
actor_types:
required_permissions:
controller:
client_operation:
contract_operation_id:
runtime_route:
data_owner:
readback_operation:
states:
  loading:
  empty:
  success:
  validation_error:
  forbidden:
  blocked:
  offline:
  unknown_result:
  stale_data:
negative_tests:
```

أي شاشة بلا capability أو controller أو operation تعد `ORPHAN_SURFACE`.

## منع raw calls

ممنوع داخل Screens/components:

```text
fetch(
axios.
new URL(apiBase)
hardcoded /dsh or /wlt paths
manual Authorization headers
domain state transitions
```

الاستثناء الوحيد: طبقة HTTP client الحاكمة.

## Identity and activation surfaces

### Captain/Field/Partner operational apps

بعد أول تفعيل:

```text
phone + issued challenge
→ session/device registration
→ choose local unlock method
→ SecureStore-backed session
→ biometric/PIN/pattern unlock locally
→ server session validation/readback
```

لا يُطلب OTP في كل فتح، ولا يتحول unlock المحلي إلى مصادقة سيرفر مستقلة.

### Client

له سياسة منتج منفصلة، لكن يستخدم Identity owner نفسه ولا يكرر session logic.

## رحلة Workforce الرأسية

```text
project manager creates senior employee
→ department manager/employee assignment
→ Identity actor provisioned with trusted scope
→ activation issued by owning department
→ app activation
→ GET workforce/me
→ readiness gate
→ DSH assignments loaded
→ WLT profile/reference loaded if financial role
→ unauthorized scope denied
```

## الرحلات التشغيلية الإلزامية

### Partner/store/catalog

```text
partner onboarding
→ store creation
→ catalog assortment
→ publication
→ customer storefront
→ order acceptance
```

### Delivery

```text
checkout
→ preparation
→ fulfillment mode decision
→ captain/partner pickup assignment
→ pickup
→ transit
→ delivery proof
→ exception/return
```

### Finance

```text
payment/COD decision
→ WLT session/custody
→ order reference
→ capture/collection
→ commission
→ settlement
→ payout
→ reconciliation/readback
```

## Runtime

### واجهة واحدة

اختيار أسماء حاكمة:

```text
runtime:up
runtime:down
runtime:reset
runtime:status
runtime:smoke
runtime:migrate
runtime:seed:local
```

Profiles تكون arguments أو أسماء فرعية ذات معنى، لا aliases متعددة للأمر نفسه.

### Readiness

Readiness يثبت:

- الاتصال بقاعدة البيانات.
- تطبيق schema المطلوب.
- قدرة الاستعلام الأساسية.
- dependencies المطلوبة.

لا ينجح بمجرد فتح port، ولا يعالج الفشل بإعادة تشغيل المرحلة كاملة.

### Clean environment

الإغلاق يتطلب:

```text
fresh checkout
→ locked toolchain
→ env from example + secrets external
→ runtime up
→ migrate
→ optional local seed
→ readiness
→ smoke
→ vertical journeys
```

لا إعداد يدوي مخفي ولا مسار خاص بجهاز واحد.

## بوابات الإغلاق

```yaml
orphan_surfaces: 0
raw_api_calls_in_surfaces: 0
local_domain_state_machines: 0
local_permission_fallbacks: 0
missing_loading_states: 0
missing_error_states: 0
success_without_readback: 0
runtime_alias_groups: 0
readiness_false_positives: 0
clean_environment_manual_steps: 0
multi_surface_contract_drift: 0
```
