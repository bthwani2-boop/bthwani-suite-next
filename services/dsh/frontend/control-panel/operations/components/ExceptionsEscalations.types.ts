export type WorkspaceFilterId = 'all' | 'mobile-owned' | 'finance-preview' | 'hidden-compat' | 'control-policy';

export type SelectedItem =
  | { type: 'exception'; id: string }
  | { type: 'flow'; id: string }
  | { type: 'rescue'; id: string }
  | { type: 'playbook'; id: string }
  | null;

export type ExceptionsStateItem = {
  id: string;
  type: string;
  lifecycleState: string;
  affectedSurface: string;
  ownerQueue: string;
  severity: string;
  currentOwner: string;
  startTime: string;
  lastAction: string;
  suggestedAction: string;
  resolutionPath: string;
  routeHint: string;
  evidenceNeeded: boolean;
  onDemandDetailPolicy: string;
  note: string;
  statusTone: string;
  customOwner: string;
  customQueue: string;
  customSlaState: 'نشط' | 'مصعّد' | 'محلول';
  customNote: string;
  customStatusTone: 'warning' | 'danger' | 'best' | 'brand';
  realId?: string;
};

export const WORKSPACE_FILTERS: ReadonlyArray<{ id: WorkspaceFilterId; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'mobile-owned', label: 'مُلاك الجوال' },
  { id: 'finance-preview', label: 'معاينة مالية' },
  { id: 'hidden-compat', label: 'توافقي مخفي' },
  { id: 'control-policy', label: 'سياسة التحكم' },
];

export const SURFACE_LABELS: Record<string, string> = {
  'app-client': 'العميل',
  'app-partner': 'الشريك',
  'app-captain': 'الكابتن',
  'app-field': 'الميداني',
  'control-panel': 'لوحة التحكم',
  'wlt-finance': 'WLT المالية',
};

export const DOMAIN_LABELS: Record<string, string> = {
  'order-lifecycle': 'دورة الطلب',
  'cart-checkout': 'السلة والدفع',
  tracking: 'التتبع',
  'delivery-mode': 'وضع التنفيذ',
  'partner-operations': 'تشغيل الشريك',
  'captain-operations': 'تشغيل الكابتن',
  'field-onboarding': 'ضم المتاجر',
  'catalog-inventory': 'الكتالوج والمخزون',
  'support-escalation': 'الدعم والتصعيد',
  'chat-conversation': 'المحادثات',
  'cancellation-rejection': 'الإلغاء والرفض',
  'finance-preview': 'مالي للقراءة فقط',
  'control-policy': 'سياسة التحكم',
};

export const VISIBILITY_LABELS: Record<string, string> = {
  primary: 'أساسي',
  contextual: 'سياقي',
  'escalation-only': 'تصعيد فقط',
  'hidden-compat': 'توافقي مخفي',
  internal: 'داخلي',
  disabled: 'معطل',
};

export const POLICY_LABELS: Record<string, string> = {
  'summary-only': 'ملخص أولًا',
  'detail-on-open': 'تفاصيل عند الفتح',
  'evidence-on-open': 'أدلة عند الفتح',
  'chat-on-open': 'دردشة عند الفتح',
  'finance-preview-only': 'مالي للقراءة فقط',
};

// Friendly queue names and simulated default owners
export const QUEUE_LABELS: Record<string, { label: string; owner: string }> = {
  'customer-support': { label: 'دعم العملاء (Customer Support)', owner: 'فريق دعم العملاء' },
  'captain-operations': { label: 'تشغيل الكباتن (Captain Operations)', owner: 'إدارة الكباتن' },
  'partner-stores': { label: 'جاهزية وإدارة الشركاء (Partner Stores)', owner: 'إدارة الشركاء' },
  'dispatch-assignment': { label: 'الإسناد والجدولة (Dispatch)', owner: 'فريق الإسناد' },
  'audit-support-sla': { label: 'تدقيق الدعم والالتزام (SLA Audit)', owner: 'الدعم الفني' },
};
