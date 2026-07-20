import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import {
  Box,
  Button,
  Chip,
  MobileScrollView,
  SectionHeader,
  StateView,
  Surface,
  Text,
  TextField,
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
  rejectionReasons: Array<{
    id: string;
    label: string;
    description?: string;
    requiresNote?: boolean;
  }>;
  canAccept?: boolean;
  canReject?: boolean;
  onAccept: () => void;
  onReject: (reasonId: string, reasonNote: string) => void;
  onBack?: () => void;
  errorMessage?: string;
};

export function DshPartnerOrderRejectionScreen({
  state = 'ready',
  orderCode,
  amount,
  items,
  rejectionReasons,
  canAccept = true,
  canReject = true,
  onAccept,
  onReject,
  onBack,
  errorMessage,
}: DshPartnerOrderRejectionScreenProps) {
  const { direction } = useDirection();
  const [selectedReasonId, setSelectedReasonId] = React.useState<string | null>(null);
  const [reasonNote, setReasonNote] = React.useState('');
  const [showRejectionPanel, setShowRejectionPanel] = React.useState(false);
  const selectedReason = rejectionReasons.find((reason) => reason.id === selectedReasonId);

  React.useEffect(() => {
    if (!canReject && showRejectionPanel) {
      setShowRejectionPanel(false);
      setSelectedReasonId(null);
      setReasonNote('');
    }
  }, [canReject, showRejectionPanel]);

  if (state === 'loading') {
    return <Surface style={styles.root}><StateView title="جارٍ تثبيت القرار" loading /></Surface>;
  }

  if (state === 'success') {
    return (
      <Surface style={styles.root}>
        <StateView
          title="تم تثبيت قرار الطلب"
          description="توقفت العمليات التابعة، وأُرسل الأثر المالي إلى WLT لتحديد التحرير أو الاسترداد."
          actionLabel="العودة للطلبات"
          onActionPress={onBack}
        />
      </Surface>
    );
  }

  return (
    <MobileScrollView padding={4} gap={4}>
      <Box gap={2}>
        <Text role="titleLg">قرار قبول أو إلغاء الطلب</Text>
        <Text role="bodyMd" tone="muted">
          الأزرار المعروضة هي الإجراءات التي يسمح بها DSH للحالة الحالية فقط.
        </Text>
      </Box>

      {state === 'error' && errorMessage ? (
        <Surface tone="danger" gap={2}>
          <Text role="bodyStrong">تعذر تثبيت القرار</Text>
          <Text role="bodySm">{errorMessage}</Text>
        </Surface>
      ) : null}

      <Surface tone="action" gap={3}>
        <Box style={{ flexDirection: resolveRowDirection(direction), justifyContent: 'space-between', alignItems: 'center' }}>
          <Text role="titleMd" style={{ color: colorPalette.white }}>الطلب {orderCode}</Text>
          <Chip label={canAccept || canReject ? 'ينتظر القرار' : 'تم تحديث الحالة'} selected />
        </Box>
        <Text role="bodySm" style={{ color: colorPalette.white }}>الإجمالي: {amount}</Text>
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
          {canAccept ? <Button label="قبول الطلب" tone="primary" onPress={onAccept} /> : null}
          {canReject ? (
            <Button
              label="إلغاء الطلب مع سبب"
              tone="danger"
              onPress={() => setShowRejectionPanel(true)}
            />
          ) : null}
          {!canAccept && !canReject ? (
            <StateView
              tone="warning"
              title="لا يوجد قرار متاح"
              description="تغيرت حالة الطلب. ارجع إلى لوحة الطلبات لقراءة الحالة الحالية."
              actionLabel="العودة للطلبات"
              onActionPress={onBack}
            />
          ) : null}
        </Box>
      ) : (
        <Surface tone="default" gap={3}>
          <SectionHeader
            title="سبب الإلغاء"
            subtitle="السبب مصنف ويظهر للعمليات ويرتبط بقرار WLT المالي."
          />
          <Box gap={2}>
            {rejectionReasons.map((reason) => (
              <Pressable
                key={reason.id}
                onPress={() => {
                  setSelectedReasonId(reason.id);
                  if (!reason.requiresNote) setReasonNote('');
                }}
                style={[
                  styles.reasonItem,
                  { flexDirection: resolveRowDirection(direction) },
                  selectedReasonId === reason.id && styles.reasonItemSelected,
                ]}
              >
                <View style={[styles.radioCircle, selectedReasonId === reason.id && styles.radioCircleActive]}>
                  {selectedReasonId === reason.id ? <View style={styles.radioInner} /> : null}
                </View>
                <Box style={styles.reasonText} gap={1}>
                  <Text role="bodyMd" style={[styles.reasonLabel, selectedReasonId === reason.id && { color: colorRoles.brandActionPressed }]}>
                    {reason.label}
                  </Text>
                  {reason.description ? <Text role="caption" tone="muted">{reason.description}</Text> : null}
                </Box>
              </Pressable>
            ))}
          </Box>
          {selectedReason?.requiresNote ? (
            <TextField
              label="التوضيح المطلوب"
              placeholder="اكتب سببًا تشغيليًا قابلًا للمراجعة"
              value={reasonNote}
              onChangeText={setReasonNote}
            />
          ) : null}
          <Box gap={2} style={{ marginTop: spacing[2] }}>
            <Button
              label="تأكيد إلغاء الطلب"
              tone="danger"
              disabled={!canReject || !selectedReasonId || Boolean(selectedReason?.requiresNote && !reasonNote.trim())}
              onPress={() => canReject && selectedReasonId && onReject(selectedReasonId, reasonNote.trim())}
            />
            <Button
              label="تراجع"
              tone="secondary"
              onPress={() => {
                setShowRejectionPanel(false);
                setSelectedReasonId(null);
                setReasonNote('');
              }}
            />
          </Box>
        </Surface>
      )}

      <Box padding={spacing[3]} style={{ backgroundColor: colorRoles.surfaceBase, borderRadius: radius.md }}>
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[2] }}>
          <Icon name="time-outline" size={16} tone="muted" />
          <Text role="caption" tone="muted">التأخر في القرار قد يؤدي إلى تصعيد تشغيلي أو إلغاء تلقائي وفق السياسة.</Text>
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
  reasonText: {
    flex: 1,
  },
  reasonLabel: {
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
