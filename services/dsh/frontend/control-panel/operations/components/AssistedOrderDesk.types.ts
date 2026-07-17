import type { DshFulfillmentDeliveryMode } from '../../../shared/delivery/delivery.contract';

export const IDENTITY_STATUS_META = {
  verified: { label: 'هوية مؤكدة', tone: 'success' as const, risk: 'neutral' as const },
  required: { label: 'التحقق مطلوب', tone: 'warning' as const, risk: 'warning' as const },
  blocked: { label: 'محظور', tone: 'danger' as const, risk: 'danger' as const },
} as const;

export const SERVICEABILITY_STATUS_META = {
  serviceable: { label: 'قابل للخدمة', tone: 'success' as const },
  blocked: { label: 'محظور', tone: 'danger' as const },
} as const;

export type AssistedOrderVerificationStatus = keyof typeof IDENTITY_STATUS_META;
export type AssistedOrderServiceabilityStatus = keyof typeof SERVICEABILITY_STATUS_META;
export type AssistedOrderCartItemStatus = 'active' | 'substitute' | 'unavailable';

export type AssistedLookupInput = {
  key: string;
  label?: string;
  value: string;
  [key: string]: unknown;
};

export type AssistedVerificationStep = {
  stepId: string;
  label: string;
  completed: boolean;
  [key: string]: unknown;
};

export type AssistedOrderCartItem = {
  sku: string;
  name: string;
  quantity: number;
  status: AssistedOrderCartItemStatus;
  published?: boolean;
  note?: string;
  [key: string]: unknown;
};

export type AssistedDeliveryModeOption = {
  modeId: DshFulfillmentDeliveryMode;
  label: string;
  [key: string]: unknown;
};

export type AssistedOrderDesk = {
  deskId: string;
  orderId?: string;
  customerId: string;
  ticketId?: string;
  customerName: string;
  basketSummary: string;
  nextAction: string;
  auditFlags: string[];
  lookupPanel: {
    inputs: AssistedLookupInput[];
  };
  identityVerification: {
    verificationStatus: AssistedOrderVerificationStatus;
    verificationSteps: AssistedVerificationStep[];
  };
  cartBuilderPreview: {
    items: AssistedOrderCartItem[];
  };
  deliveryModeSelector: {
    selectedMode: DshFulfillmentDeliveryMode;
    options: AssistedDeliveryModeOption[];
  };
  serviceabilitySummary: {
    serviceabilityStatus: AssistedOrderServiceabilityStatus;
    zoneLabel: string;
  };
  wltReadOnlyHandoff: {
    calculationTruthOwner: string;
    paymentVisibility: string;
    refundVisibility: string;
    settlementVisibility?: string;
    [key: string]: string | undefined;
  };
  auditReason: {
    reasonLabel: string;
    operatorNote: string;
    [key: string]: string;
  };
  submitDraftPreview: {
    nextAction: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type AssistedOrderPlaybook = {
  playbookId: string;
  title: string;
  checkpoints: string[];
  severity: 'danger' | 'warning' | 'neutral' | 'success';
};

export const translateDesc = (text: string) => {
  const descTranslations: Record<string, string> = {
    'Payment snapshot is read-only from WLT.': 'حالة الدفع من WLT للعرض فقط.',
    'Paid via WLT wallet snapshot — read-only visibility.': 'الدفع عبر محفظة WLT للعرض فقط.',
    'Refund execution remains WLT-owned; DSH displays status only.': 'تنفيذ الاسترداد مملوك لـ WLT؛ DSH يعرض الحالة فقط.',
    'Settlement remains WLT-owned; DSH displays status only.': 'التسوية مملوكة لـ WLT؛ DSH يعرض الحالة فقط.',
    'Partner settlement remains WLT-owned; DSH displays status only.': 'تسوية الشريك مملوكة لـ WLT؛ DSH يعرض الحالة فقط.',
    'Assisted order rebuild after manual call confirmation.': 'إعادة بناء الطلب المساعد بعد التأكيد الهاتفي اليدوي.',
    'DSH & WLT': 'نظام DSH والمحفظة WLT',
    'Riyadh / Al Yasmin': 'الرياض / الياسمين',
    'Riyadh / Al Malaz': 'الرياض / الملز',
    'Riyadh / Al Olaya': 'الرياض / العليا',
  };
  return descTranslations[text] ?? text;
};
