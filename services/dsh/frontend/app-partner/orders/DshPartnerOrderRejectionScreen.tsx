import React from 'react';
import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import {
  Box,
  Button,
  Chip,
  MobileScrollView,
  SectionHeader,
  StateView,
  Surface,
  Text,
  colorPalette,
  colorRoles,
  spacing,
  radius,
  Icon,
  useDirection,
  resolveRowDirection,
} from '@bthwani/ui-kit';

export type DshPartnerOrderRejectionScreenProps = {
  state?: 'ready' | 'loading' | 'success' | 'error';
  orderCode: string;
  amount: string;
  items: Array<{ id: string; name: string; quantity: number }>;
  rejectionReasons: Array<{ id: string; label: string }>;
  onAccept: () => void;
  onReject: (reasonId: string) => void;
  onBack?: () => void;
};

export function DshPartnerOrderRejectionScreen({
  state = 'ready',
  orderCode = '#' + '4401',
  amount = '92 ر.ي',
  items = [
    { id: '1', name: 'برجر كلاسيك', quantity: 2 },
    { id: '2', name: 'بطاطس مقلية', quantity: 1 },
    { id: '3', name: 'بيبسي', quantity: 1 },
  ],
  rejectionReasons = [
    { id: 'out-of-stock', label: 'بعض الأصناف غير متوفرة' },
    { id: 'busy', label: 'المتجر مزدحم جداً حالياً' },
    { id: 'closing-soon', label: 'المتجر سيغلق قريباً' },
    { id: 'technical-issue', label: 'مشكلة تقنية في استقبال الطلبات' },
    { id: 'other', label: 'سبب آخر' },
  ],
  onAccept,
  onReject,
  onBack,
}: DshPartnerOrderRejectionScreenProps) {
  const { direction } = useDirection();
  const [selectedReasonId, setSelectedReasonId] = React.useState<string | null>(null);
  const [showRejectionPanel, setShowRejectionPanel] = React.useState(false);

  if (state === 'loading') {
    return <Surface style={styles.root}><StateView title="جارٍ التحميل" loading /></Surface>;
  }

  if (state === 'success') {
    return (
      <Surface style={styles.root}>
        <StateView
          title="تم تحديث حالة الطلب"
          description="تم تسجيل قرارك بنجاح وسيتم إبلاغ العميل والعمليات."
          actionLabel="العودة للطلبات"
          onActionPress={onBack}
        />
      </Surface>
    );
  }

  return (
    <MobileScrollView padding={4} gap={4}>
      <Box gap={2}>
        <Text role="titleLg">قرار قبول الطلب</Text>
        <Text role="bodyMd" tone="muted">
          يرجى مراجعة تفاصيل الطلب واتخاذ القرار خلال الوقت المحدد (SLA).
        </Text>
      </Box>

      <Surface tone="action" gap={3}>
        <Box style={{ flexDirection: resolveRowDirection(direction), justifyContent: 'space-between', alignItems: 'center' }}>
          <Text role="titleMd" style={{ color: colorPalette.white }}>الطلب {orderCode}</Text>
          <Chip label="جديد" selected />
        </Box>
        <Box gap={1}>
          <Text role="bodySm" style={{ color: colorPalette.white }}>الإجمالي: {amount}</Text>
        </Box>
      </Surface>

      <Surface tone="raised" gap={3}>
        <SectionHeader title="أصناف الطلب" subtitle={`${items.length} أصناف في هذا الطلب`} />
        <Box gap={2}>
          {items.map((item) => (
            <View key={item.id} style={[styles.itemRow, { flexDirection: resolveRowDirection(direction) }]}>
              <Text role="bodyMd" style={styles.itemText}>{item.name}</Text>
              <Text role="bodyStrong" style={styles.itemQty}>x{item.quantity}</Text>
            </View>
          ))}
        </Box>
      </Surface>

      {!showRejectionPanel ? (
        <Box gap={3} style={{ marginTop: spacing[4] }}>
          <Button label="قبول الطلب وبدء التحضير" tone="primary" onPress={onAccept} />
          <Button
            label="رفض الطلب"
            tone="danger"
            onPress={() => setShowRejectionPanel(true)}
          />
        </Box>
      ) : (
        <Surface tone="default" gap={3}>
          <SectionHeader
            title="سبب الرفض"
            subtitle="يساعدنا سبب الرفض في تحسين تجربة العميل وتعديل حالة المتجر."
          />
          <Box gap={2}>
            {rejectionReasons.map((reason) => (
              <Pressable
                key={reason.id}
                onPress={() => setSelectedReasonId(reason.id)}
                style={[
                  styles.reasonItem,
                  { flexDirection: resolveRowDirection(direction) },
                  selectedReasonId === reason.id && styles.reasonItemSelected,
                ]}
              >
                <View style={[styles.radioCircle, selectedReasonId === reason.id && styles.radioCircleActive]}>
                  {selectedReasonId === reason.id && <View style={styles.radioInner} />}
                </View>
                <Text role="bodyMd" style={[styles.reasonLabel, selectedReasonId === reason.id && { color: colorRoles.brandActionPressed }]}>
                  {reason.label}
                </Text>
              </Pressable>
            ))}
          </Box>
          <Box gap={2} style={{ marginTop: spacing[2] }}>
            <Button
              label="تأكيد الرفض"
              tone="danger"
              disabled={!selectedReasonId}
              onPress={() => selectedReasonId && onReject(selectedReasonId)}
            />
            <Button label="تراجع" tone="secondary" onPress={() => setShowRejectionPanel(false)} />
          </Box>
        </Surface>
      )}

      <Box padding={spacing[3]} style={{ backgroundColor: colorRoles.surfaceBase, borderRadius: radius.md }}>
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[2] }}>
          <Icon name="time-outline" size={16} tone="muted" />
          <Text role="caption" tone="muted">ملاحظة: التأخر في اتخاذ القرار قد يؤدي إلى إلغاء الطلب تلقائياً.</Text>
        </Box>
      </Box>
    </MobileScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
  },
  itemRow: {
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
  },
  itemText: {
    flex: 1,
    color: colorRoles.brandActionPressed,
    textAlign: 'right',
  },
  itemQty: {
    color: colorRoles.brandAction,
    width: 40,
    textAlign: 'left',
  },
  reasonItem: {
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
    gap: spacing[3],
  },
  reasonItemSelected: {
    backgroundColor: colorRoles.borderSubtle + '10',
  },
  reasonLabel: {
    flex: 1,
    textAlign: 'right',
    color: colorRoles.brandActionPressed,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colorRoles.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colorRoles.danger,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colorRoles.danger,
  },
});
