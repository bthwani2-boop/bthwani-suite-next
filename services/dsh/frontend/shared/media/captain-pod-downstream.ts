/** PoD downstream notification targets — read-only contract references. Actual delivery is owned by WLT + backend. */
export type DshCaptainPodDownstreamTarget = {
  readonly surface: 'app-client' | 'app-partner' | 'control-panel' | 'wlt-finance';
  readonly notificationLabel: string;
  readonly stateChange: string;
  readonly readOnlyReference: true;
  readonly contractState: 'DSH_WLT_READ_ONLY_REFERENCE';
};

export const DSH_CAPTAIN_POD_DOWNSTREAM: readonly DshCaptainPodDownstreamTarget[] = [
  {
    surface: 'app-client',
    notificationLabel: 'إشعار: "تم تسليم طلبك"',
    stateChange: 'client state → delivered',
    readOnlyReference: true,
    contractState: 'DSH_WLT_READ_ONLY_REFERENCE',
  },
  {
    surface: 'app-partner',
    notificationLabel: 'تحديث حالة الطلب: "تم التوصيل"',
    stateChange: 'partner order list → delivered',
    readOnlyReference: true,
    contractState: 'DSH_WLT_READ_ONLY_REFERENCE',
  },
  {
    surface: 'control-panel',
    notificationLabel: 'الطلب يُغلق في Operations + يُضاف لـ COD pending settlement',
    stateChange: 'ops order → closed + finance cod list → new entry',
    readOnlyReference: true,
    contractState: 'DSH_WLT_READ_ONLY_REFERENCE',
  },
  {
    surface: 'wlt-finance',
    notificationLabel: 'بدء احتساب تسوية الكابتن (COD + عمولة)',
    stateChange: 'wlt settlement queue → captain entry added',
    readOnlyReference: true,
    contractState: 'DSH_WLT_READ_ONLY_REFERENCE',
  },
] as const;
