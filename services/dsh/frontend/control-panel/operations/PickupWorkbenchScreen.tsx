'use client';

import React, { useState } from 'react';
import { Box, Text } from '@bthwani/ui-kit';
import { WebControlPanelQueue, WebControlPanelDecisionRow, WebControlPanelRecommendation } from '@bthwani/ui-kit/web';
import { useOperatorPickupsController } from '../../shared/pickup/use-pickup-controller';
import { opsTheme as theme } from '../../shared/operations';

export function PickupWorkbenchScreen() {
  const { listState, loadList, extendWindow, resendNotification } = useOperatorPickupsController({ limit: 100, autoLoad: true });
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleResend = async (orderId: string, version: number) => {
    setActionFeedback('جاري إعادة الإرسال...');
    const result = await resendNotification(orderId, version);
    if (result.ok) {
      setActionFeedback('تم الإرسال بنجاح.');
      loadList();
    } else {
      setActionFeedback(`فشل: ${result.message}`);
    }
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleExtend = async (orderId: string, version: number) => {
    setActionFeedback('جاري تمديد النافذة...');
    // Add 2 hours for fallback
    const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const result = await extendWindow(orderId, version, 'طلب من الدعم التشغيلي (Operator fallback)', newExpiry);
    if (result.ok) {
      setActionFeedback('تم التمديد بنجاح.');
      loadList();
    } else {
      setActionFeedback(`فشل: ${result.message}`);
    }
    setTimeout(() => setActionFeedback(null), 3000);
  };

  if (!listState.loaded && listState.data.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: theme.textMuted, fontSize: '13px' }}>جارٍ تحميل جلسات الاستلام...</p>
      </div>
    );
  }

  return (
    <Box gap={4}>
      <Text role="title" align="start">إدارة جلسات الاستلام الذاتي (Pickup)</Text>
      <WebControlPanelRecommendation
        title="إدارة جلسات OTP والـ QR"
        reason="يمكنك من هذه الشاشة متابعة جلسات الاستلام الذاتي للمتاجر، وإعادة إرسال رموز التحقق، وتمديد نوافذ الاستلام لتجنب الـ No-Show."
        confidence="high"
        auditTag="PICKUP_SESSION_MANAGEMENT"
      />
      {actionFeedback && (
        <div style={{ padding: '12px', background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', marginBottom: '16px', color: 'var(--bthwani-control-panel-brand)' }}>
          {actionFeedback}
        </div>
      )}
      <WebControlPanelQueue title="نوافذ الاستلام المباشرة" meta={`${listState.data.length} جلسة`}>
        {listState.data.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Text role="bodySm" tone="muted">لا توجد جلسات استلام نشطة حالياً.</Text>
          </div>
        ) : (
          listState.data.map((session) => (
            <WebControlPanelDecisionRow
              key={session.id}
              entityId={session.id}
              entityLabel={`طلب: ${session.orderId} — عميل: ${session.clientId}`}
              status={new Date(session.expiresAt) < new Date() ? 'expired' : 'active'}
              statusTone={new Date(session.expiresAt) < new Date() ? 'danger' : 'success'}
              sla={`ينتهي في: ${new Date(session.expiresAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
              reason={`المحاولات: ${session.attemptCount}/${session.maxAttempts}`}
              primaryAction={{
                id: `extend-${session.id}`,
                label: 'تمديد النافذة',
                onAction: () => handleExtend(session.orderId, session.version),
              }}
              secondaryAction={{
                id: `resend-${session.id}`,
                label: 'إعادة إرسال الإشعار',
                onAction: () => handleResend(session.orderId, session.version),
              }}
            />
          ))
        )}
      </WebControlPanelQueue>
    </Box>
  );
}
