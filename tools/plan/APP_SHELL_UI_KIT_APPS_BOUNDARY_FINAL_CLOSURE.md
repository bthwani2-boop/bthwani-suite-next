# APP_SHELL_UI_KIT_APPS_BOUNDARY_FINAL_CLOSURE

> ملف أمر تنفيذ مباشر لإغلاق حدود:
>
> - `shared/app-shell`
> - `shared/ui-kit`
> - `apps/*`
>
> الفرع المستهدف: `starting-implementing-slices`

---

الأمر التالي هو النسخة التنفيذية المصححة، مبنية على التشخيص الرقمي للمرفق: `shared/app-shell` فيه runtime/auth مخالف، و`shared/ui-kit` فيه shell/domain/CpPrimitives/platform تشظي، و`apps` ليست shell-only بالكامل. 

نفّذ إغلاقًا معماريًا وتشغيليًا نهائيًا للحدود التالية:

* shared/app-shell
* shared/ui-kit
* apps/*

اسم الشريحة:

APP_SHELL_UI_KIT_APPS_BOUNDARY_FINAL_CLOSURE

المستودع الجديد:

REPO_REMOTE:
bthwani2-boop/bthwani-suite-next

REPO_LOCAL:
C:\bthwani-suite-next

BRANCH:
starting-implementing-slices

المستودع المانح للقراءة فقط:

DONOR_REMOTE_READ_ONLY:
bthwani2-boop/bthwani-suite

DONOR_BRANCH_READ_ONLY:
main

القاعدة الحاكمة:
اعتبر الحالة FIX_REQUIRED حتى تثبت GitHub Remote والكود الحي عكس ذلك.
لا تعلن PASS أو READY أو CLOSED أو 100% إلا إذا أصبحت كل الأرقام المطلوبة صفرًا وكل الفحوص PASS.
هذا تنفيذ فعلي في الكود، وليس تقريرًا أو تحليلًا فقط.
يجب التنظيف والنقل والترتيب والإنشاء والحذف والتعديل وتحديث المسارات حتى لا تبقى شظايا أو آثار أو نقاط ضعف أو تكرار أو تضارب.

الهدف النهائي:

1. shared/app-shell:
   يجب أن يصبح contracts + registries + composition boundaries فقط.
   ممنوع أن يملك runtime/auth/hooks/design/components/Tamagui/API/fetch/navigation.

2. shared/ui-kit:
   يجب أن يصبح حزمة التصميم المركزية الوحيدة.
   يجب أن تعمل للويب والموبايل معًا.
   يجب أن تحتوي Design System فقط:
   foundation, appearance, theme, primitives, components, patterns, providers, web/mobile/next adapters.
   ممنوع أن تحتوي domain أو app shell أو control-panel runtime أو service-specific UI.

3. apps:
   يجب أن تكون shell/runtime فقط.
   apps تركّب providers/navigation/surface mounting فقط.
   لا تملك Design System محلي.
   لا تملك domain screens.
   لا تكرر Button/Card/Table/Header.
   لا تسحب ControlPanelShell من ui-kit.

القرار المعماري النهائي:

shared/app-shell =

* contracts only
* surface contracts
* service contracts
* service slots
* screen placement contracts
* ui-kit consumption contracts
* donor pattern contracts
* control-panel section/service registries فقط
* runtime-neutral boundaries

shared/ui-kit =

* Web + Mobile Design System
* Tamagui داخل ui-kit فقط
* public exports:
  @bthwani/ui-kit
  @bthwani/ui-kit/web
  @bthwani/ui-kit/mobile
  @bthwani/ui-kit/next

apps =

* runtime shell
* providers
* navigation runtime
* app/surface mounting
* لا business logic
* لا design system
* لا domain components

services =

* domain screens
* service frontend UI
* API clients
* domain behavior
* DSH/WLT-specific components

الممنوع نهائيًا:

داخل shared/app-shell:

* @bthwani/core-identity dependency
* useIdentitySession
* login/logout hooks
* devBypassLogin runtime export
* React runtime hooks إلا إذا ثبت أنها contract-only ولا تحمل behavior
* Tamagui imports
* design tokens
* visual components
* service screens
* API clients
* fetch/axios
* navigation runtime
* Next runtime
* auth-session-runtime

داخل shared/ui-kit:

* ControlPanelShell
* ControlPanelNavigation
* ControlPanelTopBar
* CpPrimitives public export
* CpButton
* CpTable
* CpKpiCard
* CpStatePanel
* StoreHero
* StoreFront
* ProductCard
* StoreCard
* AuthLoginCard
* BottomNavBar app navigation
* AppHeader إذا كان shell/navigation
* Payment components
* Cart components
* Order components
* DSH-specific components
* WLT-specific components
* service-specific props
* fetch/API/client logic
* app shell runtime
* navigation runtime
* preview/mock/runtime data
* duplicated Button/Card/Header/DataTable systems

داخل apps:

* reusable design system محلي
* raw random colors كنظام تصميم
* duplicate ControlPanelShell في الصفحات
* imports من ui-kit internals
* direct Tamagui imports
* domain screens التي مكانها services/*
* business logic

المرحلة 0 — إثبات الحالة الحالية رقميًا:

ابدأ من GitHub Remote فقط ثم طابقه مع الكود المحلي بعد checkout/pull.

نفّذ:

* تأكد من الفرع:
  starting-implementing-slices

* احسب قبل التعديل:
  total files in shared/app-shell
  total TS/TSX files in shared/app-shell
  total files in shared/ui-kit
  total TS/TSX files in shared/ui-kit
  total files in apps
  total TS/TSX files in apps

* احسب المخالفات قبل التعديل:
  app_shell_core_identity_dependency_count
  app_shell_auth_runtime_hook_count
  app_shell_tamagui_import_count
  app_shell_design_token_import_count
  app_shell_api_fetch_import_count

  ui_kit_domain_component_count
  ui_kit_control_panel_shell_count
  ui_kit_cp_primitives_public_export_count
  ui_kit_duplicate_core_component_count
  ui_kit_direct_fetch_count
  ui_kit_service_specific_import_count
  ui_kit_preview_mock_data_count

  apps_local_design_system_count
  apps_inline_reusable_button_card_table_count
  apps_control_panel_shell_from_ui_kit_count
  apps_deep_ui_kit_import_count
  apps_direct_tamagui_import_count

لا تبدأ التعديل قبل تسجيل هذه الأرقام.

المرحلة 1 — إغلاق shared/app-shell:

الهدف:
shared/app-shell يصبح contracts-only فعليًا.

نفّذ:

1. افحص:
   shared/app-shell/package.json
   shared/app-shell/src/index.ts
   shared/app-shell/src/shell-contracts.ts
   shared/app-shell/src/auth-session/*
   shared/app-shell/src/control-panel/*

2. أزل dependency المباشر:
   @bthwani/core-identity
   من shared/app-shell/package.json.

3. انقل auth runtime خارج shared/app-shell:

   * useIdentitySession
   * configureIdentitySession runtime re-export
   * getIdentityAccessToken runtime re-export
   * getIdentityState runtime re-export
   * loginIdentity
   * logoutIdentity
   * subscribeIdentityState
   * devBypassLogin

4. المكان الصحيح للـ auth runtime:

   * إما core/identity/clients أو core/identity/runtime
   * أو shared/auth-runtime إذا كان موجودًا أو قررت إنشاءه كحزمة runtime واضحة
   * ممنوع إبقاؤه في shared/app-shell.

5. حدّث كل المستهلكين الذين كانوا يستوردون auth session من:
   @bthwani/app-shell
   إلى المسار الصحيح الجديد.

6. إذا احتجت contract فقط داخل shared/app-shell:
   أنشئ auth-contract.ts أو identity-contract.ts يحتوي types/interfaces فقط.
   ممنوع أن يحتوي hooks أو runtime functions.

7. أبقِ داخل shared/app-shell فقط:

   * surfaces
   * services
   * current phase service surface map
   * service slots
   * screen placement contract
   * ui-kit consumption contract
   * donor pattern contract
   * shell contracts
   * control-panel registries إذا كانت metadata فقط

8. راجع control-panel داخل app-shell:

   * ControlPanelSectionRegistry يبقى إذا كان metadata.
   * ControlPanelServiceRegistry يبقى إذا كان metadata.
   * أي React context/hook فيه runtime behavior ينقل إلى apps/control-panel/runtime/src/shell أو apps/control-panel/runtime/src/context.
   * لا تترك runtime provider داخل app-shell إلا إذا أثبت أنه contract-only.

9. حدّث shared/app-shell/src/index.ts:
   يجب أن يصدّر contracts/registries فقط.
   ممنوع أن يصدّر auth runtime أو runtime hooks.

معايير PASS للمرحلة 1:

* app_shell_core_identity_dependency_count = 0
* app_shell_auth_runtime_hook_count = 0
* app_shell_tamagui_import_count = 0
* app_shell_design_token_import_count = 0
* app_shell_api_fetch_import_count = 0
* app_shell_runtime_provider_count = 0 أو مبرر كـ contract-only
* shared/app-shell typecheck = PASS

أي فشل = FIX_REQUIRED.

المرحلة 2 — إعادة بناء shared/ui-kit كحزمة تصميم Web + Mobile:

الهدف:
shared/ui-kit تصبح Design System حقيقي للويب والموبايل معًا.

لا تنسخ ui-kit من المانح كما هو.
استخدم المانح كمرجع معماري فقط:

* foundation/tokens
* appearance
* theme
* RTL/direction helpers
* primitives العامة
* component patterns العامة
* فكرة exports: root/web/mobile/next

ممنوع نقل تضخم المانح:

* domain components
* payment/store/cart/product components
* control panel runtime shell
* mobile command center runtime
* web app shell runtime
* Next routes
* providers التي تحمل runtime business behavior

الهيكل المستهدف:

shared/ui-kit/
package.json
tsconfig.json
tsconfig.contracts.json
README.md
src/
index.ts
web.ts
mobile.tsx
next.ts

```
foundation/
  index.ts
  colors.ts
  spacing.ts
  radius.ts
  typography.ts
  elevation.ts
  motion.ts
  sizing.ts
  breakpoints.ts
  borders.ts
  opacity.ts
  z-index.ts
  direction.ts
  semantic-theme.ts

appearance/
  index.ts
  appearance.ts
  appearance-provider.tsx

theme/
  index.ts
  tamagui-config.ts
  theme-provider.tsx

primitives/
  index.ts
  Box.tsx
  Text.tsx
  Surface.tsx
  Divider.tsx
  ScrollView.tsx

components/
  index.ts
  Button.tsx
  IconButton.tsx
  Card.tsx
  Badge.tsx
  Chip.tsx
  TextField.tsx
  SelectField.tsx
  Checkbox.tsx
  Radio.tsx
  Switch.tsx
  ListItem.tsx
  Avatar.tsx
  Image.tsx
  Dialog.tsx
  Sheet.tsx
  Tabs.tsx
  DataTable.tsx
  Toast.tsx

patterns/
  index.ts
  Screen.tsx
  Header.tsx
  SectionHeader.tsx
  ActionBar.tsx
  FilterBar.tsx
  StateView.tsx
  LoadingState.tsx
  EmptyState.tsx
  ErrorState.tsx
  SuccessState.tsx
  OfflineState.tsx
  PermissionState.tsx
  FormShell.tsx
  DetailShell.tsx

providers/
  index.ts
  UiKitProvider.tsx
  DirectionProvider.tsx
  PortalProvider.tsx

web/
  index.ts
  root-layout.tsx
  WebThemeStyle.tsx
  WebPageFrame.tsx
  WebSectionCard.tsx
  WebActionCard.tsx

mobile/
  index.ts
  MobileRoot.tsx
  MobileScreenFrame.tsx
  MobileStickyAction.tsx

next/
  index.ts
  metadata.ts
  NextThemeBridge.tsx

internal/
  createStyled.ts
  platform.ts
  assertions.ts
```

قواعد package exports:

في shared/ui-kit/package.json اجعل exports فقط:

".":
"./src/index.ts"

"./web":
"./src/web.ts"

"./mobile":
"./src/mobile.tsx"

"./next":
"./src/next.ts"

ممنوع:

* exports داخلية
* exports لكل component
* exports لـ platform/*
* exports لـ CpPrimitives
* exports لـ control-panel shell

قواعد root export:
src/index.ts يصدّر فقط:

* foundation
* appearance
* theme
* primitives
* components
* patterns
* providers

ممنوع في root export:

* web-only
* mobile-only
* next-only
* control-panel shell
* domain components
* service-specific UI

قواعد web export:
src/web.ts يصدّر فقط:

* web design adapter
* WebThemeStyle
* WebPageFrame
* WebSectionCard
* WebActionCard
* root-layout إذا كان عامًا
  ممنوع:
* ControlPanelShell
* ControlPanelNavigation
* ControlPanelTopBar
* DSH/WLT UI
* runtime routes
* service screens

قواعد mobile export:
src/mobile.tsx يصدّر فقط:

* mobile design adapter
* MobileRoot تصميمي عام
* MobileScreenFrame
* MobileStickyAction
  ممنوع:
* navigation runtime
* BottomNavBar app-specific
* app screen registry
* service screens

قواعد next export:
src/next.ts يصدّر فقط:

* NextThemeBridge
* metadata helpers
* root layout helpers العامة
  ممنوع:
* routes
* app shell runtime
* control-panel shell

نفّذ:

1. صنّف كل ملف داخل shared/ui-kit بقرار:

   * KEEP
   * REBUILD_FROM_DONOR_KERNEL
   * MERGE
   * MOVE_TO_CONTROL_PANEL_APP
   * MOVE_TO_MOBILE_APP
   * MOVE_TO_SERVICE_OWNER
   * DELETE_DUPLICATE
   * DELETE_DEAD

2. انقل خارج ui-kit:

   * ControlPanelShell
   * ControlPanelNavigation
   * ControlPanelTopBar
   * CpPrimitives
   * CpButton
   * CpTable
   * CpKpiCard
   * CpStatePanel
   * StoreHero
   * StoreFront
   * ProductCard
   * AuthLoginCard
   * BottomNavBar app navigation
   * AppHeader إذا كان shell/navigation
   * Payment/Cart/Order components

3. مكان النقل:

   * ControlPanel shell إلى:
     apps/control-panel/runtime/src/shell

   * ControlPanel-specific helper components إلى:
     apps/control-panel/runtime/src/components
     لكن لا تجعلها Design System ثاني.

   * Store/Product/Cart/Payment domain components إلى:
     services/dsh/frontend أو مالك المجال المناسب.

   * Auth UI/runtime إلى:
     core/identity أو auth surface owner.

   * Mobile navigation shell إلى:
     apps/app-client/runtime أو app runtime المناسب.

4. وحّد core components:

   * Button واحد
   * Card واحد
   * Header واحد
   * DataTable واحد
   * StateView واحد
   * TextField واحد
   * SelectField واحد
   * FilterBar واحد
   * ActionBar واحد

5. احذف أي duplicate implementation:

   * WebButton إذا كان يكرر Button العام
   * CpButton إذا كان يكرر Button
   * HTML button style system إذا كان يكرر Button
   * CpTable إذا كان يكرر DataTable
   * CpStatePanel إذا كان يكرر StateView

6. لا تسمح بأي direct Tamagui import خارج shared/ui-kit.

7. لا تسمح بأي fetch/API/client داخل shared/ui-kit.

8. لا تسمح بأي DSH/WLT imports داخل shared/ui-kit.

9. لا تسمح بأي preview/mock/runtime data داخل shared/ui-kit.

معايير PASS للمرحلة 2:

* ui_kit_domain_component_count = 0
* ui_kit_control_panel_shell_count = 0
* ui_kit_cp_primitives_public_export_count = 0
* ui_kit_duplicate_core_component_count = 0
* ui_kit_direct_fetch_count = 0
* ui_kit_service_specific_import_count = 0
* ui_kit_preview_mock_data_count = 0
* direct_tamagui_outside_ui_kit_count = 0
* deep_ui_kit_import_count = 0
* package_exports = exactly ".", "./web", "./mobile", "./next"
* root/web/mobile/next exports compile
* shared/ui-kit typecheck = PASS

أي فشل = FIX_REQUIRED.

المرحلة 3 — إغلاق apps كـ shell-only:

الهدف:
apps تصبح runtime shell فقط.

نفّذ:

1. افحص:
   apps/app-client/runtime
   apps/app-partner/runtime
   apps/app-captain/runtime
   apps/app-field/runtime
   apps/control-panel/runtime

2. القاعدة:
   apps تملك:

   * entry
   * providers
   * navigation runtime
   * shell composition
   * route mounting
   * surface mounting

3. apps لا تملك:

   * reusable design system
   * domain screens
   * domain logic
   * duplicated Button/Card/Table/Header
   * raw random colors كنظام تصميم
   * ControlPanelShell مستورد من ui-kit
   * deep ui-kit imports
   * direct Tamagui imports

4. Control Panel:

   * أنشئ/نظّف:
     apps/control-panel/runtime/src/shell
   * انقل إليه:
     ControlPanelShell
     ControlPanelNavigation
     ControlPanelTopBar
   * اجعل كل صفحات control-panel تستخدم shell موحدًا من apps/control-panel/runtime/src/shell.
   * أزل تكرار shell من الصفحات.
   * أزل inline design المتكرر.
   * استبدل buttons/cards/tables/states بمكونات ui-kit أو components محلية فوق ui-kit.

5. Mobile apps:

   * app-client/app-partner/app-captain/app-field تبقى shells فقط.
   * انقل inline icon system أو navigation components إلى shell واضح أو icon registry مناسب.
   * لا تضع domain screen logic داخل App.tsx.
   * screens تبقى من services/dsh/frontend أو service owner.

6. حدّث كل imports:

   * لا يوجد import لـ ControlPanelShell من @bthwani/ui-kit.
   * لا يوجد import لـ CpButton/CpTable/CpKpiCard من @bthwani/ui-kit.
   * لا يوجد deep import من @bthwani/ui-kit/src.
   * كل التصميم العام من:
     @bthwani/ui-kit
     @bthwani/ui-kit/web
     @bthwani/ui-kit/mobile
     @bthwani/ui-kit/next

معايير PASS للمرحلة 3:

* apps_local_design_system_count = 0
* apps_inline_reusable_button_card_table_count = 0
* apps_control_panel_shell_from_ui_kit_count = 0
* apps_deep_ui_kit_import_count = 0
* apps_direct_tamagui_import_count = 0
* control_panel_duplicated_shell_count = 0
* app_runtime_domain_screen_ownership_violations = 0
* affected apps typecheck = PASS

أي فشل = FIX_REQUIRED.

المرحلة 4 — تحديث المسارات والاستيرادات:

يجب تحديث كل المسارات بعد النقل.

ابحث في كامل المستودع عن:

* @bthwani/app-shell
* @bthwani/ui-kit
* @bthwani/ui-kit/src
* @bthwani/ui-kit/platform
* @bthwani/ui-kit/components
* @bthwani/ui-kit/primitives
* @bthwani/ui-kit/patterns
* ControlPanelShell
* ControlPanelNavigation
* ControlPanelTopBar
* CpButton
* CpTable
* CpKpiCard
* CpStatePanel
* useIdentitySession
* devBypassLogin
* BthwaniUiProvider
* MobileUiProvider
* direct Tamagui imports
* StoreHero
* StoreFront
* AuthLoginCard
* BottomNavBar
* ProductCard
* PaymentDecisionCard

لكل نتيجة:

* إما تحديث import إلى المالك الصحيح.
* أو نقل الملف للمالك الصحيح.
* أو حذف الكود إذا كان ميتًا.
* ممنوع ترك import مكسور.
* ممنوع ترك alias قديم بلا سبب.

المرحلة 5 — التنظيف والحذف:

احذف كل ما يلي إذا أصبح غير مستخدم:

* مجلدات فارغة.
* index.ts يعيد تصدير لا شيء.
* aliases قديمة.
* components مكررة.
* CpPrimitives إذا لم تعد لازمة.
* provider قديم داخل ui-kit إذا استبدل بـ UiKitProvider.
* auth-session داخل app-shell بعد النقل.
* platform/web القديم إذا استبدل بـ src/web.
* platform/mobile القديم إذا استبدل بـ src/mobile.
* أي preview/mock data داخل هذه الحدود.
* أي ملف evidence ضخم غير مطلوب لهذه الشريحة.

لا تترك:

* TODO
* FIXME
* TBD
* UNPROVEN
* dead exports
* orphan files
* duplicate names
* fallback imports
* temporary wrappers بلا سبب.

المرحلة 6 — guards:

أضف أو حدّث guards عملية، قليلة وواضحة:

1. no-runtime-in-app-shell
   يفشل إذا وجد:

* core-identity dependency داخل shared/app-shell
* auth runtime hooks داخل shared/app-shell
* fetch/axios/API clients داخل shared/app-shell
* Tamagui داخل shared/app-shell

2. no-domain-in-ui-kit
   يفشل إذا وجد داخل shared/ui-kit:

* DSH/WLT imports
* Store/Product/Cart/Payment/Auth domain components
* service-specific props
* API/fetch/client logic

3. no-control-panel-shell-in-ui-kit
   يفشل إذا وجد:

* ControlPanelShell
* ControlPanelNavigation
* ControlPanelTopBar
  داخل shared/ui-kit.

4. no-cp-primitives-public-export
   يفشل إذا وجد:

* CpPrimitives
* CpButton
* CpTable
* CpKpiCard
* CpStatePanel
  كـ public export من ui-kit.

5. no-direct-tamagui-outside-ui-kit
   يفشل إذا وجد Tamagui import خارج shared/ui-kit.

6. no-deep-ui-kit-imports
   يفشل إذا وجد:
   @bthwani/ui-kit/src/*
   @bthwani/ui-kit/components/*
   @bthwani/ui-kit/primitives/*
   @bthwani/ui-kit/patterns/*
   @bthwani/ui-kit/platform/*

7. apps-shell-only-boundary
   يفشل إذا apps تحتوي reusable design system أو domain screens أو duplicated shell.

أضف scripts لهذه guards في package.json إذا لم تكن موجودة.

المرحلة 7 — تحديث تعليمات الوكلاء:

حدّث:
.agents/EVIDENCE_GATE_ROUTER.md
.agents/skills/bthwani-ui-kit-design-lock/SKILL.md
وأي skill/guard router مرتبط.

المطلوب:

* إضافة UI_PACKAGE_REFACTOR gate.
* إضافة APP_SHELL_BOUNDARY gate.
* إضافة APPS_SHELL_ONLY gate.
* منع backend/docker/go/runtime smoke لهذا النوع إلا إذا غيّر runtime فعليًا.
* منع evidence packs الضخمة.
* final-slice-closure-judge يستخدم فقط عند إعلان إغلاق شامل.
* أي عمل على ui-kit يجب أن يثبت Web + Mobile boundary.
* أي عمل على app-shell يجب أن يثبت contracts-only.
* أي عمل على apps يجب أن يثبت shell-only.

المرحلة 8 — الفحوص المطلوبة:

شغّل فقط الفحوص المناسبة:

* git status
* git diff --check
* app-shell typecheck
* ui-kit typecheck
* affected apps typecheck
* affected services/frontend typecheck
* all new boundary guards
* import scan
* dead export scan إن توفر
* package exports check

ممنوع لهذا العمل إلا إذا تغيّر runtime فعليًا:

* Docker
* backend Go tests
* runtime smoke
* database migrations
* API smoke

المرحلة 9 — معايير الإغلاق النهائي:

لا يجوز إعلان PASS إلا إذا الأرقام التالية كلها صفر أو PASS:

APP_SHELL:

* core_identity_dependency = 0
* auth_runtime_hooks = 0
* runtime_provider_violations = 0
* tamagui_imports = 0
* design_token_imports = 0
* api_fetch_imports = 0
* service_screen_imports = 0
* app-shell typecheck = PASS

UI_KIT:

* domain_components = 0
* control_panel_shell = 0
* cp_primitives_public_exports = 0
* duplicate_core_components = 0
* direct_fetch = 0
* service_specific_imports = 0
* preview_mock_runtime_data = 0
* deep_import_consumers = 0
* direct_tamagui_outside_ui_kit = 0
* package_exports = PASS
* root_export = PASS
* web_export = PASS
* mobile_export = PASS
* next_export = PASS
* ui-kit typecheck = PASS

APPS:

* local_design_systems = 0
* duplicated_shells = 0
* control_panel_shell_from_ui_kit = 0
* inline_reusable_design_systems = 0
* deep_ui_kit_imports = 0
* direct_tamagui_imports = 0
* domain_screen_ownership_violations = 0
* affected apps typecheck = PASS

SERVICES:

* imports updated = PASS
* affected services/frontend typecheck = PASS
* service screens remain in service owners = PASS

GUARDS:

* no-runtime-in-app-shell = PASS
* no-domain-in-ui-kit = PASS
* no-control-panel-shell-in-ui-kit = PASS
* no-cp-primitives-public-export = PASS
* no-direct-tamagui-outside-ui-kit = PASS
* no-deep-ui-kit-imports = PASS
* apps-shell-only-boundary = PASS

GIT:

* git diff --check = PASS
* no broken imports = PASS
* no orphan files = PASS
* no dead exports = PASS أو موثق بسبب أداة غير متاحة
* no TODO/FIXME/TBD/UNPROVEN added = PASS

المرحلة 10 — المخرج النهائي المطلوب:

اكتب النتيجة فقط بهذا الشكل:

RESULT:
PASS أو FIX_REQUIRED

BRANCH:
starting-implementing-slices

SUMMARY:
سطر واحد يوضح هل تم إغلاق الحدود أم لا.

BEFORE COUNTS:
app-shell files = X
ui-kit files = X
apps files = X
violations total = X

AFTER COUNTS:
app-shell files = X
ui-kit files = X
apps files = X
violations total = X

MOVED:
قائمة مختصرة بالمسارات المنقولة

DELETED:
قائمة مختصرة بالمسارات المحذوفة

CREATED:
قائمة مختصرة بالمسارات المنشأة

UPDATED IMPORTS:
count = X
remaining broken imports = 0 أو العدد

BOUNDARY RESULTS:
app-shell contracts-only = PASS/FAIL
ui-kit web+mobile design-only = PASS/FAIL
apps shell-only = PASS/FAIL
services ownership preserved = PASS/FAIL

GUARDS:
no-runtime-in-app-shell = PASS/FAIL
no-domain-in-ui-kit = PASS/FAIL
no-control-panel-shell-in-ui-kit = PASS/FAIL
no-cp-primitives-public-export = PASS/FAIL
no-direct-tamagui-outside-ui-kit = PASS/FAIL
no-deep-ui-kit-imports = PASS/FAIL
apps-shell-only-boundary = PASS/FAIL

TYPECHECK:
app-shell = PASS/FAIL
ui-kit = PASS/FAIL
affected apps = PASS/FAIL
affected services/frontend = PASS/FAIL

FINAL DECISION:
PASS فقط إذا كل البنود PASS وكل المخالفات = 0.
غير ذلك FIX_REQUIRED مع قائمة المتبقي وأسبابه الدقيقة.

قاعدة أخيرة:
لا تترك أي أثر أو شظية.
لا تترك أي import قديم.
لا تترك أي export ميت.
لا تترك أي duplicate shell/design component.
لا تترك أي مسار مخالف للمالك الصحيح.
لا تكتب 100% إلا إذا كل الأرقام صفر وكل الفحوص PASS.

---

## ملاحظة تنفيذية

هذا الملف مخصص للنسخ إلى الوكيل/المحرر وتنفيذه على الكود الحي. لا يجوز إعلان `PASS` أو `100%` إلا إذا أصبحت كل المخالفات الرقمية صفرًا وكل الفحوص المطلوبة `PASS`.
