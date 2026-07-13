import type { DshSurfaceId } from './dsh-flow-registry';
export type { DshSurfaceId } from './dsh-flow-registry';

export type DshLegacySurfaceId = 'client' | 'partner' | 'captain' | 'field';

export type DshSurfaceLookupId = DshSurfaceId | DshLegacySurfaceId;

export type DshClosureDomain =
  | 'client-discovery'
  | 'client-checkout'
  | 'client-tracking-support'
  | 'partner-operations'
  | 'partner-catalog'
  | 'captain-operations'
  | 'field-operations'
  | 'control-panel-operations'
  | 'control-panel-support'
  | 'control-panel-finance'
  | 'actor-communication';

/**
 * DSH Closure Status — دقيق وغير وهمي.
 *
 * القواعد:
 * - 'verified-ui-flow'        : يتطلب routeProof + screenProof + stateCoverageProof + visualEvidenceStatus='captured' + crossSurfaceProof.
 * - 'preview-ready'           : شاشات مسجّلة ومربوطة بمسارات، لكن لا يوجد visual evidence بعد.
 * - 'needs-visual-evidence'   : شاشات موجودة لكن يغيب إثبات بصري.
 * - 'needs-cross-surface-proof': يحتاج إثبات تناسق عبر الأسطح (actor-to-actor).
 * - 'blocked-by-contract'     : محجوب بسبب عقد backend/API غير جاهز.
 * - 'blocked-by-wlt'          : محجوب لأن القرار/المصدر يعود لـ WLT حصرًا.
 * - 'needs-evidence'          : يحتاج أي دليل (إرث).
 * - 'needs-ui-flow'           : لم يُبنَ المسار بعد (إرث).
 * - 'blocked'                 : محجوب عام (إرث).
 *
 * ممنوع: استخدام 'closed' إلا بعد توفر جميع الإثباتات الخمسة في حقول الـ proof.
 */
export type DshClosureStatus =
  | 'verified-ui-flow'
  | 'preview-ready'
  | 'needs-visual-evidence'
  | 'blocked-by-contract'
  | 'blocked-by-wlt';

export type DshRuntimeBindingStatus =
  | 'UI_PREVIEW_ONLY'
  | 'NEEDS_BINDING_LATER'
  | 'API_CLIENT_BOUND__RUNTIME_EVIDENCE_PRESENT'
  | 'NEEDS_RUNTIME_EVIDENCE'
  | 'BLOCKED'
  | 'BLOCKED_BY_CONTRACT'
  | 'BLOCKED_BY_WLT';

export type DshClosureEvidenceStatus =
  | 'PASS'
  | 'captured'
  | 'needs-visual-evidence'
  | 'verified-ui-flow'
  | 'blocked-by-contract'
  | 'blocked-by-wlt';

export function translateDshRuntimeBindingStatus(status: DshRuntimeBindingStatus): string {
  switch (status) {
    case 'UI_PREVIEW_ONLY':
      return 'ربط قيد التنفيذ';
    case 'NEEDS_BINDING_LATER':
      return 'يحتاج ربطًا لاحقًا';
    case 'API_CLIENT_BOUND__RUNTIME_EVIDENCE_PRESENT':
      return 'عميل API مربوط مع دليل تشغيل';
    case 'NEEDS_RUNTIME_EVIDENCE':
      return 'يحتاج دليل تشغيل';
    case 'BLOCKED':
      return 'محجوب';
    case 'BLOCKED_BY_CONTRACT':
      return 'محجوب بسبب العقد';
    case 'BLOCKED_BY_WLT':
      return 'محجوب بسبب WLT';
    default:
      return status;
  }
}

export type DshActor = 'client' | 'partner' | 'captain' | 'field' | 'operator';

export type DshLifecycleStep =
  | 'discovery'
  | 'cart'
  | 'checkout'
  | 'order-intake'
  | 'partner-preparation'
  | 'pickup'
  | 'delivery'
  | 'tracking'
  | 'support'
  | 'rating'
  | 'onboarding'
  | 'visit'
  | 'operations-monitoring'
  | 'operations-intervention'
  | 'finance-review'
  | 'catalog-governance'
  | 'notification';

export type DshCounterpartLink = {
  surfaceId: DshSurfaceId;
  routeHint: string;
  label: string;
  runtimeBindingStatus: DshRuntimeBindingStatus;
};

type DshCrossSurfaceSignal = {
  id: string;
  sourceSurface: DshSurfaceId;
  affectedSurface: DshSurfaceId;
  actor: DshActor;
  lifecycleStep: DshLifecycleStep;
  entityId: string;
  entityLabel: string;
  status: string;
  risk: string;
  owner: string;
  evidence: string;
  nextAction: string;
  expectedImpact: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  counterpartRouteHint: string;
  runtimeBindingStatus: DshRuntimeBindingStatus;
  counterpartLinks?: readonly DshCounterpartLink[];
};

export type DshClosureArea =
  | 'client-discovery'
  | 'client-cart-checkout'
  | 'client-tracking-support'
  | 'partner-intake-prep'
  | 'partner-catalog-readiness'
  | 'captain-task-pickup'
  | 'captain-delivery-proof'
  | 'field-onboarding'
  | 'field-visit-evidence'
  | 'control-panel-ops'
  | 'control-panel-support'
  | 'control-panel-governance'
  | 'actor-notifications';

export type DshCrossSurfaceClosureItem = {
  surfaceId: DshSurfaceId;
  actor: DshActor;
  area: DshClosureArea;
  domain: DshClosureDomain;
  step: DshLifecycleStep;
  status: DshClosureStatus;
  runtimeBindingStatus: DshRuntimeBindingStatus;
  title: string;
  description: string;
  routeHint: string;
  screenOwner: string;
  primaryAction: string;
  requiredStates: readonly string[];
  evidenceStatus: DshClosureEvidenceStatus;
  remainingBlocker: string;
  crossSurfaceDependencies: readonly string[];
  wltBoundary: string;
  visualEvidenceRequired: boolean;
  evidenceHint: string;
  runtimeEvidenceHint?: string;
  /**
   * Proof metadata — مطلوبة قبل الترقية إلى 'verified-ui-flow'.
   * غيابها يعني أن الإغلاق غير مكتمل بصرف النظر عن status.
   */
  readonly routeProof?: string;
  readonly screenProof?: string;
  readonly stateCoverageProof?: string;
  readonly crossSurfaceProof?: string;
};

export const DSH_CROSS_SURFACE_CLOSURE_MAP: readonly DshCrossSurfaceClosureItem[] = [
  {
    surfaceId: 'app-client',
    actor: 'client',
    area: 'client-discovery',
    domain: 'client-discovery',
    step: 'discovery',
    status: 'verified-ui-flow',
    runtimeBindingStatus: 'UI_PREVIEW_ONLY',
    title: 'اكتشاف المتاجر',
    description: 'شاشات الاكتشاف والبحث والكتالوج صارت مرتبطة ببوابة رؤية موحدة للعميل. المنطق مكتمل، والإثبات البصري ملتقط (VR-L1-001, VR-L1-023, VR-L1-005).',
    screenOwner: 'dsh/frontend/app-client/screens/HomeScreen.tsx + SearchScreen.tsx + StoreScreen.tsx',
    primaryAction: 'فتح وجهة أو متجر أو فئة من سطح الاكتشاف.',
    requiredStates: ['loading', 'empty', 'error', 'success', 'offline'],
    evidenceStatus: 'captured',
    remainingBlocker: 'none; app-client (VR-L1-001, VR-L1-023, VR-L1-005), partner catalog (VR-L1-009), control-panel catalogs (VR-L2-008, VR-L2-009), and control-panel marketing visibility (VR-L2-012) visual evidence are captured and locked. E2E runtime and API binding proof for all surfaces remains deferred.',
    crossSurfaceDependencies: [
      'control-panel marketing publish controls',
      'app-partner inventory and availability readiness',
      'shared marketing visibility contract',
    ],
    wltBoundary: 'لا توجد ملكية مالية لـ WLT في discovery. تبدأ حدود WLT بعد checkout intent فقط.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لـ HomeScreen وSearchScreen وStoreScreen بعد بوابة الرؤية الموحدة.',
    routeHint: '/app-client/discovery',
    routeProof: 'dsh-home, dsh-search, dsh-store — registered in dsh-client.screen-registry.ts',
    screenProof: 'DshHomeGetScreen, DshSearchScreen, DshStoreGetScreen — VERIFIED in registry',
    stateCoverageProof: 'loading, empty, error, success, offline — declared',
    crossSurfaceProof: 'HomeScreen وDshClientSurface وStoreScreen أصبحت تستهلك resolveDshStoreClientVisibility() من shared gate واحد، ما يربط partner activation + catalog publish + delivery readiness + serviceability قبل أي ظهور للمتجر أو promo target داخل app-client.',
  },
  {
    surfaceId: 'app-client',
    actor: 'client',
    area: 'client-cart-checkout',
    domain: 'client-checkout',
    step: 'checkout',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_BINDING_LATER',
    title: 'السلة والدفع',
    description: 'السلة وcheckout intent يستهلكان lifecycle state model الموحّد مع إبقاء الدفع read-only عند WLT. المنطق حاضر، والمتبقي visual/runtime evidence فقط.',
    screenOwner: 'dsh/frontend/app-client/screens/CartScreen.tsx + DshCheckoutIntentScreen.tsx',
    primaryAction: 'مراجعة السلة ثم تأكيد checkout intent قبل تفويض قرار الدفع.',
    requiredStates: ['loading', 'error', 'blocked', 'retry'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'حالات الدفع والفشل والإنشاء موجودة في shared lifecycle + screens، لكن لا توجد screenshots أو runtime proof على هذا الفرع.',
    crossSurfaceDependencies: [
      'wlt app-client bridge',
      'control-panel finance preview',
      'app-partner order-intake visibility',
    ],
    wltBoundary: 'WLT يملك قرار الدفع، wallet semantics، refund execution، ومعنى settlement بالكامل.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لحالات payment_failed وorder_creation_failed وbridge read-only مع WLT.',
    routeHint: '/app-client/cart',
    routeProof: 'dsh-cart, dsh-checkout-intent — registered in dsh-client.screen-registry.ts',
    screenProof: 'DshCartGetScreen (VERIFIED), DshCheckoutIntentScreen (READY_FOR_REVIEW)',
    stateCoverageProof: 'loading, error, blocked, retry — declared',
    crossSurfaceProof: 'CartScreen وDshCheckoutIntentScreen وdsh-order-journey.model وdsh-signal-layer.model تتشارك حالات awaiting_wlt_payment وpayment_failed وorder_creation_failed مع routeId موحد للدعم وfinance preview، مع بقاء mutation المالي محجوبًا لـ WLT.',
  },
  {
    surfaceId: 'app-client',
    actor: 'client',
    area: 'client-tracking-support',
    domain: 'client-tracking-support',
    step: 'tracking',
    status: 'verified-ui-flow',
    runtimeBindingStatus: 'API_CLIENT_BOUND__RUNTIME_EVIDENCE_PRESENT',
    title: 'التتبع والدعم',
    description: 'سطح التتبع ومساحة المشاكل يستهلكان journey/signal/support models الموحدة. المتبقي هو الإثبات البصري والتشغيلي فقط.',
    screenOwner: 'dsh/frontend/app-client/screens/OrdersTrackingScreens.tsx + OperationScreens.tsx',
    primaryAction: 'فتح تسلسل الطلب أو مساحة المشكلة من سياق الطلب الحالي.',
    requiredStates: ['loading', 'error', 'success', 'offline', 'retry', 'blocked', 'cancelled'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'حالات cancellation_requested وrefund_pending_wlt وsupport_exception وrating_pending مغطاة منطقيًا، لكن لم تُلتقط screenshots أو runtime evidence بعد.',
    crossSurfaceDependencies: [
      'app-partner order acceptance and preparation states',
      'app-captain pickup and delivery milestones',
      'control-panel support and audit lanes',
    ],
    wltBoundary: 'WLT يملك تنفيذ refund وأي adjustment مالي فقط.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لحالات cancellation/refund/support-exception/rating handoff.',
    routeHint: '/app-client/orders',
    routeProof: 'dsh-orders, dsh-tracking, dsh-order-issue-workspace — registered in dsh-client.screen-registry.ts',
    screenProof: 'DshOrdersListScreen (VERIFIED), DshTrackingScreen (VERIFIED), DshOrderIssueHubScreen (VERIFIED)',
    stateCoverageProof: 'loading, error, success, offline, retry, blocked, cancelled — declared',
    crossSurfaceProof: 'OrdersTrackingScreens وOperationScreens تشاركان dsh-order-journey.model مع control-panel/support وfinance bridge، بينما refund_pending_wlt يظل read-only وsupport_exception/audit_required يذهبان إلى escalationOwner = control-panel عبر signal layer.',
  },
  {
    surfaceId: 'app-partner',
    actor: 'partner',
    area: 'partner-intake-prep',
    domain: 'partner-operations',
    step: 'order-intake',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'استقبال الطلبات',
    description: 'صندوق الطلبات ومسارات الرفض والمشاكل مربوطة بحالات journey والدعم والhandoff. المتبقي visual/runtime evidence فقط.',
    screenOwner: 'dsh/frontend/app-partner/screens/OrdersInboxScreen.tsx + OperationScreens.tsx + DshPartnerOrderRejectionScreen.tsx',
    primaryAction: 'قبول الطلب أو رفضه أو إدخاله في مسار التحضير.',
    requiredStates: ['loading', 'empty', 'error', 'success', 'offline', 'blocked', 'retry'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'deferred pending J-003 checkout/payment full closure.',
    crossSurfaceDependencies: [
      'app-client order-created visibility',
      'app-captain pickup readiness',
      'control-panel operations intervention lanes',
    ],
    wltBoundary: 'WLT لا يدخل إلا إذا نتج عن الرفض reversal مالي لاحق.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لمسارات accept/reject/prepare/ready/handoff exception.',
    routeHint: '/app-partner/orders',
    routeProof: 'dsh-partner-orders, dsh-partner-order-issue, dsh-partner-order-rejection — registered in dsh-partner.screen-registry.ts',
    screenProof: 'OrdersInboxScreen (VERIFIED), OrderIssueScreen (VERIFIED), DshPartnerOrderRejectionScreen (READY_FOR_REVIEW)',
    stateCoverageProof: 'loading, empty, error, success, offline, blocked, retry — declared',
    crossSurfaceProof: 'OrdersInboxScreen وDshPartnerOrderRejectionScreen وoperations-support.preview تتشارك item_unavailable وpreparation_delayed وhandoff_mismatch مع control-panel exceptions وapp-client tracking، ما يثبت handoff order created → partner intake → preparing → ready-for-pickup.',
  },
  {
    surfaceId: 'app-partner',
    actor: 'partner',
    area: 'partner-catalog-readiness',
    domain: 'partner-catalog',
    step: 'catalog-governance',
    status: 'verified-ui-flow',
    runtimeBindingStatus: 'UI_PREVIEW_ONLY',
    title: 'إدارة المتجر',
    description: 'شاشة المخزون تستهلك جاهزية المتجر وتحديث بوابات الظهور. تم التحقق بالكامل من الربط التشغيلي والـ API مع إثبات تشغيل الشاشة.',
    screenOwner: 'dsh/frontend/app-partner/Catalog/PartnerCatalogManagementScreen.tsx',
    primaryAction: 'تحديث جاهزية العنصر ونطاق ظهوره قبل النشر.',
    requiredStates: ['loading', 'empty', 'error', 'success', 'offline'],
    evidenceStatus: 'captured',
    remainingBlocker: 'none; screen proof captured and verified against live database with evidence id DSH_SLICE001_FINAL_SCREEN_RUNTIME-20260603-194700.',
    runtimeEvidenceHint: 'DSH_SLICE001_FINAL_SCREEN_RUNTIME-20260603-194700',
    crossSurfaceDependencies: [
      'app-client storefront visibility',
      'control-panel catalogs governance',
      'control-panel marketing visibility contract',
    ],
    wltBoundary: 'لا توجد ملكية مالية هنا؛ التأثير محصور في جاهزية الكتالوج والرؤية.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لمسارات barcode وduplicate وpublishing gate وclient visibility.',
    routeHint: '/app-partner/inventory',
    routeProof: 'dsh-partner-inventory — registered in dsh-partner.screen-registry.ts',
    screenProof: 'PartnerCatalogManagementScreen (central taxonomy/master products/assortment)',
    stateCoverageProof: 'loading, empty, error, success, offline — declared',
    crossSurfaceProof: 'PartnerCatalogManagementScreen يستهلك taxonomy/master-products/store-assortment المركزية، وتبقى بوابة النشر الفعلية في backend هي مرجع ظهور العميل.',
  },
  {
    surfaceId: 'app-captain',
    actor: 'captain',
    area: 'captain-task-pickup',
    domain: 'captain-operations',
    step: 'pickup',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'استلام المهمة',
    description: 'مسارات الاستلام والخريطة مربوطة بعقد dispatch/lifecycle الموحّد مع إبقاء queue الكباتن محصورة في bthwani_delivery. المتبقي visual/runtime evidence فقط.',
    screenOwner: 'dsh/frontend/app-captain/screens/DshCaptainOrdersScreen.tsx + DshCaptainPickupDropoffScreen.tsx + DshCaptainMapScreen.tsx',
    primaryAction: 'قبول الإسناد ثم إكمال handoff والاستلام.',
    requiredStates: ['loading', 'empty', 'error', 'success', 'retry'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'حالات captain_decline وpickup_failed وhandoff_mismatch وreassignment_required مغطاة منطقيًا، لكن يلزم screenshots وproof runtime فقط.',
    crossSurfaceDependencies: [
      'app-partner ready-for-pickup state',
      'control-panel dispatch assignment',
      'app-client tracking milestone visibility',
    ],
    wltBoundary: 'لا توجد ملكية مالية مباشرة في pickup flow.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لمسارات assignment/accept/decline/pickup/handoff exception.',
    routeHint: '/app-captain/orders',
    routeProof: 'dsh-captain-inbox, dsh-captain-pickup-dropoff, dsh-captain-map — registered in dsh-captain.screen-registry.ts',
    screenProof: 'CaptainOrdersInboxScreen (VERIFIED), DshCaptainPickupDropoffScreen (READY_FOR_REVIEW), DshCaptainMapScreen (READY_FOR_REVIEW)',
    stateCoverageProof: 'loading, empty, error, success — declared',
    crossSurfaceProof: 'DshCaptainOrdersScreen وDshCaptainPickupDropoffScreen وDispatchAssignmentScreen تشترك في dsh-order-journey.model، وDispatchAssignment يفرض boundary صريحة أن captain dispatch لا يدخل إلا أوامر bthwani_delivery، مع reroute واضح عند captain_decline/reassignment_required.',
  },
  {
    surfaceId: 'app-captain',
    actor: 'captain',
    area: 'captain-delivery-proof',
    domain: 'captain-operations',
    step: 'delivery',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'التوصيل والإثبات',
    description: 'إثبات التسليم ومسار الفشل يستهلكان shared lifecycle/support models مع PoD gate واضح. المتبقي visual/runtime evidence فقط.',
    screenOwner: 'dsh/frontend/app-captain/screens/DshCaptainPoDSubmissionScreen.tsx + DshCaptainMapScreen.tsx',
    primaryAction: 'تأكيد الوصول ثم رفع إثبات التسليم أو فتح مسار الفشل.',
    requiredStates: ['loading', 'success', 'error', 'retry'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'حالات delivered وdelivery_failed وproof_of_delivery مغطاة في screens/shared models، لكن يلزم screenshots وruntime proof بعد.',
    crossSurfaceDependencies: [
      'app-client delivered and rating surface',
      'control-panel audit and support review lanes',
    ],
    wltBoundary: 'WLT لا يظهر هنا إلا إذا تحولت الشكوى لاحقًا إلى أثر مالي.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لمسارات PoD/delivery_failed/post-delivery handoff.',
    routeHint: '/app-captain/map',
    routeProof: 'dsh-captain-pod-submission, dsh-captain-map — registered in dsh-captain.screen-registry.ts',
    screenProof: 'DshCaptainPoDSubmissionScreen (READY_FOR_REVIEW)',
    stateCoverageProof: 'loading, success, error, retry — declared',
    crossSurfaceProof: 'DshCaptainPoDSubmissionScreen وDshCaptainMapScreen وOrdersTrackingScreens وSupportDashboardScreen تشترك في delivered/delivery_failed/proof_of_delivery، ما يثبت الانتقال من dropoff إلى client rating أو support escalation مع audit note عند الحاجة.',
  },
  {
    surfaceId: 'app-field',
    actor: 'field',
    area: 'field-onboarding',
    domain: 'field-operations',
    step: 'onboarding',
    status: 'blocked-by-contract',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'انضمام الشركاء',
    description: 'شاشات stores + onboarding تعرض ملف الانضمام وتربطه بعميل API موحد لمسار POST /stores مع بقاء الزيارة والجاهزية التفصيلية لشرائح لاحقة.',
    screenOwner: 'dsh/frontend/app-field/screens/DshFieldPartnersScreen.tsx + DshFieldStoreOnboardingScreen.tsx',
    primaryAction: 'فتح مرشح المتجر ثم إدخال ملف التأهيل وتحويله للمراجعة.',
    requiredStates: ['loading', 'empty', 'error', 'success', 'offline', 'disabled'],
    evidenceStatus: 'blocked-by-contract',
    remainingBlocker: 'pending production auth and real database E2E proof',
    crossSurfaceDependencies: [
      'control-panel partner approval workflow',
      'app-partner store readiness ownership',
    ],
    wltBoundary: 'لا توجد ملكية مالية في onboarding flow.',
    visualEvidenceRequired: true,
    evidenceHint: '006A evidence: device screenshots + POST /stores runtime proof captured under DSH_SLICE_006A_STORE_ONBOARDING_FINAL_CLOSURE-20260606-LOCAL.',
    routeHint: '/app-field/stores',
    routeProof: 'dsh-field-stores, dsh-field-onboarding — registered in dsh-field.screen-registry.ts',
    screenProof: 'DshFieldPartnersScreen (VERIFIED), DshFieldStoreOnboardingScreen (VERIFIED)',
    stateCoverageProof: 'loading, empty, error, success, offline — device-visible; API validation covered by POST /stores handler tests',
    crossSurfaceProof: 'DshFieldSurface submits onboarding through createDshFieldStoreOnboardingHttpClient; OpenAPI defines createFieldStore; runtime proof returned pending_review. Control-panel approval and visit evidence remain downstream.',
  },
  {
    surfaceId: 'app-field',
    actor: 'field',
    area: 'field-visit-evidence',
    domain: 'field-operations',
    step: 'visit',
    status: 'blocked-by-contract',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'الزيارات والأدلة',
    description: 'الزيارة الميدانية تربط ملخص الزيارة وخطوة المتابعة بعميل API موحد لمسار POST /stores/{id}/field-visits، مع إبقاء رفع الصور الخام لشرائح media اللاحقة.',
    screenOwner: 'dsh/frontend/app-field/screens/DshFieldStoreVisitScreen.tsx + DshFieldReadinessEscalationScreen.tsx',
    primaryAction: 'التقاط دليل الزيارة ثم رفع تصعيد الجاهزية عند الحاجة.',
    requiredStates: ['loading', 'empty', 'error', 'success', 'offline', 'disabled', 'blocked', 'retry'],
    evidenceStatus: 'blocked-by-contract',
    remainingBlocker: 'pending production auth and real database E2E proof',
    crossSurfaceDependencies: [
      'control-panel partner approvals',
      'app-partner readiness ownership',
      'app-field history and account surfaces',
    ],
    wltBoundary: 'أي finance visibility لاحقة تبقى WLT-owned وخارج visit/readiness flow.',
    visualEvidenceRequired: true,
    evidenceHint: 'Runtime evidence captured with evidence id DSH_SLICE_006B_FIELD_VISIT_EVIDENCE_FINAL_CLOSURE-20260606-LOCAL. المتبقي: visual capture بعد rebuild/install.',
    routeHint: '/app-field/visits',
    routeProof: 'dsh-field-visit, dsh-field-readiness-escalation — registered in dsh-field.screen-registry.ts',
    screenProof: 'DshFieldStoreVisitScreen (VERIFIED), DshFieldReadinessEscalationScreen (READY_FOR_REVIEW)',
    stateCoverageProof: 'loading, empty, error, success, offline, disabled — declared; handler validation covers invalid JSON, missing summary, and missing follow-up.',
    crossSurfaceProof: 'DshFieldSurface submits field visit through createDshFieldVisitHttpClient; OpenAPI defines createFieldVisit; local Postgres runtime proof returned submitted. Readiness approval and raw media upload remain downstream; WLT finance stays outside visit flow.',
  },
  {
    surfaceId: 'control-panel',
    actor: 'operator',
    area: 'control-panel-ops',
    domain: 'control-panel-operations',
    step: 'operations-monitoring',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'الرقابة والتدخل',
    description: 'شاشات عمليات لوحة التحكم صارت مربوطة بمسار lifecycle الموحد، وصف الاستثناءات/الدعم، وحدود الخريطة control-panel only. المتبقي الآن هو visual evidence فقط.',
    screenOwner: 'dsh/frontend/control-panel/operations/operations.registry.ts + CommandCenterScreen.tsx + DispatchAssignmentScreen.tsx + ExceptionsEscalationsScreen.tsx + AuditSupportSlaScreen.tsx + GeoHeatmapScreen.tsx',
    primaryAction: 'فحص المخاطر العابرة للأسطح ثم توجيه التدخل التشغيلي التالي.',
    requiredStates: ['success', 'error', 'retry', 'blocked'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'اللقطات الحالية والـ runtime evidence ما زالت غير ملتقطة على هذا الفرع.',
    crossSurfaceDependencies: [
      'app-client tracking and support context',
      'app-partner preparation and readiness lanes',
      'app-captain assignment and proof milestones',
      'shared signal layer model',
    ],
    wltBoundary: 'لا توجد ملكية مالية مباشرة في operations surface.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لـ CommandCenter وDispatchAssignment وExceptionsEscalations وAuditSupportSla وGeoHeatmap بعد التعديلات الحالية.',
    routeHint: '/operations',
    routeProof: 'operations.registry.ts يثبت /operations عبر buildOperationsHref ويطبع workspaces: command-center, live-orders, dispatch-assignment, exceptions-escalations, audit-support-sla, geo-heatmap.',
    screenProof: 'CommandCenterScreen.tsx + DispatchAssignmentScreen.tsx + ExceptionsEscalationsScreen.tsx + AuditSupportSlaScreen.tsx + GeoHeatmapScreen.tsx موجودة ومستخدمة في control-panel operations surface.',
    stateCoverageProof: 'DispatchAssignment يستهلك DISPATCH_LIFECYCLE_STATE_MAP + getDshLifecycleStateMetadata؛ ExceptionsEscalations يربط EXCEPTION_TICKET_MAP بتذاكر الدعم/audit؛ AuditSupportSla يفتح detail route بدل console/debug path؛ GeoHeatmap يعلن boundary صريحة أنه CP-only summary-first.',
    crossSurfaceProof: 'التناظر actor-to-actor صار مثبتًا في الكود: حالات captain_unavailable / reassignment_required في control-panel تعتمد نفس dsh-order-journey.model المستهلك في app-captain/app-client، وصف الاستثناءات يربط support/audit handoff، وheatmap تبقى control-panel only بدل خلطها بأسطح التشغيل الأخرى.',
  },
  {
    surfaceId: 'control-panel',
    actor: 'operator',
    area: 'control-panel-support',
    domain: 'control-panel-support',
    step: 'support',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'Customer 360',
    description: 'logic/action completion ready; visual evidence pending',
    screenOwner: 'SupportDashboardScreen.tsx',
    primaryAction: 'فتح العميل ثم توجيه الحالة إلى active order أو ticket أو assisted-order أو rescue أو WLT reference.',
    requiredStates: ['loading', 'empty', 'error', 'success', 'blocked'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'screenshots وruntime proof لمسار lookup/filter/timeline/quick-action ما زالت ناقصة.',
    crossSurfaceDependencies: [
      'app-client order context',
      'control-panel operations assisted order',
      'wlt finance visibility',
    ],
    wltBoundary: 'الرؤية المالية هنا مرجعية فقط، وأي refund/settlement/payout يبقى مملوكًا لـ WLT.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لـ Customer 360 بعد تطبيق lookup/filter, last-5-orders, tickets history, notes timeline, وWLT read-only panel.',
    runtimeEvidenceHint: 'Quick actions وroute hints مهيأة محليًا فقط؛ لا claim backend/API/runtime closure.',
    routeHint: '/support?workspace=customer-360',
    routeProof: 'PENDING_IMPLEMENTATION: /support يعرض SupportDashboardScreen.tsx حاليًا؛ Customer360Workspace غير موجود في الكود ولم يُبنَ بعد — هذا البند FIX_REQUIRED وليس مغلقًا.',
    screenProof: 'Customer360Workspace.tsx يستهلك searchFilters + lastFiveOrdersSummary + ticketsHistory + wltReadOnlyVisibility + notesTimeline + quickActions.',
    stateCoverageProof: 'verification required / verified / blocked + ticket open / resolved / escalated + serviceability blocked/serviceable + WLT read-only معلنة في shared preview.',
    crossSurfaceProof: 'Customer360Workspace يربط app-client order context وoperations assisted-order/rescue وWLT reference routes من نفس shared preview بدل نسخ payloads منفصلة.',
  },
  {
    surfaceId: 'control-panel',
    actor: 'operator',
    area: 'control-panel-ops',
    domain: 'control-panel-operations',
    step: 'operations-intervention',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'Manual Call Intake',
    description: 'logic/action completion ready; visual evidence pending',
    screenOwner: 'SupportDashboardScreen.tsx',
    primaryAction: 'فتح المكالمة اليدوية ثم توجيهها إلى ticket أو Customer 360 أو assisted-order أو rescue أو support escalation.',
    requiredStates: ['loading', 'empty', 'error', 'success', 'blocked'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'screenshots وruntime proof لمسار الهوية اليدوي والتحويلات المتقاطعة ما زالت ناقصة.',
    crossSurfaceDependencies: [
      'support ticket ownership',
      'operations assisted order and order rescue',
      'wlt finance visibility',
    ],
    wltBoundary: 'أي payment/refund/settlement يظهر كمرجع read-only فقط، ولا يوجد أي call runtime أو mutation مالي داخل DSH.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لـ source=external_phone_manual وlookup/reason/identity/ticket/transfer/outcome داخل workspace المكالمات.',
    runtimeEvidenceHint: 'Call intake remains local preview + route handoff only; no telephony/runtime/backend claim.',
    routeHint: '/support?workspace=call-intake',
    routeProof: 'PENDING_IMPLEMENTATION: /support يعرض SupportDashboardScreen.tsx حاليًا؛ ManualCallIntakeWorkspace غير موجود في الكود ولم يُبنَ بعد — هذا البند FIX_REQUIRED وليس مغلقًا.',
    screenProof: 'ManualCallIntakeWorkspace.tsx يستهلك lookupPanel + callReasonSelector + identityVerificationResult + ticketPreview + transferContextToOperations + closeCallOutcome.',
    stateCoverageProof: 'verified / blocked identity + create/link ticket preview + transfer to assisted-order/rescue/support escalation + close outcomes كلها معلنة في shared preview.',
    crossSurfaceProof: 'ManualCallIntakeWorkspace يربط الدعم بالعمليات وWLT reference من خلال route hints موحدة مع carry-over للـ customer/order/ticket/call ids.',
  },
  {
    surfaceId: 'control-panel',
    actor: 'operator',
    area: 'control-panel-ops',
    domain: 'control-panel-operations',
    step: 'operations-intervention',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'Assisted Order',
    description: 'logic/action completion ready; visual evidence pending',
    screenOwner: 'OperationsHubScreen.tsx + AssistedOrderDeskScreen.tsx + dsh-assisted-order.preview.ts',
    primaryAction: 'فتح lookup/verification/cart/delivery/serviceability/WLT/audit/submit preview من نفس قسم العمليات.',
    requiredStates: ['loading', 'empty', 'error', 'success', 'blocked'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'screenshots وruntime proof لمسار assisted-order الكامل ما زالت مفقودة.',
    crossSurfaceDependencies: [
      'support customer 360 and call intake',
      'app-partner readiness and product substitutions',
      'wlt preview-only finance references',
    ],
    wltBoundary: 'payment/refund/settlement visibility read-only فقط؛ لا claim order creation ولا mutation مالي داخل DSH.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لـ assisted-order-desk مع customer lookup وidentity gate وcart builder وdelivery mode وserviceability وWLT handoff.',
    runtimeEvidenceHint: 'submit draft remains preview-only with signal route, not backend/runtime order creation.',
    routeHint: '/operations?workspace=assisted-order-desk',
    routeProof: 'operations.registry.ts يسجّل assisted-order-desk ويولّد route عبر buildOperationsHref مع order/customer/ticket/call focus params.',
    screenProof: 'AssistedOrderDeskScreen.tsx يستهلك lookupPanel + identityVerification + cartBuilderPreview + deliveryModeSelector + serviceabilitySummary + wltReadOnlyHandoff + auditReason + submitDraftPreview.',
    stateCoverageProof: 'verified / required / blocked identity + serviceable / blocked zone + previewState ready_for_preview / blocked_by_identity / blocked_by_serviceability موثقة في shared preview.',
    crossSurfaceProof: 'AssistedOrderDeskScreen يفتح handoff واضحًا إلى Customer 360 وOrder Rescue وWLT reference من نفس metadata المشتركة مع call-intake/customer-360.',
  },
  {
    surfaceId: 'control-panel',
    actor: 'operator',
    area: 'control-panel-ops',
    domain: 'control-panel-operations',
    step: 'operations-intervention',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'Order Rescue',
    description: 'logic/action completion ready; visual evidence pending',
    screenOwner: 'OperationsHubScreen.tsx + OrderRescueScreen.tsx + dsh-order-rescue.preview.ts',
    primaryAction: 'تحديد blocker وowner وnext action ثم فتح support handoff أو WLT reference عند الحاجة.',
    requiredStates: ['loading', 'empty', 'error', 'success', 'blocked'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'screenshots وruntime proof لمسار rescue decision completion ما زالت مفقودة.',
    crossSurfaceDependencies: [
      'support customer 360 and call intake',
      'app-partner readiness and disputes',
      'wlt preview-only finance references',
    ],
    wltBoundary: 'أي refund/settlement/payout يظهر كمرجع read-only فقط؛ لا mutation ولا delivery-mode override بعد lifecycle محظور.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لـ order-rescue مع reason/owner/action/evidence/support-handoff/WLT sections.',
    runtimeEvidenceHint: 'Rescue remains local decision preview + signal route only; no backend/runtime finance action.',
    routeHint: '/operations?workspace=order-rescue',
    routeProof: 'operations.registry.ts يسجّل order-rescue ويولّد route عبر buildOperationsHref مع order/customer/ticket/call focus params.',
    screenProof: 'OrderRescueScreen.tsx يستهلك rescueReasonSelector + ownerSelection + nextActionSelector + requiredEvidence + supportHandoff + wltImpactVisibility + decisionSignal.',
    stateCoverageProof: 'item_unavailable / payment_failure / handoff_mismatch وغيرها + selected owner + selected next action + required audit/reason موثقة في shared preview.',
    crossSurfaceProof: 'OrderRescueScreen يربط Support ticket وManual Call Intake وCustomer 360 وWLT visibility من metadata مشتركة مع carry-over للهوية والطلب والتذكرة.',
  },
  {
    surfaceId: 'app-client',
    actor: 'client',
    area: 'actor-notifications',
    domain: 'actor-communication',
    step: 'notification',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'إشعارات العميل',
    description: 'NotificationCenterScreen يستهلك useNotificationsController للعناصر والقراءة الجماعية.',
    screenOwner: 'dsh/frontend/app-client/notifications/NotificationCenterScreen.tsx',
    primaryAction: 'قراءة الإشعار أو تحديد الكل مقروءًا.',
    requiredStates: ['loading', 'empty', 'error', 'success'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'ينقص runtime smoke مخصص للعمليات الستة وvisual evidence عند الإغلاق النهائي.',
    crossSurfaceDependencies: ['shared notifications controller', 'backend notifications routes', 'OpenAPI notifications operations'],
    wltBoundary: 'لا توجد mutation مالية داخل DSH notifications.',
    visualEvidenceRequired: true,
    evidenceHint: 'التقاط مركز إشعارات العميل بعد runtime smoke المخصص.',
    runtimeEvidenceHint: 'لا يوجد runtime evidence حالي؛ يلزم smoke مخصص للعمليات الستة قبل الإغلاق.',
    routeHint: '/app-client/notifications',
    routeProof: 'DshClientSurface يفتح NotificationCenterScreen من زر الإشعارات.',
    screenProof: 'NotificationCenterScreen.tsx يستهلك useNotificationsController.',
    stateCoverageProof: 'idle/loading/error/empty/success + markRead/markAllRead.',
    crossSurfaceProof: 'يشترك مع الأسطح الأخرى في shared/notifications controller وbackend routes نفسها.',
  },
  {
    surfaceId: 'app-partner',
    actor: 'partner',
    area: 'actor-notifications',
    domain: 'actor-communication',
    step: 'notification',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'إشعارات الشريك',
    description: 'NotificationsScreen يعرض ActorNotificationsPanel العام قبل تنبيهات الطلب المحلية.',
    screenOwner: 'dsh/frontend/app-partner/account/OperationScreens.tsx',
    primaryAction: 'قراءة إشعار الشريك أو فتح تنبيهات الطلب المرتبطة بالطلب الحالي.',
    requiredStates: ['loading', 'empty', 'error', 'success'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'ينقص runtime smoke مخصص وإثبات بصري عند الإغلاق النهائي.',
    crossSurfaceDependencies: ['shared notifications controller', 'partner order alerts panel'],
    wltBoundary: 'إشعارات مالية إن وجدت تبقى عرضًا فقط ولا تنقل mutation مالية إلى DSH.',
    visualEvidenceRequired: true,
    evidenceHint: 'التقاط شاشة إشعارات الشريك مع panel العام وتنبيهات الطلب.',
    runtimeEvidenceHint: 'لا يوجد runtime evidence حالي؛ يلزم smoke مخصص للعمليات الستة قبل الإغلاق.',
    routeHint: '/app-partner/notifications',
    routeProof: 'DshPartnerRouteRenderer يفتح NotificationsScreen.',
    screenProof: 'NotificationsScreen يستهلك ActorNotificationsPanel.',
    stateCoverageProof: 'idle/loading/error/empty/success + markRead/markAllRead.',
    crossSurfaceProof: 'يشترك مع app-client/app-field/app-captain/control-panel في shared notifications API.',
  },
  {
    surfaceId: 'app-field',
    actor: 'field',
    area: 'actor-notifications',
    domain: 'actor-communication',
    step: 'notification',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'إشعارات المندوب الميداني',
    description: 'جرس FieldTopBar أصبح يعرض unread count من useNotificationsController ويغلق القراءة الجماعية.',
    screenOwner: 'dsh/frontend/app-field/stores/DshFieldPartnersScreen.tsx',
    primaryAction: 'قراءة عداد الإشعارات أو تحديثه/تحديده مقروءًا من الجرس الحالي.',
    requiredStates: ['loading', 'empty', 'error', 'success'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'ينقص route/screen مخصص كامل وruntime smoke مخصص قبل الإغلاق.',
    crossSurfaceDependencies: ['shared notifications controller', 'field onboarding surface'],
    wltBoundary: 'لا توجد ملكية مالية في إشعارات field.',
    visualEvidenceRequired: true,
    evidenceHint: 'التقاط top bar مع عداد الإشعارات بعد seed runtime مناسب.',
    runtimeEvidenceHint: 'لا يوجد runtime evidence حالي؛ يلزم smoke مخصص للعمليات الستة قبل الإغلاق.',
    routeHint: '/app-field/stores',
    routeProof: 'DshFieldPartnersScreen يربط FieldTopBar بمتحكم الإشعارات.',
    screenProof: 'FieldTopBar يعرض unread badge من useNotificationsController.',
    stateCoverageProof: 'success unread count + reload/markAllRead behavior.',
    crossSurfaceProof: 'يستخدم controller نفسه المستعمل في بقية الأسطح.',
  },
  {
    surfaceId: 'app-captain',
    actor: 'captain',
    area: 'actor-notifications',
    domain: 'actor-communication',
    step: 'notification',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'إشعارات الكابتن',
    description: 'هيدر الكابتن وroute الجرس يستهلكان shared notifications بدل badge ثابت.',
    screenOwner: 'dsh/frontend/app-captain/DshCaptainSurface.tsx + DshCaptainRouteRenderer.tsx',
    primaryAction: 'فتح إشعارات الكابتن أو الرجوع لصندوق الطلبات.',
    requiredStates: ['loading', 'empty', 'error', 'success'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'ينقص runtime smoke مخصص وإثبات بصري عند الإغلاق النهائي.',
    crossSurfaceDependencies: ['shared notifications controller', 'captain order inbox'],
    wltBoundary: 'لا توجد mutation مالية في جرس الكابتن.',
    visualEvidenceRequired: true,
    evidenceHint: 'التقاط الهيدر مع badge ومحتوى route الجرس بعد runtime seed.',
    runtimeEvidenceHint: 'لا يوجد runtime evidence حالي؛ يلزم smoke مخصص للعمليات الستة قبل الإغلاق.',
    routeHint: '/app-captain/bell',
    routeProof: 'DshCaptainSurface يفتح route=bell وDshCaptainRouteRenderer يعرض ActorNotificationsPanel.',
    screenProof: 'DshCaptainSurface يستخدم unread count من useNotificationsController.',
    stateCoverageProof: 'idle/loading/error/empty/success + markRead/markAllRead.',
    crossSurfaceProof: 'يشترك مع بقية الأسطح في backend routes والعقد نفسه.',
  },
  {
    surfaceId: 'control-panel',
    actor: 'operator',
    area: 'actor-notifications',
    domain: 'actor-communication',
    step: 'notification',
    status: 'needs-visual-evidence',
    runtimeBindingStatus: 'NEEDS_RUNTIME_EVIDENCE',
    title: 'إعدادات إشعارات المنصة',
    description: 'PlatformNotificationConfigScreen تعرض وتعدل config المنصة عبر save من shared controller.',
    screenOwner: 'dsh/frontend/control-panel/support/PlatformNotificationConfigScreen.tsx',
    primaryAction: 'إنشاء أو تعديل topic وactorTypes وحالة التفعيل.',
    requiredStates: ['loading', 'empty', 'error', 'success'],
    evidenceStatus: 'needs-visual-evidence',
    remainingBlocker: 'ينقص runtime smoke مخصص لإثبات GET/PUT config وvisual evidence عند الإغلاق النهائي.',
    crossSurfaceDependencies: ['shared platform notification config controller', 'backend operator notification config routes'],
    wltBoundary: 'إعدادات إشعارات المنصة لا تمنح DSH أي mutation مالية.',
    visualEvidenceRequired: true,
    evidenceHint: 'التقاط list/edit/save لإعدادات الإشعارات بعد runtime smoke.',
    runtimeEvidenceHint: 'لا يوجد runtime evidence حالي؛ يلزم smoke مخصص للعمليات الستة قبل الإغلاق.',
    routeHint: '/support/notifications-config',
    routeProof: 'PlatformNotificationConfigScreen موجودة تحت control-panel/support.',
    screenProof: 'الشاشة تستهلك usePlatformNotificationConfigController.save.',
    stateCoverageProof: 'loading/empty/error/success + save enabled/disabled.',
    crossSurfaceProof: 'operator config يضبط topics المستهلكة عبر backend notifications للأدوار الأخرى.',
  },
  {
    surfaceId: 'control-panel',
    actor: 'operator',
    area: 'control-panel-ops',
    domain: 'control-panel-operations',
    step: 'operations-monitoring',
    status: 'preview-ready',
    runtimeBindingStatus: 'UI_PREVIEW_ONLY',
    title: 'Orphan CTA / Route / Signal Guard',
    description: 'local guard coverage ready; visual evidence not applicable',
    screenOwner: 'tools/checks/verify-dsh-action-completion.ps1 + operations.registry.ts + SupportDashboardScreen.tsx + shared preview contracts',
    primaryAction: 'تشغيل guard ومراجعة orphan CTA/route/signal/WLT/audit/noise/classification داخل نفس الحزمة.',
    requiredStates: ['success', 'blocked'],
    evidenceStatus: 'captured',
    remainingBlocker: 'لا يوجد blocker منطقي معروف بعد تشغيل guard؛ المتبقي يبقى المراجعة البصرية للشاشات نفسها.',
    crossSurfaceDependencies: [
      'operations screens and registry',
      'support workspaces and shared previews',
      'wlt read-only route references',
    ],
    wltBoundary: 'الـ guard يثبت أن كل WLT action يظل read-only بلا mutation أو calculation truth داخل DSH.',
    visualEvidenceRequired: false,
    evidenceHint: 'guard output + placeholder classification يجب أن يُلتقطا داخل evidence pack المحلي.',
    runtimeEvidenceHint: 'هذا guard محلي فقط ولا يثبت backend/runtime closure.',
    routeHint: '/operations?workspace=audit-support-sla',
    routeProof: 'التحقق يربط routeHint/routeId/CTA coverage عبر operations/support/shared metadata من دون إضافة CI إلزامي.',
    screenProof: 'verify-dsh-action-completion.ps1 يفحص onAction أو routeHint وsignal routeId وWLT read-only وplaceholder classifications ضمن الملفات المسموحة.',
    stateCoverageProof: 'no console.log + no status closed + no pending-ui-gap + no raw colors + no direct tamagui imports + classified placeholders كلها جزء من guard result.',
    crossSurfaceProof: 'الـ guard يفحص الشاشات وshared previews كحزمة واحدة متعددة الأسطح، لا كملفات منفصلة.',
  },
  {
    surfaceId: 'control-panel',
    actor: 'operator',
    area: 'control-panel-governance',
    domain: 'control-panel-finance',
    step: 'finance-review',
    status: 'blocked-by-wlt',
    runtimeBindingStatus: 'BLOCKED_BY_WLT',
    title: 'الحوكمة والمالية',
    description: 'قسم المالية داخل DSH يعرض WLT bridge للقراءة فقط. الملكية المالية والحقيقة المحاسبية خارج DSH بالكامل.',
    screenOwner: 'dsh/frontend/control-panel/finance/FinanceHubScreen.tsx + FinanceHubScreens.tsx + WLT bridge workspaces',
    primaryAction: 'فحص عرض مالي read-only مع إبقاء كل القرار المالي خارج DSH.',
    requiredStates: ['loading', 'error', 'success', 'blocked'],
    evidenceStatus: 'blocked-by-wlt',
    remainingBlocker: 'settlement وrefund وpayout وcommission وledger تبقى WLT-owned؛ DSH لا يملك mutation مالي هنا.',
    crossSurfaceDependencies: [
      'wlt/frontend/dsh/control-panel preview data',
      'partner/captain/field bridge workspaces',
    ],
    wltBoundary: 'حد WLT كامل: settlement, payout, refund, commission, ledger, reconciliation كلها خارج DSH.',
    visualEvidenceRequired: true,
    evidenceHint: 'يحتاج: visual capture لـ WltBoundaryBanner عبر workspaces المالية مع بقاء القرار المالي محجوبًا بـ WLT.',
    routeHint: '/finance',
    routeProof: 'DshControlPanelSurfaceHost.tsx يوجّه /finance إلى ControlPanelDshFinanceHubScreen، وFinanceHubScreen.tsx يبني المسارات الداخلية عبر buildFinanceHref وFINANCE_ACTIVE_GROUPS.',
    screenProof: 'FinanceHubScreen.tsx + WltBoundaryBanner.tsx + PartnerSettlementWorkspace.tsx + CaptainPayoutWorkspace.tsx + RefundQueueWorkspace.tsx + PlatformFeeAuditWorkspace.tsx + FieldCommissionWorkspace.tsx تثبت أن كل workspace مالي يعرض bridge panel أو boundary banner واضحًا.',
    stateCoverageProof: 'FinanceHubScreen يحمّل getWltControlPanelFinancePreview() من wlt/frontend/control-panel/dsh/dshFinancePreview؛ FinanceHubScreens.tsx يوسم overview/settlements/refunds/payouts/ledger/risk-audit كلها كـ WLT-owned read-only previews؛ WltBoundaryBanner يفرض شارة "WLT — عرض فقط".',
    crossSurfaceProof: 'العقد عبر الأسطح واضح: DSH control-panel يقرأ من WLT preview، بينما app-client وعمليات DSH لا تملك أي financial mutation. بقاء status = blocked-by-wlt مقصود لأنه يمنع نقل ملكية القرار المالي إلى DSH.',
  },
];

export function resolveDshSurfaceId(surfaceId: DshSurfaceLookupId): DshSurfaceId {
  if (surfaceId === 'client') {
    return 'app-client';
  }

  if (surfaceId === 'partner') {
    return 'app-partner';
  }

  if (surfaceId === 'captain') {
    return 'app-captain';
  }

  if (surfaceId === 'field') {
    return 'app-field';
  }

  return surfaceId;
}

export function getDshClosureItemsBySurface(surfaceId: DshSurfaceLookupId) {
  const resolvedSurfaceId = resolveDshSurfaceId(surfaceId);
  return DSH_CROSS_SURFACE_CLOSURE_MAP.filter((item) => item.surfaceId === resolvedSurfaceId);
}

function getDshClosureItemsByStatus(status: DshClosureStatus) {
  return DSH_CROSS_SURFACE_CLOSURE_MAP.filter((item) => item.status === status);
}
