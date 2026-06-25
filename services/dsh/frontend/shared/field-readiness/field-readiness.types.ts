export type DshVisitType = "onboarding" | "periodic" | "escalation_followup";
export type DshVisitStatus = "in_progress" | "complete" | "escalated";

export type DshCheckType =
  | "location_verified"
  | "documents_uploaded"
  | "product_list_submitted"
  | "equipment_checked"
  | "safety_compliant"
  | "hygiene_compliant";

export type DshCheckStatus = "pending" | "passed" | "failed";

export type DshEscalationStatus = "open" | "acknowledged" | "resolved" | "escalated_further";
export type DshEscalationSeverity = "low" | "medium" | "high" | "critical";
export type DshEscalationCategory =
  | "document_missing"
  | "safety_violation"
  | "location_mismatch"
  | "product_compliance"
  | "equipment_failure"
  | "other";

export type DshFieldVisit = {
  readonly id: string;
  readonly storeId: string;
  readonly fieldAgentId: string;
  readonly visitType: DshVisitType;
  readonly status: DshVisitStatus;
  readonly notes: string;
  readonly startedAt: string;
  readonly completedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshReadinessCheck = {
  readonly id: string;
  readonly visitId: string;
  readonly storeId: string;
  readonly checkType: DshCheckType;
  readonly status: DshCheckStatus;
  readonly evidenceUrl: string;
  readonly notes: string;
  readonly verifiedBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshReadinessEscalation = {
  readonly id: string;
  readonly visitId: string;
  readonly storeId: string;
  readonly raisedBy: string;
  readonly severity: DshEscalationSeverity;
  readonly category: DshEscalationCategory;
  readonly description: string;
  readonly status: DshEscalationStatus;
  readonly resolvedBy?: string;
  readonly resolvedAt?: string | null;
  readonly resolutionNote: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshOnboardingStatus = {
  readonly storeId: string;
  readonly totalVisits: number;
  readonly completedVisits: number;
  readonly openEscalations: number;
  readonly onboardingComplete: boolean;
  readonly status: "pending" | "complete" | "escalation_required";
};

export type DshCreateVisitInput = {
  readonly visitType?: DshVisitType;
};

export type DshUpsertCheckInput = {
  readonly checkType: DshCheckType;
  readonly status: DshCheckStatus;
  readonly evidenceUrl?: string;
  readonly notes?: string;
};

export type DshCreateEscalationInput = {
  readonly visitId?: string;
  readonly severity: DshEscalationSeverity;
  readonly category: DshEscalationCategory;
  readonly description: string;
};

export type DshUpdateEscalationInput = {
  readonly status: DshEscalationStatus;
  readonly resolutionNote?: string;
};

export const CHECK_TYPE_LABELS: Record<DshCheckType, string> = {
  location_verified: "التحقق من الموقع",
  documents_uploaded: "رفع الوثائق",
  product_list_submitted: "قائمة المنتجات",
  equipment_checked: "فحص المعدات",
  safety_compliant: "الامتثال الأمني",
  hygiene_compliant: "الامتثال الصحي",
};

export const ESCALATION_SEVERITY_LABELS: Record<DshEscalationSeverity, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
  critical: "حرج",
};

export const ESCALATION_CATEGORY_LABELS: Record<DshEscalationCategory, string> = {
  document_missing: "وثيقة مفقودة",
  safety_violation: "مخالفة أمنية",
  location_mismatch: "تعارض الموقع",
  product_compliance: "امتثال المنتج",
  equipment_failure: "عطل معدات",
  other: "أخرى",
};

export const VISIT_STATUS_LABELS: Record<DshVisitStatus, string> = {
  in_progress: "جارٍ",
  complete: "مكتملة",
  escalated: "مُصعَّدة",
};
