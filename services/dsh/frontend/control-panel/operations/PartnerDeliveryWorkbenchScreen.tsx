'use client';

import React from 'react';
import { Box, Text } from '@bthwani/ui-kit';
import { WebControlPanelRecommendation } from '@bthwani/ui-kit/web';
import type { OperationsFocusParams } from './operations.types';

const DshPartnerStoreCourierScreen = React.lazy(() => import('../../app-partner/store/DshPartnerStoreCourierScreen').then(m => ({ default: m.DshPartnerStoreCourierScreen })));

export type PartnerDeliveryWorkbenchScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: OperationsFocusParams;
};

export function PartnerDeliveryWorkbenchScreen({ focusParams }: PartnerDeliveryWorkbenchScreenProps) {
  // If we had a store selector, we'd use it here.
  // For now, if the user focused on an order, we could extract storeId.
  // Assuming focusParams.orderId implies a selected context.
  const storeId = 'mock-store-id'; // In a real app, this would be selected from a list or derived from orderId

  return (
    <Box gap={4}>
      <Text role="title" align="start">إدارة توصيل المتجر (Partner Delivery)</Text>
      <WebControlPanelRecommendation
        title="تنبيه السعة والتحكم"
        reason="تغيير سعة المنطقة والمتاجر متاح فقط من مركز القيادة (Command Center). هذه الشاشة مخصصة لإدارة بيانات موصّل المتجر الشريك."
        confidence="high"
        auditTag="PARTNER_DELIVERY_SCOPES"
      />
      <div style={{ background: 'var(--bthwani-control-panel-surface)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '12px', overflow: 'hidden', minHeight: '500px', position: 'relative' }}>
        <React.Suspense fallback={<div style={{ padding: '24px', textAlign: 'center' }}>جاري التحميل...</div>}>
          <DshPartnerStoreCourierScreen
            storeId={storeId}
            scopes={[
              { scopeId: 'branch-1', displayName: 'الفرع الرئيسي' }
            ]}
            onBack={() => {}}
          />
        </React.Suspense>
      </div>
    </Box>
  );
}
