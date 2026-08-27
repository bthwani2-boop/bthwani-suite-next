import type {
  CanonicalFinanceGroupId,
  FinanceGroupMeta,
  FinanceNormalizationResult,
  FinancePanelId,
} from './finance.types';

export const FINANCE_CANONICAL_GROUPS: readonly FinanceGroupMeta[] = [
  {
    id: 'financial-command-center',
    label: 'مركز القيادة المالية',
    description: 'المشهد المالي الشامل: الأرصدة، التدفقات، والمركز المالي اليومي.',
    badge: 'HQ',
    subGroups: [
      { id: 'overview', label: 'الخلاصة المالية' },
      { id: 'position', label: 'المركز المالي اليومي' }
    ]
  },
  {
    id: 'ledger-order-finance',
    label: 'الأستاذ وحركات الطلبات',
    description: 'دفتر الأستاذ العام، ودورة الحياة المالية الكاملة للطلبات مع سجل الأثر.',
    badge: 'Ledger',
    subGroups: [
      { id: 'ledger', label: 'دفتر الأستاذ العام' },
      { id: 'order-lifecycle', label: 'دورة الطلب المالية' },
      { id: 'audit-trail', label: 'سجل الأثر والتدقيق' }
    ]
  },
  {
    id: 'payments-wallets',
    label: 'المدفوعات والمحافظ',
    description: 'إدارة المدفوعات الواردة، ومحافظ العملاء، الشركاء، الكباتن والمنصة.',
    badge: 'Wallet',
    subGroups: [
      { id: 'payments', label: 'عمليات الدفع' },
      { id: 'client-wallets', label: 'محافظ العملاء' },
      { id: 'partner-wallets', label: 'محافظ الشركاء' },
      { id: 'captain-wallets', label: 'محافظ الكباتن' },
      { id: 'platform-wallet', label: 'محفظة المنصة' }
    ]
  },
  {
    id: 'settlements-payouts',
    label: 'التسويات والدفعات',
    description: 'إدارة وتدقيق تسويات مستحقات المتاجر، الكباتن، الميدانيين، وحوالات الصرف البنكية.',
    badge: 'Payout',
    subGroups: [
      { id: 'partners', label: 'تسويات الشركاء' },
      { id: 'stores', label: 'تسويات المتاجر' },
      { id: 'captains', label: 'تسويات الكباتن' },
      { id: 'field', label: 'تسويات الميدانيين' },
      { id: 'gateways', label: 'بوابات الدفع' },
      { id: 'bank-transfers', label: 'الحوالات البنكية' }
    ]
  },
  {
    id: 'refunds-disputes-holds',
    label: 'الاستردادات والنزاعات',
    description: 'معالجة المبالغ المرجوعة للعملاء، النزاعات التشغيلية، والتعليق الاحترازي للدفعات.',
    badge: 'Risk',
    subGroups: [
      { id: 'refunds', label: 'الاستردادات' },
      { id: 'cancellations', label: 'الإلغاءات' },
      { id: 'disputes', label: 'النزاعات' },
      { id: 'holds', label: 'المبالغ المحجوزة' }
    ]
  },
  {
    id: 'commissions-fees-promo',
    label: 'العمولات والتمويل الترويجي',
    description: 'إدارة عمولات المنصة، الرسوم الإضافية، الفواتير والضرائب، وتكلفة الحملات الترويجية.',
    badge: 'Promo',
    subGroups: [
      { id: 'commissions', label: 'العمولات' },
      { id: 'fees', label: 'الرسوم والضرائب' },
      { id: 'promo', label: 'التمويل الترويجي' }
    ]
  },
  {
    id: 'reconciliation-risk',
    label: 'المطابقة والمخاطر',
    description: 'مطابقة البيانات المالية، كشف الفوارق ومكافحة الاحتيال.',
    badge: 'Audit',
    subGroups: [
      { id: 'reconciliation', label: 'مطابقة البيانات' },
      { id: 'risk-fraud', label: 'المخاطر والاحتيال' }
    ]
  },
  {
    id: 'reports-policies-approvals',
    label: 'التقارير والاعتمادات',
    description: 'التقارير المالية الدورية، سياسات العمولات والتحكم، ومسار اعتمادات Maker-Checker.',
    badge: 'Gov',
    subGroups: [
      { id: 'reports', label: 'التقارير المالية' },
      { id: 'policies', label: 'السياسات والتحكم' },
      { id: 'approvals', label: 'الاعتمادات والموافقات' }
    ]
  }
];

export const FINANCE_CANONICAL_GROUP_IDS = FINANCE_CANONICAL_GROUPS.map((group) => group.id) as readonly CanonicalFinanceGroupId[];

export function getFinanceGroupMeta(groupId: CanonicalFinanceGroupId) {
  return FINANCE_CANONICAL_GROUPS.find((group) => group.id === groupId) ?? FINANCE_CANONICAL_GROUPS[0]!;
}

export function buildFinanceHref(group: CanonicalFinanceGroupId = 'financial-command-center', options?: { subGroup?: string | undefined; panel?: FinancePanelId | undefined }) {
  const searchParams = new URLSearchParams();
  if (group !== 'financial-command-center') searchParams.set('workspace', group);
  if (options?.subGroup) searchParams.set('subGroup', options.subGroup);
  if (options?.panel) searchParams.set('panel', options.panel);
  const query = searchParams.toString();
  return query ? `/wlt/finance?${query}` : '/wlt/finance';
}
