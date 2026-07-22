'use client';

import React from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  StateView,
  Text,
  TextField,
} from '@bthwani/ui-kit';
import {
  useOperatorDeliveryProofReviewController,
  type DshDeliveryProof,
  type DshDeliveryProofStatus,
} from '../../shared/delivery-proof';

export type DeliveryProofReviewScreenProps = {
  readonly hubHref: string;
  readonly subGroup?: string;
};

const STATUS_LABELS: Readonly<Record<DshDeliveryProofStatus, string>> = {
  submitted: 'مُرسل',
  pending_review: 'قيد المراجعة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  superseded: 'مستبدل',
};

function statusTone(status: DshDeliveryProofStatus): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'accepted') return 'success';
  if (status === 'rejected' || status === 'superseded') return 'danger';
  if (status === 'pending_review' || status === 'submitted') return 'warning';
  return 'neutral';
}

function methodLabel(proof: DshDeliveryProof): string {
  if (proof.method === 'otp_pin') return 'رمز العميل';
  if (proof.method === 'composite') return 'رمز + وسائط';
  if (proof.method === 'signature') return 'توقيع';
  return 'صورة';
}

export function DeliveryProofReviewScreen({ hubHref }: DeliveryProofReviewScreenProps) {
  const controller = useOperatorDeliveryProofReviewController('pending_review');
  const [selectedProofId, setSelectedProofId] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');

  const selectedProof = controller.proofs.find((proof) => proof.id === selectedProofId) ?? null;
  const reviewDisabled = reason.trim().length < 5 || controller.reviewingProofId !== null;

  const runReview = React.useCallback(async (action: 'accept' | 'reject') => {
    if (!selectedProof || reason.trim().length < 5) return;
    const updated = await controller.review(selectedProof.id, action, {
      expectedVersion: selectedProof.version,
      reason: reason.trim(),
    });
    if (updated) {
      setSelectedProofId(null);
      setReason('');
      await controller.refresh();
    }
  }, [controller, reason, selectedProof]);

  if (controller.state === 'loading' && controller.proofs.length === 0) {
    return (
      <StateView
        stateId="loading"
        title="جارٍ تحميل إثباتات التسليم"
        description="نقرأ قائمة المراجعة الحية من DSH ولا نستخدم بيانات محلية أو افتراضية."
      />
    );
  }

  if (controller.state === 'offline' || controller.state === 'error') {
    return (
      <StateView
        stateId={controller.state === 'offline' ? 'offline' : 'recoverableError'}
        title={controller.state === 'offline' ? 'خدمة إثبات التسليم غير متاحة' : 'تعذر تحميل قائمة الإثباتات'}
        description={controller.error?.message ?? 'تعذر الاتصال بـDSH.'}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void controller.refresh()}
      />
    );
  }

  return (
    <Box gap={4}>
      <Card gap={3}>
        <Box layoutDirection="row" justify="space-between" align="center">
          <Box gap={1}>
            <Text role="titleMd">مراجعة إثباتات التسليم</Text>
            <Text role="bodySm" tone="muted">
              قبول الإثبات يغلق الطلب مرة واحدة وينشئ حدث DSH الدائم إلى WLT. الرفض يبقي المهمة عند العميل ويسمح بمحاولة جديدة.
            </Text>
          </Box>
          <Badge label={`${controller.proofs.length} إثبات`} tone={controller.proofs.length > 0 ? 'warning' : 'success'} />
        </Box>
        <Box layoutDirection="row" gap={2}>
          {(['pending_review', 'accepted', 'rejected'] as const).map((status) => (
            <Button
              key={status}
              label={STATUS_LABELS[status]}
              size="sm"
              fullWidth={false}
              tone={controller.status === status ? 'brand' : 'secondary'}
              onPress={() => controller.setStatus(status)}
            />
          ))}
          <Button
            label="تحديث"
            size="sm"
            fullWidth={false}
            tone="ghost"
            onPress={() => void controller.refresh()}
          />
          <Button
            label="العودة لمركز العمليات"
            size="sm"
            fullWidth={false}
            tone="ghost"
            onPress={() => globalThis.location.assign(hubHref)}
          />
        </Box>
      </Card>

      {controller.state === 'empty' ? (
        <StateView
          stateId="empty"
          title={`لا توجد إثباتات بحالة ${STATUS_LABELS[controller.status]}`}
          description="ستظهر السجلات هنا فور إرسالها أو تغير قرار المراجعة في DSH."
          actionLabel="تحديث القائمة"
          onActionPress={() => void controller.refresh()}
        />
      ) : (
        <Box gap={3}>
          {controller.proofs.map((proof) => {
            const selected = selectedProofId === proof.id;
            const canReview = proof.status === 'pending_review' || proof.status === 'submitted';
            return (
              <Card key={proof.id} gap={3}>
                <Box layoutDirection="row" justify="space-between" align="center">
                  <Box gap={1}>
                    <Text role="titleSm">الطلب {proof.orderId}</Text>
                    <Text role="caption" tone="muted">الإسناد {proof.assignmentId} · الكابتن {proof.captainId}</Text>
                  </Box>
                  <Badge label={STATUS_LABELS[proof.status]} tone={statusTone(proof.status)} />
                </Box>

                <Box layoutDirection="row" gap={4}>
                  <Text role="bodySm">الطريقة: <Text role="bodyStrong">{methodLabel(proof)}</Text></Text>
                  <Text role="bodySm">وقت الالتقاط: <Text role="bodyStrong">{new Date(proof.capturedAt).toLocaleString('ar-YE')}</Text></Text>
                  <Text role="bodySm">الإصدار: <Text role="bodyStrong">{proof.version}</Text></Text>
                </Box>

                <Box gap={1}>
                  <Text role="caption" tone="muted">الصورة: {proof.hasPhoto ? 'موجودة ومسجلة' : 'غير موجودة'}</Text>
                  <Text role="caption" tone="muted">التوقيع: {proof.hasSignature ? 'موجود ومسجل' : 'غير موجود'}</Text>
                  {proof.capturedLatitude != null && proof.capturedLongitude != null ? (
                    <Text role="caption" tone="muted">
                      الموقع المثبت: {proof.capturedLatitude.toFixed(5)}, {proof.capturedLongitude.toFixed(5)}
                    </Text>
                  ) : (
                    <Text role="caption" tone="warning">لم يرفق موقع مع الإثبات؛ راجع بقية الأدلة قبل القرار.</Text>
                  )}
                  {proof.reviewReason ? <Text role="bodySm">قرار المراجعة: {proof.reviewReason}</Text> : null}
                </Box>

                {canReview ? (
                  <Box gap={3}>
                    <Button
                      label={selected ? 'إغلاق نموذج القرار' : 'فتح قرار المراجعة'}
                      tone={selected ? 'ghost' : 'secondary'}
                      onPress={() => {
                        setSelectedProofId(selected ? null : proof.id);
                        setReason('');
                      }}
                    />
                    {selected ? (
                      <Box gap={2}>
                        <TextField
                          label="سبب القرار التشغيلي"
                          value={reason}
                          onChangeText={setReason}
                          placeholder="اكتب الأدلة التي اعتمد عليها القبول أو الرفض"
                          multiline
                        />
                        {controller.error ? <Text role="caption" tone="danger">{controller.error.message}</Text> : null}
                        <Box layoutDirection="row" gap={2}>
                          <Button
                            label={controller.reviewingProofId === proof.id ? 'جارٍ القبول…' : 'قبول وإكمال الطلب'}
                            tone="brand"
                            disabled={reviewDisabled}
                            onPress={() => void runReview('accept')}
                          />
                          <Button
                            label={controller.reviewingProofId === proof.id ? 'جارٍ الرفض…' : 'رفض والسماح بمحاولة جديدة'}
                            tone="danger"
                            disabled={reviewDisabled}
                            onPress={() => void runReview('reject')}
                          />
                        </Box>
                      </Box>
                    ) : null}
                  </Box>
                ) : null}
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
