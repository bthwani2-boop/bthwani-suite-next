import type { DshStoreAdminDetailState } from "../../../shared/store";

type Props = {
  readonly state: DshStoreAdminDetailState;
  readonly onClose: () => void;
};

export function StoreDetailAdminPanel({ state, onClose }: Props) {
  return (
    <div style={{ padding: "1rem", height: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
          تفاصيل المتجر
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق لوحة التفاصيل"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1.25rem",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {state.kind === "loading" && (
        <div role="status" aria-live="polite" style={{ opacity: 0.65 }}>
          جاري التحميل…
        </div>
      )}

      {state.kind === "not_found" && (
        <div role="alert" style={{ opacity: 0.65 }}>
          المتجر غير موجود.
        </div>
      )}

      {state.kind === "permission_denied" && (
        <div role="alert" style={{ opacity: 0.65 }}>
          HTTP {state.statusCode} — غير مصرح بعرض تفاصيل هذا المتجر.
        </div>
      )}

      {state.kind === "error" && (
        <div role="alert">
          <div style={{ marginBottom: "0.5rem" }}>تعذر تحميل التفاصيل.</div>
          <code
            style={{
              fontSize: "0.75rem",
              opacity: 0.7,
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            {state.message}
          </code>
        </div>
      )}

      {state.kind === "success" && (
        <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <DetailRow label="المعرّف">
            <code style={{ fontSize: "0.8rem", fontFamily: "monospace" }}>
              {state.detail.id}
            </code>
          </DetailRow>
          <DetailRow label="الاسم">{state.detail.displayName}</DetailRow>
          <DetailRow label="التصنيف">{state.detail.categoryLabel}</DetailRow>
          <DetailRow label="الحالة">
            {STATUS_LABELS[state.detail.status] ?? state.detail.status}
          </DetailRow>
          <DetailRow label="الرؤية">
            {state.detail.isVisible ? "مرئي للعملاء" : "مخفي"}
          </DetailRow>
          <DetailRow label="قابلية الخدمة">
            {SERVICEABILITY_LABELS[state.detail.serviceabilityStatus] ??
              state.detail.serviceabilityStatus}
          </DetailRow>
          <DetailRow label="الموقع">
            {state.detail.cityCode} / {state.detail.serviceAreaCode}
          </DetailRow>
          <DetailRow label="طرق التوصيل">
            {state.detail.deliveryModes.join("، ") || "—"}
          </DetailRow>
          {state.detail.deliveryEtaMin !== null &&
            state.detail.deliveryEtaMax !== null && (
              <DetailRow label="وقت التوصيل">
                {state.detail.deliveryEtaMin}–{state.detail.deliveryEtaMax} دقيقة
              </DetailRow>
            )}
          <DetailRow label="توصيل مجاني">
            {state.detail.isFreeDelivery ? "نعم" : "لا"}
          </DetailRow>
          {state.detail.ratingAverage !== null && state.detail.ratingCount > 0 && (
            <DetailRow label="التقييم">
              {state.detail.ratingAverage.toFixed(1)} ({state.detail.ratingCount})
            </DetailRow>
          )}
          {state.detail.heroImageUrl && (
            <DetailRow label="صورة الغلاف">
              <a
                href={state.detail.heroImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ wordBreak: "break-all", fontSize: "0.8rem" }}
              >
                {state.detail.heroImageUrl}
              </a>
            </DetailRow>
          )}
          {state.detail.logoUrl && (
            <DetailRow label="الشعار">
              <a
                href={state.detail.logoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ wordBreak: "break-all", fontSize: "0.8rem" }}
              >
                {state.detail.logoUrl}
              </a>
            </DetailRow>
          )}
          <DetailRow label="شارات">
            {[
              state.detail.hasProBadge && "Pro",
              state.detail.hasCouponBadge && "كوبون",
              state.detail.isPopular && "مشهور",
            ]
              .filter(Boolean)
              .join("، ") || "—"}
          </DetailRow>
          <DetailRow label="تاريخ الإنشاء">
            {new Date(state.detail.createdAt).toLocaleString("ar")}
          </DetailRow>
          <DetailRow label="آخر تحديث">
            {new Date(state.detail.updatedAt).toLocaleString("ar")}
          </DetailRow>
        </dl>
      )}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
      <dt
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          opacity: 0.55,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: "0.875rem" }}>{children}</dd>
    </div>
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
