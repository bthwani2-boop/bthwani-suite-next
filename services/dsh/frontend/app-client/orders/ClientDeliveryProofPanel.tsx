import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Badge,
  Box,
  Button,
  StateView,
  Surface,
  Text,
  colorRoles,
  spacing,
} from '@bthwani/ui-kit';
import { useClientDeliveryPinController } from '../../shared/delivery-proof';

export type ClientDeliveryProofPanelProps = {
  readonly orderId: string;
  readonly captainArrived: boolean;
};

function expiresLabel(expiresAt: string): string {
  return new Date(expiresAt).toLocaleTimeString('ar-YE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ClientDeliveryProofPanel({
  orderId,
  captainArrived,
}: ClientDeliveryProofPanelProps) {
  const controller = useClientDeliveryPinController(orderId);

  React.useEffect(() => {
    void controller.refreshProof();
  }, [controller.refreshProof]);

  if (controller.proof) {
    return (
      <Surface tone="raised" gap={3}>
        <Box layoutDirection="row" justify="space-between" align="center">
          <Text role="titleSm">إثبات التسليم المقبول</Text>
          <Badge label="مقبول" tone="success" />
        </Box>
        <View style={styles.row}>
          <Text role="bodySm" tone="muted">طريقة الإثبات</Text>
          <Text role="bodyStrong">{controller.proof.method === 'otp_pin' ? 'رمز العميل' : controller.proof.method === 'composite' ? 'رمز وصورة' : controller.proof.method === 'signature' ? 'توقيع' : 'صورة مراجعة'}</Text>
        </View>
        <View style={styles.row}>
          <Text role="bodySm" tone="muted">وقت الالتقاط</Text>
          <Text role="bodyStrong">{new Date(controller.proof.capturedAt).toLocaleString('ar-YE')}</Text>
        </View>
        <Text role="caption" tone="muted">
          يعرض هذا السطح ملخصًا مخفي التفاصيل فقط؛ لا تظهر إحداثيات الكابتن أو مراجع الوسائط أو بيانات المراجعة الداخلية.
        </Text>
        <Button
          label="تحديث ملخص الإثبات"
          tone="secondary"
          disabled={controller.state === 'loading'}
          onPress={() => void controller.refreshProof()}
        />
      </Surface>
    );
  }

  if (controller.state === 'offline' || controller.state === 'error') {
    return (
      <StateView
        tone="warning"
        title={controller.state === 'offline' ? 'تعذر الاتصال بخدمة إثبات التسليم' : 'تعذر قراءة إثبات التسليم'}
        description={controller.error?.message ?? 'تحقق من الاتصال ثم أعد المحاولة.'}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void controller.refreshProof()}
      />
    );
  }

  if (!captainArrived) {
    return (
      <Surface tone="raised" gap={2}>
        <Text role="titleSm">رمز التسليم</Text>
        <Text role="bodySm" tone="muted">
          سيصبح إصدار الرمز متاحًا عندما يثبت DSH وصول الكابتن إلى موقع التسليم. لا تشارك أي رمز قبل ذلك.
        </Text>
      </Surface>
    );
  }

  return (
    <Surface tone="warning" gap={3}>
      <Box layoutDirection="row" justify="space-between" align="center">
        <Text role="titleSm">رمز التسليم الآمن</Text>
        <Badge label="للطلب الحالي فقط" tone="warning" />
      </Box>
      <Text role="bodySm">
        أصدر الرمز عند حضور الكابتن، ثم اعرضه له مباشرة. ينتهي الرمز تلقائيًا ولا يُخزن بصيغته الظاهرة داخل DSH.
      </Text>
      {controller.issued ? (
        <View style={styles.pinBox} accessibilityLabel={`رمز التسليم ${controller.issued.pin.split('').join(' ')}`}>
          <Text role="displaySm" style={styles.pinText}>{controller.issued.pin}</Text>
          <Text role="caption" tone="muted">صالح حتى {expiresLabel(controller.issued.challenge.expiresAt)}</Text>
        </View>
      ) : null}
      <Button
        label={controller.state === 'loading' ? 'جارٍ إصدار الرمز…' : controller.issued ? 'تدوير الرمز وإلغاء السابق' : 'إصدار رمز التسليم'}
        tone="brand"
        disabled={controller.state === 'loading'}
        onPress={() => void controller.issuePin()}
      />
      <Button
        label="تحديث حالة الإثبات"
        tone="secondary"
        disabled={controller.state === 'loading'}
        onPress={() => void controller.refreshProof()}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
  },
  pinBox: {
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: spacing[2],
    backgroundColor: colorRoles.surfaceWarm,
  },
  pinText: {
    letterSpacing: spacing[2],
    direction: 'ltr',
  },
});
