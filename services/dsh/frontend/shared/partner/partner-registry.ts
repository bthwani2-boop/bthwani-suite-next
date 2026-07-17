export type PartnerWorkspaceTabId =
  | 'inbox'
  | 'all_partners'
  | 'field_readiness';

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
 * Only globally backed workspaces are exposed here. Partner documents,
 * lifecycle activation, stores, visits, readiness, and audit are entity-scoped
 * and live in PartnerDetailScreen after selecting the sovereign partner id.
 */
export const PARTNER_PRIMARY_TABS: readonly PartnerWorkspaceTabItem[] = [
  { id: 'inbox', label: 'طلبات الانضمام' },
  { id: 'all_partners', label: 'كل الشركاء' },
  { id: 'field_readiness', label: 'تصعيدات الجاهزية' },
];

export const PARTNER_SUB_TAB_DEFINITIONS: Readonly<Record<PartnerWorkspaceTabId, readonly PartnerSubTabItem[]>> = {
  inbox: [
    { id: 'registration', label: 'طلبات التسجيل' },
  ],
  all_partners: [
    { id: 'partners_list', label: 'قائمة الشركاء' },
  ],
  field_readiness: [
    { id: 'field_readiness_queue', label: 'قائمة التصعيدات' },
  ],
};

export function isPartnerWorkspaceTabId(value: string | null | undefined): value is PartnerWorkspaceTabId {
  return value === 'inbox' || value === 'all_partners' || value === 'field_readiness';
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
