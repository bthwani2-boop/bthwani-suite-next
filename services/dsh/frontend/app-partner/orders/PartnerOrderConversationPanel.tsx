import React from 'react';
import { Badge, Box, ListItem, SectionHeader, StateView, Surface, Text } from '@bthwani/ui-kit';
import type { DshPartnerOperationalFlowId } from '../dsh-partner.types';
import {
  shouldShowDshPartnerOrderConversation,
  type DshPartnerOrderConversationMessage,
  type DshPartnerOrderConversationMode,
} from '../../shared/orders';

export type DshPartnerOrderConversationPanelProps = {
  enabledForOrderMode?: DshPartnerOrderConversationMode;
  messages?: readonly DshPartnerOrderConversationMessage[];
  /** Navigation compatibility only; it is not a message mutation binding. */
  onOpenFlow?: (flowId: DshPartnerOperationalFlowId) => void;
};

export function DshPartnerOrderConversationPanel({
  enabledForOrderMode = 'pickup',
  messages = [],
  onOpenFlow,
}: DshPartnerOrderConversationPanelProps) {
  const visibility = shouldShowDshPartnerOrderConversation(enabledForOrderMode);
  const hasNavigationCompatibility = typeof onOpenFlow === 'function';

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
      <SectionHeader
        title="محادثة الطلب"
        subtitle="تعرض هذه المساحة رسائل الطلب الحية فقط؛ لا توجد رسائل تجريبية أو محلية."
      />
      {messages.length === 0 ? (
        <StateView
          title="لا توجد رسائل حية"
          description="الإرسال وإقرار القراءة محجوبان حتى يتوفر عقد محادثة حي، صلاحيات actor-scoped، حفظ، وتأكيد قراءة راجعة من DSH Runtime."
          tone="warning"
        />
      ) : (
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
      )}
      <Text role="bodySm" tone="muted">
        {hasNavigationCompatibility
          ? 'مسارات التنقل القديمة متاحة للتوافق فقط، ولا تُعامل كإثبات إرسال أو إقرار قراءة.'
          : 'لا يوجد binding تنقل أو mutation للمحادثة في هذا السطح.'}
      </Text>
    </Surface>
  );
}
