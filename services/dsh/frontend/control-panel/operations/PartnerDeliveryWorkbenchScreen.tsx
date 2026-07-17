'use client';

import React from 'react';
import { StateView } from '@bthwani/ui-kit';
import type { OperationsFocusParams } from './operations.types';

export type PartnerDeliveryWorkbenchScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: OperationsFocusParams;
};

/**
 * The live partner-delivery journey is owned by the partner surface and the
 * partner-delivery backend. Operations may monitor it through LiveOrders but
 * must not mount a partner screen with a fabricated store scope.
 */
export function PartnerDeliveryWorkbenchScreen(_props: PartnerDeliveryWorkbenchScreenProps) {
  return (
    <StateView
      kind="warning"
      title="إدارة موصل المتجر غير متاحة من العمليات"
      description="اختر طلب توصيل متجر من الطلبات الحية. تعديل فريق المتجر ونطاق الفروع يبقى داخل تطبيق الشريك بعد حل المتجر من الجلسة الموثقة."
    />
  );
}

export default PartnerDeliveryWorkbenchScreen;
