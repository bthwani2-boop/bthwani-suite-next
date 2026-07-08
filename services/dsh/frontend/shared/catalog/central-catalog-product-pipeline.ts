export type ProductProposalPipelineStatus =
  | "catalog-draft"
  | "partner-proposed"
  | "partner-review"
  | "marketing-review"
  | "catalog-adopted"
  | "catalog-approved"
  | "client-visible"
  | "needs-fix"
  | "rejected";

export interface ProductApprovalStateMetadata {
  readonly status: ProductProposalPipelineStatus;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly ownerSurface: "app-partner" | "app-field" | "control-panel-catalog" | "control-panel-platform" | "system";
  readonly allowedNextStatuses: readonly ProductProposalPipelineStatus[];
  readonly isClientVisible: boolean;
  readonly isPartnerVisible: boolean;
  readonly partnerCanAdvance: boolean;
  readonly auditRequired: boolean;
  readonly primaryActionLabel?: string;
  readonly tone: "warning" | "success" | "danger" | "neutral" | "info";
}

export const PRODUCT_PROPOSAL_PIPELINE_METADATA: Record<ProductProposalPipelineStatus, ProductApprovalStateMetadata> = {
  "catalog-draft": {
    status: "catalog-draft",
    labelAr: "مسودة الكتالوج",
    labelEn: "Catalog Draft",
    ownerSurface: "app-partner",
    allowedNextStatuses: ["partner-proposed"],
    isClientVisible: false,
    isPartnerVisible: true,
    partnerCanAdvance: true,
    auditRequired: false,
    primaryActionLabel: "إرسال الاقتراح",
    tone: "neutral",
  },
  "partner-proposed": {
    status: "partner-proposed",
    labelAr: "مقترح من الشريك",
    labelEn: "Partner Proposed",
    ownerSurface: "control-panel-catalog",
    allowedNextStatuses: ["partner-review", "needs-fix", "rejected"],
    isClientVisible: false,
    isPartnerVisible: true,
    partnerCanAdvance: false,
    auditRequired: true,
    primaryActionLabel: "بدء مراجعة الشركاء",
    tone: "warning",
  },
  "partner-review": {
    status: "partner-review",
    labelAr: "مراجعة الشركاء والكتالوج",
    labelEn: "Partner Catalog Review",
    ownerSurface: "control-panel-catalog",
    allowedNextStatuses: ["marketing-review", "needs-fix", "rejected"],
    isClientVisible: false,
    isPartnerVisible: true,
    partnerCanAdvance: false,
    auditRequired: true,
    primaryActionLabel: "إحالة للمراجعة التسويقية",
    tone: "info",
  },
  "marketing-review": {
    status: "marketing-review",
    labelAr: "المراجعة التسويقية",
    labelEn: "Marketing Review",
    ownerSurface: "control-panel-catalog",
    allowedNextStatuses: ["catalog-adopted", "needs-fix", "rejected"],
    isClientVisible: false,
    isPartnerVisible: true,
    partnerCanAdvance: false,
    auditRequired: true,
    primaryActionLabel: "اعتماد ودمج الكتالوج",
    tone: "info",
  },
  "catalog-adopted": {
    status: "catalog-adopted",
    labelAr: "تم الدمج في الكتالوج",
    labelEn: "Catalog Adopted",
    ownerSurface: "control-panel-catalog",
    allowedNextStatuses: ["catalog-approved"],
    isClientVisible: false,
    isPartnerVisible: true,
    partnerCanAdvance: false,
    auditRequired: true,
    primaryActionLabel: "الموافقة النهائية والنشر",
    tone: "success",
  },
  "catalog-approved": {
    status: "catalog-approved",
    labelAr: "معتمد في الكتالوج",
    labelEn: "Catalog Approved",
    ownerSurface: "control-panel-catalog",
    allowedNextStatuses: ["client-visible"],
    isClientVisible: false,
    isPartnerVisible: true,
    partnerCanAdvance: false,
    auditRequired: true,
    primaryActionLabel: "تفعيل الرؤية للعملاء",
    tone: "success",
  },
  "client-visible": {
    status: "client-visible",
    labelAr: "ظاهر للعميل",
    labelEn: "Client Visible",
    ownerSurface: "system",
    allowedNextStatuses: ["rejected"],
    isClientVisible: true,
    isPartnerVisible: true,
    partnerCanAdvance: false,
    auditRequired: true,
    tone: "success",
  },
  "needs-fix": {
    status: "needs-fix",
    labelAr: "يتطلب تعديل",
    labelEn: "Needs Fix",
    ownerSurface: "app-partner",
    allowedNextStatuses: ["partner-proposed"],
    isClientVisible: false,
    isPartnerVisible: true,
    partnerCanAdvance: true,
    primaryActionLabel: "إعادة الإرسال بعد التعديل",
    auditRequired: true,
    tone: "warning",
  },
  "rejected": {
    status: "rejected",
    labelAr: "مرفوض",
    labelEn: "Rejected",
    ownerSurface: "control-panel-catalog",
    allowedNextStatuses: [],
    isClientVisible: false,
    isPartnerVisible: true,
    partnerCanAdvance: false,
    auditRequired: true,
    tone: "danger",
  },
};
