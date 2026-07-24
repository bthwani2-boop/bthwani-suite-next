import type { DshStoreAdminDetail } from "./store-admin.view-model";
import {
  formatDeliveryModes,
  formatServiceArea,
} from "./store-discovery.formatters";

export type StoreReadinessCheck = {
  readonly id: string;
  readonly label: string;
  readonly ready: boolean;
  readonly detail: string;
};

export type PartnerStoreContextViewModel = {
  readonly store: DshStoreAdminDetail;
  readonly checks: readonly StoreReadinessCheck[];
  readonly operatingLabel: string;
  readonly visibilityLabel: string;
  readonly catalogReadinessSummary: string;
  readonly readinessPercent: number;
  readonly attentionCount: number;
  readonly serviceModesLabel: string;
  readonly nextAction: string;
};

export type FieldStoreContextViewModel = {
  readonly store: DshStoreAdminDetail;
  readonly checks: readonly StoreReadinessCheck[];
  readonly verificationSummary: string;
  readonly readinessPercent: number;
  readonly attentionChecks: readonly StoreReadinessCheck[];
  readonly recommendation: string;
};

export type CaptainStoreContextViewModel = {
  readonly store: DshStoreAdminDetail;
  readonly pickupEnabled: boolean;
  readonly pickupLabel: string;
  readonly locationLabel: string;
  readonly operatingLabel: string;
  readonly serviceModesLabel: string;
  readonly estimatedWindowLabel: string;
  readonly pickupChecks: readonly StoreReadinessCheck[];
  readonly pickupInstruction: string;
};

type SafeOperationalFields = Readonly<{
  addressLine: string;
  coverageSummary: string;
  operatingHours: string;
  deliveryReadiness: string;
  deliveryModes: readonly string[];
}>;

function safeOperationalFields(store: DshStoreAdminDetail): SafeOperationalFields {
  return {
    addressLine: store.addressLine ?? "",
    coverageSummary: store.coverageSummary ?? "",
    operatingHours: store.operatingHours ?? "",
    deliveryReadiness: store.deliveryReadiness ?? "",
    deliveryModes: store.deliveryModes ?? [],
  };
}

function operatingLabel(store: DshStoreAdminDetail): string {
  const lifecycle = store.isOpen ? "المتجر يعمل" : "المتجر غير متاح حاليًا";
  const { operatingHours } = safeOperationalFields(store);
  return operatingHours.length > 0
    ? `${lifecycle} · ${operatingHours}`
    : `${lifecycle} · ساعات التشغيل غير مكتملة`;
}

export function toPartnerStoreContext(
  store: DshStoreAdminDetail,
): PartnerStoreContextViewModel {
  const checks = createReadinessChecks(store);
  const readyCount = checks.filter((check) => check.ready).length;
  const attentionCount = checks.length - readyCount;
  const { deliveryModes } = safeOperationalFields(store);
  return {
    store,
    checks,
    operatingLabel: operatingLabel(store),
    visibilityLabel: store.isVisible ? "ظاهر للعملاء" : "مخفي عن العملاء",
    catalogReadinessSummary: store.publicationEligible
      ? "المتجر اجتاز بوابة النشر التشغيلية"
      : "يلزم إغلاق عناصر الجاهزية قبل النشر للعملاء",
    readinessPercent: checks.length === 0 ? 0 : Math.round((readyCount / checks.length) * 100),
    attentionCount,
    serviceModesLabel: formatDeliveryModes(deliveryModes),
    nextAction:
      attentionCount === 0
        ? "حافظ على البيانات محدثة وراجع ظهور المتجر للعملاء."
        : `راجع ${attentionCount} عناصر غير مكتملة قبل توسيع تشغيل المتجر.`,
  };
}

export function toFieldStoreContext(
  store: DshStoreAdminDetail,
): FieldStoreContextViewModel {
  const checks = createReadinessChecks(store);
  const readyCount = checks.filter((check) => check.ready).length;
  return {
    store,
    checks,
    verificationSummary: `${readyCount} من ${checks.length} عناصر تحقق جاهزة`,
    readinessPercent: checks.length === 0 ? 0 : Math.round((readyCount / checks.length) * 100),
    attentionChecks: checks.filter((check) => !check.ready),
    recommendation:
      readyCount === checks.length
        ? "البيانات الحالية متسقة ويمكن رفع نتيجة التحقق للجهة المالكة عند اعتماده."
        : "وثّق العناصر الناقصة ولا تعتبر المتجر جاهزًا قبل استكمالها في مسار التحقق المعتمد.",
  };
}

export function toCaptainStoreContext(
  store: DshStoreAdminDetail,
): CaptainStoreContextViewModel {
  const {
    addressLine,
    coverageSummary,
    operatingHours,
    deliveryReadiness,
    deliveryModes,
  } = safeOperationalFields(store);
  const pickupEnabled = deliveryModes.includes("pickup");
  const hasLocation = addressLine.length > 0 && coverageSummary.length > 0;
  const hasOperatingHours = operatingHours.length > 0;
  const deliveryReady = deliveryReadiness === "ready";
  const pickupChecks: readonly StoreReadinessCheck[] = [
    {
      id: "store-open",
      label: "حالة المتجر",
      ready: store.isOpen,
      detail: store.isOpen ? "المتجر مفتوح حاليًا" : "المتجر غير متاح حاليًا",
    },
    {
      id: "pickup-mode",
      label: "خدمة الاستلام",
      ready: pickupEnabled,
      detail: pickupEnabled ? "الاستلام مفعل" : "الاستلام غير مفعل",
    },
    {
      id: "serviceability",
      label: "قابلية الخدمة",
      ready: store.isServiceable,
      detail: store.isServiceable ? "الموقع قابل للخدمة" : "الموقع خارج الخدمة",
    },
    {
      id: "location",
      label: "عنوان الاستلام",
      ready: hasLocation,
      detail: hasLocation ? `${addressLine} · ${coverageSummary}` : "عنوان أو تغطية المتجر غير مكتملين",
    },
    {
      id: "operating-hours",
      label: "ساعات التشغيل",
      ready: hasOperatingHours,
      detail: hasOperatingHours ? operatingHours : "ساعات التشغيل غير محددة",
    },
    {
      id: "delivery-readiness",
      label: "جاهزية التسليم",
      ready: deliveryReady,
      detail: deliveryReady ? "المتجر جاهز للتسليم" : `الحالة: ${deliveryReadiness || "غير محددة"}`,
    },
  ];
  return {
    store,
    pickupEnabled,
    pickupLabel: pickupEnabled
      ? "الاستلام من المتجر متاح"
      : "الاستلام من المتجر غير متاح",
    locationLabel: addressLine || formatServiceArea(store.cityCode, store.serviceAreaCode),
    operatingLabel: operatingLabel(store),
    serviceModesLabel: formatDeliveryModes(deliveryModes, "غير محددة"),
    estimatedWindowLabel:
      store.deliveryEtaMin !== null && store.deliveryEtaMax !== null
        ? `${store.deliveryEtaMin}–${store.deliveryEtaMax} دقيقة`
        : "غير محدد",
    pickupChecks,
    pickupInstruction:
      pickupChecks.every((check) => check.ready)
        ? "راجع هوية المتجر وموقعه قبل الوصول. تأكيد الاستلام يبدأ فقط من دورة التوصيل المعتمدة."
        : "لا تبدأ الاستلام. توجد قيود تشغيلية يجب أن يعالجها المشغل قبل دورة التوصيل.",
  };
}

function createReadinessChecks(
  store: DshStoreAdminDetail,
): readonly StoreReadinessCheck[] {
  const {
    addressLine,
    coverageSummary,
    operatingHours,
    deliveryReadiness,
    deliveryModes,
  } = safeOperationalFields(store);
  const operationalContextReady =
    addressLine.length > 0 &&
    coverageSummary.length > 0 &&
    operatingHours.length > 0 &&
    deliveryReadiness.length > 0;
  return [
    {
      id: "location",
      label: "الموقع ونطاق الخدمة",
      ready:
        (store.cityCode ?? "").trim().length > 0 &&
        (store.serviceAreaCode ?? "").trim().length > 0,
      detail: formatServiceArea(store.cityCode ?? "", store.serviceAreaCode ?? ""),
    },
    {
      id: "operational-context",
      label: "الساعات والعنوان والجاهزية",
      ready: operationalContextReady,
      detail: operationalContextReady
        ? `${operatingHours} · ${addressLine}`
        : "يلزم استكمال العنوان والتغطية والساعات وجاهزية التوصيل",
    },
    {
      id: "media",
      label: "الهوية البصرية",
      ready: store.heroImageUrl != null && store.logoUrl != null,
      detail:
        store.heroImageUrl != null && store.logoUrl != null
          ? "الغلاف والشعار متاحان"
          : "يلزم استكمال الغلاف أو الشعار",
    },
    {
      id: "delivery",
      label: "طرق الخدمة",
      ready: deliveryModes.length > 0,
      detail: formatDeliveryModes(deliveryModes, "لا توجد طرق خدمة"),
    },
    {
      id: "visibility",
      label: "الرؤية وقابلية الخدمة",
      ready: store.isVisible && store.isServiceable,
      detail:
        store.isVisible && store.isServiceable
          ? "مرئي وقابل للخدمة"
          : "يلزم مراجعة الرؤية أو قابلية الخدمة",
    },
    {
      id: "partner-readiness",
      label: "جاهزية الشريك",
      ready: store.partnerReadiness === "ready",
      detail: store.partnerReadiness === "ready" ? "جاهزية الشريك مكتملة" : `الحالة: ${store.partnerReadiness ?? "غير محددة"}`,
    },
    {
      id: "catalog-approval",
      label: "اعتماد الكتالوج",
      ready: store.catalogApprovalStatus === "approved",
      detail: store.catalogApprovalStatus === "approved" ? "الكتالوج معتمد" : `الحالة: ${store.catalogApprovalStatus ?? "غير محددة"}`,
    },
    {
      id: "marketing-visibility",
      label: "الظهور التسويقي",
      ready: store.marketingVisibility === "visible",
      detail: store.marketingVisibility === "visible" ? "الظهور التسويقي مفعل" : "الظهور التسويقي مخفي",
    },
  ];
}
