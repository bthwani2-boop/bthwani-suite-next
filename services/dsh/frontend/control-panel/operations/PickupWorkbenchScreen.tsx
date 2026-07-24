'use client';

import React from 'react';
import { Box, StateView, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelQueue,
  WebControlPanelRecommendation,
  type WebControlPanelDecisionRowProps,
} from '@bthwani/ui-kit/web';
import { useOperatorPickupsController } from '../../shared/pickup/use-pickup-controller';

export type PickupWorkbenchScreenProps = {
  hubHref: string;
  subGroup?: string;
};

/**
 * Read/monitor screen. The store owns extending an active window and
 * rescheduling after a no-show from its own app; the operator surface only
 * observes. Extending a session beyond its cap still requires an operator
 * emergency override, which is a separate sovereign-intervention flow, not
 * a routine action offered here.
 */
export function PickupWorkbenchScreen() {
  const { listState, loadList } = useOperatorPickupsController({
    limit: 100,
    autoLoad: true,
  });

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
        <Text role="titleMd">متابعة جلسات الاستلام الذاتي</Text>
        <Text role="bodySm" tone="muted">
          المتجر يملك تمديد نافذته النشطة وإعادة جدولتها بعد عدم الحضور من تطبيق الشريك. هذه الشاشة للقراءة والمتابعة فقط.
        </Text>
      </Box>

      <WebControlPanelRecommendation
        title="حدود التحكم السيادية"
        reason="تمديد النافذة وإعادة الجدولة إجراءان روتينيان يديرهما المتجر. تدخّل العمليات مقصور على التعليق أو الإلغاء الاستثنائي عبر مسار الحوادث التشغيلية."
        confidence="high"
        auditTag="PICKUP_OPERATOR_BOUNDARY"
      />

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
            const currentStatus = session.status ?? 'unknown';
            const cancelled = currentStatus === 'cancelled' || Boolean(session.cancelledAt);
            const consumed = Boolean(session.usedAt);
            const expired = !cancelled && !consumed && new Date(session.expiresAt).getTime() < Date.now();
            const status = cancelled
              ? 'cancelled'
              : consumed
                ? currentStatus
                : expired
                  ? 'expired'
                  : currentStatus;
            const statusTone = cancelled || expired || currentStatus === 'no_show'
              ? 'danger'
              : consumed
                ? 'success'
                : 'warning';
            const reason = cancelled
              ? `سبب الإلغاء: ${session.cancellationReason || 'إلغاء الطلب'}`
              : currentStatus === 'no_show'
                ? `سبب عدم الحضور: ${session.noShowReason || 'غير محدد'}`
                : session.customerArrivedAt
                  ? `وصل العميل: ${new Date(session.customerArrivedAt).toLocaleString('ar-SA')}`
                  : session.customerNotifiedAt
                    ? `أُشعر العميل: ${new Date(session.customerNotifiedAt).toLocaleString('ar-SA')}`
                    : `المحاولات: ${session.attemptCount}/${session.maxAttempts}`;
            const sla = cancelled && session.cancelledAt
              ? `ألغي: ${new Date(session.cancelledAt).toLocaleString('ar-SA')}`
              : currentStatus === 'no_show' && session.noShowAt
                ? `سُجل عدم الحضور: ${new Date(session.noShowAt).toLocaleString('ar-SA')}`
                : `ينتهي: ${new Date(session.expiresAt).toLocaleString('ar-SA')} — تمديدات: ${session.extensionCount ?? 0}/${session.maxExtensions ?? 2}`;
            const rowProps: WebControlPanelDecisionRowProps = {
              entityId: session.id,
              entityLabel: `طلب: ${session.orderId} — عميل: ${session.clientId}`,
              status,
              statusTone,
              reason,
              sla,
            };
            return <WebControlPanelDecisionRow key={session.id} {...rowProps} />;
          })
        )}
      </WebControlPanelQueue>
    </Box>
  );
}

export default PickupWorkbenchScreen;
