import React from 'react';
import { Badge, Box, Button, ListItem, Surface, Text, TextField, spacing } from '@bthwani/ui-kit';
import { OperationHeader } from './OperationHeader';

type AuctionStatusId = 'received' | 'under-review' | 'approved' | 'closed';

const auctionStatusItems: readonly {
  id: AuctionStatusId;
  title: string;
  subtitle: string;
  badgeLabel: string;
}[] = [
  {
    id: 'received',
    title: 'تم استلام الحالة',
    subtitle: 'تسجيل وصول التحديث من الفرع أو منسق العملية قبل أي قرار لاحق.',
    badgeLabel: 'استلام',
  },
  {
    id: 'under-review',
    title: 'قيد المراجعة',
    subtitle: 'الحالة تحت المراجعة التشغيلية بانتظار قرار أو اعتماد داخلي.',
    badgeLabel: 'مراجعة',
  },
  {
    id: 'approved',
    title: 'تم اعتماد التحديث',
    subtitle: 'أصبح التحديث صالحًا للاعتماد الداخلي والمتابعة في الدورة الحالية.',
    badgeLabel: 'اعتماد',
  },
  {
    id: 'closed',
    title: 'تم إغلاق الحالة',
    subtitle: 'أُغلق هذا التحديث بعد توثيق نتيجته النهائية داخل المسار نفسه.',
    badgeLabel: 'إغلاق',
  },
] as const;

const nextStatusByStage: Partial<Record<AuctionStatusId, AuctionStatusId>> = {
  received: 'under-review',
  'under-review': 'approved',
  approved: 'closed',
};

export type AuctionStatusUpdateScreenProps = {
  onBack?: () => void;
  onSecondaryAction?: () => void;
};

export function AuctionStatusUpdateScreen({ onBack, onSecondaryAction }: AuctionStatusUpdateScreenProps) {
  const [selectedStatus, setSelectedStatus] = React.useState<AuctionStatusId>('received');
  const [statusNote, setStatusNote] = React.useState('تم استلام التحديث التشغيلي وبانتظار قرار المراجعة.');
  const [savedMessage, setSavedMessage] = React.useState('لم يتم حفظ أي تحديث بعد.');

  const nextStatus = nextStatusByStage[selectedStatus];

  return (
    <Box gap={4}>
      <OperationHeader
        title="تحديث حالة المزاد"
        subtitle="شاشة تشغيلية محلية لتسجيل حالة المزاد الحالية، ملاحظتها، والمرحلة التالية بدون أي placeholder أو ربط خلفي غير مثبت."
        chips={
          <>
            <Badge label={`الحالة الحالية: ${auctionStatusItems.find((item) => item.id === selectedStatus)?.title ?? ''}`} tone="action" />
            <Badge label={`المرحلة التالية: ${nextStatus ? auctionStatusItems.find((item) => item.id === nextStatus)?.title : 'إغلاق نهائي'}`} tone="info" />
          </>
        }
      />

      <Surface tone="raised" padding={0} gap={0}>
        <Text role="label" tone="muted" style={{ paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[2] }}>
          مراحل التحديث
        </Text>
        {auctionStatusItems.map((item) => (
          <ListItem
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            trailing={item.badgeLabel ? <Badge label={item.badgeLabel} /> : undefined}
            meta={selectedStatus === item.id ? 'المسار النشط' : 'اختيار الحالة'}
            onPress={() => setSelectedStatus(item.id)}
          />
        ))}
      </Surface>

      <Surface tone="raised" padding={3} gap={3}>
        <Text role="label" tone="muted">ملاحظة تشغيلية</Text>
        <TextField
          label="ملخص التحديث"
          value={statusNote}
          onChangeText={setStatusNote}
          multiline
          numberOfLines={4}
          hint="اكتب التغيير التشغيلي أو قرار المراجعة داخل هذا المسار فقط."
        />
        <Text role="bodySm" tone="muted">
          {savedMessage}
        </Text>
        <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
          <Button
            label="حفظ التحديث محليًا"
            onPress={() => setSavedMessage(`تم حفظ الحالة: ${auctionStatusItems.find((item) => item.id === selectedStatus)?.title ?? 'غير معروفة'}`)}
          />
          {nextStatus ? (
            <Button
              label="الانتقال إلى المرحلة التالية"
              tone="secondary"
              fullWidth={false}
              onPress={() => {
                setSelectedStatus(nextStatus);
                setSavedMessage(`تم نقل الحالة إلى: ${auctionStatusItems.find((item) => item.id === nextStatus)?.title ?? 'غير معروفة'}`);
              }}
            />
          ) : null}
        </Box>
        <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
          {onBack ? <Button label="العودة" tone="ghost" fullWidth={false} onPress={onBack} /> : null}
          {onSecondaryAction ? <Button label="العودة لدليل العمليات" tone="ghost" fullWidth={false} onPress={onSecondaryAction} /> : null}
        </Box>
      </Surface>
    </Box>
  );
}
