import {
  CONTROL_PANEL_SECTION_ROUTES,
  type ControlPanelSectionRoute,
} from '../control-panel-routes.ts';
import type {
  CanonicalOperationsGroupId,
  NonOperationsSectionRootId,
  OperationsFocusParams,
  OperationsGroupMeta,
  OperationsPanelId,
  OperationsViewState,
  StateViewCopy,
} from './operations.types';

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
    description: 'الإسناد، الكباتن، خريطة المناطق، والسعة التشغيلية ضمن مسار واحد.',
    badge: 'إسناد',
    subGroups: [
      { id: 'pending', label: 'قيد الإسناد' },
      { id: 'captains', label: 'الكباتن' },
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

export const OPERATIONS_CANONICAL_GROUP_IDS = OPERATIONS_CANONICAL_GROUPS.map(
  (group) => group.id,
) as readonly CanonicalOperationsGroupId[];

type NonOperationsSectionRoute = ControlPanelSectionRoute;

export const NON_OPERATIONS_SECTION_SHORTCUTS: ReadonlyArray<{
  id: NonOperationsSectionRootId;
  label: string;
  description: string;
  href: NonOperationsSectionRoute;
}> = [
  { id: 'support', label: 'الدعم', description: 'التذاكر والمتابعة والتصعيد تبقى في قسم الدعم.', href: CONTROL_PANEL_SECTION_ROUTES.support },
  { id: 'finance', label: 'المالية', description: 'الحقائق المالية تبقى في قسم المالية.', href: CONTROL_PANEL_SECTION_ROUTES.finance },
  { id: 'catalogs', label: 'الكتالوجات', description: 'حوكمة الكتالوج تبقى في قسم الكتالوجات.', href: CONTROL_PANEL_SECTION_ROUTES.catalogs },
  { id: 'marketing', label: 'التسويق', description: 'التسويق والنمو يبقيان في قسم التسويق.', href: CONTROL_PANEL_SECTION_ROUTES.marketing },
  { id: 'partners', label: 'الشركاء', description: 'إدارة الشركاء تبقى في قسم الشركاء.', href: CONTROL_PANEL_SECTION_ROUTES.partners },
  { id: 'platform', label: 'المنصة', description: 'السياسات والمتغيرات تبقى في قسم المنصة.', href: CONTROL_PANEL_SECTION_ROUTES.platform },
  { id: 'administration', label: 'الإدارة', description: 'الأدوار وسلسلة الاعتماد تبقى في قسم الإدارة.', href: CONTROL_PANEL_SECTION_ROUTES.administration },
] as const;

export function coerceOperationsPanel(panel?: string): OperationsPanelId | undefined {
  if (
    panel === 'detail'
    || panel === 'timeline'
    || panel === 'chat'
    || panel === 'batches'
    || panel === 'proof'
    || panel === 'audit'
    || panel === 'dispatch'
    || panel === 'exception'
  ) {
    return panel;
  }
  return undefined;
}

export function buildOperationsHref(
  group: CanonicalOperationsGroupId = 'command-center',
  options?: OperationsFocusParams,
) {
  const searchParams = new globalThis.URLSearchParams();
  if (group !== 'command-center') {
    searchParams.set('workspace', group);
  }

  if (options?.orderId) searchParams.set('orderId', options.orderId);
  if (options?.customerId) searchParams.set('customerId', options.customerId);
  if (options?.ticketId) searchParams.set('ticketId', options.ticketId);
  if (options?.callId) searchParams.set('callId', options.callId);
  if (options?.requestId) searchParams.set('requestId', options.requestId);
  if (options?.panel) searchParams.set('panel', options.panel);

  const resolvedSubGroup = options?.subGroup;
  if (resolvedSubGroup) searchParams.set('subGroup', resolvedSubGroup);
  const query = searchParams.toString();
  return query ? `/dsh/operations?${query}` : '/dsh/operations';
}

export function getOperationsGroupMeta(groupId: CanonicalOperationsGroupId): OperationsGroupMeta {
  return OPERATIONS_CANONICAL_GROUPS.find((group) => group.id === groupId)
    ?? OPERATIONS_CANONICAL_GROUPS[0]!;
}

const STATE_COPY: Record<Exclude<OperationsViewState, 'ready'>, StateViewCopy> = {
  loading: {
    stateId: 'loading',
    title: 'جاري تحميل العمليات',
    description: 'تتم قراءة الحالة التشغيلية من الخدمات المالكة.',
    actionLabel: 'فتح العمليات',
  },
  empty: {
    stateId: 'empty',
    title: 'لا توجد بيانات تشغيلية',
    description: 'لم تُرجع الخدمة المالكة بيانات للمساحة الحالية.',
    actionLabel: 'فتح العمليات',
  },
  error: {
    stateId: 'recoverableError',
    title: 'تعذر تحميل بيانات العمليات',
    description: 'أعد المحاولة لقراءة الحالة من المصدر التشغيلي.',
    actionLabel: 'فتح العمليات',
  },
  offline: {
    stateId: 'offline',
    title: 'خدمة العمليات غير متصلة',
    description: 'أعد الاتصال أو حدّث الصفحة للمتابعة.',
    actionLabel: 'فتح العمليات',
  },
  disabled: {
    kind: 'warning',
    title: 'مساحة العمليات معطلة',
    description: 'هذه المساحة غير متاحة وفق إعدادات التشغيل الحالية.',
    actionLabel: 'فتح العمليات',
  },
};

export function resolveOperationsStateCopy(
  state: Exclude<OperationsViewState, 'ready'>,
): StateViewCopy {
  return STATE_COPY[state];
}
