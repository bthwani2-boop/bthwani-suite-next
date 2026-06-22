import type { DshStoreAdminDetail } from "./store-admin.view-model";
import { formatServiceArea } from "./store-discovery.formatters";

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
};

export type FieldStoreContextViewModel = {
  readonly store: DshStoreAdminDetail;
  readonly checks: readonly StoreReadinessCheck[];
  readonly verificationSummary: string;
};

export type CaptainStoreContextViewModel = {
  readonly store: DshStoreAdminDetail;
  readonly pickupEnabled: boolean;
  readonly pickupLabel: string;
  readonly locationLabel: string;
  readonly operatingLabel: string;
};

export function toPartnerStoreContext(
  store: DshStoreAdminDetail,
): PartnerStoreContextViewModel {
  const checks = createReadinessChecks(store);
  return {
    store,
    checks,
    operatingLabel: store.isOpen ? "المتجر يعمل" : "المتجر غير متاح حاليًا",
    visibilityLabel: store.isVisible ? "ظاهر للعملاء" : "مخفي عن العملاء",
    catalogReadinessSummary: checks.every((check) => check.ready)
      ? "بيانات المتجر جاهزة للربط بكتالوج لاحق"
      : "يلزم استكمال بيانات المتجر قبل ربط الكتالوج",
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
  };
}

export function toCaptainStoreContext(
  store: DshStoreAdminDetail,
): CaptainStoreContextViewModel {
  const pickupEnabled = store.deliveryModes.includes("pickup");
  return {
    store,
    pickupEnabled,
    pickupLabel: pickupEnabled
      ? "الاستلام من المتجر متاح"
      : "الاستلام من المتجر غير متاح",
    locationLabel: formatServiceArea(store.cityCode, store.serviceAreaCode),
    operatingLabel: store.isOpen ? "مفتوح للاستلام" : "غير متاح للاستلام",
  };
}

function createReadinessChecks(
  store: DshStoreAdminDetail,
): readonly StoreReadinessCheck[] {
  return [
    {
      id: "location",
      label: "الموقع ونطاق الخدمة",
      ready:
        store.cityCode.trim().length > 0 &&
        store.serviceAreaCode.trim().length > 0,
      detail: formatServiceArea(store.cityCode, store.serviceAreaCode),
    },
    {
      id: "media",
      label: "الهوية البصرية",
      ready: store.heroImageUrl !== null && store.logoUrl !== null,
      detail:
        store.heroImageUrl !== null && store.logoUrl !== null
          ? "الغلاف والشعار متاحان"
          : "يلزم استكمال الغلاف أو الشعار",
    },
    {
      id: "delivery",
      label: "طرق الخدمة",
      ready: store.deliveryModes.length > 0,
      detail: store.deliveryModes.join("، ") || "لا توجد طرق خدمة",
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
  ];
}
