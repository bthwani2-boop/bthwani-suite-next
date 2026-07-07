import React from 'react';
import { Button, SectionHeader, Surface, Text, TextField, Chip, Box,
  spacing,
} from '@bthwani/ui-kit';
import { ApprovalStage } from '../../shared';
import type { DshPartnerOperationalFlowId } from '../dsh-partner.types';

export type DshPartnerVideoSubmissionPanelProps = {
  onSelectFlow?: (flowId: DshPartnerOperationalFlowId) => void;
};

export function DshPartnerVideoSubmissionPanel({ onSelectFlow }: DshPartnerVideoSubmissionPanelProps) {
  const [videoTitle, setVideoTitle] = React.useState('تجربة منتج الشريك');
  const [videoSummary, setVideoSummary] = React.useState('مراجعة سريعة لأداء المنتج في المطبخ.');
  const [videoOwner, setVideoOwner] = React.useState<'promotions' | 'catalog'>('promotions');
  const videoStage: ApprovalStage = 'partner-review';

  return (
    <Surface tone="raised" gap={3}>
      <Box layoutDirection="row" justify="space-between" align="center">
        <SectionHeader title="رفع فيديو الشريك" subtitle="يجهز مسار الفيديو بوضوح داخل تصنيف الفيديو فقط." />
        <Chip label={videoOwner === 'catalog' ? 'ملكية الكتالوج' : 'ملكية العروض'} />
      </Box>
      <TextField label="عنوان الفيديو" value={videoTitle} onChangeText={setVideoTitle} />
      <TextField label="ملخص الفيديو" value={videoSummary} onChangeText={setVideoSummary} multiline numberOfLines={3} />
      <Box gap={2}>
        <Text role="bodySm" tone="muted">
          حدّد المالك قبل فتح المسار: فيديو الاكتشاف المرتبط بمتجر/قسم/منتج منشور يذهب إلى الكتالوج، أما فيديو القصة التسويقية أو الولاء فيذهب إلى promotions.
        </Text>
        <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
          <Chip label="Promotions" selected={videoOwner === 'promotions'} onPress={() => setVideoOwner('promotions')} />
          <Chip label="Catalog" selected={videoOwner === 'catalog'} onPress={() => setVideoOwner('catalog')} />
        </Box>
      </Box>
      <Text role="bodySm" tone="muted">
        {videoOwner === 'catalog'
          ? 'هذا الفيديو سيُراجع كجزء من محتوى الاكتشاف المرتبط بالكتالوج، ولن يُنشر قبل اكتمال مسار النشر والظهور.'
          : 'هذا الفيديو يبقى ضمن promotions كقصة تسويقية أو مزايا، ولا يتحول إلى مسار كتالوج إلا إذا صار مرتبطاً بمنتج أو اكتشاف فعلي.'}
      </Text>
      <Button label={videoOwner === 'catalog' ? 'فتح مسار فيديو الكتالوج' : 'فتح مسار فيديو العروض'} onPress={() => onSelectFlow?.('video-upload')} />
    </Surface>
  );
}

// export default DshPartnerVideoSubmissionPanel; // Unused default export