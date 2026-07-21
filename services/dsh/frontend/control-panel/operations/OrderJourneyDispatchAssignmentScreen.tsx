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
import type { OperatorOrderWorkboardRow } from '../../shared/operations';

export type OrderJourneyDispatchAssignmentScreenProps = {
  hubHref: string;
  subGroup?: string;
  focusParams?: { orderId?: string };
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

  const queue = workboard.state.orders.filter(eligibleOrder);
  const selectedOrder = queue.find((order) => order.id === selectedOrderId) ?? null;

  const submit = async () => {
    if (!selectedOrder || !selectedCaptainId) {
      setMutationState('error');
      setMutationMessage('اختر طلبًا وكابتنًا مؤهلًا.');
      return;
    }
    setMutationState('loading');
    setMutationMessage('');
    try {
      await assignOrderToCaptain(selectedOrder.id, selectedCaptainId);
      await workboard.refresh();
      setMutationState('success');
      setMutationMessage('تم إنشاء عرض الإسناد للكابتن وتحديث Workboard.');
      setSelectedOrderId(null);
      setSelectedCaptainId('');
    } catch (error) {
      setMutationState('error');
      setMutationMessage(dispatchAssignmentErrorMessage(error));
    }
  };

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={[
        { id: 'queue', label: 'جاهزة للإسناد', value: String(queue.length), tone: queue.length > 0 ? 'warning' : 'success' },
        { id: 'eligible-captains', label: 'كباتن مؤهلون', value: captainsState === 'ready' ? String(captains.length) : '—', tone: captains.length > 0 ? 'success' : 'warning' },
        { id: 'order-source', label: 'مصدر الطلب', value: 'DSH Workboard', tone: 'success' },
        { id: 'captain-source', label: 'مصدر الكابتن', value: 'Workforce', tone: 'success' },
      ]} />

      {captainsState === 'error' ? (
        <StateView stateId="recoverableError" title="تعذر تحميل الكباتن" description={captainsError} actionLabel="إعادة المحاولة" onActionPress={loadCaptains} />
      ) : null}

      <div className={styles.surfaceSplitGrid}>
        <WebControlPanelQueue title="طلبات جاهزة لتوصيل بثواني" meta={`${queue.length} طلب`}>
          {queue.length === 0 ? (
            <StateView stateId="empty" title="لا توجد طلبات قابلة للإسناد" description="يدخل الطابور فقط طلب توصيل بثواني بعد أن يؤكد الشريك جاهزيته." actionLabel="تحديث" onActionPress={workboard.refresh} />
          ) : queue.map((order) => (
            <WebControlPanelDecisionRow
              key={order.id}
              entityId={order.id}
              entityLabel={`متجر: ${order.storeId} — عميل: ${order.clientId}`}
              status="جاهز للإسناد"
              statusTone="warning"
              reason={`${order.totalPrice.toLocaleString('ar-YE')} ر.ي · جاهز للاستلام`}
              sla={`منذ ${new Date(order.updatedAt).toLocaleString('ar-YE')}`}
              onInspect={() => {
                setSelectedOrderId(order.id);
                setSelectedCaptainId('');
                setMutationState('idle');
                setMutationMessage('');
              }}
            />
          ))}
        </WebControlPanelQueue>

        {selectedOrder ? (
          <WebControlPanelInspectorShell title={`إسناد الطلب ${selectedOrder.id}`} onClose={() => setSelectedOrderId(null)}>
            <Box gap={3} padding={4}>
              <Text role="bodySm">المتجر: {selectedOrder.storeId}</Text>
              <Text role="bodySm">العميل: {selectedOrder.clientId}</Text>
              <Text role="bodySm">الحالة المثبتة: {selectedOrder.status}</Text>
              <label htmlFor="eligible-captain-select" style={{ fontWeight: 700 }}>الكابتن المؤهل</label>
              <select
                id="eligible-captain-select"
                value={selectedCaptainId}
                onChange={(event) => setSelectedCaptainId(event.target.value)}
                disabled={captainsState !== 'ready' || mutationState === 'loading'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--bthwani-control-panel-border)',
                  borderRadius: '8px',
                  background: 'var(--bthwani-control-panel-surface-base)',
                }}
              >
                <option value="">اختر كابتنًا</option>
                {captains.map((captain) => (
                  <option key={captain.actorId} value={captain.actorId}>
                    {`${captain.fullNameAr} · ${captain.captainProfile?.vehicleType ?? ''} · ${captain.captainProfile?.serviceZoneId ?? ''}`}
                  </option>
                ))}
              </select>
              {mutationMessage ? <Text role="bodySm" tone={mutationState === 'error' ? 'danger' : 'success'}>{mutationMessage}</Text> : null}
              <Button
                label={mutationState === 'loading' ? 'جارٍ إنشاء الإسناد…' : 'إرسال عرض الإسناد'}
                disabled={!selectedCaptainId || mutationState === 'loading'}
                onPress={() => void submit()}
              />
            </Box>
          </WebControlPanelInspectorShell>
        ) : (
          <WebControlPanelRecommendation
            title="إسناد محكوم"
            reason="اختر طلبًا جاهزًا ثم كابتنًا مفعلًا برخصة صالحة ومركبة ونطاق خدمة من Workforce."
            confidence="high"
            auditTag="ORDER_DISPATCH_ELIGIBILITY"
          />
        )}
      </div>
    </Box>
  );
}

export default OrderJourneyDispatchAssignmentScreen;
