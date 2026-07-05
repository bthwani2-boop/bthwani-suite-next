import React from 'react';
import { useIdentitySession } from '@bthwani/core-identity';
import { Box, Button, Chip, ListItem, Surface, Text, TextField,
  spacing,
  Badge,
} from '@bthwani/ui-kit';
import { ActorNotificationsPanel } from '../../shared/notifications';
import {
  mapDshPartnerOperationalFlowToSupportRoute,
  type DshPartnerOperationalFlowId,
  type DshPartnerSupportIssueCategoryId,
} from '../dsh-partner.types';
import {
  DSH_ORDER_LIFECYCLE_HANDOFFS,
  getSurfaceObservation,
} from '../../shared/orders';
import { DshPartnerInventoryActionPanel, type PartnerInventoryFlowId } from '../Catalog/PartnerInventoryActionPanel';
import { DshPartnerOnboardingActionPanel, type PartnerOnboardingFlowId } from './PartnerOnboardingActionPanel';
import { DshPartnerOrderActionPanel, type PartnerOrderActionFlowId } from '../orders/PartnerOrderActionPanel';
import { DshPartnerOrderAlertsPanel } from '../orders/PartnerOrderAlertsPanel';
import { DshPartnerOrderConversationPanel } from '../orders/PartnerOrderConversationPanel';
import {
  DshPartnerOrderIssuePanel,
  resolvePartnerOrderIssueDefaultCategory,
  type PartnerOrderIssueFlowId,
} from '../orders/PartnerOrderIssuePanel';
import { DshPartnerVideoSubmissionPanel } from './PartnerVideoSubmissionPanel';

function OperationHeader({
  title,
  subtitle,
  chips,
  actions,
}: {
  title: string;
  subtitle: string;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Surface tone="raised" padding={3} gap={3}>
      <Text role="titleSm">{title}</Text>
      <Text role="bodySm" tone="muted">
        {subtitle}
      </Text>
      {chips ? <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>{chips}</Box> : null}
      {actions ? <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>{actions}</Box> : null}
    </Surface>
  );
}

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

export type InventoryActionScreenProps = {
  activeFlowId?: PartnerInventoryFlowId;
  onBack?: () => void;
  onOpenScreen?: (screenId: PartnerInventoryFlowId) => void;
  onSecondaryAction?: () => void;
};

const inventoryFlowCopy: Record<PartnerInventoryFlowId, { title: string; subtitle: string }> = {
  'inventory-adjust': {
    title: 'تعديل مخزون سريع',
    subtitle: 'صحّح الكمية أو الإتاحة لعنصر واحد بسرعة من داخل نفس المسار.',
  },
  'inventory-update': {
    title: 'تحديث مخزون جماعي',
    subtitle: 'راجع التغييرات الأوسع على المخزون والأسعار والتوفر.',
  },
  'items-upsert': {
    title: 'إضافة أو تحديث منتج',
    subtitle: 'ابدأ دائمًا بالبحث في الكتالوج قبل إنشاء عنصر جديد أو تعديله.',
  },
};

export function InventoryActionScreen({ activeFlowId = 'inventory-adjust', onBack, onOpenScreen, onSecondaryAction }: InventoryActionScreenProps) {
  const activeCopy = inventoryFlowCopy[activeFlowId];

  return (
    <Box gap={4}>
      <OperationHeader
        title={activeCopy.title}
        subtitle={activeCopy.subtitle}
        actions={
          <>
            {onBack ? <Button label="العودة" tone="secondary" fullWidth={false} onPress={onBack} /> : null}
            {onSecondaryAction ? <Button label="العودة لدليل العمليات" fullWidth={false} onPress={onSecondaryAction} /> : null}
          </>
        }
      />

      <DshPartnerInventoryActionPanel
        activeFlowId={activeFlowId}
        onSelectFlow={(flowId) => {
          if (flowId === activeFlowId) {
            onSecondaryAction?.();
            return;
          }
          onOpenScreen?.(flowId);
        }}
      />
    </Box>
  );
}

export type NotificationsScreenProps = {
  activeOrderId?: string;
  onOpenInbox?: () => void;
  onOpenOrderSupport?: (orderId: string) => void;
  onOpenAlertsSupport?: (flowId: DshPartnerOperationalFlowId) => void;
  onBack?: () => void;
  onRetry?: () => void;
};

export function NotificationsScreen({
  activeOrderId,
  onOpenInbox,
  onOpenOrderSupport,
  onOpenAlertsSupport,
  onBack,
  onRetry,
}: NotificationsScreenProps) {
  const identity = useIdentitySession();

  return (
    <Box gap={4}>
      <OperationHeader
        title="الإشعارات والتواصل"
        subtitle="مركز إشعارات الممثل العام يظهر أولًا، وتنبيهات الطلب تبقى مرتبطة بسياق الطلب الحالي."
        actions={
          <>
            {onOpenInbox ? <Button label="العودة لصندوق الطلبات" tone="secondary" fullWidth={false} onPress={onOpenInbox} /> : null}
            {onBack ? <Button label="رجوع" fullWidth={false} onPress={onBack} /> : null}
          </>
        }
      />

      <ActorNotificationsPanel
        authKind={identity.state.kind}
        title="إشعارات الشريك"
        emptyDescription="ستظهر هنا إشعارات الفرع، القبول، والمراسلات التشغيلية للشريك."
      />

      <DshPartnerOrderAlertsPanel
        {...(activeOrderId !== undefined ? { activeOrderId } : {})}
        onOpenOrder={(orderId) => onOpenOrderSupport?.(orderId)}
        onOpenFlow={(flowId) => onOpenAlertsSupport?.(flowId)}
        {...(onRetry !== undefined ? { onRetry } : {})}
      />
    </Box>
  );
}

export type OnboardingActionScreenProps = {
  activeFlowId?: PartnerOnboardingFlowId;
  onBack?: () => void;
  onOpenScreen?: (screenId: PartnerOnboardingFlowId) => void;
  onSecondaryAction?: () => void;
};

const onboardingFlowCopy: Record<PartnerOnboardingFlowId, { title: string; subtitle: string }> = {
  'doc-upload': {
    title: 'رفع المستندات',
    subtitle: 'أكمل متطلبات المستندات والامتثال للفرع من نفس المسار التشغيلي.',
  },
  'intake-start': {
    title: 'بدء الاستقبال',
    subtitle: 'ابدأ تسلسل الإدخال أو التهيئة الأولية دون توسيع النطاق إلى شاشة منفصلة جديدة.',
  },
  'store-nomination': {
    title: 'ترشيح متجر',
    subtitle: 'رشّح فرعًا جديدًا أو راجع جاهزية الفرع الحالي قبل المتابعة.',
  },
};

export function OnboardingActionScreen({ activeFlowId = 'doc-upload', onBack, onOpenScreen, onSecondaryAction }: OnboardingActionScreenProps) {
  const activeCopy = onboardingFlowCopy[activeFlowId];

  return (
    <Box gap={4}>
      <OperationHeader
        title={activeCopy.title}
        subtitle={activeCopy.subtitle}
        actions={
          <>
            {onBack ? <Button label="العودة" tone="secondary" fullWidth={false} onPress={onBack} /> : null}
            {onSecondaryAction ? <Button label="العودة لدليل العمليات" fullWidth={false} onPress={onSecondaryAction} /> : null}
          </>
        }
      />

      <DshPartnerOnboardingActionPanel
        activeFlowId={activeFlowId}
        onSelectFlow={(flowId) => {
          if (flowId === activeFlowId) {
            onSecondaryAction?.();
            return;
          }
          onOpenScreen?.(flowId);
        }}
      />
    </Box>
  );
}

export type OrderActionScreenProps = {
  activeFlowId?: PartnerOrderActionFlowId;
  onBack?: () => void;
  onOpenScreen?: (screenId: PartnerOrderActionFlowId) => void;
  onSecondaryAction?: () => void;
};

const orderActionFlowCopy: Record<PartnerOrderActionFlowId, { title: string; subtitle: string; secondaryLabel: string }> = {
  'order-accept': {
    title: 'قبول الطلب',
    subtitle: 'ابدأ التنفيذ من نقطة القبول الرسمية ثم انتقل إلى التحضير داخل نفس سياق الطلب.',
    secondaryLabel: 'الانتقال إلى استلام الطلب',
  },
  'order-get': {
    title: 'استلام الطلب',
    subtitle: 'أكّد أن الفرع استلم الطلب بالكامل وجهّزه للانتقال إلى handoff أو الإغلاق التالي.',
    secondaryLabel: 'الانتقال إلى التسليم للمندوب',
  },
  'order-prepare': {
    title: 'تحضير الطلب',
    subtitle: 'تابع تجهيز الطلب قبل إعلانه جاهزًا أو تسليمه للمندوب.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
  'order-ready': {
    title: 'تأكيد الجاهزية',
    subtitle: 'ثبّت جاهزية الطلب قبل handoff أو التسليم النهائي.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
  'order-handoff': {
    title: 'تسليم للمندوب',
    subtitle: 'أكمل handoff من نفس المسار التشغيلي المختصر.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
  'order-out-for-delivery': {
    title: 'قيد التوصيل',
    subtitle: 'تابع الطلب بعد خروجه من الفرع ضمن نفس دورة التنفيذ.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
  'order-store-delivered': {
    title: 'تسليم داخل المتجر',
    subtitle: 'أغلق حالة التسليم عندما يكون الفرع هو نقطة الاستلام النهائية.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
};

export function OrderActionScreen({ activeFlowId = 'order-accept', onBack, onOpenScreen, onSecondaryAction }: OrderActionScreenProps) {
  const activeCopy = orderActionFlowCopy[activeFlowId];

  // SSoT Handoff lookup dynamically matching the flow state
  const matchedHandoff = React.useMemo(() => {
    if (activeFlowId === 'order-accept') {
      return DSH_ORDER_LIFECYCLE_HANDOFFS.find((h) => h.handoffId === 'operations_approved');
    }
    if (activeFlowId === 'order-ready') {
      return DSH_ORDER_LIFECYCLE_HANDOFFS.find((h) => h.handoffId === 'pickup_ready_client_collect' || h.handoffId === 'ready_for_pickup_captain_assigned');
    }
    if (activeFlowId === 'order-handoff') {
      return DSH_ORDER_LIFECYCLE_HANDOFFS.find((h) => h.handoffId === 'picked_up' || h.handoffId === 'partner_delivery_dispatched');
    }
    return undefined;
  }, [activeFlowId]);

  const observation = matchedHandoff ? getSurfaceObservation(matchedHandoff, 'app-partner') : undefined;

  return (
    <Box gap={4}>
      <OperationHeader
        title={activeCopy.title}
        subtitle={activeCopy.subtitle}
        actions={
          <>
            {onBack ? <Button label="العودة" tone="secondary" fullWidth={false} onPress={onBack} /> : null}
            {onSecondaryAction ? <Button label={activeCopy.secondaryLabel} fullWidth={false} onPress={onSecondaryAction} /> : null}
          </>
        }
      />

      {observation ? (
        <Surface tone="info" padding={3} gap={1}>
          <Text role="bodyStrong" tone="action" style={{ textAlign: 'right' }}>
            {`ملاحظة النقل (SSoT): ${observation.label}`}
          </Text>
          <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
            {`سلوك الواجهة المقترح: ${observation.uiStateHint} ${observation.actionRequired ? '— الإجراء مطلوب!' : ''}`}
          </Text>
        </Surface>
      ) : null}

      <DshPartnerOrderActionPanel
        activeFlowId={activeFlowId}
        onSelectFlow={(flowId) => {
          if (flowId === activeFlowId) {
            onSecondaryAction?.();
            return;
          }
          onOpenScreen?.(flowId);
        }}
      />
    </Box>
  );
}

export type OrderIssueScreenProps = {
  activeFlowId?: PartnerOrderIssueFlowId;
  selectedCategoryId?: DshPartnerSupportIssueCategoryId;
  onBack?: () => void;
  onOpenScreen?: (screenId: PartnerOrderIssueFlowId) => void;
  onSecondaryAction?: () => void;
};

const orderIssueFlowCopy: Record<PartnerOrderIssueFlowId, { title: string; subtitle: string; secondaryLabel: string }> = {
  'order-issue-queue': {
    title: 'طابور مشكلات الطلبات',
    subtitle: 'اعرض الطلبات التي تحتاج قرارًا تشغيليًا سريعًا دون مغادرة سياق الدعم.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
  'order-reject': {
    title: 'رفض الطلب',
    subtitle: 'استخدم هذا المسار فقط عند وجود سبب تشغيلي صريح ومعلن ومراجعته داخل نفس السياق.',
    secondaryLabel: 'إغلاق مسار الرفض',
  },
};

export function OrderIssueScreen({
  activeFlowId = 'order-issue-queue',
  selectedCategoryId,
  onBack,
  onOpenScreen,
  onSecondaryAction,
}: OrderIssueScreenProps) {
  const activeCopy = orderIssueFlowCopy[activeFlowId];
  const resolvedCategoryId = selectedCategoryId ?? resolvePartnerOrderIssueDefaultCategory(activeFlowId);

  return (
    <Box gap={4}>
      <OperationHeader
        title={activeCopy.title}
        subtitle={activeCopy.subtitle}
        actions={
          <>
            {onBack ? <Button label="العودة" tone="secondary" fullWidth={false} onPress={onBack} /> : null}
            {onSecondaryAction ? <Button label={activeCopy.secondaryLabel} fullWidth={false} onPress={onSecondaryAction} /> : null}
          </>
        }
      />

      <DshPartnerOrderIssuePanel
        activeFlowId={activeFlowId}
        selectedCategoryId={resolvedCategoryId}
        onSelectFlow={(flowId) => {
          if (flowId === activeFlowId) {
            onSecondaryAction?.();
            return;
          }
          onOpenScreen?.(flowId);
        }}
      />
    </Box>
  );
}

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
