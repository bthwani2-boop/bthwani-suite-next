'use client';

import React from 'react';
import { StateView } from '@bthwani/ui-kit';

export type OrderRescueScreenProps = {
  hubHref: string;
  subGroup?: string;
};

export type RescueCase = never;

/**
 * Source-preserving quarantine for order rescue.
 *
 * The previous screen converted every recent order into a fabricated rescue
 * case and exposed local-only mutations. The production router does not mount
 * this workspace. It remains explicitly blocked until rescue cases, allowed
 * actions, evidence, audit, and readback are supplied by a sovereign backend.
 */
export function OrderRescueScreen(_props: OrderRescueScreenProps) {
  return (
    <StateView
      kind="warning"
      title="إنقاذ الطلبات غير مفعّل"
      description="لا توجد حاليًا حالة إنقاذ سيادية أو أوامر مدققة مرتبطة بـDSH Runtime؛ لذلك لا تُعرض حالات مصطنعة ولا تنفذ إجراءات محلية."
    />
  );
}

export default OrderRescueScreen;
