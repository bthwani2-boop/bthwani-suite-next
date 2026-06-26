// Canonical location: dsh/frontend/shared/delivery/delivery.contract.ts
// Authority: dsh/frontend/shared/delivery — delivery-specific data contracts.

export type ActiveOrderPhase = 'pickup' | 'delivery';

export type StoreCourierStage =
  | 'ready_for_pickup'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivery_failed'
  | 'delivered';

// ─── Delivery Mode Model (Moved from shared/contracts/dsh-delivery-mode.model.ts) ───

export type DshFulfillmentDeliveryMode =
  | 'bthwani_delivery'
  | 'partner_delivery'
  | 'pickup';

export type DshDeliveryModeCaptainInvolvement =
  | 'full'   // Assignment + pickup + captain tracking + PoD all required
  | 'none';  // No captain — not dispatched, not tracked, not assigned

export type DshDeliveryModeTrackingStageFilter = {
  readonly showCaptainStages: boolean;
  readonly showPickupStoreInstructions: boolean;
  readonly showPartnerCourierStatus: boolean;
  readonly showDeliveryDropoffAddress: boolean;
};

export type DshDeliveryModeDefinition = {
  readonly modeId: DshFulfillmentDeliveryMode;
  readonly label: string;
  readonly icon: string;
  readonly operationalOwner: string;
  readonly financialOwner: 'WLT';
  readonly requiresCaptain: boolean;
  readonly requiresPartnerCourier: boolean;
  readonly requiresCustomerPickup: boolean;
  readonly captainInvolvement: DshDeliveryModeCaptainInvolvement;
  readonly cartSummaryBehavior: string;
  readonly clientCheckoutBehavior: string;
  readonly partnerPreparationBehavior: string;
  readonly requiresDispatch: boolean;
  readonly controlPanelDispatchBehavior: string;
  readonly trackingTimelineBehavior: string;
  readonly showCaptainTracking: boolean;
  readonly showPartnerCourierTracking: boolean;
  readonly handoffBehavior: string;
  readonly supportFallback: string;
  readonly notificationEvents: ReadonlyArray<string>;
  readonly wltDisplayImpactOnly: true;
  readonly forbiddenUiClaims: ReadonlyArray<string>;
};

export const DSH_DELIVERY_MODE_DEFINITIONS: ReadonlyArray<DshDeliveryModeDefinition> = [
  {
    modeId: 'bthwani_delivery',
    label: 'توصيل بثواني',
    icon: 'bicycle-outline',
    operationalOwner: 'DSH Operations + Captain',
    financialOwner: 'WLT',
    requiresCaptain: true,
    requiresPartnerCourier: false,
    requiresCustomerPickup: false,
    captainInvolvement: 'full',
    cartSummaryBehavior: 'يعرض وقت التوصيل المقدر (ETA) ورسوم الخدمة — كلاهما من WLT بصيغة عرض فقط.',
    clientCheckoutBehavior: 'يختار العميل توصيل بثواني كقناة التوصيل — يظهر ETA والرسوم من WLT. لا تحرير مالي داخل DSH.',
    partnerPreparationBehavior: 'يجهّز الشريك الطلب ويضغط "جاهز للاستلام" — يُشغّل تعيين الكابتن تلقائيًا.',
    requiresDispatch: true,
    controlPanelDispatchBehavior: 'يدخل قائمة انتظار التعيين — يختار المشرف الكابتن يدويًا أو تتم العملية تلقائيًا بحسب المنطقة والتوفر.',
    trackingTimelineBehavior: 'يعرض كل المراحل: تعيين كابتن → في الطريق للاستلام → وصل للمتجر → استلم الطلب → في الطريق إليك → قريب → عند الباب → قرع الجرس → تسليم → إثبات تسليم.',
    showCaptainTracking: true,
    showPartnerCourierTracking: false,
    handoffBehavior: 'الكابتن يستلم من المتجر ويسلّم للعميل وجهًا لوجه — مطلوب إثبات التسليم (PoD) قبل إغلاق المهمة.',
    supportFallback: 'تصعيد للعمليات عبر نظام تذاكر الدعم — يُربط بمعرّف الطلب والكابتن.',
    notificationEvents: [
      'order_created',
      'captain_assigned',
      'captain_declined',
      'reassignment_required',
      'picked_up',
      'near_customer',
      'bell_rang',
      'delivered',
      'delivery_failed',
    ],
    wltDisplayImpactOnly: true,
    forbiddenUiClaims: [
      'show-partner-courier-tracking',
      'show-pickup-only-instructions',
      'hide-captain-assignment',
      'skip-proof-of-delivery',
      'show-store-location-as-dropoff',
    ],
  },
  {
    modeId: 'partner_delivery',
    label: 'توصيل المتجر',
    icon: 'storefront-outline',
    operationalOwner: 'Partner / Store Courier',
    financialOwner: 'WLT',
    requiresCaptain: false,
    requiresPartnerCourier: true,
    requiresCustomerPickup: false,
    captainInvolvement: 'none',
    cartSummaryBehavior: 'يعرض توصيل المتجر كخيار — ETA تقديري من الشريك، لا رسوم تعيين كابتن إضافية.',
    clientCheckoutBehavior: 'يختار العميل توصيل المتجر — لا كابتن، لا تتبع GPS للكابتن، يظهر ETA من المتجر.',
    partnerPreparationBehavior: 'يجهّز الشريك الطلب وينظّم التوصيل عبر موصله الخاص — لا تعيين كابتن من المنصة.',
    requiresDispatch: false,
    controlPanelDispatchBehavior: 'لا يدخل قائمة تعيين الكابتن — يُراقَب فقط كـ store-delivery monitoring في لوحة العمليات.',
    trackingTimelineBehavior: 'مراحل محدودة: استلم المتجر الطلب → موصل المتجر في الطريق → تم التسليم. لا مراحل كابتن.',
    showCaptainTracking: false,
    showPartnerCourierTracking: true,
    handoffBehavior: 'موصل المتجر يسلّم للعميل مباشرة — PoD اختياري حسب سياسة الشريك المتفق عليها.',
    supportFallback: 'تواصل مع الشريك أولًا → تصعيد للعمليات إذا لم يُحل خلال SLA المتفق عليه.',
    notificationEvents: [
      'order_created',
      'partner_accepted',
      'partner_rejected',
      'delivered',
      'delivery_failed',
    ],
    wltDisplayImpactOnly: true,
    forbiddenUiClaims: [
      'show-captain-tracking',
      'show-captain-assignment',
      'show-captain-bell-event',
      'show-proof-of-delivery-captain',
      'enter-dispatch-queue',
    ],
  },
  {
    modeId: 'pickup',
    label: 'استلم بنفسك',
    icon: 'bag-handle-outline',
    operationalOwner: 'Client + Store',
    financialOwner: 'WLT',
    requiresCaptain: false,
    requiresPartnerCourier: false,
    requiresCustomerPickup: true,
    captainInvolvement: 'none',
    cartSummaryBehavior: 'يعرض موقع المتجر ووقت الجاهزية التقديري — لا رسوم توصيل.',
    clientCheckoutBehavior: 'يختار العميل الاستلام بنفسه — يظهر موقع المتجر وتعليمات الاستلام. لا كابتن. لا موصل.',
    partnerPreparationBehavior: 'يجهّز الشريك الطلب ويُشير إلى الجاهزية — العميل هو من يأتي للاستلام.',
    requiresDispatch: false,
    controlPanelDispatchBehavior: 'لا يدخل قائمة الإسناد إطلاقًا — يُراقَب فقط كـ store-readiness (العميل يستلم).',
    trackingTimelineBehavior: 'مراحل الاستلام فقط: استلم المتجر الطلب → قيد التجهيز → جاهز للاستلام → إشعار العميل → تأكيد الاستلام. لا كابتن. لا موصل.',
    showCaptainTracking: false,
    showPartnerCourierTracking: false,
    handoffBehavior: 'العميل يصل للمتجر ويستلم بنفسه — لا توصيل. لا PoD مطلوب.',
    supportFallback: 'تواصل مع المتجر مباشرة → تصعيد للعمليات عند عدم الحل.',
    notificationEvents: [
      'order_created',
      'partner_accepted',
      'partner_ready',
      'delivered',
    ],
    wltDisplayImpactOnly: true,
    forbiddenUiClaims: [
      'show-captain-tracking',
      'show-captain-assignment',
      'show-captain-bell-event',
      'show-partner-courier-tracking',
      'show-dropoff-address',
      'enter-dispatch-queue',
      'require-proof-of-delivery',
    ],
  },
];

export function getDshDeliveryModeDefinition(
  mode: DshFulfillmentDeliveryMode,
): DshDeliveryModeDefinition {
  return DSH_DELIVERY_MODE_DEFINITIONS.find((d) => d.modeId === mode) as DshDeliveryModeDefinition;
}

export function getDshDeliveryModeActorLabel(mode: DshFulfillmentDeliveryMode): string {
  switch (mode) {
    case 'bthwani_delivery': return 'الكابتن';
    case 'partner_delivery': return 'موصل المتجر';
    case 'pickup':           return 'العميل';
  }
}

export function isDshModeDispatchRequired(mode: DshFulfillmentDeliveryMode): boolean {
  return mode === 'bthwani_delivery';
}

export function isDshModeCaptainTrackingVisible(mode: DshFulfillmentDeliveryMode): boolean {
  return mode === 'bthwani_delivery';
}

export function getDshModeTrackingStageFilter(
  mode: DshFulfillmentDeliveryMode,
): DshDeliveryModeTrackingStageFilter {
  return {
    showCaptainStages:            mode === 'bthwani_delivery',
    showPickupStoreInstructions:  mode === 'pickup',
    showPartnerCourierStatus:     mode === 'partner_delivery',
    showDeliveryDropoffAddress:   mode !== 'pickup',
  };
}

export function isDshFulfillmentDeliveryMode(
  value: string | null | undefined,
): value is DshFulfillmentDeliveryMode {
  return value === 'bthwani_delivery' || value === 'partner_delivery' || value === 'pickup';
}
