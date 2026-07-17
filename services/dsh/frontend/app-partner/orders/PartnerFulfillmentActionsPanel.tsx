import React from 'react';
import { View } from 'react-native';
import { Badge, Box, Button, Icon, Surface, Text, TextField, spacing, useDirection } from '@bthwani/ui-kit';
import type { DshFulfillmentDeliveryMode } from '../../shared/delivery/delivery.contract';
import type { PartnerTeamMember } from '../team/partner-team.types';
import { usePartnerDeliveryActionsController } from '../../shared/partner-delivery/use-partner-delivery-controller';
import { usePickupActionsController } from '../../shared/pickup/use-pickup-controller';

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
  const [selectedCourierId, setSelectedCourierId] = React.useState('');
  const { state, assign, depart, arrive, submitProof, refresh } = usePartnerDeliveryActionsController();
  const { task, busy, message, isError, errorCode } = state;
  const displayMessage = isError ? ((errorCode && PARTNER_DELIVERY_ERROR_LABELS[errorCode]) ?? message) : message;

  const eligibleCouriers = React.useMemo(
    () => teamMembers.filter((m) => m.role === 'courier' && m.status === 'active'),
    [teamMembers],
  );

  const handleAssign = React.useCallback(() => {
    if (!selectedCourierId) return;
    void assign(orderId, selectedCourierId);
  }, [orderId, selectedCourierId, assign]);

  const handleDepart = React.useCallback(() => {
    if (!task) return;
    void depart(orderId, task.version);
  }, [orderId, task, depart]);

  const handleArrive = React.useCallback(() => {
    if (!task) return;
    void arrive(orderId, task.version);
  }, [orderId, task, arrive]);

  const handleProof = React.useCallback(() => {
    if (!task) return;
    void submitProof(orderId, task.version, 'photo');
  }, [orderId, task, submitProof]);

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
            onPress={() => task && refresh(task.id)}
          />
        </Box>
      )}

      {displayMessage && (
        <Text role="caption" tone={isError ? 'danger' : 'success'} style={{ textAlign }}>
          {displayMessage}
        </Text>
      )}
    </Surface>
  );
}

function PickupActions({ orderId }: { orderId: string }) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const [code, setCode] = React.useState('');
  const { state, markReady, notify, customerArrived, verify } = usePickupActionsController();
  const { session, stage, busy, message, isError, errorCode } = state;
  const displayMessage = isError ? ((errorCode && PICKUP_ERROR_LABELS[errorCode]) ?? message) : message;

  const handleMarkReady = React.useCallback(() => {
    void markReady(orderId, session?.version ?? 0);
  }, [orderId, session, markReady]);

  const handleNotify = React.useCallback(() => {
    void notify(orderId, session?.version ?? 0);
  }, [orderId, session, notify]);

  const handleCustomerArrived = React.useCallback(() => {
    void customerArrived(orderId, session?.version ?? 0);
  }, [orderId, session, customerArrived]);

  const handleVerify = React.useCallback(() => {
    if (!code.trim()) return;
    void verify(orderId, session?.version ?? 0, code.trim()).then(() => setCode(''));
  }, [orderId, code, session, verify]);

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

      {displayMessage && (
        <Text role="caption" tone={isError ? 'danger' : 'success'} style={{ textAlign }}>
          {displayMessage}
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
