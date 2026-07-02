export type PartnerWorkspaceTabId =
  | 'inbox'
  | 'activation'
  | 'documents'
  | 'readiness_escalations'
  | 'readiness_approvals'
  | 'overrides'
  | 'performance'
  | 'eligibility'
  | 'topology'
  | 'contracts'
  | 'deactivation';

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
  { id: 'activation', label: 'تفعيل الشريك' },
  { id: 'documents', label: 'وثائق الشراكة' },
  { id: 'readiness_escalations', label: 'تصاعد الجاهزية' },
  { id: 'readiness_approvals', label: 'اعتمادات الجاهزية' },
  { id: 'overrides', label: 'تجاوزات الكاتالوج' },
  { id: 'performance', label: 'الأداء والإحصاءات' },
  { id: 'eligibility', label: 'أهلية الترويج' },
  { id: 'topology', label: 'مستويات الخدمة' },
  { id: 'contracts', label: 'إدارة العقود والإحصاءات' },
  { id: 'deactivation', label: 'إلغاء التفعيل' },
];

export const PARTNER_SUB_TAB_DEFINITIONS: Readonly<Record<string, readonly PartnerSubTabItem[]>> = {
  inbox: [
    { id: 'registration', label: 'طلبات التسجيل' },
    { id: 'modifications', label: 'تعديل البيانات' },
    { id: 'complaints', label: 'شكاوى الشراكة' },
  ],
  performance: [
    { id: 'performance', label: 'الأداء والسرعة' },
    { id: 'disputes', label: 'النزاعات والاستفسار' },
    { id: 'visibility', label: 'الظهور والتمييز' },
  ],
  eligibility: [
    { id: 'benefits', label: 'المزايا والعروض' },
  ],
};

export function buildPartnersHref(group: PartnerWorkspaceTabId = 'inbox', options?: { subGroup?: string | undefined }) {
  const searchParams = new URLSearchParams();
  if (group !== 'inbox') searchParams.set('workspace', group);
  if (options?.subGroup) searchParams.set('subGroup', options.subGroup);
  const query = searchParams.toString();
  return query ? `/dsh/partners?${query}` : '/dsh/partners';
}
