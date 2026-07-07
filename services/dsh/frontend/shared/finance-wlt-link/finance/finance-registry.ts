import type {
  CanonicalFinanceGroupId,
  FinanceGroupMeta,
  FinanceNormalizationResult,
  FinancePanelId,
  FinanceWorkspaceInput,
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
    description: 'مطابقة النقد المحصل (COD)، كشف الفوارق المالية ومكافحة الاحتيال.',
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

function normalizeFinanceLocation(workspace?: string, panel?: string): FinanceNormalizationResult {
  const resolvedPanel = panel as FinancePanelId | undefined;
  const typedWorkspace = workspace as FinanceWorkspaceInput | undefined;

  if (!typedWorkspace) {
    return { kind: 'group', group: 'financial-command-center', subGroup: 'overview', sourceWorkspace: workspace, panel: resolvedPanel };
  }

  if (FINANCE_CANONICAL_GROUP_IDS.includes(typedWorkspace as CanonicalFinanceGroupId)) {
    const group = typedWorkspace as CanonicalFinanceGroupId;
    const meta = getFinanceGroupMeta(group);
    return { kind: 'group', group, subGroup: meta.subGroups?.[0]?.id, sourceWorkspace: workspace, panel: resolvedPanel };
  }

  switch (typedWorkspace) {
    case 'financial-center':
      return { kind: 'group', group: 'financial-command-center', subGroup: 'position', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'overview':
      return { kind: 'group', group: 'financial-command-center', subGroup: 'overview', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'ledger':
      return { kind: 'group', group: 'ledger-order-finance', subGroup: 'ledger', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'audit-close':
    case 'daily-close':
      return { kind: 'group', group: 'reports-policies-approvals', subGroup: 'approvals', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'account-statements':
      return { kind: 'group', group: 'payments-wallets', subGroup: 'client-wallets', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'captain-finance':
      return { kind: 'group', group: 'payments-wallets', subGroup: 'captain-wallets', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'store-settlements':
    case 'stores':
    case 'store-delivery-finance':
      return { kind: 'group', group: 'settlements-payouts', subGroup: 'stores', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'partner-settlements':
    case 'partners':
    case 'settlements':
    case 'payouts':
    case 'settlements-payouts':
      return { kind: 'group', group: 'settlements-payouts', subGroup: 'partners', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'settlement-calendar':
      return { kind: 'group', group: 'settlements-payouts', subGroup: 'bank-transfers', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'tax-compliance':
      return { kind: 'group', group: 'commissions-fees-promo', subGroup: 'fees', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'refund-ledger':
    case 'refunds':
      return { kind: 'group', group: 'refunds-disputes-holds', subGroup: 'refunds', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'cod-cash':
    case 'cod-reconciliation':
    case 'captain-eligibility':
      return { kind: 'group', group: 'reconciliation-risk', subGroup: 'reconciliation', sourceWorkspace: workspace, panel: resolvedPanel };
    case 'risk-audit':
    case 'variances':
      return { kind: 'group', group: 'reconciliation-risk', subGroup: 'risk-fraud', sourceWorkspace: workspace, panel: resolvedPanel };
    default:
      return { kind: 'group', group: 'financial-command-center', subGroup: 'overview', sourceWorkspace: workspace, panel: resolvedPanel };
  }
}

export function buildFinanceHref(group: CanonicalFinanceGroupId = 'financial-command-center', options?: { subGroup?: string | undefined; panel?: FinancePanelId | undefined }) {
  const searchParams = new URLSearchParams();
  if (group !== 'financial-command-center') searchParams.set('workspace', group);
  if (options?.subGroup) searchParams.set('subGroup', options.subGroup);
  if (options?.panel) searchParams.set('panel', options.panel);
  const query = searchParams.toString();
  return query ? `/dsh/finance?${query}` : '/dsh/finance';
}
