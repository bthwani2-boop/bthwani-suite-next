export type PartnerWorkspaceTabId =
  | 'inbox'
  | 'all_partners'
  | 'activation'
  | 'field_readiness'
  | 'documents_contracts'
  | 'governance'
  | 'performance';

export type PartnerSubTabItem = {
  readonly id: string;
  readonly label: string;
};

export type PartnerWorkspaceTabItem = {
  readonly id: PartnerWorkspaceTabId;
  readonly label: string;
  readonly active?: boolean;
};

export const PARTNER_PRIMARY_TABS: readonly PartnerWorkspaceTabItem[] = [
  { id: 'inbox', label: 'الوارد الجديد' },
  { id: 'all_partners', label: 'كل الشركاء' },
  { id: 'activation', label: 'تفعيل' },
  { id: 'field_readiness', label: 'جاهزية الميدان' },
  { id: 'documents_contracts', label: 'العقود والوثائق' },
  { id: 'governance', label: 'الحوكمة والتجاوزات' },
  { id: 'performance', label: 'الأداء والعروض' },
];

export const PARTNER_SUB_TAB_DEFINITIONS: Readonly<Record<string, readonly PartnerSubTabItem[]>> = {
  inbox: [
    { id: 'registration', label: 'طلبات التسجيل' },
    { id: 'modifications', label: 'تعديل البيانات' },
    { id: 'complaints', label: 'شكاوى الشراكة' },
  ],
  all_partners: [
    { id: 'partners_list', label: 'قائمة الشركاء' },
  ],
  activation: [
    { id: 'partner_activation', label: 'تفعيل شركاء' },
  ],
  field_readiness: [
    { id: 'field_readiness_queue', label: 'جاهزية الميدان' },
    { id: 'readiness_escalations', label: 'تصاعد الجاهزية' },
    { id: 'readiness_approvals', label: 'اعتمادات الجاهزية' },
  ],
  documents_contracts: [
    { id: 'documents', label: 'وثائق الشراكة' },
    { id: 'contracts', label: 'إدارة العقود والإحصاءات' },
  ],
  governance: [
    { id: 'overrides', label: 'تجاوزات الكاتالوج' },
    { id: 'deactivation', label: 'إلغاء التفعيل' },
  ],
  performance: [
    { id: 'performance', label: 'الأداء والإحصاءات' },
    { id: 'eligibility', label: 'أهلية الترويج' },
    { id: 'topology', label: 'مستويات الخدمة' },
  ],
};

export function buildPartnersHref(group: PartnerWorkspaceTabId = 'inbox', options?: { subGroup?: string | undefined }) {
  const searchParams = new URLSearchParams();
  if (group !== 'inbox') searchParams.set('workspace', group);
  if (options?.subGroup) searchParams.set('subGroup', options.subGroup);
  const query = searchParams.toString();
  return query ? `/dsh/partners?${query}` : '/dsh/partners';
}
