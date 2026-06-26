// DSH partner types — shared across all surfaces.
// No JSX. No ui-kit. No Tamagui.

export type {
  DshPartnerActivationStatus,
  DshPartner,
  DshPartnerSummary,
  DshPartnerDocument,
  DshPartnerFieldVisit,
  DshPartnerActivationEvent,
  DshPartnerReadiness,
  DshPartnerReadinessItem,
  DshPartnerListResponse,
  DshPartnerApiError,
} from "../../../clients/partner-client";

export const PARTNER_ACTIVATION_STATUSES = [
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
  "ops_approved",
  "ops_rejected",
  "partner_active",
  "partner_deactivated",
  "client_visible",
  "client_hidden",
] as const;

export type DshPartnerDocumentType =
  | "national_id"
  | "commercial_register"
  | "lease_agreement"
  | "health_certificate"
  | "store_photo"
  | "owner_photo"
  | "other";

export const REQUIRED_DOCUMENT_TYPES: DshPartnerDocumentType[] = [
  "national_id",
  "commercial_register",
];

export const DOCUMENT_TYPE_LABELS: Record<DshPartnerDocumentType, string> = {
  national_id: "الهوية الوطنية",
  commercial_register: "السجل التجاري",
  lease_agreement: "عقد الإيجار أو الملكية",
  health_certificate: "شهادة صحة / ترخيص",
  store_photo: "صورة المتجر",
  owner_photo: "صورة المالك",
  other: "مستند آخر",
};
