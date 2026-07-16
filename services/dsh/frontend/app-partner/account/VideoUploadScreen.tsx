import React from 'react';
import { Box, Button } from '@bthwani/ui-kit';
import { OperationHeader } from './OperationHeader';
import { DshPartnerVideoSubmissionPanel } from './PartnerVideoSubmissionPanel';

export type VideoUploadScreenProps = {
  onBack?: () => void;
  onSecondaryAction?: () => void;
};

export function VideoUploadScreen({ onBack, onSecondaryAction }: VideoUploadScreenProps) {
  return (
    <Box gap={4}>
      <OperationHeader
        title="رفع فيديو الشريك"
        subtitle="هذا المسار يعرض إعداد الفيديو ومراجعته داخل شاشة تشغيلية حقيقية بدل placeholder عام."
        actions={
          <>
            {onBack ? <Button label="العودة" tone="secondary" fullWidth={false} onPress={onBack} /> : null}
            {onSecondaryAction ? <Button label="العودة لدليل العمليات" fullWidth={false} onPress={onSecondaryAction} /> : null}
          </>
        }
      />

      <DshPartnerVideoSubmissionPanel onSelectFlow={() => onSecondaryAction?.()} />
    </Box>
  );
}
