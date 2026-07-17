'use client';

import React from 'react';
import { Box, StateView, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelQueue,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import { useOperatorPickupsController } from '../../shared/pickup/use-pickup-controller';

export type PickupWorkbenchScreenProps = {
  hubHref: string;
  subGroup?: string;
};

export function PickupWorkbenchScreen() {
  const { listState, loadList, extendWindow } = useOperatorPickupsController({
    limit: 100,
    autoLoad: true,
  });
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);
  const [actionPendingFor, setActionPendingFor] = React.useState<string | null>(null);

  const handleExtend = React.useCallback(
    async (orderId: string, version: number) => {
      setActionPendingFor(orderId);
      setActionFeedback(null);
      const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const result = await extendWindow(
        orderId,
        version,
        'تمديد تشغيلي موثق من لوحة التحكم',
        newExpiry,
      );
      setActionPendingFor(null);
      if (result.ok) {
        setActionFeedback('تم تمديد نافذة الاستلام وقراءة الحالة المحدّثة من DSH.');
        await loadList();
        return;
      }
      setActionFeedback(`تعذر تمديد النافذة: ${result.message}`);
    },
    [extendWindow, loadList],
  );

  if (!listState.loaded && !listState.error) {
    return (
      <StateView
        stateId="loading"
        title="جاري تحميل جلسات الاستلام"
        description="تتم قراءة الجلسات مباشرة من DSH Runtime."
      />
    );
  }

  if (listState.error) {
    return (
      <StateView
        stateId={listState.offline ? 'offline' : 'recoverableError'}
        title={listState.offline ? 'خدمة الاستلام غير متصلة' : 'تعذر تحميل جلسات الاستلام'}
        description={listState.error}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void loadList()}
      />
    );
  }

  return (
    <Box gap={4}>
      <Box gap={1}>
        <Text role="titleMd">إدارة جلسات الاستلام الذاتي</Text>
        <Text role="bodySm" tone="muted">
          القراءة والتمديد فقط من صلاحيات المشغّل؛ إصدار الرمز والتحقق منه يبقيان داخل رحلة المتجر والعميل.
        </Text>
      </Box>

      <WebControlPanelRecommendation
        title="حدود التحكم السيادية"
        reason="المشغّل يراقب جلسات الاستلام ويمدد النافذة عند وجود سبب تشغيلي. إشعار العميل وإصدار OTP والتحقق منه ليست إجراءات مشغّل."
        confidence="high"
        auditTag="PICKUP_OPERATOR_BOUNDARY"
      />

      {actionFeedback ? (
        <Box padding={3} background="brandSurface" radiusToken="md">
          <Text role="bodySm">{actionFeedback}</Text>
        </Box>
      ) : null}

      <WebControlPanelQueue
        title="نوافذ الاستلام المباشرة"
        meta={`${listState.data.length} جلسة`}
      >
        {listState.data.length === 0 ? (
          <StateView
            stateId="empty"
            title="لا توجد جلسات استلام"
            description="لا توجد جلسات استلام مسجلة في DSH حاليًا."
            actionLabel="تحديث"
            onActionPress={() => void loadList()}
          />
        ) : (
          listState.data.map((session) => {
            const expired = new Date(session.expiresAt).getTime() < Date.now();
            const pending = actionPendingFor === session.orderId;
            const action = session.usedAt
              ? undefined
              : {
                  id: `extend-${session.id}`,
                  label: pending ? 'جارٍ التمديد...' : 'تمديد ساعتين',
                  onAction: () => void handleExtend(session.orderId, session.version),
                };
            return (
              <WebControlPanelDecisionRow
                key={session.id}
                entityId={session.id}
                entityLabel={`طلب: ${session.orderId} — عميل: ${session.clientId}`}
                status={session.usedAt ? 'verified' : expired ? 'expired' : 'active'}
                statusTone={session.usedAt ? 'success' : expired ? 'danger' : 'warning'}
                reason={`المحاولات: ${session.attemptCount}/${session.maxAttempts}`}
                sla={`ينتهي: ${new Date(session.expiresAt).toLocaleString('ar-SA')}`}
                {...(action ? { primaryAction: action } : {})}
              />
            );
          })
        )}
      </WebControlPanelQueue>
    </Box>
  );
}

export default PickupWorkbenchScreen;
