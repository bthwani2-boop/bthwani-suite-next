import {
  CpDescriptionList,
  CpDescriptionRow,
  CpDetailError,
  CpDetailMessage,
  CpDetailPanel,
  CpExternalLink,
  CpInlineCode,
} from "@bthwani/control-panel/components";
import {
  formatDeliveryModes,
  type DshStoreAdminDetailState,
} from "../../../shared/store";

type Props = {
  readonly state: DshStoreAdminDetailState;
  readonly onClose: () => void;
};

export function StoreDetailAdminPanel({ state, onClose }: Props) {
  return (
    <CpDetailPanel title="تفاصيل المتجر" onClose={onClose}>
      {state.kind === "loading" && (
        <CpDetailMessage role="status">جاري التحميل…</CpDetailMessage>
      )}

      {state.kind === "not_found" && (
        <CpDetailMessage role="alert">المتجر غير موجود.</CpDetailMessage>
      )}

      {state.kind === "permission_denied" && (
        <CpDetailMessage role="alert">
          HTTP {state.statusCode} — غير مصرح بعرض تفاصيل هذا المتجر.
        </CpDetailMessage>
      )}

      {state.kind === "error" && (
        <CpDetailError message={state.message} />
      )}

      {state.kind === "success" && (
        <CpDescriptionList>
          <CpDescriptionRow label="المعرّف">
            <CpInlineCode>{state.detail.id}</CpInlineCode>
          </CpDescriptionRow>
          <CpDescriptionRow label="الاسم">{state.detail.displayName}</CpDescriptionRow>
          <CpDescriptionRow label="التصنيف">{state.detail.categoryLabel}</CpDescriptionRow>
          <CpDescriptionRow label="الحالة">
            {STATUS_LABELS[state.detail.status] ?? state.detail.status}
          </CpDescriptionRow>
          <CpDescriptionRow label="الرؤية">
            {state.detail.isVisible ? "مرئي للعملاء" : "مخفي"}
          </CpDescriptionRow>
          <CpDescriptionRow label="قابلية الخدمة">
            {SERVICEABILITY_LABELS[state.detail.serviceabilityStatus] ??
              state.detail.serviceabilityStatus}
          </CpDescriptionRow>
          <CpDescriptionRow label="الموقع">
            {state.detail.cityCode} / {state.detail.serviceAreaCode}
          </CpDescriptionRow>
          <CpDescriptionRow label="طرق التوصيل">
            {formatDeliveryModes(state.detail.deliveryModes, "—")}
          </CpDescriptionRow>
          {state.detail.deliveryEtaMin !== null &&
            state.detail.deliveryEtaMax !== null && (
              <CpDescriptionRow label="وقت التوصيل">
                {state.detail.deliveryEtaMin}–{state.detail.deliveryEtaMax} دقيقة
              </CpDescriptionRow>
            )}
          <CpDescriptionRow label="توصيل مجاني">
            {state.detail.isFreeDelivery ? "نعم" : "لا"}
          </CpDescriptionRow>
          {state.detail.ratingAverage !== null && state.detail.ratingCount > 0 && (
            <CpDescriptionRow label="التقييم">
              {state.detail.ratingAverage.toFixed(1)} ({state.detail.ratingCount})
            </CpDescriptionRow>
          )}
          {state.detail.heroImageUrl && (
            <CpDescriptionRow label="صورة الغلاف">
              <CpExternalLink href={state.detail.heroImageUrl}>
                {state.detail.heroImageUrl}
              </CpExternalLink>
            </CpDescriptionRow>
          )}
          {state.detail.logoUrl && (
            <CpDescriptionRow label="الشعار">
              <CpExternalLink href={state.detail.logoUrl}>
                {state.detail.logoUrl}
              </CpExternalLink>
            </CpDescriptionRow>
          )}
          <CpDescriptionRow label="شارات">
            {[
              state.detail.hasProBadge && "Pro",
              state.detail.hasCouponBadge && "كوبون",
              state.detail.isPopular && "مشهور",
            ]
              .filter(Boolean)
              .join("، ") || "—"}
          </CpDescriptionRow>
          <CpDescriptionRow label="تاريخ الإنشاء">
            {new Date(state.detail.createdAt).toLocaleString("ar")}
          </CpDescriptionRow>
          <CpDescriptionRow label="آخر تحديث">
            {new Date(state.detail.updatedAt).toLocaleString("ar")}
          </CpDescriptionRow>
        </CpDescriptionList>
      )}
    </CpDetailPanel>
  );
}

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  temporarily_closed: "مغلق مؤقتاً",
  unavailable: "غير متاح",
};

const SERVICEABILITY_LABELS: Record<string, string> = {
  serviceable: "قابل للخدمة",
  limited: "خدمة محدودة",
  out_of_area: "خارج نطاق التوصيل",
  unavailable: "غير متاح",
};
