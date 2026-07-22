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

export function PickupWorkbenchScreen() {
  const {
    listState,
    loadList,
    extendWindow,
    rescheduleWindow,
  } = useOperatorPickupsController({
    limit: 100,
    autoLoad: true,
  });
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);
  const [actionPendingFor, setActionPendingFor] = React.useState<string | null>(null);

  const handleWindowAction = React.useCallback(
    async (orderId: string, version: number, mode: 'extend' | 'reschedule') => {
      setActionPendingFor(orderId);
      setActionFeedback(null);
      const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const result = mode === 'reschedule'
        ? await rescheduleWindow(
            orderId,
            version,
            'إعادة جدولة موثقة بعد عدم حضور العميل',
            newExpiry,
          )
        : await extendWindow(
            orderId,
            version,
            'تمديد تشغيلي موثق من لوحة التحكم',
            newExpiry,
          );
      setActionPendingFor(null);
      if (result.ok) {
        setActionFeedback(
          mode === 'reschedule'
            ? 'تمت إعادة فتح نافذة الاستلام. يجب على المتجر إصدار وإرسال رمز جديد للعميل.'
            : 'تم تمديد نافذة الاستلام وقراءة الحالة المحدّثة من DSH.',
        );
        await loadList();
        return;
      }
      setActionFeedback(
        `${mode === 'reschedule' ? 'تعذرت إعادة الجدولة' : 'تعذر تمديد النافذة'}: ${result.message}`,
      );
    },
    [extendWindow, loadList, rescheduleWindow],
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
          يراقب المشغّل الجلسات ويمدد النافذة النشطة أو يعيد جدولة جلسة عدم الحضور. إصدار الرمز والتحقق منه يبقيان لدى المتجر والعميل.
        </Text>
      </Box>

      <WebControlPanelRecommendation
        title="حدود التحكم السيادية"
        reason="إعادة الجدولة تبطل الرمز السابق وتفتح نافذة جديدة فقط؛ لا تعرض رمزًا للمشغّل، ويجب على المتجر إرسال رمز جديد بعد الاستعادة."
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
            const currentStatus = session.status ?? 'unknown';
            const cancelled = currentStatus === 'cancelled' || Boolean(session.cancelledAt);
            const consumed = Boolean(session.usedAt);
            const expired = !cancelled && !consumed && new Date(session.expiresAt).getTime() < Date.now();
            const pending = actionPendingFor === session.orderId;
            const actionMode = currentStatus === 'no_show'
              ? 'reschedule'
              : currentStatus === 'active' && !cancelled && !consumed
                ? 'extend'
                : null;
            const action = actionMode
              ? {
                  id: `${actionMode}-${session.id}`,
                  label: pending
                    ? 'جارٍ التنفيذ...'
                    : actionMode === 'reschedule'
                      ? 'إعادة جدولة ساعتين'
                      : 'تمديد ساعتين',
                  onAction: () => void handleWindowAction(
                    session.orderId,
                    session.version,
                    actionMode,
                  ),
                }
              : undefined;
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
                : `ينتهي: ${new Date(session.expiresAt).toLocaleString('ar-SA')}`;
            const rowProps: WebControlPanelDecisionRowProps = {
              entityId: session.id,
              entityLabel: `طلب: ${session.orderId} — عميل: ${session.clientId}`,
              status,
              statusTone,
              reason,
              sla,
            };
            return action ? (
              <WebControlPanelDecisionRow key={session.id} {...rowProps} primaryAction={action} />
            ) : (
              <WebControlPanelDecisionRow key={session.id} {...rowProps} />
            );
          })
        )}
      </WebControlPanelQueue>
    </Box>
  );
}

export default PickupWorkbenchScreen;
