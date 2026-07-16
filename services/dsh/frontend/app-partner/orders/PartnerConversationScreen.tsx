import React from 'react';
import { Badge, Box, Button, ListItem, Surface, Text, spacing } from '@bthwani/ui-kit';
import { OperationHeader } from '../account/OperationHeader';
import { mapDshPartnerOperationalFlowToSupportRoute } from '../dsh-partner.types';
import { DshPartnerOrderConversationPanel } from './PartnerOrderConversationPanel';

export type PartnerConversationRouteId = 'chat-read-ack' | 'chat-send' | 'quick-reply-config' | 'quick-reply-settings' | 'quick-reply-setup';

export type ConversationScreenProps = {
  activeFlowId?: PartnerConversationRouteId;
  onBack?: () => void;
  onOpenScreen?: (screenId: PartnerConversationRouteId) => void;
  onSecondaryAction?: () => void;
};

const quickReplyItems: readonly { id: Extract<PartnerConversationRouteId, 'quick-reply-config' | 'quick-reply-settings' | 'quick-reply-setup'>; title: string; subtitle: string }[] = [
  { id: 'quick-reply-config', title: 'إعداد الردود السريعة', subtitle: 'راجع القوالب الأساسية للردود الجاهزة.' },
  { id: 'quick-reply-settings', title: 'إعدادات الردود السريعة', subtitle: 'اضبط التفضيلات والتفعيل لكل فئة من الردود.' },
  { id: 'quick-reply-setup', title: 'تهيئة الردود السريعة', subtitle: 'أكمل التهيئة التشغيلية للردود من نفس المسار.' },
] as const;

const conversationFlowCopy: Record<PartnerConversationRouteId, { title: string; subtitle: string }> = {
  'chat-read-ack': {
    title: 'تأكيد قراءة المحادثة',
    subtitle: 'إقرار القراءة مرتبط بالطلب الحالي فقط ولا يتحول إلى inbox عام.',
  },
  'chat-send': {
    title: 'إرسال محادثة',
    subtitle: 'المحادثة تبقى داخل سياق الطلب وتغلق بانتهاء دورة التنفيذ.',
  },
  'quick-reply-config': {
    title: 'إعداد الردود السريعة',
    subtitle: 'القوالب الجاهزة تظل جزءًا من نفس محادثة الطلب.',
  },
  'quick-reply-settings': {
    title: 'إعدادات الردود السريعة',
    subtitle: 'اضبط سلوك الردود الجاهزة دون إنشاء شاشة منفصلة خارج السياق.',
  },
  'quick-reply-setup': {
    title: 'تهيئة الردود السريعة',
    subtitle: 'أكمل تهيئة الردود من داخل مساحة المحادثة التشغيلية.',
  },
};

export function ConversationScreen({ activeFlowId = 'chat-send', onBack, onOpenScreen, onSecondaryAction }: ConversationScreenProps) {
  const activeCopy = conversationFlowCopy[activeFlowId];

  return (
    <Box gap={4}>
      <OperationHeader
        title={activeCopy.title}
        subtitle={activeCopy.subtitle}
        actions={
          <>
            {onBack ? <Button label="العودة" tone="secondary" fullWidth={false} onPress={onBack} /> : null}
            {onSecondaryAction ? <Button label="المسار التالي" fullWidth={false} onPress={onSecondaryAction} /> : null}
          </>
        }
      />

      <DshPartnerOrderConversationPanel
        onOpenFlow={(flowId) => {
          const routeId = mapDshPartnerOperationalFlowToSupportRoute(flowId);
          if (routeId) {
            onOpenScreen?.(routeId as PartnerConversationRouteId);
          }
        }}
      />

      <Surface tone="raised" padding={0} gap={0}>
        <Text role="label" tone="muted" style={{ paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[2] }}>
          الردود السريعة
        </Text>
        {quickReplyItems.map((item) => (
          <ListItem
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            meta={activeFlowId === item.id ? 'المسار النشط' : 'افتح المسار'}
            trailing={<Badge label="ردود" />}
            onPress={() => onOpenScreen?.(item.id)}
          />
        ))}
      </Surface>
    </Box>
  );
}
