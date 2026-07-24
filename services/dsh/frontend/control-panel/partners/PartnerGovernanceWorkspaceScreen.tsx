"use client";

import {
  Badge,
  Button,
  Card,
  StateView,
  Text,
  lightThemeColors,
} from "@bthwani/ui-kit";
import type {
  PartnerWorkspaceTabId,
  usePartnerWorkspaceListController,
} from "../../shared/partner";
import { getDshPartnerActivationStatusLabel } from "../../shared/partner";

type Controller = ReturnType<typeof usePartnerWorkspaceListController>;

type Props = {
  readonly workspace: PartnerWorkspaceTabId;
  readonly subTab: string;
  readonly controller: Controller;
  readonly onOpenPartner?: (partnerId: string) => void;
};

type WorkspaceDefinition = Readonly<{
  title: string;
  description: string;
  statuses?: ReadonlySet<string>;
}>;

const PENDING = new Set([
  "draft",
  "submitted",
  "field_visit_scheduled",
  "field_visit_completed",
  "documents_missing",
  "documents_uploaded",
  "documents_verified",
  "catalog_not_ready",
  "catalog_ready",
  "delivery_modes_not_ready",
  "delivery_modes_ready",
  "ops_review",
]);

function definition(workspace: PartnerWorkspaceTabId, subTab: string): WorkspaceDefinition {
  switch (workspace) {
    case "inbox":
      return {
        title: "الوارد الجديد",
        description: "طلبات الانضمام الحقيقية التي لم تصل بعد إلى حالة تشغيل نهائية.",
        statuses: PENDING,
      };
    case "activation":
      return {
        title: subTab === "operations_review" ? "مراجعة العمليات" : "قائمة تفعيل الشركاء",
        description: "متابعة انتقالات التفعيل الفعلية وفتح ملف الشريك لاتخاذ قرار موثق.",
        statuses: subTab === "operations_review"
          ? new Set(["ops_review", "ops_approved", "ops_rejected"])
          : new Set(["documents_verified", "catalog_ready", "delivery_modes_ready", "ops_review", "ops_approved"]),
      };
    case "documents":
      return {
        title: subTab === "document_resubmit" ? "طلبات إعادة رفع الوثائق" : "مراجعة وثائق الشراكة",
        description: "قائمة شاملة للشركاء الموجودين في مراحل الوثائق؛ القرار التفصيلي يتم داخل الملف السيادي.",
        statuses: subTab === "document_resubmit"
          ? new Set(["documents_missing", "ops_rejected"])
          : new Set(["documents_missing", "documents_uploaded", "documents_verified"]),
      };
    case "readiness_approvals":
      return {
        title: subTab === "readiness_ready" ? "الشركاء الجاهزون للنشر" : "اعتمادات الجاهزية",
        description: "جاهزية الشريك وكل فرع مرتبطة ببوابات التشغيل والكتالوج والتسويق والظهور.",
        statuses: subTab === "readiness_ready"
          ? new Set(["partner_active", "client_visible"])
          : new Set(["catalog_ready", "delivery_modes_ready", "ops_review", "ops_approved"]),
      };
    case "catalog_exceptions":
      return {
        title: subTab === "catalog_ready" ? "الكتالوجات الجاهزة" : "تجاوزات الكتالوج",
        description: "قراءة مرحلة الكتالوج من دورة حياة الشريك ثم فتح المتاجر والمنتجات ذات العلاقة.",
        statuses: subTab === "catalog_ready"
          ? new Set(["catalog_ready", "delivery_modes_ready", "ops_review", "ops_approved", "partner_active", "client_visible"])
          : new Set(["catalog_not_ready"]),
      };
    case "performance":
      return {
        title: subTab === "store_performance" ? "أداء الفروع" : "أداء الشركاء",
        description: "نقطة دخول موحدة إلى الشركاء النشطين وفروعهم وقراءات الأداء التشغيلية.",
        statuses: new Set(["partner_active", "client_visible", "client_hidden", "partner_deactivated"]),
      };
    case "promotion_eligibility":
      return {
        title: subTab === "offers_benefits" ? "المزايا والعروض" : "أهلية الظهور والترويج",
        description: "الأهلية تبدأ من حالة الشريك وتستكمل ببوابات الفرع والتسويق قبل الظهور للعميل.",
        statuses: new Set(["partner_active", "client_visible", "client_hidden"]),
      };
    case "service_levels":
      return {
        title: subTab === "operational_follow_up" ? "المتابعة التشغيلية" : "مستويات الخدمة",
        description: "متابعة الشركاء التشغيليين وفتح ملف الشريك وفروعه والتصعيدات ذات العلاقة.",
        statuses: new Set(["partner_active", "client_visible", "client_hidden", "partner_deactivated"]),
      };
    case "contracts":
      return {
        title: subTab === "partnership_complaints"
          ? "شكاوى الشراكة"
          : subTab === "partnership_disputes"
            ? "نزاعات الشراكة"
            : "إدارة العقود والملفات القانونية",
        description: "الكيان القانوني هو نقطة الربط السيادية للعقد والشكوى والنزاع؛ افتح الملف لقراءة الهوية والوثائق والتدقيق.",
      };
    case "deactivation":
      return {
        title: subTab === "client_hidden" ? "المخفي عن العملاء" : "الإيقاف وإلغاء التفعيل",
        description: "قرارات الإخفاء والإيقاف والرفض مع أسبابها وسجلها غير القابل للتجاوز.",
        statuses: subTab === "client_hidden"
          ? new Set(["client_hidden"])
          : new Set(["ops_rejected", "partner_deactivated", "client_hidden"]),
      };
    default:
      return {
        title: "مساحة عمل الشركاء",
        description: "قراءة موحدة من DSH Runtime.",
      };
  }
}

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "client_visible" || status === "partner_active" || status === "ops_approved") return "success";
  if (status === "ops_rejected" || status === "partner_deactivated") return "danger";
  if (status === "client_hidden" || status.includes("missing") || status.includes("not_ready")) return "warning";
  return "info";
}

export function PartnerGovernanceWorkspaceScreen({
  workspace,
  subTab,
  controller,
  onOpenPartner,
}: Props) {
  const config = definition(workspace, subTab);

  if (controller.listState.kind === "idle" || controller.listState.kind === "loading") {
    return <StateView stateId="loading" title={`جاري تحميل ${config.title}`} description="تتم القراءة من DSH Runtime ضمن المستأجر الحالي." />;
  }
  if (controller.listState.kind === "offline") {
    return <StateView stateId="offline" tone="warning" title="خدمة الشركاء غير متاحة" description="لا يتم استخدام بيانات محلية بديلة عن الحقيقة التشغيلية." actionLabel="إعادة المحاولة" onActionPress={controller.retry} />;
  }
  if (controller.listState.kind === "error") {
    return <StateView stateId="recoverableError" title="تعذر تحميل مساحة العمل" description={controller.listState.message} actionLabel="إعادة المحاولة" onActionPress={controller.retry} />;
  }

  const partners = controller.partners.filter((partner) => !config.statuses || config.statuses.has(partner.activationStatus));
  if (partners.length === 0) {
    return <StateView stateId="empty" title={`لا توجد عناصر في ${config.title}`} description={config.description} actionLabel="تحديث" onActionPress={controller.retry} />;
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Card style={{ padding: "1rem", display: "grid", gap: "0.25rem" }}>
        <Text role="titleMd">{config.title}</Text>
        <Text role="body" tone="muted">{config.description}</Text>
        <Text role="caption" tone="muted">{partners.length} نتيجة ضمن الصفحة الحالية</Text>
      </Card>

      <Card style={{ padding: "1rem" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${lightThemeColors.borderColor}` }}>
                <th style={{ padding: "0.75rem" }}>الشريك القانوني</th>
                <th style={{ padding: "0.75rem" }}>الفئة</th>
                <th style={{ padding: "0.75rem" }}>الجوال</th>
                <th style={{ padding: "0.75rem" }}>الحالة</th>
                <th style={{ padding: "0.75rem" }}>آخر تحديث</th>
                <th style={{ padding: "0.75rem" }}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id} style={{ borderBottom: `1px solid ${lightThemeColors.borderColor}` }}>
                  <td style={{ padding: "0.75rem" }}>
                    <Text style={{ fontWeight: "700" }}>{partner.displayName}</Text>
                    <Text role="caption" tone="muted">{partner.legalNameAr}</Text>
                  </td>
                  <td style={{ padding: "0.75rem" }}>{partner.category}</td>
                  <td style={{ padding: "0.75rem" }}>{partner.primaryPhone || "—"}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <Badge label={getDshPartnerActivationStatusLabel(partner.activationStatus)} tone={statusTone(partner.activationStatus)} />
                  </td>
                  <td style={{ padding: "0.75rem" }}>{new Date(partner.updatedAt).toLocaleString("ar-SA")}</td>
                  <td style={{ padding: "0.75rem" }}>
                    {onOpenPartner ? (
                      <Button label="فتح الملف السيادي" tone="secondary" onPress={() => onOpenPartner(partner.id)} />
                    ) : (
                      <Text role="caption" tone="muted">مسار التفاصيل غير متاح</Text>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
