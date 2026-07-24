export type PartnerWorkspaceTabId =
  | 'inbox'
  | 'activation'
  | 'documents'
  | 'field_readiness'
  | 'readiness_approvals'
  | 'catalog_exceptions'
  | 'performance'
  | 'promotion_eligibility'
  | 'service_levels'
  | 'contracts'
  | 'deactivation'
  | 'stores'
  | 'all_partners';

export type PartnerSubTabItem = {
  readonly id: string;
  readonly label: string;
};

export type PartnerWorkspaceTabItem = {
  readonly id: PartnerWorkspaceTabId;
  readonly label: string;
  readonly active?: boolean;
};

/**
 * Complete partner/legal-entity workspace. Entity-scoped documents, visits,
 * stores, readiness and audit remain available inside PartnerDetailScreen, while
 * these tabs provide real cross-partner operational queues and entry points.
 */
export const PARTNER_PRIMARY_TABS: readonly PartnerWorkspaceTabItem[] = [
  { id: 'inbox', label: 'الوارد الجديد' },
  { id: 'activation', label: 'تفعيل الشريك' },
  { id: 'documents', label: 'وثائق الشراكة' },
  { id: 'field_readiness', label: 'تصاعد الجاهزية' },
  { id: 'readiness_approvals', label: 'اعتمادات الجاهزية' },
  { id: 'catalog_exceptions', label: 'تجاوزات الكتالوج' },
  { id: 'performance', label: 'الأداء والإحصاءات' },
  { id: 'promotion_eligibility', label: 'أهلية الترويج' },
  { id: 'service_levels', label: 'مستويات الخدمة' },
  { id: 'contracts', label: 'العقود والشكاوى' },
  { id: 'deactivation', label: 'إلغاء التفعيل' },
  { id: 'stores', label: 'المتاجر والفروع' },
  { id: 'all_partners', label: 'كل الشركاء' },
];

export const PARTNER_SUB_TAB_DEFINITIONS: Readonly<Record<PartnerWorkspaceTabId, readonly PartnerSubTabItem[]>> = {
  inbox: [
    { id: 'registration', label: 'طلبات التسجيل' },
  ],
  activation: [
    { id: 'activation_queue', label: 'قائمة التفعيل' },
    { id: 'operations_review', label: 'مراجعة العمليات' },
  ],
  documents: [
    { id: 'document_review', label: 'المراجعة' },
    { id: 'document_resubmit', label: 'إعادة الرفع' },
  ],
  field_readiness: [
    { id: 'field_readiness_queue', label: 'قائمة التصعيدات' },
  ],
  readiness_approvals: [
    { id: 'readiness_pending', label: 'بانتظار الاعتماد' },
    { id: 'readiness_ready', label: 'جاهز للنشر' },
  ],
  catalog_exceptions: [
    { id: 'catalog_blocked', label: 'كتالوج غير جاهز' },
    { id: 'catalog_ready', label: 'كتالوج جاهز' },
  ],
  performance: [
    { id: 'partner_performance', label: 'أداء الشركاء' },
    { id: 'store_performance', label: 'أداء الفروع' },
  ],
  promotion_eligibility: [
    { id: 'marketing_eligibility', label: 'أهلية الظهور' },
    { id: 'offers_benefits', label: 'المزايا والعروض' },
  ],
  service_levels: [
    { id: 'service_level', label: 'مستوى الخدمة' },
    { id: 'operational_follow_up', label: 'المتابعة التشغيلية' },
  ],
  contracts: [
    { id: 'contract_management', label: 'إدارة العقود' },
    { id: 'partnership_complaints', label: 'شكاوى الشراكة' },
    { id: 'partnership_disputes', label: 'النزاعات' },
  ],
  deactivation: [
    { id: 'deactivation_queue', label: 'طلبات الإيقاف' },
    { id: 'client_hidden', label: 'المخفي عن العملاء' },
  ],
  stores: [
    { id: 'stores_management', label: 'إدارة المتاجر والفروع' },
  ],
  all_partners: [
    { id: 'partners_list', label: 'قائمة الشركاء' },
  ],
};

export function isPartnerWorkspaceTabId(value: string | null | undefined): value is PartnerWorkspaceTabId {
  return PARTNER_PRIMARY_TABS.some((tab) => tab.id === value);
}

export function resolvePartnerSubTab(workspace: PartnerWorkspaceTabId, value: string | null | undefined): string {
  const definitions = PARTNER_SUB_TAB_DEFINITIONS[workspace];
  if (value && definitions.some((item) => item.id === value)) return value;
  return definitions[0]?.id ?? '';
}

export function buildPartnersHref(group: PartnerWorkspaceTabId = 'inbox', options?: { subGroup?: string | undefined }) {
  const searchParams = new URLSearchParams();
  if (group !== 'inbox') searchParams.set('workspace', group);
  const subGroup = resolvePartnerSubTab(group, options?.subGroup);
  if (subGroup) searchParams.set('subGroup', subGroup);
  const query = searchParams.toString();
  return query ? `/dsh/partners?${query}` : '/dsh/partners';
}
