export type DshTicketStatus = "open" | "in_review" | "pending_user" | "resolved" | "closed";
export type DshTicketPriority = "low" | "normal" | "high" | "urgent";
export type DshTicketCategory =
  | "order_issue"
  | "delivery_issue"
  | "store_quality"
  | "payment_reference"
  | "account_access"
  | "app_bug"
  | "other";

export type DshSenderRole = "client" | "partner" | "captain" | "operator" | "system";
export type DshIncidentStatus = "open" | "monitoring" | "resolved";
export type DshIncidentSeverity = "low" | "medium" | "high" | "critical";
export type DshIncidentScope = "delivery" | "stores" | "payments" | "platform" | "unknown";

export type DshSupportTicket = {
  readonly id: string;
  readonly storeId: string;
  readonly reporterId: string;
  readonly reporterRole: string;
  readonly subject: string;
  readonly description: string;
  readonly category: DshTicketCategory;
  readonly priority: DshTicketPriority;
  readonly status: DshTicketStatus;
  readonly assignedTo: string;
  readonly orderId: string;
  readonly resolvedAt?: string | null | undefined;
  readonly closedAt?: string | null | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshSupportMessage = {
  readonly id: string;
  readonly ticketId: string;
  readonly senderId: string;
  readonly senderRole: DshSenderRole;
  readonly body: string;
  readonly isInternal: boolean;
  readonly createdAt: string;
};

export type DshSupportTicketEvent = {
  readonly id: string;
  readonly ticketId: string;
  readonly reporterId: string;
  readonly actorId: string;
  readonly actorRole: DshSenderRole;
  readonly eventType: "created" | "message_added" | "status_changed" | "escalated" | "closed";
  readonly correlationId: string;
  readonly createdAt: string;
};

export type DshIncident = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: DshIncidentSeverity;
  readonly status: DshIncidentStatus;
  readonly affectedScope: DshIncidentScope;
  readonly raisedBy: string;
  readonly resolvedBy?: string | undefined;
  readonly resolvedAt?: string | null | undefined;
  readonly postmortemUrl: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshCreateTicketInput = {
  readonly subject: string;
  readonly description: string;
  readonly category: DshTicketCategory;
  readonly priority?: DshTicketPriority | undefined;
  readonly storeId?: string | undefined;
  readonly orderId?: string | undefined;
};

export type DshAddMessageInput = {
  readonly body: string;
  readonly isInternal?: boolean | undefined;
};

export type DshUpdateTicketInput = {
  readonly expectedStatus?: DshTicketStatus | undefined;
  readonly status: DshTicketStatus;
  readonly assignedTo?: string | undefined;
};

export type DshCreateIncidentInput = {
  readonly title: string;
  readonly description: string;
  readonly severity: DshIncidentSeverity;
  readonly affectedScope?: DshIncidentScope | undefined;
};

export type DshUpdateIncidentInput = {
  readonly status: DshIncidentStatus;
  readonly postmortemUrl?: string | undefined;
};

export const TICKET_STATUS_LABELS: Record<DshTicketStatus, string> = {
  open: "مفتوحة",
  in_review: "قيد المراجعة",
  pending_user: "بانتظار المستخدم",
  resolved: "محلولة",
  closed: "مغلقة",
};

export const TICKET_PRIORITY_LABELS: Record<DshTicketPriority, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "مرتفعة",
  urgent: "عاجلة",
};

export const TICKET_CATEGORY_LABELS: Record<DshTicketCategory, string> = {
  order_issue: "مشكلة في الطلب",
  delivery_issue: "مشكلة في التوصيل",
  store_quality: "جودة المتجر",
  payment_reference: "مرجع دفع",
  account_access: "الوصول للحساب",
  app_bug: "خلل تقني",
  other: "أخرى",
};

export const INCIDENT_SEVERITY_LABELS: Record<DshIncidentSeverity, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
  critical: "حرج",
};

export const INCIDENT_STATUS_LABELS: Record<DshIncidentStatus, string> = {
  open: "مفتوح",
  monitoring: "قيد المراقبة",
  resolved: "محلول",
};

export const INCIDENT_SCOPE_LABELS: Record<DshIncidentScope, string> = {
  delivery: "التوصيل",
  stores: "المتاجر",
  payments: "المدفوعات",
  platform: "المنصة",
  unknown: "غير محدد",
};
