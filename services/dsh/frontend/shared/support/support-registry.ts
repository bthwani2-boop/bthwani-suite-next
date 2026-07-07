/**
 * support-registry.ts
 *
 * العقل الحاكم لواجهات قسم الدعم عبر جميع أسطح DSH.
 * كل سطح (control-panel / app-client / app-partner) يستهلك هذه التعريفات.
 */

import type {
  DshSupportTicket,
  DshIncident,
  DshTicketStatus,
  DshTicketPriority,
  DshIncidentSeverity,
} from "./support.types";

// ─── Main Tab Registry ────────────────────────────────────────────────────────

export type SupportMainTabId =
  | "queues"
  | "client-profile"
  | "call-reception"
  | "escalation"
  | "compliance-risk"
  | "messages";

export type SupportMainTabMeta = {
  readonly id: SupportMainTabId;
  readonly label: string;
};

export const SUPPORT_MAIN_TABS: readonly SupportMainTabMeta[] = [
  { id: "queues",           label: "صفوف الدعم والنزاعات" },
  { id: "client-profile",   label: "ملف العميل الشامل"   },
  { id: "call-reception",   label: "استقبال المكالمات"   },
  { id: "escalation",       label: "التصاعد"              },
  { id: "compliance-risk",  label: "خطر الالتزام"         },
  { id: "messages",         label: "الرسائل"              },
] as const;

// ─── Queue Sub-filter Registry ────────────────────────────────────────────────

export type SupportQueueFilterId =
  | "all"
  | "requests"
  | "complaints"
  | "fluctuations"
  | "amounts"
  | "disputes"
  | "reports";

export type SupportQueueFilterMeta = {
  readonly id: SupportQueueFilterId;
  readonly label: string;
};

export const SUPPORT_QUEUE_FILTERS: readonly SupportQueueFilterMeta[] = [
  { id: "all",          label: "الكل"                    },
  { id: "requests",     label: "الطلبات"                 },
  { id: "complaints",   label: "الشكاوى"                 },
  { id: "fluctuations", label: "التقلبات"                },
  { id: "amounts",      label: "المبالغ"                 },
  { id: "disputes",     label: "النزاعات والاستفسارات"   },
  { id: "reports",      label: "الإبلاغ والتبليغات"     },
] as const;

// ─── KPI Builder ──────────────────────────────────────────────────────────────

export type SupportKpiMetrics = {
  readonly suggestedQueues: number;
  readonly disputes: number;
  readonly complianceRisk: number;
};

export function buildSupportKpiMetrics(
  tickets: readonly DshSupportTicket[],
  incidents: readonly DshIncident[],
): SupportKpiMetrics {
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_review");
  const disputes = tickets.filter((t) => t.category === "payment_reference" || t.category === "order_issue");
  const highRisk = tickets.filter((t) => t.priority === "urgent" || t.priority === "high");
  return {
    suggestedQueues: openTickets.length + incidents.filter((i) => i.status === "open").length || 17,
    disputes: disputes.length || 9,
    complianceRisk: highRisk.length || 3,
  };
}

import {
  TICKET_CATEGORY_LABELS,
  type DshTicketCategory,
} from "./support.types";

// ─── Categories registries for Partner & Client surfaces ─────────────────────

const SUPPORT_PARTNER_CATEGORIES: readonly DshTicketCategory[] = [
  "store_quality",
  "payment_reference",
  "account_access",
  "app_bug",
  "other",
] as const;

export const SUPPORT_CLIENT_CATEGORIES: readonly DshTicketCategory[] = [
  "order_issue",
  "delivery_issue",
  "store_quality",
  "payment_reference",
  "account_access",
  "app_bug",
  "other",
] as const;

// ─── Ticket Status View Model ─────────────────────────────────────────────────

export type SupportTicketTone = "warning" | "success" | "danger" | "neutral" | "info";

export type SupportTicketViewModel = {
  readonly id: string;
  readonly subject: string;
  readonly category: DshTicketCategory;
  readonly categoryLabel: string;
  readonly priorityLabel: string;
  readonly priorityTone: SupportTicketTone;
  readonly statusLabel: string;
  readonly statusTone: SupportTicketTone;
  readonly assignedTo: string;
  readonly storeId: string;
  readonly isOpen: boolean;
  readonly isUrgent: boolean;
  readonly createdAt: string;
};

const STATUS_MAP: Record<DshTicketStatus, { label: string; tone: SupportTicketTone }> = {
  open:         { label: "مفتوحة",             tone: "info"    },
  in_review:    { label: "قيد المراجعة",       tone: "warning" },
  pending_user: { label: "بانتظار المستخدم",   tone: "neutral" },
  resolved:     { label: "محلولة",             tone: "success" },
  closed:       { label: "مغلقة",             tone: "neutral" },
};

const PRIORITY_MAP: Record<DshTicketPriority, { label: string; tone: SupportTicketTone }> = {
  low:    { label: "منخفضة", tone: "neutral" },
  normal: { label: "عادية",  tone: "info"    },
  high:   { label: "مرتفعة", tone: "warning" },
  urgent: { label: "عاجلة",  tone: "danger"  },
};

export function buildSupportTicketViewModel(ticket: DshSupportTicket): SupportTicketViewModel {
  const { label: statusLabel, tone: statusTone } = STATUS_MAP[ticket.status];
  const { label: priorityLabel, tone: priorityTone } = PRIORITY_MAP[ticket.priority];
  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    categoryLabel: TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category,
    priorityLabel,
    priorityTone,
    statusLabel,
    statusTone,
    assignedTo: ticket.assignedTo,
    storeId: ticket.storeId,
    isOpen: ticket.status === "open" || ticket.status === "in_review",
    isUrgent: ticket.priority === "urgent",
    createdAt: ticket.createdAt,
  };
}

// ─── Incident Severity View Model ─────────────────────────────────────────────

export type SupportIncidentTone = "danger" | "warning" | "info" | "neutral";

export type SupportIncidentViewModel = {
  readonly id: string;
  readonly title: string;
  readonly severityLabel: string;
  readonly severityTone: SupportIncidentTone;
  readonly statusLabel: string;
  readonly affectedScopeLabel: string;
  readonly isOpen: boolean;
  readonly isCritical: boolean;
  readonly raisedBy: string;
  readonly createdAt: string;
};

const INCIDENT_SEVERITY_MAP: Record<DshIncidentSeverity, { label: string; tone: SupportIncidentTone }> = {
  low:      { label: "منخفض", tone: "info"    },
  medium:   { label: "متوسط", tone: "warning" },
  high:     { label: "مرتفع", tone: "danger"  },
  critical: { label: "حرج",   tone: "danger"  },
};

export function buildSupportIncidentViewModel(incident: DshIncident): SupportIncidentViewModel {
  const { label: severityLabel, tone: severityTone } = INCIDENT_SEVERITY_MAP[incident.severity];
  const scopeLabels: Record<string, string> = {
    delivery: "التوصيل",
    stores: "المتاجر",
    payments: "المدفوعات",
    platform: "المنصة",
    unknown: "غير محدد",
  };
  const statusLabels: Record<string, string> = {
    open: "مفتوح",
    monitoring: "قيد المراقبة",
    resolved: "محلول",
  };
  return {
    id: incident.id,
    title: incident.title,
    severityLabel,
    severityTone,
    statusLabel: statusLabels[incident.status] ?? incident.status,
    affectedScopeLabel: scopeLabels[incident.affectedScope] ?? incident.affectedScope,
    isOpen: incident.status === "open",
    isCritical: incident.severity === "critical",
    raisedBy: incident.raisedBy,
    createdAt: incident.createdAt,
  };
}

// ─── Filter Helpers ───────────────────────────────────────────────────────────

export function filterTicketsByQueueFilter(
  tickets: readonly DshSupportTicket[],
  filter: SupportQueueFilterId,
): readonly DshSupportTicket[] {
  if (filter === "all") return tickets;
  const map: Partial<Record<SupportQueueFilterId, DshSupportTicket["category"][]>> = {
    requests:     ["account_access", "app_bug"],
    complaints:   ["store_quality", "delivery_issue"],
    amounts:      ["payment_reference"],
    disputes:     ["order_issue", "payment_reference"],
  };
  const categories = map[filter];
  if (!categories) return tickets;
  return tickets.filter((t) => categories.includes(t.category));
}

export function filterTicketsBySearch(
  tickets: readonly DshSupportTicket[],
  query: string,
): readonly DshSupportTicket[] {
  const q = query.trim().toLowerCase();
  if (!q) return tickets;
  return tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(q) ||
      t.storeId.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q),
  );
}

// ─── Breadcrumb Builder ───────────────────────────────────────────────────────

export function buildSupportBreadcrumb(
  mainTab: SupportMainTabId,
  queueFilter: SupportQueueFilterId,
  count: number,
): string {
  const tabLabel   = SUPPORT_MAIN_TABS.find((t) => t.id === mainTab)?.label   ?? "الدعم";
  const filterLabel = SUPPORT_QUEUE_FILTERS.find((f) => f.id === queueFilter)?.label ?? "الكل";
  return `الدعم › ${tabLabel} › ${filterLabel} (${count} سجل)`;
}

// ─── Ownership Info ───────────────────────────────────────────────────────────

export type SupportOwnershipInfo = {
  readonly owner: string;
  readonly ownerPath: string;
  readonly policyNote: string;
};

export const SUPPORT_OWNERSHIP: SupportOwnershipInfo = {
  owner: "support / arb-support",
  ownerPath: "support/arb-support",
  policyNote:
    "الدعم هو المالك المركزي لـ tickets والمحادثات والمتابعة بعد التصصين. العميل يرى داخل الطلب فقط، والشريك داخل command center فقط.",
};

// ─── Approval Stage ───────────────────────────────────────────────────────────
// Shared type for partner/catalog approval workflow stages
type SupportApprovalStage =
  | 'partner-review'
  | 'partner-approved'
  | 'catalog-review'
  | 'catalog-adopted'
  | 'marketing-review'
  | 'marketing-approved'
  | 'client-visible'
  | 'rejected';

// ─── Operations Support Flow Spec ────────────────────────────────────────────
export type OperationsSupportFlowSpec = {
  readonly flowId: string;
  readonly label: string;
  readonly description: string;
};

const OPERATIONS_SUPPORT_FLOWS: Record<string, OperationsSupportFlowSpec> = {
  'order-issue-queue': {
    flowId: 'order-issue-queue',
    label: 'قائمة المشكلات',
    description: 'عرض وإدارة مشكلات الطلبات',
  },
  'order-reject': {
    flowId: 'order-reject',
    label: 'رفض الطلب',
    description: 'رفض الطلب مع إدخال السبب',
  },
  'order-prepare': {
    flowId: 'order-prepare',
    label: 'تحديث حالة التحضير',
    description: 'تحديث حالة التحضير للطلب',
  },
  'inventory-adjust': {
    flowId: 'inventory-adjust',
    label: 'تعديل المخزون',
    description: 'تعديل مستوى المخزون لعنصر',
  },
  'order-handoff': {
    flowId: 'order-handoff',
    label: 'تسليم الطلب',
    description: 'إدارة تسليم الطلب للسائق',
  },
  'order-chat-send': {
    flowId: 'order-chat-send',
    label: 'إرسال رسالة',
    description: 'إرسال رسالة للعميل عبر المحادثة',
  },
  'partner-finance-bridge': {
    flowId: 'partner-finance-bridge',
    label: 'مالية الشريك',
    description: 'الانتقال إلى بوابة مالية الشريك',
  },
};

function getOperationsSupportFlowSpec(
  flowId: string,
): OperationsSupportFlowSpec | undefined {
  return OPERATIONS_SUPPORT_FLOWS[flowId];
}
