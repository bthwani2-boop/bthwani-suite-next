/** PoD downstream notification targets — preview only. Actual delivery requires WLT + backend. */
export type DshCaptainPodDownstreamTarget = {
  readonly surface: 'app-client' | 'app-partner' | 'control-panel' | 'wlt-finance';
  readonly notificationLabel: string;
  readonly stateChange: string;
  readonly previewOnly: true;
  readonly contractState: 'CONTRACT_SCAFFOLD_PREVIEW_ONLY';
};

export const DSH_CAPTAIN_POD_DOWNSTREAM: readonly DshCaptainPodDownstreamTarget[] = [
  {
    surface: 'app-client',
    notificationLabel: 'إشعار: "تم تسليم طلبك"',
    stateChange: 'client state → delivered',
    previewOnly: true,
    contractState: 'CONTRACT_SCAFFOLD_PREVIEW_ONLY',
  },
  {
    surface: 'app-partner',
    notificationLabel: 'تحديث حالة الطلب: "تم التوصيل"',
    stateChange: 'partner order list → delivered',
    previewOnly: true,
    contractState: 'CONTRACT_SCAFFOLD_PREVIEW_ONLY',
  },
  {
    surface: 'control-panel',
    notificationLabel: 'الطلب يُغلق في Operations + يُضاف لـ COD pending settlement',
    stateChange: 'ops order → closed + finance cod list → new entry',
    previewOnly: true,
    contractState: 'CONTRACT_SCAFFOLD_PREVIEW_ONLY',
  },
  {
    surface: 'wlt-finance',
    notificationLabel: 'بدء احتساب تسوية الكابتن (COD + عمولة)',
    stateChange: 'wlt settlement queue → captain entry added',
    previewOnly: true,
    contractState: 'CONTRACT_SCAFFOLD_PREVIEW_ONLY',
  },
] as const;
