'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, StateView, Text } from '@bthwani/ui-kit';
import { buildOperationsHref } from './operations.registry';

export type AssistedOrderDeskScreenProps = {
  hubHref: string;
  subGroup?: string;
};

/**
 * Assisted-order mutation is intentionally fail-closed.
 *
 * The previous screen fabricated customer identity, cart items, serviceability,
 * WLT state, and submission success in local React state. No governed backend
 * contract currently authorizes an operator to impersonate a client, mutate a
 * client cart, or submit a draft on the client's behalf. Until Product Truth,
 * server permissions, audit, and client acceptance exist, this route may only
 * direct operators to real runtime workspaces.
 */
export function AssistedOrderDeskScreen(_props: AssistedOrderDeskScreenProps) {
  const router = useRouter();
  const liveOrdersHref = buildOperationsHref('live-orders', { subGroup: 'queue' });
  const specialOperationsHref = buildOperationsHref('special-ops', { subGroup: 'shein' });

  return (
    <Box gap={4}>
      <StateView
        kind="warning"
        title="الطلبات المساعدة غير مفعلة"
        description="لا يوجد حاليًا عقد سيادي يسمح ببحث العميل أو تعديل سلته أو تقديم مسودة باسمه. تم حجب الواجهة المحلية التي كانت تعرض هوية ومنتجات وقابلية خدمة ونجاحًا غير صادر من DSH."
      />
      <Box gap={2}>
        <Text role="bodyStrong" align="start">المسارات التشغيلية المتاحة فعليًا</Text>
        <Button
          label="فتح صف الطلبات الحية"
          tone="primary"
          onPress={() => router.push(liveOrdersHref)}
        />
        <Button
          label="فتح العمليات الخاصة"
          tone="secondary"
          onPress={() => router.push(specialOperationsHref)}
        />
      </Box>
    </Box>
  );
}

export default AssistedOrderDeskScreen;
