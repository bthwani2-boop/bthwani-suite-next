'use client';

import React from 'react';
import { Box, Button, StateView, Text } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelInspectorShell,
  WebControlPanelKpiStrip,
  WebControlPanelQueue,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import styles from '../shared/control-panel-surface.module.css';
import { useOperatorOrderWorkboard } from '../../shared/operations/use-operator-order-workboard';
import {
  assignOrderToCaptain,
  dispatchAssignmentErrorMessage,
} from '../../shared/operations';
import { listCaptains } from '../../shared/workforce';
import type { Captain } from '../../shared/workforce';
import type { OperationsFocusParams, OperatorOrderWorkboardRow } from '../../shared/operations';

export type OrderJourneyDispatchAssignmentScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: OperationsFocusParams;
};

function isEligibleCaptain(captain: Captain): boolean {
  const profile = captain.captainProfile;
  return captain.workforceKind === 'captain'
    && captain.engagementStatus === 'active'
    && profile?.licenseStatus === 'valid'
    && Boolean(profile.vehicleType?.trim())
    && Boolean(profile.vehicleIdentifier?.trim())
    && Boolean(profile.serviceZoneId?.trim());
}

function eligibleOrder(order: OperatorOrderWorkboardRow): boolean {
  return order.fulfillmentMode === 'bthwani_delivery'
    && order.status === 'ready_for_pickup'
    && !order.captainId;
}

export function OrderJourneyDispatchAssignmentScreen({
  focusParams,
}: OrderJourneyDispatchAssignmentScreenProps) {
  const workboard = useOperatorOrderWorkboard();
  const [captains, setCaptains] = React.useState<readonly Captain[]>([]);
  const [captainsState, setCaptainsState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [captainsError, setCaptainsError] = React.useState('');
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(focusParams?.orderId ?? null);
  const [selectedCaptainId, setSelectedCaptainId] = React.useState('');
  const [mutationState, setMutationState] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mutationMessage, setMutationMessage] = React.useState('');

  const loadCaptains = React.useCallback(async () => {
    setCaptainsState('loading');
    setCaptainsError('');
    try {
      const result = await listCaptains({ status: 'active', limit: 200 });
      setCaptains(result.filter(isEligibleCaptain));
      setCaptainsState('ready');
    } catch (error) {
      setCaptains([]);
      setCaptainsState('error');
      setCaptainsError(error instanceof Error ? error.message : 'تعذر تحميل الكباتن من Workforce.');
    }
  }, []);

  React.useEffect(() => {
    void loadCaptains();
  }, [loadCaptains]);

  React.useEffect(() => {
    if (focusParams?.orderId) setSelectedOrderId(focusParams.orderId);
  }, [focusParams?.orderId]);

  if (workboard.state.kind === 'loading') {
    return <StateView stateId="loading" title="جاري تحميل طابور الإسناد" description="نقرأ الطلبات الجاهزة من DSH والكباتن المؤهلين من Workforce." />;
  }

  if (workboard.state.kind === 'error') {
    return <StateView stateId="recoverableError" title="تعذر تحميل طابور الإسناد" description={workboard.state.message} actionLabel="إعادة المحاولة" onActionPress={workboard.refresh} />;
  }

  const orders = workboard.state.orders.filter(eligibleOrder);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const selectedCaptain = captains.find((captain) => captain.id === selectedCaptainId) ?? null;

  async function handleAssign() {
    if (!selectedOrder || !selectedCaptain) return;
    setMutationState('loading');
    setMutationMessage('');
    try {
      await assignOrderToCaptain({ orderId: selectedOrder.id, captainId: selectedCaptain.id });
      setMutationState('success');
      setMutationMessage('تم إسناد الطلب للكابتن وتحديث القراءة التشغيلية.');
      setSelectedOrderId(null);
      setSelectedCaptainId('');
      await workboard.refresh();
    } catch (error) {
      setMutationState('error');
      setMutationMessage(dispatchAssignmentErrorMessage(error));
    }
  }

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={[
        { id: 'ready', label: 'جاهزة للإسناد', value: String(orders.length), tone: orders.length > 0 ? 'warning' : 'success' },
        { id: 'captains', label: 'كباتن مؤهلون', value: String(captains.length), tone: captains.length > 0 ? 'success' : 'danger' },
      ]} />

      {captainsState === 'error' ? (
        <StateView stateId="recoverableError" title="تعذر تحميل الكباتن" description={captainsError} actionLabel="إعادة المحاولة" onActionPress={() => void loadCaptains()} />
      ) : null}

      <div className={styles.surfaceSplitGrid}>
        <WebControlPanelQueue title="طلبات جاهزة بلا كابتن" meta={String(orders.length)}>
          {orders.length === 0 ? (
            <StateView stateId="empty" title="لا توجد طلبات تنتظر الإسناد" description="كل الطلبات الجاهزة مسندة أو لا تنطبق عليها رحلة توصيل بثواني." actionLabel="تحديث" onActionPress={workboard.refresh} />
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
          <WebControlPanelRecommendation
            title="إسناد محكوم"
            description="اختر طلبًا جاهزًا وكابتنًا فعالًا مكتمل المركبة والترخيص والمنطقة. لا تنفذ الواجهة نجاحًا محليًا."
            tone={orders.length > 0 && captains.length === 0 ? 'warning' : 'neutral'}
          />

          <WebControlPanelInspectorShell
            title="اختيار الكابتن"
            description={selectedOrder ? `الطلب: ${selectedOrder.id}` : 'اختر طلبًا من الطابور أولًا.'}
          >
            <Box gap={2}>
              {captainsState === 'loading' ? <Text role="bodySm">جاري تحميل الكباتن…</Text> : null}
              {captainsState === 'ready' && captains.length === 0 ? (
                <StateView stateId="empty" title="لا يوجد كابتن مؤهل" description="تحقق من حالة Workforce والترخيص والمركبة والمنطقة قبل الإسناد." />
              ) : null}
              {captains.map((captain) => (
                <Button
                  key={captain.id}
                  label={`${captain.displayName} — ${captain.captainProfile?.vehicleIdentifier ?? 'بلا مركبة'}`}
                  tone={selectedCaptainId === captain.id ? 'brand' : 'secondary'}
                  onPress={() => setSelectedCaptainId(captain.id)}
                />
              ))}
              <Button
                label={mutationState === 'loading' ? 'جاري الإسناد…' : 'تأكيد الإسناد'}
                disabled={!selectedOrder || !selectedCaptain || mutationState === 'loading'}
                onPress={() => void handleAssign()}
              />
              {mutationMessage ? <Text role="bodySm" tone={mutationState === 'error' ? 'danger' : 'success'}>{mutationMessage}</Text> : null}
            </Box>
          </WebControlPanelInspectorShell>
        </Box>
      </div>
    </Box>
  );
}

export default OrderJourneyDispatchAssignmentScreen;
