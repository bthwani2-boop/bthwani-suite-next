import React from 'react';
import { Badge, Box, Button, ListItem, SectionHeader, StateView, Surface, Text, TextField } from '@bthwani/ui-kit';
import type { DshPartnerOperationalFlowId } from '../dsh-partner.types';
import {
  shouldShowDshPartnerOrderConversation,
  type DshPartnerOrderConversationMessage,
  type DshPartnerOrderConversationMode,
} from '../../shared/orders';

export type DshPartnerOrderConversationPanelProps = {
  enabledForOrderMode?: DshPartnerOrderConversationMode;
  messages?: readonly DshPartnerOrderConversationMessage[];
  onOpenFlow?: (flowId: DshPartnerOperationalFlowId) => void;
};

const DEFAULT_MESSAGES: DshPartnerOrderConversationMessage[] = [
  { id: '1', authorLabel: 'المندوب', body: 'أنا عند بوابة الفرع الآن.', timestampLabel: 'قبل دقيقتين', acknowledged: false },
  { id: '2', authorLabel: 'الفرع', body: 'الطلب في مرحلة التغليف الأخيرة.', timestampLabel: 'الآن', acknowledged: true },
];

export function DshPartnerOrderConversationPanel({
  enabledForOrderMode = 'pickup',
  messages = DEFAULT_MESSAGES,
  onOpenFlow,
}: DshPartnerOrderConversationPanelProps) {
  const [draftMessage, setDraftMessage] = React.useState('');
  const visibility = shouldShowDshPartnerOrderConversation(enabledForOrderMode);

  if (visibility === 'disabled-for-mode') {
    return (
      <Surface tone="raised" gap={3}>
        <SectionHeader title="محادثة الطلب" subtitle="المحادثة لا تُفتح لكل الأنماط التشغيلية." />
        <StateView
          title="المحادثة غير مفعلة لهذا النوع"
          description="هذا المسار متاح فقط في استلم بنفسك أو توصيل المتجر. عند إغلاق دورة الطلب تُغلق المحادثة سياقيًا ولا تتحول إلى inbox عام."
        />
      </Surface>
    );
  }

  return (
    <Surface tone="raised" gap={3}>
      <SectionHeader title="محادثة الطلب" subtitle="المحادثة مرتبطة بالطلب الحالي فقط وتغلق مباشرةً عند إغلاق دورة الطلب." />
      <Box gap={2}>
        {messages.map((message) => (
          <ListItem
            key={message.id}
            title={message.authorLabel}
            subtitle={message.body}
            meta={message.timestampLabel}
            trailing={<Badge label={message.acknowledged ? 'مقروء' : 'بانتظار الإقرار'} tone="neutral" />}
          />
        ))}
      </Box>
      <TextField
        label="رسالة سريعة للطلب"
        value={draftMessage}
        onChangeText={setDraftMessage}
        hint="تُرسل داخل الطلب النشط فقط ولا تُحفظ كمحادثة عامة."
      />
      <Box layoutDirection="row" gap={2}>
        <Button label="إقرار القراءة" tone="secondary" onPress={() => onOpenFlow?.('order-chat-read-ack')} />
        <Button label="إرسال الرسالة" onPress={() => onOpenFlow?.('order-chat-send')} />
      </Box>
      <Text role="bodySm" tone="muted">
        الردود السريعة تظل جزءًا من هذا الطلب وحده، ولا يوجد chat دائم أو inbox عام في هذا المسار.
      </Text>
    </Surface>
  );
}

// export default DshPartnerOrderConversationPanel; // Unused default export