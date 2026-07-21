import React from 'react';
import { Box, Button, Divider, KeyValueList, MobileScrollView, StateView, Surface, Text } from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import { OrderInboxSection } from './OrderInboxSection';
import { OrderDetailSection } from './OrderDetailSection';
import { OrderChatSection } from './OrderChatSection';
import { OrderBellSection } from './OrderBellSection';
import { OrderActionSection } from './OrderActionSection';
import { OrderProofSection } from './OrderProofSection';
import { SimpleSupportScreen } from './SimpleSupportScreen';
import type {
  DshCaptainOrderAction,
  DshCaptainOrderBellItem,
  DshCaptainOrderDetailSummary,
  DshCaptainOrderId,
  DshCaptainOrderMessage,
  DshCaptainOrderMode,
  DshCaptainOrderProofStatus,
  DshCaptainOrdersScreenState,
} from '../../shared/orders';
import type { DshDispatchAssignment } from '../../shared/dispatch';

const SurfaceAny = Surface as any;

export type { DshCaptainOrderDetailSummary } from '../../shared/orders';

export type DshCaptainOrdersScreenProps = {
  section?: DshCaptainOrderMode;
  state?: DshCaptainOrdersScreenState;
  items?: DshCaptainOrderBellItem[];
  summary?: DshCaptainOrderDetailSummary;
  messages?: DshCaptainOrderMessage[];
  proofStatus?: DshCaptainOrderProofStatus;
  onOpenOrder?: (orderId: DshCaptainOrderId) => void;
  onOpenNextOrder?: (orderId: DshCaptainOrderId) => void;
  onBackToInbox?: () => void;
  onRetry?: () => void;
  onActionPress?: (action: DshCaptainOrderAction) => void;
};

function renderOrdersState(state: DshCaptainOrdersScreenState, onRetry?: () => void) {
  const presentations: Partial<Record<DshCaptainOrdersScreenState, {
    tone: 'neutral' | 'info' | 'success' | 'danger';
    loading?: boolean;
    title: string;
    description: string;
  }>> = {
    'availability-toggle': { tone: 'info', loading: true, title: 'جارٍ تحديث حالة التوفر…', description: 'يُرجى الانتظار بينما تسجل DSH الحالة الجديدة.' },
    'loading-assignment': { tone: 'info', loading: true, title: 'جارٍ تحميل المهمة…', description: 'نقرأ تفاصيل الاستلام والتسليم من DSH.' },
    'offer-accepting': { tone: 'info', loading: true, title: 'جارٍ قبول العرض…', description: 'لن يظهر نجاح قبل تثبيت قرار DSH.' },
    'offer-accepted': { tone: 'success', title: 'تم قبول العرض', description: 'أصبحت المهمة قابلة للتنفيذ بعد القراءة المحدثة.' },
    loading: { tone: 'info', loading: true, title: 'جارٍ تحميل صندوق الكابتن', description: 'نقرأ العروض والمهام الخاصة بالكابتن المصادق عليه.' },
    empty: { tone: 'neutral', title: 'لا توجد مهام الآن', description: 'ستظهر العروض المؤهلة هنا عند وصولها.' },
    delivered: { tone: 'success', title: 'اكتملت المهام', description: 'لا توجد مهمة تنفيذية مفتوحة.' },
    error: { tone: 'danger', title: 'صندوق المهام غير متاح', description: 'أعد المحاولة لاسترجاع الحقيقة من DSH.' },
  };
  const presentation = presentations[state];
  if (!presentation) return null;
  return (
    <StateView
      {...presentation}
      actionLabel={onRetry ? 'إعادة المحاولة' : undefined}
      onActionPress={onRetry}
    />
  );
}

export function DshCaptainOrdersScreen({
  section = 'bell',
  state = 'ready',
  items = [],
  summary,
  proofStatus,
  onOpenOrder,
  onBackToInbox,
  onRetry,
  onActionPress,
}: DshCaptainOrdersScreenProps) {
  if (state !== 'ready') return renderOrdersState(state, onRetry);
  if (section === 'bell') {
    return <DshCaptainOrderOffersListScreen items={items} onBack={onBackToInbox} onSecondaryAction={onBackToInbox} onOpenOrder={onOpenOrder} />;
  }
  if (section === 'inbox') {
    return <DshCaptainOrdersListScreen items={items} onBack={onBackToInbox} onSecondaryAction={onBackToInbox} onOpenOrder={onOpenOrder} />;
  }
  if (section === 'detail' && summary) {
    return <DshCaptainOrderGetScreen summary={summary} onBack={onBackToInbox} onSecondaryAction={onBackToInbox} onActionPress={onActionPress} />;
  }
  if (section === 'chat' && summary) {
    return <OrderChatSection orderId={summary.orderId} pickupLabel={summary.pickupLabel} dropoffLabel={summary.dropoffLabel} />;
  }
  if (section === 'proof' && summary) {
    return <OrderProofSection summary={summary} status={proofStatus} onBackToInbox={onBackToInbox} onActionPress={onActionPress} />;
  }
  return (
    <DshOperationScreen
      state="ready"
      title="صندوق الكابتن"
      subtitle="العروض والمهام من موزع DSH المركزي."
      content={<OrderInboxSection items={items} onOpenOrder={onOpenOrder} />}
      primaryActionLabel={onBackToInbox ? 'العودة' : undefined}
      onPrimaryAction={onBackToInbox}
    />
  );
}

export function DshCaptainOrderOffersListScreen({
  items = [],
  onBack,
  onSecondaryAction,
  onOpenOrder,
}: {
  items?: DshCaptainOrderBellItem[];
  onBack?: () => void;
  onSecondaryAction?: () => void;
  onOpenOrder?: (id: DshCaptainOrderId) => void;
}) {
  const offers = items.filter((item) => item.kind === 'incoming-offer');
  return (
    <DshOperationScreen
      state="ready"
      title="عروض الكابتن"
      subtitle="المسافة والمنطقة والأولوية والمهلة تأتي من DSH."
      content={offers.length > 0
        ? <OrderInboxSection items={offers} onOpenOrder={onOpenOrder} />
        : <StateView title="لا توجد عروض معلقة" description="لا يوجد عرض ينتظر قرارك الآن." tone="neutral" />}
      primaryActionLabel={onBack ? 'العودة' : undefined}
      secondaryActionLabel={onSecondaryAction ? 'فتح المهام المقبولة' : undefined}
      onPrimaryAction={onBack}
      onSecondaryAction={onSecondaryAction}
    />
  );
}

export function DshCaptainOrdersListScreen({
  items = [],
  onBack,
  onSecondaryAction,
  onOpenOrder,
}: {
  items?: DshCaptainOrderBellItem[];
  onBack?: () => void;
  onSecondaryAction?: () => void;
  onOpenOrder?: (id: DshCaptainOrderId) => void;
}) {
  const activeOrders = items.filter((item) => item.kind === 'active');
  return (
    <DshOperationScreen
      state="ready"
      title="مهام الكابتن"
      subtitle="المهام المقبولة فقط تبقى في صف التنفيذ."
      content={activeOrders.length > 0
        ? <OrderInboxSection items={activeOrders} onOpenOrder={onOpenOrder} />
        : <StateView title="لا توجد مهمة مقبولة" description="اقبل عرضًا صالحًا أولًا لبدء التنفيذ." tone="neutral" />}
      primaryActionLabel={onBack ? 'العودة' : undefined}
      secondaryActionLabel={onSecondaryAction ? 'عرض العروض الواردة' : undefined}
      onPrimaryAction={onBack}
      onSecondaryAction={onSecondaryAction}
    />
  );
}

export function DshCaptainOrderGetScreen({
  summary,
  onBack,
  onSecondaryAction,
  onActionPress,
}: {
  summary?: DshCaptainOrderDetailSummary;
  onBack?: () => void;
  onSecondaryAction?: () => void;
  onActionPress?: (action: DshCaptainOrderAction) => void;
}) {
  if (!summary) {
    return <StateView title="تفاصيل المهمة غير متاحة" description="حدّث صندوق المهام ثم أعد الفتح." tone="warning" onActionPress={onBack} actionLabel={onBack ? 'العودة' : undefined} />;
  }
  const nextAction = summary.nextActionLabel.includes('تسليم') ? 'deliver' : 'pickup';
  return (
    <DshOperationScreen
      state="ready"
      title="تفاصيل المهمة"
      subtitle="تفاصيل الاستلام والتسليم من القراءة التشغيلية الحية."
      content={
        <Box gap={4}>
          <OrderDetailSection summary={summary} />
          <Divider />
          <OrderActionSection action={nextAction} summary={summary} onActionPress={onActionPress} />
        </Box>
      }
      primaryActionLabel={onBack ? 'العودة' : undefined}
      secondaryActionLabel={onSecondaryAction ? 'فتح دردشة الدعم' : undefined}
      onPrimaryAction={onBack}
      onSecondaryAction={onSecondaryAction}
    />
  );
}

export function DshCaptainOrderAcceptScreen({
  assignment,
  onBack,
  onAccept,
  onDecline,
}: {
  assignment?: DshDispatchAssignment;
  onBack?: () => void;
  onAccept?: (assignmentId: string) => void;
  onDecline?: (assignmentId: string) => void;
}) {
  if (!assignment || assignment.status !== 'offered') {
    return (
      <StateView
        title="لا يوجد عرض صالح"
        description="افتح عرضًا حيًا من صندوق الكابتن. لا تعرض هذه الشاشة بيانات افتراضية."
        tone="warning"
        actionLabel={onBack ? 'العودة' : undefined}
        onActionPress={onBack}
      />
    );
  }
  const distance = assignment.distanceMeters == null
    ? 'غير محسوبة'
    : assignment.distanceMeters < 1000
      ? `${assignment.distanceMeters} متر`
      : `${(assignment.distanceMeters / 1000).toFixed(1)} كم`;
  return (
    <DshOperationScreen
      state="ready"
      title="عرض توصيل جديد"
      subtitle={`عرض للطلب #${assignment.orderId || assignment.specialRequestId}.`}
      content={
        <SurfaceAny tone="raised" padding={4} gap={3} radiusToken="xl">
          <KeyValueList items={[
            { label: 'منطقة الخدمة', value: assignment.serviceAreaCode || 'غير محددة' },
            { label: 'المسافة', value: distance },
            { label: 'الأولوية', value: String(assignment.priority ?? 0) },
            { label: 'سبب العرض', value: assignment.offerReason || 'إسناد تشغيلي' },
            { label: 'مهلة الرد', value: new Date(assignment.responseDeadlineAt).toLocaleString('ar-YE'), tone: 'warning' },
          ]} />
        </SurfaceAny>
      }
      primaryActionLabel="قبول العرض"
      secondaryActionLabel="رفض العرض"
      tertiaryActionLabel={onBack ? 'العودة' : undefined}
      onPrimaryAction={() => onAccept?.(assignment.id)}
      onSecondaryAction={() => onDecline?.(assignment.id)}
      onTertiaryAction={onBack}
    />
  );
}

export function DshCaptainOrderPickupScreen({ onBack, onSecondaryAction }: { onBack?: () => void; onSecondaryAction?: () => void }) {
  return <SimpleSupportScreen title="استلام الطلب" subtitle="أكد الاستلام بعد مطابقة الطلب الحي." heroTitle="في انتظار الاستلام" heroDescription="لا يبدأ هذا المسار قبل قبول الإسناد ووصول الكابتن للمتجر." primaryLabel="تأكيد الاستلام" secondaryLabel="فتح خريطة التوجيه" onBack={onBack} onSecondaryAction={onSecondaryAction} />;
}

export function DshCaptainOrderDeliverScreen({ onBack, onSecondaryAction }: { onBack?: () => void; onSecondaryAction?: () => void }) {
  return <SimpleSupportScreen title="تسليم الطلب" subtitle="أكد التسليم عبر المسار المحكوم وإثباته." heroTitle="في انتظار التسليم" heroDescription="تعرض تفاصيل المهمة الحية فقط ولا تفترض قيمة COD محلية." primaryLabel="فتح إثبات التسليم" secondaryLabel="فتح خريطة التوجيه" onBack={onBack} onSecondaryAction={onSecondaryAction} />;
}

export function DshCaptainOrderDetailsScreen({ summary, onBack, onSecondaryAction }: { summary?: DshCaptainOrderDetailSummary; onBack?: () => void; onSecondaryAction?: () => void }) {
  return <DshCaptainOrderGetScreen summary={summary} onBack={onBack} onSecondaryAction={onSecondaryAction} />;
}

export function DshCaptainOrdersOffersListScreen({ items = [], onBack, onSecondaryAction, onOpenOrder }: { items?: DshCaptainOrderBellItem[]; onBack?: () => void; onSecondaryAction?: () => void; onOpenOrder?: (id: string) => void }) {
  return <DshCaptainOrderOffersListScreen items={items} onBack={onBack} onSecondaryAction={onSecondaryAction} onOpenOrder={onOpenOrder} />;
}

export function DshCaptainProofUploadScreen({
  orderId,
  status,
  onBack,
  onSecondaryAction,
  onActionPress,
}: {
  orderId?: string;
  status?: DshCaptainOrderProofStatus;
  onBack?: () => void;
  onSecondaryAction?: () => void;
  onActionPress?: (action: DshCaptainOrderAction) => void;
}) {
  if (!orderId) return <StateView title="لا توجد مهمة لإثباتها" description="افتح مهمة مقبولة أولًا." tone="warning" onActionPress={onBack} actionLabel={onBack ? 'العودة' : undefined} />;
  return (
    <DshOperationScreen
      state="ready"
      title="إثبات التسليم (PoD)"
      subtitle={`أرفق إثباتًا واضحًا للطلب #${orderId}.`}
      content={<OrderProofSection status={status} onActionPress={onActionPress} />}
      primaryActionLabel={onBack ? 'العودة' : undefined}
      secondaryActionLabel={onSecondaryAction ? 'تفاصيل المهمة' : undefined}
      onPrimaryAction={onBack}
      onSecondaryAction={onSecondaryAction}
    />
  );
}

export function CaptainPickupConfirmSheet({
  visible,
  orderTitle,
  state = 'ready',
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  orderTitle: string;
  state?: 'ready' | 'loading' | 'success' | 'error';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;
  if (state === 'loading') return <StateView tone="info" loading title="جاري تأكيد الاستلام…" description="" />;
  if (state === 'success') return <StateView tone="success" title="تم الاستلام" description="تم تحديث المهمة من DSH." actionLabel="موافق" onActionPress={onConfirm} />;
  if (state === 'error') return <StateView tone="danger" title="فشل تأكيد الاستلام" description="حدّث المهمة ثم أعد المحاولة." actionLabel="إغلاق" onActionPress={onCancel} />;
  return (
    <SurfaceAny tone="raised" padding={4} gap={3} radiusToken="xl">
      <Text role="bodyStrong">تأكيد الاستلام</Text>
      <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>{orderTitle}</Text>
      <Box gap={2}><Button label="تأكيد الاستلام" onPress={onConfirm} /><Button label="إلغاء" tone="ghost" onPress={onCancel} /></Box>
    </SurfaceAny>
  );
}

export function CaptainDeliveryConfirmSheet({ visible, orderTitle, onConfirm, onCancel }: { visible: boolean; orderTitle: string; onConfirm: () => void; onCancel: () => void }) {
  if (!visible) return null;
  return (
    <SurfaceAny tone="raised" padding={4} gap={3} radiusToken="xl">
      <Text role="bodyStrong">تأكيد التسليم</Text>
      <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>{orderTitle}</Text>
      <Box gap={2}><Button label="تأكيد التسليم" onPress={onConfirm} /><Button label="إلغاء" tone="ghost" onPress={onCancel} /></Box>
    </SurfaceAny>
  );
}

export function DshCaptainOrderChatScreen({ orderId, pickupLabel, dropoffLabel, state = 'active' }: { orderId: string; pickupLabel: string; dropoffLabel: string; state?: 'active' | 'readOnly' }) {
  return <OrderChatSection orderId={orderId} pickupLabel={pickupLabel} dropoffLabel={dropoffLabel} state={state} />;
}

export function DshCaptainBellScreen({
  state,
  items,
  onOpenInbox,
  onOpenNextOrder,
  onRetry,
  onBack,
}: {
  state?: 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled';
  summary?: { inboxLabel: string; approvalLabel: string; urgentLabel: string; nextActionLabel: string };
  items?: DshCaptainOrderBellItem[];
  onOpenInbox?: () => void;
  onOpenNextOrder?: () => void;
  onRetry?: () => void;
  onBack?: () => void;
}) {
  if (state && state !== 'ready') {
    const stateProps = {
      loading: { tone: 'info' as const, loading: true, title: 'جارٍ تجهيز جرس الكابتن', description: 'ستظهر العروض فور وصولها.', actionLabel: 'إعادة المحاولة' },
      empty: { tone: 'neutral' as const, title: 'لا توجد عروض جديدة', description: 'لا يوجد عرض ينتظر قرارك.', actionLabel: 'فتح الصندوق' },
      offline: { tone: 'warning' as const, title: 'جرس الكابتن غير متصل', description: 'أعد الاتصال لاسترجاع العروض.', actionLabel: 'إعادة المحاولة' },
      disabled: { tone: 'warning' as const, title: 'جرس الكابتن متوقف', description: 'يمكن فتح الصندوق للقراءة.', actionLabel: 'فتح الصندوق' },
      error: { tone: 'danger' as const, title: 'تعذر تحميل الجرس', description: 'أعد المحاولة دون افتراض نجاح.', actionLabel: 'إعادة المحاولة' },
      ready: null,
    }[state];
    if (!stateProps) return null;
    return <MobileScrollView padding={4} gap={4}><StateView {...stateProps} onActionPress={onRetry ?? onOpenInbox ?? onBack} /></MobileScrollView>;
  }
  return <OrderBellSection items={items} onOpenInbox={onOpenInbox} onOpenNextOrder={onOpenNextOrder} onRetry={onRetry} onBack={onBack} />;
}

export function CaptainOrdersInboxScreen(props: Pick<DshCaptainOrdersScreenProps, 'state' | 'items' | 'onOpenOrder' | 'onOpenNextOrder' | 'onRetry'> = {}) {
  return <DshCaptainOrdersScreen {...props} section="inbox" />;
}

export function CaptainOrderDetailScreen({
  summary,
  onConfirmPickup,
  onConfirmDelivery,
  onOpenNextOrder,
  onBackToInbox,
  onRetry,
}: {
  summary?: DshCaptainOrderDetailSummary;
  onConfirmPickup?: () => void;
  onConfirmDelivery?: () => void;
  onOpenNextOrder?: () => void;
  onBackToInbox?: () => void;
  onRetry?: () => void;
}) {
  return <OrderDetailSection summary={summary} onConfirmPickup={onConfirmPickup} onConfirmDelivery={onConfirmDelivery} onOpenNextOrder={onOpenNextOrder} onBackToInbox={onBackToInbox} onRetry={onRetry} />;
}
