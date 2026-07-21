'use client';

import React from 'react';
import { Box, Button, StateView, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelKpiStrip,
  WebControlPanelQueue,
} from '@bthwani/ui-kit/web';
import styles from '../shared/control-panel-surface.module.css';
import { useOperatorOrderWorkboard } from '../../shared/operations/use-operator-order-workboard';
import {
  assignOrderToCaptain,
  buildDispatchAssignmentIdempotencyKey,
  dispatchAssignmentErrorMessage,
} from '../../shared/operations';
import { useDispatchCaptainOptions } from '../../shared/operations/use-dispatch-captain-options';
import type { OperationsFocusParams, OperatorOrderWorkboardRow } from '../../shared/operations';

export type OrderJourneyDispatchAssignmentScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: OperationsFocusParams;
};

function eligibleOrder(order: OperatorOrderWorkboardRow): boolean {
  return order.fulfillmentMode === 'bthwani_delivery'
    && order.status === 'ready_for_pickup'
    && !order.captainId;
}

export function OrderJourneyDispatchAssignmentScreen({
  focusParams,
}: OrderJourneyDispatchAssignmentScreenProps) {
  const workboard = useOperatorOrderWorkboard();
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(focusParams?.orderId ?? null);
  const [selectedCaptainId, setSelectedCaptainId] = React.useState('');
  const [mutationState, setMutationState] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mutationMessage, setMutationMessage] = React.useState('');

  const orders = workboard.state.orders.filter(eligibleOrder);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const captainList = useDispatchCaptainOptions(selectedOrder?.storeId);
  const options = captainList.state.options;
  const selectedOption = options.find((option) => option.candidate.captainId === selectedCaptainId) ?? null;

  const idempotencyKey = React.useMemo(() => {
    if (!selectedOrder || !selectedOption) return '';
    return buildDispatchAssignmentIdempotencyKey(
      selectedOrder.id,
      selectedOption.candidate.captainId,
    );
  }, [selectedOrder, selectedOption]);

  React.useEffect(() => {
    if (focusParams?.orderId) setSelectedOrderId(focusParams.orderId);
  }, [focusParams?.orderId]);

  React.useEffect(() => {
    setSelectedCaptainId('');
    setMutationState('idle');
    setMutationMessage('');
  }, [selectedOrderId]);

  async function handleAssign() {
    if (!selectedOrder || !selectedOption || !idempotencyKey) return;
    setMutationState('loading');
    setMutationMessage('');
    try {
      await assignOrderToCaptain({
        orderId: selectedOrder.id,
        captainId: selectedOption.candidate.captainId,
        serviceAreaCode: selectedOption.candidate.serviceAreaCode,
        idempotencyKey,
        offerReason: 'operator selected ranked eligible captain',
        responseTimeoutSeconds: 90,
      });
      setMutationState('success');
      setMutationMessage('تم إنشاء عرض الإسناد المحكوم وإرساله إلى صندوق مهام الكابتن.');
      setSelectedOrderId(null);
      setSelectedCaptainId('');
      await workboard.refresh();
    } catch (error) {
      setMutationState('error');
      setMutationMessage(dispatchAssignmentErrorMessage(error));
    }
  }

  if (workboard.state.kind === 'loading') {
    return (
      <StateView
        stateId="loading"
        title="جاري تحميل طابور الإسناد"
        description="نقرأ الطلبات الجاهزة من DSH ثم نحل منطقة المتجر ومرشحي الإسناد المحكومين."
      />
    );
  }

  if (workboard.state.kind === 'error') {
    return (
      <StateView
        stateId="recoverableError"
        title="تعذر تحميل طابور الإسناد"
        description={workboard.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={workboard.refresh}
      />
    );
  }

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={[
        {
          id: 'ready',
          label: 'جاهزة للإسناد',
          value: String(orders.length),
          tone: orders.length > 0 ? 'warning' : 'success',
        },
        {
          id: 'captains',
          label: 'مرشحون محكومون',
          value: selectedOrder ? String(options.length) : '—',
          tone: selectedOrder && options.length > 0 ? 'success' : 'warning',
        },
        {
          id: 'area',
          label: 'منطقة الخدمة',
          value: captainList.state.serviceAreaCode || '—',
          tone: captainList.state.serviceAreaCode ? 'success' : 'neutral',
        },
      ]} />

      {captainList.state.kind === 'error' ? (
        <StateView
          stateId="recoverableError"
          title="تعذر تحميل مرشحي الإسناد"
          description={captainList.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void captainList.reload()}
        />
      ) : null}

      <div className={styles.surfaceSplitGrid}>
        <WebControlPanelQueue title="طلبات جاهزة بلا كابتن" meta={String(orders.length)}>
          {orders.length === 0 ? (
            <StateView
              stateId="empty"
              title="لا توجد طلبات تنتظر الإسناد"
              description="كل الطلبات الجاهزة مسندة أو لا تنطبق عليها خدمة توصيل بثواني."
              actionLabel="تحديث"
              onActionPress={workboard.refresh}
            />
          ) : orders.map((order) => (
            <WebControlPanelDecisionRow
              key={order.id}
              entityId={order.id}
              entityLabel={`متجر: ${order.storeId}`}
              status={order.status}
              statusTone="warning"
              reason={`طلب ${order.id}`}
              sla={`آخر تحديث: ${new Date(order.updatedAt).toLocaleString('ar-YE')}`}
              onInspect={() => setSelectedOrderId(order.id)}
            />
          ))}
        </WebControlPanelQueue>

        <Box gap={3}>
          <Box gap={1}>
            <Text role="label">إسناد محكوم</Text>
            <Text role="bodySm" tone={selectedOrder && options.length === 0 ? 'warning' : 'muted'}>
              الأهلية والسعة والترتيب ومنطقة الخدمة تأتي من DSH. بيانات Workforce تستخدم لعرض اسم الكابتن والمركبة فقط.
            </Text>
          </Box>

          <Box gap={2}>
            <Text role="label">اختيار الكابتن</Text>
            <Text role="bodySm" tone="muted">
              {selectedOrder
                ? `الطلب: ${selectedOrder.id} — المتجر: ${selectedOrder.storeId}`
                : 'اختر طلبًا من الطابور أولًا.'}
            </Text>
            {captainList.state.kind === 'loading' ? (
              <Text role="bodySm">جاري حل منطقة المتجر وترتيب المرشحين…</Text>
            ) : null}
            {captainList.state.kind === 'empty' ? (
              <StateView
                stateId="empty"
                title="لا يوجد كابتن مؤهل"
                description="لا يوجد كابتن معتمد ومتاح ولديه سعة متبقية في منطقة خدمة المتجر."
                actionLabel="تحديث المرشحين"
                onActionPress={() => void captainList.reload()}
              />
            ) : null}
            {options.map((option) => {
              const captain = option.captain;
              const candidate = option.candidate;
              const captainName = captain?.fullNameAr?.trim() || candidate.captainId;
              const vehicle = captain?.captainProfile?.vehicleIdentifier?.trim() || 'بيانات المركبة غير متاحة';
              return (
                <Button
                  key={`${candidate.serviceAreaCode}:${candidate.captainId}`}
                  label={`${captainName} — ${vehicle} — السعة ${candidate.remainingCapacity}/${candidate.maxActiveAssignments}`}
                  tone={selectedCaptainId === candidate.captainId ? 'brand' : 'secondary'}
                  onPress={() => setSelectedCaptainId(candidate.captainId)}
                />
              );
            })}
            <Button
              label={mutationState === 'loading' ? 'جاري إنشاء عرض الإسناد…' : 'تأكيد الإسناد'}
              disabled={!selectedOrder || !selectedOption || !idempotencyKey || mutationState === 'loading'}
              onPress={() => void handleAssign()}
            />
            {mutationMessage ? (
              <Text role="bodySm" tone={mutationState === 'error' ? 'danger' : 'success'}>
                {mutationMessage}
              </Text>
            ) : null}
          </Box>
        </Box>
      </div>
    </Box>
  );
}

export default OrderJourneyDispatchAssignmentScreen;
