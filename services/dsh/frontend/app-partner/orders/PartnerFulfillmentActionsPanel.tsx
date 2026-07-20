import React from 'react';
import { View } from 'react-native';
import { Badge, Box, Button, Icon, StateView, Surface, Text, TextField, spacing, useDirection } from '@bthwani/ui-kit';
import type { DshFulfillmentDeliveryMode } from '../../shared/delivery/delivery.contract';
import type { PartnerTeamMember } from '../team/partner-team.types';
import { usePartnerDeliveryActionsController } from '../../shared/partner-delivery/use-partner-delivery-controller';
import { usePickupActionsController } from '../../shared/pickup/use-pickup-controller';

export type PartnerFulfillmentActionsPanelProps = {
  readonly orderId: string;
  readonly fulfillmentMode: DshFulfillmentDeliveryMode;
  readonly teamMembers?: readonly PartnerTeamMember[];
};

const PARTNER_DELIVERY_ERROR_LABELS: Record<string, string> = {
  PARTNER_DELIVERY_NOT_READY: 'الطلب غير جاهز بعد لإسناد موصل المتجر.',
  COURIER_INELIGIBLE: 'الموصل المحدد غير مؤهل أو لا ينتمي إلى فرع الطلب.',
  PARTNER_DELIVERY_ALREADY_ASSIGNED: 'تم إسناد هذه المهمة بالفعل.',
  PARTNER_DELIVERY_INVALID_TRANSITION: 'لا يمكن تنفيذ هذا الانتقال من الحالة الحالية.',
  VERSION_CONFLICT: 'تغيّرت المهمة من سطح آخر؛ تمسح إعادة التحميل قبل التكرار.',
};

const PICKUP_ERROR_LABELS: Record<string, string> = {
  PICKUP_CODE_ALREADY_USED: 'تم استخدام رمز الاستلام مسبقًا.',
  PICKUP_CODE_EXPIRED: 'انتهت صلاحية رمز الاستلام؛ أرسل رمزًا جديدًا.',
  PICKUP_CODE_ATTEMPTS_EXCEEDED: 'تم تجاوز عدد محاولات الرمز المسموح.',
  PICKUP_CODE_INVALID: 'رمز الاستلام غير صحيح.',
  PICKUP_INVALID_TRANSITION: 'لا يمكن تنفيذ هذا الإجراء في المرحلة الحالية.',
  VERSION_CONFLICT: 'تغيّرت الجلسة من سطح آخر؛ أعد التحميل قبل المتابعة.',
};

function PartnerDeliveryActions({
  orderId,
  teamMembers,
}: {
  readonly orderId: string;
  readonly teamMembers: readonly PartnerTeamMember[];
}) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const [selectedCourierId, setSelectedCourierId] = React.useState('');
  const [proofReference, setProofReference] = React.useState('');
  const { state, assign, pickup, depart, arrive, submitProof, refresh } =
    usePartnerDeliveryActionsController(orderId);
  const { task, loaded, busy, message, isError, errorCode } = state;
  const displayMessage = isError
    ? ((errorCode && PARTNER_DELIVERY_ERROR_LABELS[errorCode]) ?? message)
    : message;

  const eligibleCouriers = React.useMemo(
    () => teamMembers.filter((member) => member.role === 'courier' && member.status === 'active'),
    [teamMembers],
  );

  if (!loaded) {
    return <StateView title="جارٍ تحميل مهمة توصيل المتجر" description="نقرأ المهمة والإصدار من DSH." loading />;
  }

  const status = task?.status ?? 'unassigned';
  const pickedUp = Boolean(task?.pickedUpAt);

  return (
    <Surface tone="raised" gap={3}>
      <Text role="label" style={{ textAlign }}>توصيل المتجر</Text>
      <Text role="bodySm" tone="muted" style={{ textAlign }}>
        هذه الرحلة تدار بموصل من فريق المتجر فقط ولا تدخل صندوق كباتن بثواني.
      </Text>

      {!task || status === 'unassigned' ? (
        <Box gap={2}>
          {eligibleCouriers.length === 0 ? (
            <Text role="bodySm" tone="warning" style={{ textAlign }}>
              لا يوجد عضو فريق نشط بدور courier في هذا الفرع. أضف موصلًا من إدارة الفريق أولًا.
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
            label={busy ? 'جارٍ الإسناد…' : 'إسناد موصل المتجر'}
            disabled={!selectedCourierId || busy}
            onPress={() => void assign(selectedCourierId)}
          />
        </Box>
      ) : (
        <Box gap={3}>
          <Badge
            label={`الحالة: ${status}`}
            tone={status === 'completed' ? 'success' : status === 'exception' ? 'danger' : 'action'}
          />

          <Button
            label={busy ? 'جارٍ التثبيت…' : 'تأكيد استلام الموصل من المتجر'}
            disabled={busy || status !== 'assigned' || pickedUp}
            onPress={() => void pickup()}
          />
          <Button
            label={busy ? 'جارٍ التثبيت…' : 'تأكيد مغادرة الموصل'}
            disabled={busy || status !== 'assigned' || !pickedUp}
            onPress={() => void depart()}
          />
          <Button
            label={busy ? 'جارٍ التثبيت…' : 'تأكيد الوصول إلى العميل'}
            disabled={busy || status !== 'departed'}
            onPress={() => void arrive()}
          />

          {status === 'arrived' || status === 'proof_pending' ? (
            <Box gap={2}>
              <TextField
                label="مرجع إثبات التسليم"
                placeholder="مفتاح صورة DAM أو مرجع OTP/توقيع موثق"
                value={proofReference}
                onChangeText={setProofReference}
              />
              <Button
                label={busy ? 'جارٍ تثبيت الإثبات…' : 'إغلاق المهمة بإثبات التسليم'}
                disabled={busy || !proofReference.trim()}
                onPress={() => void submitProof('photo', proofReference).then((ok) => {
                  if (ok) setProofReference('');
                })}
              />
            </Box>
          ) : null}

          <Button
            label="إعادة قراءة المهمة"
            tone="ghost"
            size="sm"
            fullWidth={false}
            disabled={busy}
            onPress={() => void refresh()}
          />
        </Box>
      )}

      {displayMessage ? (
        <Text role="caption" tone={isError ? 'danger' : 'success'} style={{ textAlign }}>
          {displayMessage}
        </Text>
      ) : null}
    </Surface>
  );
}

function PickupActions({ orderId }: { readonly orderId: string }) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const [code, setCode] = React.useState('');
  const [noShowReason, setNoShowReason] = React.useState('');
  const { state, markReady, notify, customerArrived, verify, noShow, refresh } =
    usePickupActionsController(orderId);
  const { session, stage, loaded, busy, message, isError, errorCode } = state;
  const displayMessage = isError
    ? ((errorCode && PICKUP_ERROR_LABELS[errorCode]) ?? message)
    : message;

  if (!loaded) {
    return <StateView title="جارٍ تحميل الاستلام الذاتي" description="نقرأ الطلب وجلسة OTP وآخر مرحلة مثبتة." loading />;
  }

  return (
    <Surface tone="raised" gap={3}>
      <Text role="label" style={{ textAlign }}>الاستلام الذاتي</Text>
      <Text role="bodySm" tone="muted" style={{ textAlign }}>
        لا يُنشأ إسناد كابتن أو موصل متجر. الإغلاق يتم فقط بعد رمز العميل أحادي الاستخدام.
      </Text>
      <Badge
        label={`المرحلة: ${stage}`}
        tone={stage === 'verified' ? 'success' : stage === 'no_show' ? 'danger' : 'action'}
      />

      <Button
        label={busy ? 'جارٍ التثبيت…' : 'تعليم الطلب جاهزًا للاستلام'}
        disabled={busy || stage !== 'not_ready'}
        onPress={() => void markReady()}
      />
      <Button
        label={busy ? 'جارٍ إرسال الرمز…' : stage === 'notified' ? 'إصدار رمز جديد وإشعار العميل' : 'إشعار العميل وإصدار الرمز'}
        disabled={busy || (stage !== 'ready' && stage !== 'notified')}
        onPress={() => void notify()}
      />
      <Button
        label={busy ? 'جارٍ التثبيت…' : 'تأكيد وصول العميل'}
        disabled={busy || stage !== 'notified'}
        onPress={() => void customerArrived()}
      />

      {stage === 'customer_arrived' ? (
        <Box gap={2}>
          <TextField
            label="رمز الاستلام"
            placeholder="أدخل الرمز الظاهر للعميل"
            value={code}
            onChangeText={(value: string) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
          />
          <Button
            label={busy ? 'جارٍ التحقق…' : 'التحقق وإغلاق الطلب'}
            disabled={busy || code.length !== 6}
            onPress={() => void verify(code).then((ok) => {
              if (ok) setCode('');
            })}
          />
          <TextField
            label="سبب عدم الحضور"
            placeholder="سبب تشغيلي مسجل قبل إغلاق جلسة الرمز"
            value={noShowReason}
            onChangeText={setNoShowReason}
          />
          <Button
            label="تسجيل عدم حضور العميل"
            tone="danger"
            disabled={busy || !noShowReason.trim()}
            onPress={() => void noShow(noShowReason).then((ok) => {
              if (ok) setNoShowReason('');
            })}
          />
        </Box>
      ) : null}

      {stage === 'verified' ? (
        <Box layoutDirection="row" style={{ alignItems: 'center', gap: spacing[2] }}>
          <Icon name="checkmark-circle" size={18} tone="success" />
          <Text role="bodySm" tone="success">تم تسليم الطلب للعميل والتحقق من الرمز.</Text>
        </Box>
      ) : null}

      {stage === 'no_show' ? (
        <Text role="bodySm" tone="warning" style={{ textAlign }}>
          أغلقت جلسة الرمز كعدم حضور. يبقى قرار إلغاء الطلب أو تمديد النافذة بيد العمليات.
        </Text>
      ) : null}

      <Button label="إعادة قراءة المرحلة" tone="ghost" size="sm" fullWidth={false} disabled={busy} onPress={() => void refresh()} />
      {session ? <Text role="caption" tone="muted">الإصدار: {session.version}</Text> : null}

      {displayMessage ? (
        <Text role="caption" tone={isError ? 'danger' : 'success'} style={{ textAlign }}>
          {displayMessage}
        </Text>
      ) : null}
    </Surface>
  );
}

/** Real backend-wired fulfillment actions; no local-success state. */
export function PartnerFulfillmentActionsPanel({
  orderId,
  fulfillmentMode,
  teamMembers,
}: PartnerFulfillmentActionsPanelProps) {
  if (fulfillmentMode === 'partner_delivery') {
    return <PartnerDeliveryActions orderId={orderId} teamMembers={teamMembers ?? []} />;
  }
  if (fulfillmentMode === 'pickup') {
    return <PickupActions orderId={orderId} />;
  }
  return null;
}

export default PartnerFulfillmentActionsPanel;
