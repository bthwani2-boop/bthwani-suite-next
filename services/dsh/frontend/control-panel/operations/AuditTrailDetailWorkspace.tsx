'use client';

import React from 'react';
import { Box, KeyValueList, Surface, Text } from '@bthwani/ui-kit';
import { WebControlPanelInspectorShell } from '@bthwani/ui-kit/web';
import type { DshRuntimeOrderRow } from '../../shared/operations/dsh-operational-runtime-adapter';

export type AuditTrailDetailWorkspaceProps = {
  readonly orderId?: string | undefined;
  readonly order?: DshRuntimeOrderRow | undefined;
  readonly onClose?: (() => void) | undefined;
};

/**
 * Fail-closed operational inspector.
 *
 * DSH currently exposes an order runtime read model, not a canonical audit-entry
 * API for this workspace. The component therefore displays only returned order
 * facts and never manufactures actors, permissions, decisions, reasons, or
 * evidence locally.
 */
export function AuditTrailDetailWorkspace({
  orderId = '—',
  order,
  onClose,
}: AuditTrailDetailWorkspaceProps) {
  const title = `مراجعة تشغيلية — ${order?.id ?? orderId}`;

  return (
    <WebControlPanelInspectorShell title={title} onClose={onClose ?? (() => undefined)}>
      <Box gap={4} padding={4}>
        {!order ? (
          <Surface tone="warning" padding={3}>
            <Text role="bodySm" tone="warning">
              لا توجد أدلة تدقيق خادمية لهذا العنصر. تم إيقاف العرض المحلي المصطنع حتى يوفّر DSH عقد تدقيق فعليًا بهوية المنفّذ والقرار والسبب والأدلة.
            </Text>
          </Surface>
        ) : (
          <>
            <Surface tone="warning" padding={3}>
              <Text role="bodySm" tone="warning">
                المعروض أدناه حقائق تشغيلية من DSH Runtime، وليس سجل تدقيق. لا يُستنتج منها منفّذ أو صلاحية أو قرار تدقيق.
              </Text>
            </Surface>

            <KeyValueList
              items={[
                { label: 'معرّف الطلب', value: order.id },
                { label: 'المتجر', value: order.storeId },
                { label: 'العميل', value: order.clientId },
                { label: 'طريقة التنفيذ', value: order.fulfillmentMode },
                { label: 'الحالة التشغيلية', value: order.status },
                { label: 'الكابتن', value: order.captainId ?? 'غير معيّن' },
                { label: 'حالة الكابتن', value: order.captainLifecycleStatus ?? 'غير متاحة' },
                { label: 'إثبات التسليم', value: order.podMediaKey ? 'مرتبط' : 'غير مرتبط' },
                { label: 'سبب فشل التوصيل', value: order.deliveryFailureReason ?? 'لا يوجد' },
                { label: 'آخر تحديث', value: new Date(order.updatedAt).toLocaleString('ar-YE') },
              ]}
            />
          </>
        )}
      </Box>
    </WebControlPanelInspectorShell>
  );
}
