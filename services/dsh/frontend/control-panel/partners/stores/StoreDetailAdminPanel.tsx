import { useRef, useState } from "react";
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
  type DshStorePublicationDiagnosticsState,
  type DshStoreAuditState,
} from "../../../shared/store";
import { uploadAndLinkAsset } from "../../../shared/catalog";

type Props = {
  readonly state: DshStoreAdminDetailState;
  readonly diagnosticsState: DshStorePublicationDiagnosticsState;
  readonly auditState: DshStoreAuditState;
  readonly onClose: () => void;
};

const STORE_IMAGE_ROLES = [
  { value: "store_logo", label: "الشعار" },
  { value: "store_cover", label: "صورة الغلاف" },
  { value: "storefront_photo", label: "صورة الواجهة" },
  { value: "interior_photo", label: "صورة الداخل" },
  { value: "signage_photo", label: "صورة اللافتة" },
] as const;

function StoreImageUploadForm({ storeId }: { readonly storeId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<string>(STORE_IMAGE_ROLES[0].value);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      alert("يرجى اختيار ملف الصورة");
      return;
    }
    setUploading(true);
    try {
      await uploadAndLinkAsset({
        file,
        entityType: "stores",
        entityId: storeId,
        role,
        altAr: "",
      });
      alert("تم رفع الصورة؛ ستظهر على المتجر بعد اعتمادها من قائمة مراجعة الصور في الكتالوج.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: unknown) {
      alert("فشل رفع الصورة: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <CpDescriptionRow label="رفع صورة للمتجر">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="نوع صورة المتجر">
          {STORE_IMAGE_ROLES.map((imageRole) => (
            <option key={imageRole.value} value={imageRole.value}>{imageRole.label}</option>
          ))}
        </select>
        <input ref={fileInputRef} type="file" accept="image/*" aria-label="اختيار ملف صورة المتجر" />
        <button type="button" onClick={() => void handleUpload()} disabled={uploading}>
          {uploading ? "جارٍ الرفع…" : "رفع وربط"}
        </button>
      </div>
    </CpDescriptionRow>
  );
}

function StoreDiagnosticsRows({ state }: { readonly state: DshStorePublicationDiagnosticsState }) {
  if (state.kind === "idle" || state.kind === "loading") {
    return <CpDescriptionRow label="تشخيص النشر">جاري التحقق…</CpDescriptionRow>;
  }
  if (state.kind === "permission_denied") {
    return <CpDescriptionRow label="تشخيص النشر">HTTP {state.statusCode} — غير مصرح.</CpDescriptionRow>;
  }
  if (state.kind === "not_found") {
    return <CpDescriptionRow label="تشخيص النشر">المتجر غير موجود.</CpDescriptionRow>;
  }
  if (state.kind === "error") {
    return <CpDescriptionRow label="تشخيص النشر">{state.message}</CpDescriptionRow>;
  }
  return (
    <>
      <CpDescriptionRow label="جاهزية النشر">
        {state.isReady ? "جاهز للنشر" : "محجوب حتى إغلاق الموانع"}
      </CpDescriptionRow>
      <CpDescriptionRow label="موانع النشر">
        {state.blockers.length > 0 ? state.blockers.join(" | ") : "لا توجد موانع"}
      </CpDescriptionRow>
    </>
  );
}

function StoreAuditRows({ state }: { readonly state: DshStoreAuditState }) {
  if (state.kind === "idle" || state.kind === "loading") {
    return <CpDescriptionRow label="سجل التدقيق">جاري تحميل أثر القرارات…</CpDescriptionRow>;
  }
  if (state.kind === "permission_denied") {
    return <CpDescriptionRow label="سجل التدقيق">HTTP {state.statusCode} — غير مصرح.</CpDescriptionRow>;
  }
  if (state.kind === "not_found") {
    return <CpDescriptionRow label="سجل التدقيق">المتجر غير موجود.</CpDescriptionRow>;
  }
  if (state.kind === "error") {
    return <CpDescriptionRow label="سجل التدقيق">{state.message}</CpDescriptionRow>;
  }
  if (state.events.length === 0) {
    return <CpDescriptionRow label="سجل التدقيق">لا توجد قرارات مسجلة بعد.</CpDescriptionRow>;
  }
  return (
    <CpDescriptionRow label="سجل التدقيق">
      <ol aria-label="أحدث قرارات حوكمة المتجر">
        {state.events.map((event) => (
          <li key={event.id}>
            <strong>{event.action}</strong>
            {" — "}{event.actorRole} / {event.actorId}
            {" — "}{event.reason}
            {" — "}{new Date(event.createdAt).toLocaleString("ar")}
            {" — "}معرّف الارتباط: <CpInlineCode>{event.correlationId}</CpInlineCode>
          </li>
        ))}
      </ol>
    </CpDescriptionRow>
  );
}

export function StoreDetailAdminPanel({ state, diagnosticsState, auditState, onClose }: Props) {
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
          <CpDescriptionRow label="العنوان">
            {state.detail.addressLine || "غير مكتمل"}
          </CpDescriptionRow>
          <CpDescriptionRow label="نطاق التغطية">
            {state.detail.coverageSummary || "غير مكتمل"}
          </CpDescriptionRow>
          <CpDescriptionRow label="ساعات التشغيل">
            {state.detail.operatingHours || "غير مكتملة"}
          </CpDescriptionRow>
          <CpDescriptionRow label="جاهزية التوصيل">
            {state.detail.deliveryReadiness || "غير مكتملة"}
          </CpDescriptionRow>
          <CpDescriptionRow label="طرق التوصيل">
            {formatDeliveryModes(state.detail.deliveryModes, "—")}
          </CpDescriptionRow>
          <CpDescriptionRow label="جاهزية الشريك">
            {state.detail.partnerReadiness}
          </CpDescriptionRow>
          <CpDescriptionRow label="اعتماد الكتالوج">
            {state.detail.catalogApprovalStatus}
          </CpDescriptionRow>
          <CpDescriptionRow label="الظهور التسويقي">
            {state.detail.marketingVisibility}
          </CpDescriptionRow>
          <CpDescriptionRow label="أهلية النشر الأساسية">
            {state.detail.publicationEligible ? "مؤهل" : "غير مؤهل"}
          </CpDescriptionRow>
          <StoreDiagnosticsRows state={diagnosticsState} />
          <StoreAuditRows state={auditState} />
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
          <CpDescriptionRow label="إصدار السجل">{state.detail.version}</CpDescriptionRow>
          <CpDescriptionRow label="تاريخ الإنشاء">
            {new Date(state.detail.createdAt).toLocaleString("ar")}
          </CpDescriptionRow>
          <CpDescriptionRow label="آخر تحديث">
            {new Date(state.detail.updatedAt).toLocaleString("ar")}
          </CpDescriptionRow>
          <StoreImageUploadForm storeId={state.detail.id} />
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
