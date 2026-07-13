import type {
  AnyOperationsWorkspaceId,
  CanonicalOperationsGroupId,
  LegacyOperationsWorkspaceId,
  LegacySectionRedirectId,
  NonOperationsSectionRootId,
  OperationsFocusParams,
  OperationsGroupMeta,
  OperationsNormalizationResult,
  OperationsPanelId,
  OperationsViewState,
  StateViewCopy,
} from './operations.types';

export type { AnyOperationsWorkspaceId } from './operations.types';

export const OPERATIONS_CANONICAL_GROUPS: readonly OperationsGroupMeta[] = [
  {
    id: 'command-center',
    label: 'مركز القيادة',
    description: 'نبض العمليات، المعوقات، وأفضل إجراء تالي.',
    badge: 'قيادة',
    subGroups: [
      { id: 'overview', label: 'نظرة عامة' },
      { id: 'anomalies', label: 'شواذ النظام' },
      { id: 'recommendations', label: 'توصيات ذكية' },
      { id: 'carts', label: 'نشاط السلال' },
      { id: 'checkout', label: 'نشاط الدفع' },
    ],
  },
  {
    id: 'live-orders',
    label: 'الطلبات الحية',
    description: 'الصف الحي، وضع التنفيذ، التدخل المباشر، والمساعدة والإنقاذ.',
    badge: 'أساس',
    subGroups: [
      { id: 'queue', label: 'الصف الحي' },
      { id: 'bthwani_delivery', label: 'توصيل بثواني' },
      { id: 'partner_delivery', label: 'توصيل المتجر' },
      { id: 'pickup', label: 'استلام بنفسي' },
      { id: 'unassigned', label: 'غير مسندة' },
      { id: 'delayed', label: 'متأخرة' },
      { id: 'proofs', label: 'الإثباتات' },
      { id: 'assisted', label: 'مساعدة' },
      { id: 'rescue', label: 'إنقاذ' },
    ],
  },
  {
    id: 'dispatch-capacity',
    label: 'الإسناد والسعة',
    description: 'الإسناد، الكباتن، خريطة المناطق، والسعة التشغيلية — مسار واحد.',
    badge: 'إسناد',
    subGroups: [
      { id: 'pending', label: 'قيد الإسناد' },
      { id: 'heatmap', label: 'خريطة المناطق' },
      { id: 'zones', label: 'المناطق والسعة' },
    ],
  },
  {
    id: 'exceptions',
    label: 'الاستثناءات والتصعيد',
    description: 'الاستثناءات النشطة، التدقيق والالتزام، وجاهزية المتاجر.',
    badge: 'مخاطر',
    subGroups: [
      { id: 'active', label: 'الاستثناءات النشطة' },
      { id: 'audit', label: 'التدقيق والالتزام' },
      { id: 'stores', label: 'المتاجر' },
    ],
  },
  {
    id: 'special-ops',
    label: 'العمليات الخاصة',
    description: 'المسارات اليدوية والعمليات ذات المعالجة الخاصة.',
    badge: 'يدوي',
    subGroups: [
      { id: 'shein', label: 'شي إن' },
      { id: 'awnak', label: 'عونك' },
    ],
  },
] as const;

export const OPERATIONS_CANONICAL_GROUP_IDS = OPERATIONS_CANONICAL_GROUPS.map((group) => group.id) as readonly CanonicalOperationsGroupId[];

export const NON_OPERATIONS_SECTION_SHORTCUTS: ReadonlyArray<{
  id: NonOperationsSectionRootId;
  label: string;
  description: string;
  href: `/${NonOperationsSectionRootId}`;
}> = [
  { id: 'support', label: 'الدعم', description: 'التذاكر والمتابعة والتصعيد تبقى في قسم الدعم.', href: '/support' },
  { id: 'finance', label: 'المالية', description: 'الحقائق المالية تبقى في قسم المالية.', href: '/finance' },
  { id: 'catalogs', label: 'الكتالوجات', description: 'حوكمة الكتالوج تبقى في قسم الكتالوجات.', href: '/catalogs' },
  { id: 'marketing', label: 'التسويق', description: 'التسويق والنمو يبقيان في قسم التسويق.', href: '/marketing' },
  { id: 'partners', label: 'الشركاء', description: 'إدارة الشركاء تبقى في قسم الشركاء.', href: '/partners' },
  { id: 'platform', label: 'المنصة', description: 'السياسات والمتغيرات والـ rollouts تبقى في قسم المنصة.', href: '/platform' },
  { id: 'administration', label: 'الإدارة', description: 'الأدوار وسلسلة الاعتماد تبقى في قسم الإدارة.', href: '/administration' },
] as const;

type CanonicalMapping = { group: CanonicalOperationsGroupId; subGroup?: string };

type LegacyOperationalWorkspaceId = Exclude<LegacyOperationsWorkspaceId, LegacySectionRedirectId>;

const LEGACY_OPERATIONAL_TO_CANONICAL_GROUP: Record<LegacyOperationalWorkspaceId | 'orders' | 'overview', CanonicalMapping> = {
  // command-center
  overview:              { group: 'command-center' },
  dashboard:             { group: 'command-center' },
  // live-orders — queue/filters
  orders:                { group: 'live-orders', subGroup: 'queue' },
  'tracking-handoff':    { group: 'live-orders', subGroup: 'queue' },
  'order-detail':        { group: 'live-orders', subGroup: 'queue' },
  orderchat:             { group: 'live-orders', subGroup: 'queue' },
  'live-tracking':       { group: 'live-orders', subGroup: 'queue' },
  handoff:               { group: 'live-orders', subGroup: 'queue' },
  'proof-review':        { group: 'live-orders', subGroup: 'proofs' },
  bell:                  { group: 'live-orders', subGroup: 'queue' },
  'arrival-bell':        { group: 'live-orders', subGroup: 'queue' },
  // live-orders — assisted & rescue
  'assisted-order-desk': { group: 'live-orders', subGroup: 'assisted' },
  'order-rescue':        { group: 'live-orders', subGroup: 'rescue' },
  // dispatch-capacity
  'dispatch-assignment': { group: 'dispatch-capacity', subGroup: 'pending' },
  dispatch:              { group: 'dispatch-capacity', subGroup: 'pending' },
  'dispatch-fleet':      { group: 'dispatch-capacity', subGroup: 'pending' },
  reassign:              { group: 'dispatch-capacity', subGroup: 'pending' },
  'peak-mode':           { group: 'dispatch-capacity', subGroup: 'pending' },
  'captain-operations':  { group: 'dispatch-capacity', subGroup: 'captains' },
  'captain-ops':         { group: 'dispatch-capacity', subGroup: 'captains' },
  'geo-heatmap':         { group: 'dispatch-capacity', subGroup: 'heatmap' },
  'live-map-capacity':   { group: 'dispatch-capacity', subGroup: 'heatmap' },
  'area-capacity':       { group: 'dispatch-capacity', subGroup: 'zones' },
  capacity:              { group: 'dispatch-capacity', subGroup: 'zones' },
  'zone-set':            { group: 'dispatch-capacity', subGroup: 'zones' },
  serviceability:        { group: 'dispatch-capacity', subGroup: 'zones' },
  // exceptions
  'exceptions-escalations': { group: 'exceptions', subGroup: 'active' },
  'exceptions-sla':      { group: 'exceptions', subGroup: 'active' },
  exceptions:            { group: 'exceptions', subGroup: 'active' },
  issues:                { group: 'exceptions', subGroup: 'active' },
  'audit-support-sla':   { group: 'exceptions', subGroup: 'audit' },
  'audit-evidence':      { group: 'exceptions', subGroup: 'audit' },
  audit:                 { group: 'exceptions', subGroup: 'audit' },
  'guard-status':        { group: 'exceptions', subGroup: 'audit' },
  evidence:              { group: 'exceptions', subGroup: 'audit' },
  sla:                   { group: 'exceptions', subGroup: 'audit' },
  'partner-stores':      { group: 'exceptions', subGroup: 'stores' },
  'partner-readiness':   { group: 'exceptions', subGroup: 'stores' },
  'field-ops':           { group: 'exceptions', subGroup: 'stores' },
  'partner-prep':        { group: 'exceptions', subGroup: 'stores' },
  // special-ops
  sheinproxy:            { group: 'special-ops', subGroup: 'shein' },
  'awnak-operations':    { group: 'special-ops', subGroup: 'awnak' },
  'proxy-shein-awnak':   { group: 'special-ops', subGroup: 'awnak' },
};

const LEGACY_SECTION_REDIRECTS: Record<LegacySectionRedirectId, NonOperationsSectionRootId> = {
  support: 'support',
  finance: 'finance',
  settlements: 'finance',
  cod: 'finance',
  refunds: 'finance',
  catalogs: 'catalogs',
  'catalog-categories': 'catalogs',
  marketing: 'marketing',
  banners: 'marketing',
  growth: 'marketing',
  loyalty: 'marketing',
  'smart-signal': 'marketing',
  partners: 'partners',
  platform: 'platform',
  administration: 'administration',
};

export function coerceOperationsPanel(panel?: string): OperationsPanelId | undefined {
  if (panel === 'detail' || panel === 'chat' || panel === 'batches') {
    return panel;
  }
  return undefined;
}

export function normalizeOperationsLocation(
  workspace?: string,
  panel?: string,
): OperationsNormalizationResult {
  const resolvedPanel = coerceOperationsPanel(panel);

  if (!workspace || workspace === 'overview') {
    return {
      kind: 'group',
      group: 'command-center',
      sourceWorkspace: workspace as AnyOperationsWorkspaceId | undefined,
      panel: resolvedPanel,
    };
  }

  const directCanonical = OPERATIONS_CANONICAL_GROUP_IDS.find((groupId) => groupId === workspace);
  if (directCanonical) {
    return {
      kind: 'group',
      group: directCanonical,
      sourceWorkspace: directCanonical,
      panel: resolvedPanel,
    };
  }

  if (Object.prototype.hasOwnProperty.call(LEGACY_SECTION_REDIRECTS, workspace)) {
    const section = LEGACY_SECTION_REDIRECTS[workspace as LegacySectionRedirectId];
    return {
      kind: 'redirect',
      sourceWorkspace: workspace as AnyOperationsWorkspaceId,
      section,
      href: `/${section}`,
    };
  }

  const mapped = LEGACY_OPERATIONAL_TO_CANONICAL_GROUP[workspace as LegacyOperationalWorkspaceId | 'orders' | 'overview'];
  if (!mapped) {
    return {
      kind: 'group',
      group: 'command-center',
      sourceWorkspace: workspace as AnyOperationsWorkspaceId,
      panel: resolvedPanel,
    };
  }

  const derivedPanel = workspace === 'order-detail'
    ? 'detail'
    : workspace === 'orderchat'
      ? 'chat'
      : resolvedPanel;

  return {
    kind: 'group',
    group: mapped.group,
    subGroup: mapped.subGroup,
    sourceWorkspace: workspace as AnyOperationsWorkspaceId,
    panel: derivedPanel,
  };
}

export function buildOperationsHref(
  group: AnyOperationsWorkspaceId = 'command-center',
  options?: OperationsFocusParams,
) {
  const normalizedLocation = normalizeOperationsLocation(group, options?.panel);
  
  if (normalizedLocation.kind === 'redirect') {
    return `/dsh/${normalizedLocation.section}`;
  }

  const searchParams = new globalThis.URLSearchParams();

  if (normalizedLocation.kind === 'group' && normalizedLocation.group !== 'command-center') {
    searchParams.set('workspace', normalizedLocation.group);
  }

  if (options?.orderId) {
    searchParams.set('orderId', options.orderId);
  }

  if (options?.customerId) {
    searchParams.set('customerId', options.customerId);
  }

  if (options?.ticketId) {
    searchParams.set('ticketId', options.ticketId);
  }

  if (options?.callId) {
    searchParams.set('callId', options.callId);
  }

  if (options?.requestId) {
    searchParams.set('requestId', options.requestId);
  }

  if (options?.panel) {
    searchParams.set('panel', options.panel);
  }

  const resolvedSubGroup = options?.subGroup ?? (normalizedLocation.kind === 'group' ? normalizedLocation.subGroup : undefined);
  if (resolvedSubGroup) {
    searchParams.set('subGroup', resolvedSubGroup);
  }

  const query = searchParams.toString();
  return query ? `/dsh/operations?${query}` : '/dsh/operations';
}

export function getOperationsGroupMeta(groupId: CanonicalOperationsGroupId) {
  return OPERATIONS_CANONICAL_GROUPS.find((group) => group.id === groupId) ?? OPERATIONS_CANONICAL_GROUPS[0];
}

const STATE_COPY: Record<Exclude<OperationsViewState, 'ready'>, StateViewCopy> = {
  loading: {
    stateId: 'loading',
    title: 'جاري تحميل معاينة العمليات',
    description: 'تجهّز مساحة المعاينة الحالة التشغيلية التالية.',
    actionLabel: 'فتح العمليات',
  },
  empty: {
    stateId: 'empty',
    title: 'لا يوجد محتوى بعد',
    description: 'لا توجد عينة تشغيلية متاحة لمساحة العمل الحالية.',
    actionLabel: 'فتح العمليات',
  },
  error: {
    stateId: 'recoverableError',
    title: 'بيانات المعاينة غير متاحة',
    description: 'يمكن أن تتعافى مساحة العمل بعد التحديث التالي.',
    actionLabel: 'فتح العمليات',
  },
  offline: {
    stateId: 'offline',
    title: 'معاينة العمليات غير متصلة',
    description: 'أعد الاتصال أو حدّث مساحة العمل للمتابعة.',
    actionLabel: 'فتح العمليات',
  },
  disabled: {
    kind: 'warning',
    title: 'تم تعطيل وضع المعاينة',
    description: 'تظل المعاينة التشغيلية مخفية حتى تصبح مساحة العمل جاهزة مرة أخرى.',
    actionLabel: 'فتح العمليات',
  },
};

export function resolveOperationsStateCopy(state: Exclude<OperationsViewState, 'ready'>): StateViewCopy {
  return STATE_COPY[state];
}
