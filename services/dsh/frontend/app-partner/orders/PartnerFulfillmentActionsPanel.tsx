import React from 'react';
import { View } from 'react-native';
import { Badge, Box, Button, Icon, Surface, Text, TextField, spacing, useDirection } from '@bthwani/ui-kit';
import type { DshFulfillmentDeliveryMode } from '../../shared/delivery/delivery.contract';
import type { PartnerTeamMember } from '../team/partner-team.types';
import {
  assignPartnerDeliveryTask,
  departPartnerDeliveryTask,
  arrivePartnerDeliveryTask,
  submitPartnerDeliveryProof,
  fetchOperatorPartnerDelivery,
  classifyPartnerDeliveryError,
} from '../../shared/partner-delivery/partner-delivery.api';
import type { DshPartnerDeliveryTask } from '../../shared/partner-delivery/partner-delivery.types';
import {
  markPickupReady,
  notifyPickupCustomer,
  markPickupCustomerArrived,
  verifyPickupSession,
  fetchOperatorPickup,
  classifyPickupError,
} from '../../shared/pickup/pickup.api';
import type { DshPickupSession } from '../../shared/pickup/pickup.types';

export type PartnerFulfillmentActionsPanelProps = {
  readonly orderId: string;
  readonly fulfillmentMode: DshFulfillmentDeliveryMode;
  readonly teamMembers?: readonly PartnerTeamMember[];
  /** The already-assigned partner-delivery task id (server task.id), when known. */
  readonly partnerDeliveryTaskId?: string;
};

const PARTNER_DELIVERY_ERROR_LABELS: Record<string, string> = {
  PARTNER_DELIVERY_NOT_READY: 'الطلب غير جاهز بعد لإسناد موصل الشريك.',
  COURIER_INELIGIBLE: 'الموصل المحدد غير مؤهل لاستلام هذه المهمة.',
  PARTNER_DELIVERY_ALREADY_ASSIGNED: 'تم إسناد هذه المهمة بالفعل لموصل آخر.',
  PARTNER_DELIVERY_INVALID_TRANSITION: 'لا يمكن تنفيذ هذا الإجراء في الحالة الحالية للمهمة.',
  VERSION_CONFLICT: 'تغيّرت بيانات المهمة من مكان آخر — أعد التحميل قبل المتابعة.',
};

const PICKUP_ERROR_LABELS: Record<string, string> = {
  PICKUP_CODE_ALREADY_USED: 'تم استخدام رمز الاستلام مسبقًا.',
  PICKUP_CODE_EXPIRED: 'انتهت صلاحية رمز الاستلام — أرسل رمزًا جديدًا.',
  PICKUP_CODE_ATTEMPTS_EXCEEDED: 'تم تجاوز عدد محاولات إدخال الرمز المسموح.',
  PICKUP_CODE_INVALID: 'رمز الاستلام غير صحيح.',
  PICKUP_INVALID_TRANSITION: 'لا يمكن تنفيذ هذا الإجراء في الحالة الحالية لجلسة الاستلام.',
  VERSION_CONFLICT: 'تغيّرت بيانات الجلسة من مكان آخر — أعد التحميل قبل المتابعة.',
};

function PartnerDeliveryActions({ orderId, teamMembers }: { orderId: string; teamMembers: readonly PartnerTeamMember[] }) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const [task, setTask] = React.useState<DshPartnerDeliveryTask | null>(null);
  const [selectedCourierId, setSelectedCourierId] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);

  const eligibleCouriers = React.useMemo(
    () => teamMembers.filter((m) => m.role === 'courier' && m.status === 'active'),
    [teamMembers],
  );

  const refreshTask = React.useCallback((taskId: string) => {
    return fetchOperatorPartnerDelivery(taskId)
      .then((resp) => setTask(resp.task))
      .catch(() => { /* keep last-known task state on refresh failure */ });
  }, []);

  const runAction = React.useCallback(
    (label: string, action: () => Promise<{ task: DshPartnerDeliveryTask }>) => {
      setBusy(true);
      setMessage(null);
      setIsError(false);
      action()
        .then((resp) => {
          setTask(resp.task);
          setMessage(label);
        })
        .catch((err: unknown) => {
          const classified = classifyPartnerDeliveryError(err);
          setIsError(true);
          setMessage((classified.code && PARTNER_DELIVERY_ERROR_LABELS[classified.code]) ?? classified.message ?? 'تعذر تنفيذ الإجراء.');
        })
        .finally(() => setBusy(false));
    },
    [],
  );

  const handleAssign = React.useCallback(() => {
    if (!selectedCourierId) return;
    runAction('تم إسناد موصل الشريك بنجاح.', () =>
      assignPartnerDeliveryTask(orderId, { storeCourierId: selectedCourierId, expectedVersion: 0 }),
    );
  }, [orderId, selectedCourierId, runAction]);

  const handleDepart = React.useCallback(() => {
    if (!task) return;
    runAction('تم تسجيل خروج الموصل.', () => departPartnerDeliveryTask(orderId, task.version));
  }, [orderId, task, runAction]);

  const handleArrive = React.useCallback(() => {
    if (!task) return;
    runAction('تم تسجيل وصول الموصل.', () => arrivePartnerDeliveryTask(orderId, task.version));
  }, [orderId, task, runAction]);

  const handleProof = React.useCallback(() => {
    if (!task) return;
    runAction('تم رفع إثبات التسليم وإغلاق المهمة.', () =>
      submitPartnerDeliveryProof(orderId, { expectedVersion: task.version, proofMethod: 'photo' }),
    );
  }, [orderId, task, runAction]);

  const status = task?.status ?? 'unassigned';

  return (
    <Surface tone="raised" gap={2}>
      <Text role="label" style={{ textAlign }}>موصل الشريك</Text>

      {!task || status === 'unassigned' ? (
        <Box gap={2}>
          {eligibleCouriers.length === 0 ? (
            <Text role="bodySm" tone="muted" style={{ textAlign }}>
              لا يوجد موصلون نشطون (role=courier) في فريق هذا الفرع بعد. أضِفهم من إدارة الفريق أولًا.
            </Text>
          ) : (
            <View style={{ gap: spacing[1] }}>
              {eligibleCouriers.map((courier) => (
                <Button
                  key={courier.id}
                  label={courier.name}
                  tone={selectedCourierId === courier.id ? 'brand' : 'secondary'}
                  size="sm"
                  fullWidth={false}
                  onPress={() => setSelectedCourierId(courier.id)}
                />
              ))}
            </View>
          )}
          <Button
            label={busy ? 'جارٍ الإسناد...' : 'إسناد موصل الشريك (assign)'}
            disabled={!selectedCourierId || busy}
            onPress={handleAssign}
          />
        </Box>
      ) : (
        <Box gap={2}>
          <Badge label={`الحالة: ${status}`} tone={status === 'completed' ? 'success' : status === 'exception' ? 'danger' : 'action'} />
          <Box gap={2}>
            <Button
              label={busy ? 'جارٍ...' : 'خروج الموصل (depart)'}
              size="sm"
              fullWidth={false}
              disabled={busy || status !== 'assigned'}
              onPress={handleDepart}
            />
            <Button
              label={busy ? 'جارٍ...' : 'وصول الموصل (arrive)'}
              size="sm"
              fullWidth={false}
              disabled={busy || status !== 'departed'}
              onPress={handleArrive}
            />
            <Button
              label={busy ? 'جارٍ...' : 'رفع إثبات التسليم (proof)'}
              size="sm"
              fullWidth={false}
              disabled={busy || status !== 'arrived'}
              onPress={handleProof}
            />
          </Box>
          <Button
            label="تحديث حالة المهمة"
            tone="ghost"
            size="sm"
            fullWidth={false}
            disabled={!task || busy}
            onPress={() => task && refreshTask(task.id)}
          />
        </Box>
      )}

      {message && (
        <Text role="caption" tone={isError ? 'danger' : 'success'} style={{ textAlign }}>
          {message}
        </Text>
      )}
    </Surface>
  );
}

function PickupActions({ orderId }: { orderId: string }) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const [session, setSession] = React.useState<DshPickupSession | null>(null);
  const [stage, setStage] = React.useState<'not_ready' | 'ready' | 'notified' | 'arrived' | 'verified'>('not_ready');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);

  const refreshSession = React.useCallback(() => {
    return fetchOperatorPickup(orderId)
      .then((resp) => setSession(resp.session))
      .catch(() => { /* keep last-known session on refresh failure */ });
  }, [orderId]);

  const handleMarkReady = React.useCallback(() => {
    setBusy(true);
    setMessage(null);
    setIsError(false);
    markPickupReady(orderId, session?.version ?? 0)
      .then(() => {
        setStage('ready');
        setMessage('تم تعليم الطلب كجاهز للاستلام.');
        return refreshSession();
      })
      .catch((err: unknown) => {
        const classified = classifyPickupError(err);
        setIsError(true);
        setMessage((classified.code && PICKUP_ERROR_LABELS[classified.code]) ?? classified.message ?? 'تعذر تعليم الطلب كجاهز.');
      })
      .finally(() => setBusy(false));
  }, [orderId, session, refreshSession]);

  const handleNotify = React.useCallback(() => {
    setBusy(true);
    setMessage(null);
    setIsError(false);
    notifyPickupCustomer(orderId, { expectedVersion: session?.version ?? 0 })
      .then((resp) => {
        if (resp.session) setSession(resp.session);
        setStage('notified');
        setMessage('تم إشعار العميل وإصدار رمز استلام جديد.');
      })
      .catch((err: unknown) => {
        const classified = classifyPickupError(err);
        setIsError(true);
        setMessage((classified.code && PICKUP_ERROR_LABELS[classified.code]) ?? classified.message ?? 'تعذر إشعار العميل.');
      })
      .finally(() => setBusy(false));
  }, [orderId, session]);

  const handleCustomerArrived = React.useCallback(() => {
    setBusy(true);
    setMessage(null);
    setIsError(false);
    markPickupCustomerArrived(orderId, session?.version ?? 0)
      .then(() => {
        setStage('arrived');
        setMessage('تم تسجيل وصول العميل.');
        return refreshSession();
      })
      .catch((err: unknown) => {
        const classified = classifyPickupError(err);
        setIsError(true);
        setMessage((classified.code && PICKUP_ERROR_LABELS[classified.code]) ?? classified.message ?? 'تعذر تسجيل وصول العميل.');
      })
      .finally(() => setBusy(false));
  }, [orderId, session, refreshSession]);

  const handleVerify = React.useCallback(() => {
    if (!code.trim()) return;
    setBusy(true);
    setMessage(null);
    setIsError(false);
    verifyPickupSession(orderId, { expectedVersion: session?.version ?? 0, code: code.trim() })
      .then((resp) => {
        setSession(resp.session);
        setStage('verified');
        setMessage('تم التحقق من رمز الاستلام وإتمام تسليم الطلب.');
        setCode('');
      })
      .catch((err: unknown) => {
        const classified = classifyPickupError(err);
        setIsError(true);
        setMessage((classified.code && PICKUP_ERROR_LABELS[classified.code]) ?? classified.message ?? 'تعذر التحقق من رمز الاستلام.');
      })
      .finally(() => setBusy(false));
  }, [orderId, code, session]);

  return (
    <Surface tone="raised" gap={2}>
      <Text role="label" style={{ textAlign }}>استلام العميل الذاتي</Text>

      <Box gap={2}>
        <Button label={busy ? 'جارٍ...' : 'تعليم جاهز للاستلام (mark-ready)'} size="sm" fullWidth={false} disabled={busy || stage !== 'not_ready'} onPress={handleMarkReady} />
        <Button label={busy ? 'جارٍ...' : 'إشعار العميل (notify)'} size="sm" fullWidth={false} disabled={busy || (stage !== 'ready' && stage !== 'not_ready')} onPress={handleNotify} />
        <Button label={busy ? 'جارٍ...' : 'وصول العميل (customer-arrived)'} size="sm" fullWidth={false} disabled={busy || stage !== 'notified'} onPress={handleCustomerArrived} />
      </Box>

      {stage === 'arrived' && (
        <Box gap={2}>
          <TextField
            label="رمز الاستلام (OTP)"
            placeholder="أدخل الرمز الذي أدخله العميل"
            value={code}
            onChangeText={(v: string) => setCode(v.replace(/[^0-9]/g, ''))}
          />
          <Button label={busy ? 'جارٍ التحقق...' : 'تحقق من الرمز (verify)'} disabled={busy || !code.trim()} onPress={handleVerify} />
        </Box>
      )}

      {stage === 'verified' && (
        <Box layoutDirection="row" style={{ alignItems: 'center', gap: spacing[2] }}>
          <Icon name="checkmark-circle" size={18} tone="success" />
          <Text role="bodySm" tone="success">تم استلام الطلب من قِبل العميل بنجاح.</Text>
        </Box>
      )}

      {message && (
        <Text role="caption" tone={isError ? 'danger' : 'success'} style={{ textAlign }}>
          {message}
        </Text>
      )}
    </Surface>
  );
}

/**
 * Real, backend-wired action panel for `partner_delivery` and `pickup`
 * fulfillment modes. Every button awaits a real generated-types response
 * before enabling the next step — no local-only success state.
 */
export function PartnerFulfillmentActionsPanel({ orderId, fulfillmentMode, teamMembers }: PartnerFulfillmentActionsPanelProps) {
  if (fulfillmentMode === 'partner_delivery') {
    return <PartnerDeliveryActions orderId={orderId} teamMembers={teamMembers ?? []} />;
  }
  if (fulfillmentMode === 'pickup') {
    return <PickupActions orderId={orderId} />;
  }
  return null;
}

export default PartnerFulfillmentActionsPanel;
