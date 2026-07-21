import React from 'react';
import { TextInput, View } from 'react-native';
import {
  Box,
  Button,
  KeyValueList,
  StateView,
  Surface,
  Text,
  colorRoles,
  spacing,
} from '@bthwani/ui-kit';
import type { DshDispatchAssignment } from '../../shared/dispatch';

type Props = {
  readonly assignment: DshDispatchAssignment;
  readonly busy: boolean;
  readonly errorMessage?: string;
  readonly onAccept: (assignmentId: string) => void;
  readonly onDecline: (assignmentId: string, reason: string) => void;
};

function formatDeadline(value: string): string {
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return 'مهلة غير صالحة';
  const seconds = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 1000));
  if (seconds === 0) return 'انتهت المهلة';
  if (seconds < 60) return `${seconds} ثانية متبقية`;
  return `${Math.ceil(seconds / 60)} دقيقة متبقية`;
}

function formatDistance(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'لم تُحسب';
  if (value < 1000) return `${value} متر`;
  return `${(value / 1000).toFixed(1)} كم`;
}

export function CaptainAssignmentOfferPanel({
  assignment,
  busy,
  errorMessage,
  onAccept,
  onDecline,
}: Props) {
  const [reason, setReason] = React.useState('');
  const [deadlineLabel, setDeadlineLabel] = React.useState(() => formatDeadline(assignment.responseDeadlineAt));

  React.useEffect(() => {
    setReason('');
    setDeadlineLabel(formatDeadline(assignment.responseDeadlineAt));
    const timer = setInterval(() => {
      setDeadlineLabel(formatDeadline(assignment.responseDeadlineAt));
    }, 1_000);
    return () => clearInterval(timer);
  }, [assignment.id, assignment.responseDeadlineAt]);

  const expired = new Date(assignment.responseDeadlineAt).getTime() <= Date.now();
  const trimmedReason = reason.trim();

  return (
    <Surface tone="raised" padding={4} style={{ marginHorizontal: spacing[3], marginTop: spacing[2] }}>
      <Box gap={3}>
        <Box gap={1}>
          <Text role="titleSm">عرض إسناد جديد</Text>
          <Text role="bodySm" tone="muted">
            راجع حقيقة العرض من DSH ثم اقبل أو ارفض بسبب واضح قبل انتهاء المهلة.
          </Text>
        </Box>

        <KeyValueList
          items={[
            { label: 'رقم الطلب', value: assignment.orderId ? `#${assignment.orderId}` : 'طلب خاص' },
            { label: 'منطقة الخدمة', value: assignment.serviceAreaCode?.trim() || 'غير محددة', tone: 'info' },
            { label: 'المسافة', value: formatDistance(assignment.distanceMeters) },
            { label: 'الأولوية', value: String(assignment.priority ?? 0) },
            { label: 'سبب العرض', value: assignment.offerReason?.trim() || 'إسناد تشغيلي' },
            { label: 'مهلة الرد', value: deadlineLabel, tone: expired ? 'danger' : 'warning' },
          ]}
        />

        {errorMessage ? (
          <StateView title="تعذر تنفيذ قرار العرض" description={errorMessage} tone="danger" />
        ) : null}

        <Button
          label={busy ? 'جاري قبول العرض…' : 'قبول العرض'}
          tone="success"
          disabled={busy || expired}
          onPress={() => onAccept(assignment.id)}
        />

        <View style={{ gap: spacing[2] }}>
          <Text role="label">سبب الرفض</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            editable={!busy && !expired}
            placeholder="مثال: عطل بالمركبة أو تعذر الوصول"
            placeholderTextColor={colorRoles.textMuted}
            multiline
            textAlign="right"
            style={{
              minHeight: 72,
              borderWidth: 1,
              borderColor: colorRoles.borderDefault,
              borderRadius: 10,
              padding: spacing[3],
              color: colorRoles.textPrimary,
              backgroundColor: colorRoles.surfaceBase,
            }}
          />
          <Button
            label={busy ? 'جاري رفض العرض…' : 'رفض العرض'}
            tone="danger"
            disabled={busy || expired || trimmedReason.length < 3}
            onPress={() => onDecline(assignment.id, trimmedReason)}
          />
        </View>
      </Box>
    </Surface>
  );
}
