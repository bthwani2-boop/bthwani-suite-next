import React from 'react';
import { Box, Divider, StateView } from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import { OrderInboxSection } from './OrderInboxSection';
import { OrderDetailSection } from './OrderDetailSection';
import { CaptainOrderSupportConversationScreen } from './CaptainOrderSupportConversationScreen';
import { OrderBellSection } from './OrderBellSection';
import { OrderActionSection } from './OrderActionSection';
import type {
  DshCaptainOrderAction,
  DshCaptainOrderBellItem,
  DshCaptainOrderDetailSummary,
  DshCaptainOrderId,
  DshCaptainOrderMessage,
  DshCaptainOrderMode,
  DshCaptainOrdersScreenState,
} from '../../shared/orders';
export type { DshCaptainOrderDetailSummary } from '../../shared/orders';

export type DshCaptainOrdersScreenProps = {
  section?: DshCaptainOrderMode;
  state?: DshCaptainOrdersScreenState;
  items?: DshCaptainOrderBellItem[];
  summary?: DshCaptainOrderDetailSummary | undefined;
  messages?: DshCaptainOrderMessage[];
  onOpenOrder?: ((orderId: DshCaptainOrderId) => void) | undefined;
  onOpenNextOrder?: ((orderId: DshCaptainOrderId) => void) | undefined;
  onBackToInbox?: (() => void) | undefined;
  onRetry?: (() => void) | undefined;
  onActionPress?: ((action: DshCaptainOrderAction) => void) | undefined;
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
    return (
      <CaptainOrderSupportConversationScreen
        orderId={summary.orderId}
        composerEnabled
        onBack={onBackToInbox ?? (() => undefined)}
      />
    );
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
  onBack?: (() => void) | undefined;
  onSecondaryAction?: (() => void) | undefined;
  onOpenOrder?: ((id: DshCaptainOrderId) => void) | undefined;
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
  onBack?: (() => void) | undefined;
  onSecondaryAction?: (() => void) | undefined;
  onOpenOrder?: ((id: DshCaptainOrderId) => void) | undefined;
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
  summary?: DshCaptainOrderDetailSummary | undefined;
  onBack?: (() => void) | undefined;
  onSecondaryAction?: (() => void) | undefined;
  onActionPress?: ((action: DshCaptainOrderAction) => void) | undefined;
}) {
  if (!summary) {
    return <StateView title="تفاصيل المهمة غير متاحة" description="حدّث صندوق المهام ثم أعد الفتح." tone="warning" onActionPress={onBack} actionLabel={onBack ? 'العودة' : undefined} />;
  }
  const nextAction = summary.deliveryActionId;
  return (
    <DshOperationScreen
      state="ready"
      title="تفاصيل المهمة"
      subtitle="تفاصيل الاستلام والتسليم من القراءة التشغيلية الحية."
      content={
        <Box gap={4}>
          <OrderDetailSection summary={summary} />
          <Divider />
          {nextAction === 'none' ? (
            <StateView title="لا يوجد إجراء متاح" description={summary.nextActionLabel} tone="info" />
          ) : (
            <OrderActionSection action={nextAction} summary={summary} onActionPress={onActionPress} />
          )}
        </Box>
      }
      primaryActionLabel={onBack ? 'العودة' : undefined}
      secondaryActionLabel={onSecondaryAction ? 'فتح دردشة الدعم' : undefined}
      onPrimaryAction={onBack}
      onSecondaryAction={onSecondaryAction}
    />
  );
}

export function CaptainOrdersInboxScreen(props: Pick<DshCaptainOrdersScreenProps, 'state' | 'items' | 'onOpenOrder' | 'onOpenNextOrder' | 'onRetry'> = {}) {
  return <DshCaptainOrdersScreen {...props} section="inbox" />;
}

export function CaptainOrderDetailScreen({
  summary,
  primaryAction,
  onOpenNextOrder,
  onBackToInbox,
  onRetry,
}: {
  summary?: DshCaptainOrderDetailSummary | undefined;
  primaryAction?: { readonly label: string; readonly onPress: () => void; readonly disabled?: boolean } | undefined;
  onOpenNextOrder?: () => void;
  onBackToInbox?: (() => void) | undefined;
  onRetry?: (() => void) | undefined;
}) {
  return <OrderDetailSection summary={summary} primaryAction={primaryAction} onOpenNextOrder={onOpenNextOrder} onBackToInbox={onBackToInbox} onRetry={onRetry} />;
}
