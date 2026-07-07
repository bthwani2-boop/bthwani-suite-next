import React from 'react';
import { View } from 'react-native';
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Icon,
  MobileScrollView,
  SearchField,
  Sheet,
  StateView,
  Tabs,
  Text,
  colorPalette,
  colorRoles,
  resolveRowDirection,
  useDirection,
  spacing,
} from '@bthwani/ui-kit';
import type {
  DshPartnerOrderConversationMode,
  PartnerOrderItem,
  PartnerOrderStatus,
  PartnerOrderPriority,
} from '../../shared/orders/orders.contract';
import { AcceptanceTimerSheet } from './AcceptanceTimerSheet';
// SSoT: delivery mode labels from delivery contract.
import {
  getHandoffsForSurface,
  getActionableHandoffsForSurface,
  getSurfaceObservation,
} from '../../shared/orders';
import { getDshDeliveryModeDefinition } from '../../shared/delivery/delivery.contract';
import { getSurfaceModeCapability } from '../../shared/identity-access/surface-visibility.policy';


type OrderHubAction = 'accept' | 'details' | 'prepare' | 'ready' | 'handoff' | 'issue' | 'delivering';

export type OrderStageFilterId =
  | 'all'
  | 'acceptance'
  | 'preparation'
  | 'ready'
  | 'handoff'
  | 'delivering'
  | 'issues';

export type QuickFilterId =
  | 'urgent'
  | 'sla_risk'
  | 'unread'
  | 'pickup'
  | 'partner_delivery'
  | 'bthwani_delivery'
  | 'completed'
  | 'cancelled';

export type SortMode =
  | 'next_action'
  | 'newest'
  | 'priority'
  | 'sla';

export type PartnerOrdersHomeScreenState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';



export type PartnerOrdersHomeScreenProps = {
  state?: PartnerOrdersHomeScreenState;
  items?: readonly PartnerOrderItem[] | undefined;
  branchLabel?: string;
  quickAlert?: string;
  searchMode?: boolean | undefined;
  orderMode?: DshPartnerOrderConversationMode;
  showOrderConversation?: boolean;
  showOrderAlerts?: boolean;
  onCloseSearch?: (() => void) | undefined;
  onOpenOrderAction?: (actionId: OrderHubAction, orderId: string) => void;
  onOpenEntryPress?: () => void;
  onOpenMaintenancePress?: () => void;
  onOpenInventoryManagementPress?: () => void;
  onRetry?: (() => void) | undefined;
};

const stageFilters: ReadonlyArray<{ id: OrderStageFilterId; label: string; tone: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info' }> = [
  { id: 'all', label: 'الكل', tone: 'brand' },
  { id: 'acceptance', label: 'قبول', tone: 'warning' },
  { id: 'preparation', label: 'تجهيز', tone: 'info' },
  { id: 'ready', label: 'جاهز', tone: 'success' },
  { id: 'handoff', label: 'تسليم', tone: 'brand' },
  { id: 'delivering', label: 'في الطريق', tone: 'info' },
  { id: 'issues', label: 'مشاكل', tone: 'danger' },
];

const quickFilters: ReadonlyArray<{ id: QuickFilterId; label: string }> = [
  { id: 'urgent', label: 'عاجلة' },
  { id: 'sla_risk', label: 'SLA قريب' },
  { id: 'unread', label: 'غير مقروء' },
  { id: 'pickup', label: 'استلم بنفسك' },
  { id: 'partner_delivery', label: getDshDeliveryModeDefinition('partner_delivery').label },
  { id: 'bthwani_delivery', label: getDshDeliveryModeDefinition('bthwani_delivery').label },
  { id: 'completed', label: 'مكتملة' },
  { id: 'cancelled', label: 'ملغاة/مشكلة' },
];

const sortModes: ReadonlyArray<{ id: SortMode; label: string }> = [
  { id: 'next_action', label: 'الإجراء الأول' },
  { id: 'newest', label: 'الأحدث' },
  { id: 'priority', label: 'الأولوية العالية' },
  { id: 'sla', label: 'الأقرب لـ SLA' },
];

const EMPTY_PARTNER_ORDERS: readonly PartnerOrderItem[] = [];

function enrichOrderItemWithSSoT(item: PartnerOrderItem): PartnerOrderItem {
  const capability = getSurfaceModeCapability(item.orderMode);

  // Rule 4: partner_delivery doesn't involve captain
  // Rule 5: bthwani_delivery shows to partner, then waits for captain after ready-for-pickup
  // Rule 6: pickup is self-collect only
  let nextOwnerLabel = item.nextOwnerLabel;
  let nextActionLabel = item.nextActionLabel;

  if (item.status === 'ready') {
    if (capability.partner.manageCourier) {
      nextOwnerLabel = 'موصل المتجر';
      nextActionLabel = 'تسليم لموصل المتجر';
    } else if (item.orderMode === 'pickup') {
      nextOwnerLabel = 'العميل';
      nextActionLabel = 'انتظار استلام العميل';
    } else {
      nextOwnerLabel = 'كابتن بثواني';
      nextActionLabel = 'انتظار استلام كابتن بثواني';
    }
  } else if (item.status === 'handoff' || item.status === 'captain_assigned' || item.status === 'captain_arriving') {
    if (capability.partner.manageCourier) {
      nextOwnerLabel = 'موصل المتجر';
      nextActionLabel = 'تأكيد خروج الموصل';
    } else if (item.orderMode === 'pickup') {
      nextOwnerLabel = 'العميل';
      nextActionLabel = 'تأكيد تسليم العميل';
    } else {
      nextOwnerLabel = 'كابتن بثواني';
      nextActionLabel = 'بانتظار تأكيد الكابتن';
    }
  }

  return {
    ...item,
    nextOwnerLabel,
    nextActionLabel,
  };
}

function resolveStatusLabel(status: PartnerOrderStatus, orderMode?: DshPartnerOrderConversationMode) {
  if (status === 'new') return 'جديدة';
  if (status === 'needs_accept') return 'تحتاج قبول';
  if (status === 'preparation_started') return 'بدأ التحضير';
  if (status === 'preparing') return 'قيد التحضير';
  if (status === 'items_ready') return 'العناصر جاهزة';

  const capability = orderMode ? getSurfaceModeCapability(orderMode) : null;
  if (status === 'ready') {
    if (capability?.partner.manageCourier) return 'جاهز — تسليم لموصل المتجر';
    if (orderMode === 'pickup') return 'جاهز — بانتظار استلام العميل';
    return 'جاهز — بانتظار كابتن بثواني';
  }
  if (status === 'handoff') {
    if (capability?.partner.manageCourier) return 'سُلّم لموصل المتجر';
    if (orderMode === 'pickup') return 'تم الاستلام من العميل';
    return 'سُلّم لكابتن بثواني';
  }
  if (status === 'captain_assigned') return 'تم تعيين الكابتن';
  if (status === 'captain_arriving') return 'الكابتن في الطريق للفرع';
  if (status === 'delivering') {
    if (capability?.partner.manageCourier) return 'مع موصل المتجر للتوصيل';
    return 'في الطريق مع الكابتن';
  }
  if (status === 'completed') return 'مكتملة';
  return 'مشكلة';
}

function resolveStatusTone(status: PartnerOrderStatus): 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'needs_accept' || status === 'new') return 'warning';
  if (status === 'preparation_started' || status === 'preparing' || status === 'items_ready' || status === 'delivering') return 'info';
  if (status === 'ready' || status === 'completed') return 'success';
  if (status === 'handoff' || status === 'captain_assigned' || status === 'captain_arriving') return 'brand';
  return 'danger';
}

function resolvePriorityTone(priority: PartnerOrderPriority): 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info' {
  if (priority === 'high') return 'danger';
  if (priority === 'normal') return 'brand';
  return 'default';
}

function resolveOrderAction(status: PartnerOrderStatus): OrderHubAction {
  if (status === 'new' || status === 'needs_accept') return 'accept';
  if (status === 'preparation_started' || status === 'preparing' || status === 'items_ready') return 'prepare';
  if (status === 'ready') return 'ready';
  if (status === 'handoff' || status === 'captain_assigned' || status === 'captain_arriving') return 'handoff';
  if (status === 'delivering') return 'delivering';
  if (status === 'cancelled') return 'issue';
  return 'details';
}

function renderState(state: Exclude<PartnerOrdersHomeScreenState, 'ready'>, onRetry?: () => void) {
  if (state === 'loading') {
    return <StateView title="جارٍ تجهيز لوحة عمليات الطلب" description="نرتب أحدث الطلبات والمسارات المرتبطة بها الآن." />;
  }

  if (state === 'empty') {
    return <StateView title="لا توجد طلبات الآن" description="ستظهر الطلبات الجديدة هنا فور وصولها." actionLabel={onRetry ? 'تحديث' : undefined} onActionPress={onRetry} />;
  }

  if (state === 'offline') {
    return <StateView title="الاتصال غير متاح" description="تحقق من الشبكة ثم أعد فتح لوحة الطلبات." actionLabel={onRetry ? 'إعادة المحاولة' : undefined} onActionPress={onRetry} />;
  }

  if (state === 'disabled') {
    return <StateView tone="warning" title="لوحة عمليات الطلب متوقفة مؤقتًا" description="الوصول متوقف حتى يكتمل التحقق التشغيلي." actionLabel={onRetry ? 'تحقق الآن' : undefined} onActionPress={onRetry} />;
  }

  if (state === 'partial') {
    return <StateView tone="warning" title="توفر جزئي" description="بعض البيانات متاحة الآن مع متابعة المزامنة." actionLabel={onRetry ? 'إعادة المزامنة' : undefined} onActionPress={onRetry} />;
  }

  return <StateView title="تعذر فتح لوحة عمليات الطلب" description="حدث خلل مؤقت. أعد المحاولة من دون فقدان السياق." actionLabel={onRetry ? 'إعادة المحاولة' : undefined} onActionPress={onRetry} />;
}

function resolveOrderHistory(status: PartnerOrderStatus, orderMode: DshPartnerOrderConversationMode) {
  const capability = getSurfaceModeCapability(orderMode);
  const inPrep = status === 'preparation_started' || status === 'preparing' || status === 'items_ready' || status === 'ready' || status === 'handoff' || status === 'captain_assigned' || status === 'captain_arriving' || status === 'delivering' || status === 'completed';
  const isReady = status === 'ready' || status === 'handoff' || status === 'captain_assigned' || status === 'captain_arriving' || status === 'delivering' || status === 'completed';
  const isHandedOff = status === 'handoff' || status === 'captain_assigned' || status === 'captain_arriving' || status === 'delivering' || status === 'completed';

  let handoffLabel = 'سُلّم للكابتن';
  if (capability.partner.manageCourier) {
    handoffLabel = 'سُلّم لموصل المتجر';
  } else if (orderMode === 'pickup') {
    handoffLabel = 'استلام العميل الذاتي';
  }

  return [
    { id: 'placed', label: 'وصل الطلب', done: true },
    { id: 'accepted', label: 'تم القبول', done: status !== 'new' && status !== 'needs_accept' && status !== 'cancelled' },
    { id: 'preparing', label: 'بدأ التحضير', done: inPrep },
    { id: 'ready', label: 'جاهز', done: isReady },
    {
      id: 'handoff',
      label: handoffLabel,
      done: isHandedOff,
    },
  ];
}

// ─── Read-only metadata label using central appearance colors ──────────────────
function ReadOnlyMetaLabel({
  label,
  tone = 'info',
}: {
  label: string;
  tone?: 'brand' | 'warning' | 'danger' | 'info' | 'success' | 'default';
}) {
  return <Badge label={label} tone={tone === 'brand' ? 'action' : tone === 'default' ? 'neutral' : tone} />;
}

// ─── Inline Details Panel ──────────────────────────────────────────────────────
function InlineOrderDetailsPanel({ item }: { item: PartnerOrderItem }) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  return (
    <Box padding={2} gap={2} background="surfaceInset" radiusToken="md" style={{ marginVertical: 4 }}>
      <Text role="bodySm" style={{ textAlign }}>
        {`رمز الطلب الكامل: ${item.orderCode}`}
      </Text>
      <Text role="bodySm" style={{ textAlign }}>
        {`الفرع: ${item.branchLabel}`}
      </Text>
      <Text role="bodySm" style={{ textAlign }}>
        {`تاريخ الإنشاء: ${item.createdAtLabel} (${item.elapsedLabel})`}
      </Text>

      <View style={{ gap: 2, marginTop: spacing[1], alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
        <Text role="bodySm" weight="semibold" style={{ textAlign }}>تتبع حالة الطلب:</Text>
        {resolveOrderHistory(item.status, item.orderMode).map((step) => (
          <View key={step.id} style={{ flexDirection: rowDirection, alignItems: 'center', gap: 6 }}>
            <Icon
              name={step.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              tone={step.done ? 'success' : 'muted'}
            />
            <Text role="caption" tone={step.done ? 'default' : 'muted'} style={{ textAlign }}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    </Box>
  );
}

// ─── Inline Action Panel ───────────────────────────────────────────────────────
function InlineOrderActionPanel({
  item,
  onClose,
  onPrimaryAction,
  onIssueAction,
}: {
  item: PartnerOrderItem;
  onClose: () => void;
  onPrimaryAction: () => void;
  onIssueAction: () => void;
}) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  return (
    <Box padding={2} gap={2} background="surfaceInset" radiusToken="md" style={{ marginVertical: 4 }}>
      <Text role="caption" tone="action" style={{ textAlign }}>خيارات المعالجة الفورية</Text>

      <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: 6 }}>
        <Button
          label={item.nextActionLabel}
          size="sm"
          fullWidth={false}
          accessibilityLabel={`تأكيد إجراء: ${item.nextActionLabel}`}
          onPress={() => {
            onPrimaryAction();
            onClose();
          }}
        />
        {item.status !== 'completed' && item.status !== 'cancelled' ? (
          <Button
            label="إبلاغ عن مشكلة"
            size="sm"
            fullWidth={false}
            tone="danger"
            accessibilityLabel="إبلاغ عن مشكلة أو اعتراض تشغيلي في الطلب"
            onPress={() => {
              onIssueAction();
              onClose();
            }}
          />
        ) : null}
        <Button
          label="إلغاء"
          size="sm"
          fullWidth={false}
          tone="ghost"
          accessibilityLabel="إلغاء خيارات المعالجة"
          onPress={onClose}
        />
      </View>
    </Box>
  );
}

// ─── Command Center Order Row ──────────────────────────────────────────────────
function CommandCenterOrderRow({
  item,
  isExpanded,
  isActiveAction,
  onToggleDetails,
  onToggleAction,
  onCloseAction,
  onPrimaryAction,
  onIssueAction,
}: {
  item: PartnerOrderItem;
  isExpanded: boolean;
  isActiveAction: boolean;
  onToggleDetails: () => void;
  onToggleAction: () => void;
  onCloseAction: () => void;
  onPrimaryAction: () => void;
  onIssueAction: () => void;
}) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';
  const statusLabel = resolveStatusLabel(item.status, item.orderMode);
  const statusTone = resolveStatusTone(item.status);
  const isNewUnread = item.unread;

  return (
    <Box gap={1} style={{ width: '100%' }}>
      <Box paddingY={2}>
        <View style={{ flexDirection: rowDirection, alignItems: 'flex-start', gap: spacing[3] }}>
          <Icon
            name={
              item.orderMode === 'pickup'
                ? 'walk-outline'
                : item.orderMode === 'partner_delivery'
                  ? 'car-outline'
                  : 'bicycle-outline'
            }
            size={18}
            tone="muted"
            style={{ marginTop: 2, flexShrink: 0 }}
          />

          <View style={{ flex: 1, minWidth: 0, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: '100%', flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 6 }}>
                <Text role="bodyStrong" style={{ textAlign, color: colorRoles.textPrimary }}>
                  {item.orderCode}
                </Text>
                {isNewUnread ? (
                  <Icon name="notifications" size={16} tone="warning" />
                ) : null}
              </View>
              <ReadOnlyMetaLabel
                label={item.slaRisk && item.slaLabel ? item.slaLabel : `حالة: ${statusLabel}`}
                tone={item.slaRisk ? 'danger' : (statusTone === 'default' ? 'default' : statusTone)}
              />
            </View>

            <Text role="caption" tone="muted" style={{ textAlign }}>
              {`${item.itemsCountLabel} · ${item.itemsSummaryLabel ?? ''}`}
            </Text>

            <Box
              background="warningSurface"
              radiusToken="md"
              border
              borderTone="warning"
              paddingX={3}
              paddingY={2}
              style={{
                width: '100%',
                borderStartWidth: 3,
                borderEndWidth: 0,
                borderTopWidth: 0,
                borderBottomWidth: 0,
                marginVertical: 2,
                alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start',
              }}
            >
              <Text role="caption" tone="warning" weight="bold" style={{ textAlign }}>
                الإجراء المطلوب: {item.nextActionLabel}
              </Text>
            </Box>

            <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: spacing[1], alignItems: 'center' }}>
              <ReadOnlyMetaLabel label={item.orderTypeLabel} tone="brand" />
              {item.nextOwnerLabel ? (
                <Text role="caption" tone="muted" style={{ textAlign }}>
                  {` · الجهة التالية: ${item.nextOwnerLabel}`}
                </Text>
              ) : null}
              <Text role="caption" tone="muted" style={{ textAlign }}>
                {` · ${item.amountLabel}`}
              </Text>
              {item.paymentLabel ? (
                <Text role="caption" tone="muted" style={{ textAlign }}>
                  {` (${item.paymentLabel})`}
                </Text>
              ) : null}
            </View>

            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing[2], marginTop: 6 }}>
              <Button label="معالجة" size="sm" fullWidth={false} onPress={onToggleAction} />
              <Button label={isExpanded ? "إغلاق التفاصيل" : "تفاصيل"} size="sm" fullWidth={false} tone="secondary" onPress={onToggleDetails} />
            </View>
          </View>
        </View>
      </Box>

      {isActiveAction ? (
        <InlineOrderActionPanel
          item={item}
          onClose={onCloseAction}
          onPrimaryAction={onPrimaryAction}
          onIssueAction={onIssueAction}
        />
      ) : null}

      {isExpanded ? (
        <InlineOrderDetailsPanel item={item} />
      ) : null}

      <Divider />
    </Box>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export function DshPartnerOrdersScreen(props: PartnerOrdersHomeScreenProps) {
  const {
    state = 'empty',
    items = EMPTY_PARTNER_ORDERS,
    searchMode = false,
    onCloseSearch,
    onOpenOrderAction,
    onRetry,
  } = props;
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  const enrichedItems = React.useMemo(() => {
    return items.map(enrichOrderItemWithSSoT);
  }, [items]);

  const [selectedStage, setSelectedStage] = React.useState<OrderStageFilterId>('all');
  const [selectedQuickFilters, setSelectedQuickFilters] = React.useState<readonly QuickFilterId[]>([]);
  const [sortMode, setSortMode] = React.useState<SortMode>('next_action');
  const [query, setQuery] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(searchMode);

  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(enrichedItems[0]?.id ?? null);
  const [expandedOrderId, setExpandedOrderId] = React.useState<string | null>(null);
  const [activeActionOrderId, setActiveActionOrderId] = React.useState<string | null>(null);

  // ML-016: acceptance timer sheet — shown when partner presses accept on a needs_accept order
  const [acceptSheetVisible, setAcceptSheetVisible] = React.useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = React.useState<string | null>(null);
  const [advancedPanelVisible, setAdvancedPanelVisible] = React.useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const summary = React.useMemo(() => ({
    active: enrichedItems.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').length,
    urgent: enrichedItems.filter((item) => item.urgent || item.priority === 'high').length,
    needsAction: enrichedItems.filter((item) => item.status === 'needs_accept' || item.status === 'preparation_started' || item.status === 'preparing' || item.status === 'items_ready' || item.status === 'ready' || item.status === 'handoff' || item.status === 'captain_assigned' || item.status === 'captain_arriving').length,
    issues: enrichedItems.filter((item) => item.issueRequired || item.status === 'cancelled').length,
  }), [enrichedItems]);

  // Per-stage counts for chip labels
  const stageCounts = React.useMemo(() => {
    const counts: Partial<Record<OrderStageFilterId, number>> = {};
    for (const item of enrichedItems) {
      if (item.status === 'new' || item.status === 'needs_accept') counts.acceptance = (counts.acceptance ?? 0) + 1;
      else if (item.status === 'preparation_started' || item.status === 'preparing' || item.status === 'items_ready') counts.preparation = (counts.preparation ?? 0) + 1;
      else if (item.status === 'ready') counts.ready = (counts.ready ?? 0) + 1;
      else if (item.status === 'handoff' || item.status === 'captain_assigned' || item.status === 'captain_arriving') counts.handoff = (counts.handoff ?? 0) + 1;
      else if (item.status === 'delivering') counts.delivering = (counts.delivering ?? 0) + 1;
      else if (item.status === 'cancelled') counts.issues = (counts.issues ?? 0) + 1;
      if (item.issueRequired) counts.issues = (counts.issues ?? 0) + 1;
    }
    return counts;
  }, [enrichedItems]);

  const filteredItems = React.useMemo(() => {
    const scoped = enrichedItems.filter((item) => {
      const stageMatch =
        selectedStage === 'all'
          ? true
          : selectedStage === 'acceptance'
            ? item.status === 'new' || item.status === 'needs_accept'
            : selectedStage === 'preparation'
              ? item.status === 'preparation_started' || item.status === 'preparing' || item.status === 'items_ready'
              : selectedStage === 'ready'
                ? item.status === 'ready'
                : selectedStage === 'handoff'
                  ? item.status === 'handoff' || item.status === 'captain_assigned' || item.status === 'captain_arriving'
                  : selectedStage === 'delivering'
                    ? item.status === 'delivering'
                    : selectedStage === 'issues'
                      ? item.status === 'cancelled' || Boolean(item.issueRequired)
                      : true;

      const quickMatch = selectedQuickFilters.length === 0
        ? true
        : selectedQuickFilters.every((qf) => {
            if (qf === 'urgent') return Boolean(item.urgent || item.priority === 'high');
            if (qf === 'sla_risk') return Boolean(item.slaRisk);
            if (qf === 'unread') return Boolean(item.unread);
            if (qf === 'pickup') return item.orderMode === 'pickup';
            if (qf === 'partner_delivery') return item.orderMode === 'partner_delivery';
            if (qf === 'bthwani_delivery') return item.orderMode === 'bthwani_delivery';
            if (qf === 'completed') return item.status === 'completed';
            if (qf === 'cancelled') return item.status === 'cancelled' || Boolean(item.issueRequired);
            return true;
          });

      const textMatch =
        normalizedQuery.length === 0
          ? true
          : [item.orderCode, item.branchLabel, resolveStatusLabel(item.status, item.orderMode), item.itemsSummaryLabel ?? '']
              .join(' ')
              .toLowerCase()
              .includes(normalizedQuery);

      return stageMatch && quickMatch && textMatch;
    });

    return [...scoped].sort((left, right) => {
      if (sortMode === 'next_action') {
        const leftNeeds = left.status === 'new' || left.status === 'needs_accept' || left.status === 'preparation_started' || left.status === 'preparing' || left.status === 'items_ready' || left.status === 'ready' || left.status === 'handoff' || left.status === 'captain_assigned' || left.status === 'captain_arriving';
        const rightNeeds = right.status === 'new' || right.status === 'needs_accept' || right.status === 'preparation_started' || right.status === 'preparing' || right.status === 'items_ready' || right.status === 'ready' || right.status === 'handoff' || right.status === 'captain_assigned' || right.status === 'captain_arriving';
        if (leftNeeds !== rightNeeds) return leftNeeds ? -1 : 1;

        const leftSla = left.slaRisk ? 1 : 0;
        const rightSla = right.slaRisk ? 1 : 0;
        if (leftSla !== rightSla) return rightSla - leftSla;

        return right.createdAtLabel.localeCompare(left.createdAtLabel, 'ar');
      }

      if (sortMode === 'priority') {
        const leftScore = left.priority === 'high' ? 3 : left.priority === 'normal' ? 2 : 1;
        const rightScore = right.priority === 'high' ? 3 : right.priority === 'normal' ? 2 : 1;
        return rightScore - leftScore;
      }

      if (sortMode === 'sla') {
        const leftScore = left.slaRisk ? 1 : 0;
        const rightScore = right.slaRisk ? 1 : 0;
        if (leftScore !== rightScore) return rightScore - leftScore;
        return right.createdAtLabel.localeCompare(left.createdAtLabel, 'ar');
      }

      return right.createdAtLabel.localeCompare(left.createdAtLabel, 'ar');
    });
  }, [items, normalizedQuery, selectedQuickFilters, selectedStage, sortMode]);

  React.useEffect(() => {
    if (filteredItems.length === 0) {
      if (selectedOrderId !== null) {
        setSelectedOrderId(null);
      }
      return;
    }

    if (!filteredItems.some((item) => item.id === selectedOrderId)) {
      setSelectedOrderId(filteredItems[0]!.id);
    }
  }, [filteredItems, selectedOrderId]);

  const handleClearFilters = React.useCallback(() => {
    setQuery('');
    setSelectedStage('all');
    setSelectedQuickFilters([]);
    setSortMode('next_action');
  }, []);

  const hasActiveFilters = query.trim().length > 0 || selectedStage !== 'all' || selectedQuickFilters.length > 0 || sortMode !== 'next_action';
  const activeFiltersCount = selectedQuickFilters.length + (selectedStage !== 'all' ? 1 : 0) + (sortMode !== 'next_action' ? 1 : 0);

  const renderActiveTokens = () => {
    const tokens: Array<{ id: string; label: string; onRemove: () => void }> = [];

    if (selectedStage !== 'all') {
      const label = stageFilters.find((s) => s.id === selectedStage)?.label ?? '';
      tokens.push({
        id: `stage-${selectedStage}`,
        label: `مرحلة: ${label}`,
        onRemove: () => setSelectedStage('all'),
      });
    }

    selectedQuickFilters.forEach((qf) => {
      const label = quickFilters.find((f) => f.id === qf)?.label ?? '';
      tokens.push({
        id: `qf-${qf}`,
        label,
        onRemove: () => setSelectedQuickFilters((current) => current.filter((x) => x !== qf)),
      });
    });

    if (sortMode !== 'next_action') {
      const label = sortModes.find((s) => s.id === sortMode)?.label ?? '';
      tokens.push({
        id: `sort-${sortMode}`,
        label: `ترتيب: ${label}`,
        onRemove: () => setSortMode('next_action'),
      });
    }

    if (tokens.length === 0) return null;

    return (
      <Box style={{ flexDirection: resolveRowDirection(direction), flexWrap: 'wrap', alignItems: 'center' }} gap={2} paddingY={2}>
        {tokens.map((token) => (
          <Chip
            key={token.id}
            label={`${token.label} ×`}
            onPress={token.onRemove}
            selected

          />
        ))}
        {tokens.length > 1 || query.trim().length > 0 ? (
          <Button
            label="مسح الكل"
            size="sm"
            tone="ghost"
            fullWidth={false}
            onPress={handleClearFilters}
          />
        ) : null}
      </Box>
    );
  };

  if (state !== 'ready') {
    return renderState(state, onRetry);
  }

  function openPrimaryAction(item: PartnerOrderItem) {
    setSelectedOrderId(item.id);
    const action = resolveOrderAction(item.status);
    if (action === 'accept') {
      setAcceptingOrderId(item.id);
      setAcceptSheetVisible(true);
      return;
    }
    onOpenOrderAction?.(action, item.id);
  }

  const stageTabItems = stageFilters.map((filter) => {
    const count = filter.id === 'all' ? enrichedItems.length : (stageCounts[filter.id] ?? 0);
    const label = filter.id === 'all' ? `الكل (${count})` : count > 0 ? `${filter.label} (${count})` : filter.label;
    return { id: filter.id, label };
  });

  const focusOrder = filteredItems[0];
  const listOrders = filteredItems.slice(1);

  return (
    <>
      <MobileScrollView fill padding={4} gap={3} contentContainerStyle={{ paddingBottom: spacing[12] }}>

        {/* ─── Search + filter header ─── */}
        <Box layoutDirection="row" justify="space-between" align="center" style={{ flexDirection: resolveRowDirection(direction) }}>
          <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center' }} gap={2}>
            {searchMode && (
              <Button
                label="←"
                size="sm"
                tone="ghost"
                fullWidth={false}
                onPress={onCloseSearch}
              />
            )}
            <Text role="label">بحث الطلبات</Text>
          </Box>
          {hasActiveFilters && (
            <Button
              label="مسح"
              size="sm"
              tone="ghost"
              fullWidth={false}
              onPress={handleClearFilters}
            />
          )}
        </Box>

        <Box gap={2} paddingY={1}>
          {/* Level 1: Full-width horizontally scrollable stage filter Tabs */}
          <Tabs
            items={stageTabItems}
            value={selectedStage}
            onValueChange={(val) => setSelectedStage(val as OrderStageFilterId)}
          />

          {/* Level 2: Secondary control buttons row and toggleable search field */}
          <View style={{ flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between', gap: spacing[2], marginTop: spacing[1] }}>
            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing[2] }}>
              <Button
                label={showSearch ? "إلغاء البحث" : "بحث"}
                size="sm"
                fullWidth={false}
                tone="secondary"
                onPress={() => {
                  if (showSearch) {
                    setQuery('');
                  }
                  setShowSearch(!showSearch);
                }}
              />
              <Button
                label={`تصفية${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}`}
                tone={activeFiltersCount > 0 ? 'brand' : 'secondary'}
                size="sm"
                fullWidth={false}
                onPress={() => setAdvancedPanelVisible(true)}
              />
            </View>
          </View>

          {showSearch ? (
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="رقم الطلب، العنصر، أو الحالة..."
            />
          ) : null}
        </Box>
        {renderActiveTokens()}

        <Divider />

        {/* ─── Focus Order Zone ────────────────────────────────── */}
        {focusOrder ? (
          <Box gap={3} padding={3} border borderTone="line" radiusToken="lg" style={{ marginVertical: 4, width: '100%' }}>
            <View style={{ flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 6 }}>
                <Icon name="star-outline" size={18} tone="brand" />
                <Text role="bodyStrong" style={{ textAlign }}>الطلب ذو الأولوية الآن</Text>
              </View>
              <ReadOnlyMetaLabel
                label={focusOrder.slaRisk && focusOrder.slaLabel ? focusOrder.slaLabel : `حالة: ${resolveStatusLabel(focusOrder.status, focusOrder.orderMode)}`}
                tone={focusOrder.slaRisk ? 'danger' : resolveStatusTone(focusOrder.status)}
              />
            </View>

            <View style={{ gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start', width: '100%' }}>
              <Text role="bodyStrong" style={{ textAlign, fontSize: 16, color: colorRoles.textPrimary }}>
                {focusOrder.orderCode}
              </Text>
              <Text role="caption" tone="muted" style={{ textAlign }}>
                {`${focusOrder.itemsCountLabel} · ${focusOrder.itemsSummaryLabel ?? ''}`}
              </Text>
              <Box
                background="warningSurface"
                radiusToken="md"
                border
                borderTone="warning"
                paddingX={3}
                paddingY={2}
                style={{
                  width: '100%',
                  borderStartWidth: 3,
                  borderEndWidth: 0,
                  borderTopWidth: 0,
                  borderBottomWidth: 0,
                  marginVertical: 2,
                  alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start',
                }}
              >
                <Text role="caption" tone="warning" weight="bold" style={{ textAlign }}>
                  الإجراء المطلوب: {focusOrder.nextActionLabel}
                </Text>
              </Box>
            </View>

            <View style={{ flexDirection: rowDirection, gap: spacing[2], marginTop: spacing[1], width: '100%' }}>
              <Button
                label="معالجة الآن"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  setActiveActionOrderId(focusOrder.id);
                }}
              />
              <Button
                label={expandedOrderId === focusOrder.id ? "إغلاق التفاصيل" : "تفاصيل"}
                size="sm"
                fullWidth={false}
                tone="secondary"
                onPress={() => {
                  setExpandedOrderId(expandedOrderId === focusOrder.id ? null : focusOrder.id);
                }}
              />
            </View>

            {activeActionOrderId === focusOrder.id ? (
              <InlineOrderActionPanel
                item={focusOrder}
                onClose={() => {
                  setActiveActionOrderId(null);
                }}
                onPrimaryAction={() => openPrimaryAction(focusOrder)}
                onIssueAction={() => onOpenOrderAction?.('issue', focusOrder.id)}
              />
            ) : null}

            {expandedOrderId === focusOrder.id ? (
              <InlineOrderDetailsPanel item={focusOrder} />
            ) : null}
          </Box>
        ) : null}

        <Divider />

        {/* ─── Order list ──────────────────────────────────────── */}
        <Text role="bodySm" tone="muted">
          {filteredItems.length === 0
            ? 'لا توجد نتائج.'
            : `${filteredItems.length} طلبات`}
        </Text>

        {filteredItems.length === 0 && !focusOrder ? (
          <StateView
            title="لا توجد طلبات مطابقة"
            description="غيّر المرحلة أو امسح الفلاتر النشطة لترى طلبات أخرى."
            actionLabel="مسح الفلاتر"
            onActionPress={handleClearFilters}
          />
        ) : (
          <Box gap={2}>
            {listOrders.map((item) => (
              <CommandCenterOrderRow
                key={item.id}
                item={item}
                isExpanded={expandedOrderId === item.id}
                isActiveAction={activeActionOrderId === item.id}
                onToggleDetails={() => {
                  setExpandedOrderId(expandedOrderId === item.id ? null : item.id);
                }}
                onToggleAction={() => {
                  setActiveActionOrderId(activeActionOrderId === item.id ? null : item.id);
                }}
                onCloseAction={() => {
                  setActiveActionOrderId(null);
                }}
                onPrimaryAction={() => openPrimaryAction(item)}
                onIssueAction={() => onOpenOrderAction?.('issue', item.id)}
              />
            ))}
          </Box>
        )}

      </MobileScrollView>

      {/* ─── Advanced filters sheet ───────────────────────────── */}
      <Sheet
        open={advancedPanelVisible}
        onOpenChange={(open) => { if (!open) setAdvancedPanelVisible(false); }}
        title="الفلاتر المتقدمة والترتيب"
      >
        <Box gap={4}>
          <Box gap={2}>
            <Text role="titleSm">تصفية حسب الخصائص</Text>
            <Box style={{ flexDirection: resolveRowDirection(direction), flexWrap: 'wrap' }} gap={2}>
              {quickFilters.map((filter) => {
                const isSelected = selectedQuickFilters.includes(filter.id);
                return (
                  <Chip
                    key={filter.id}
                    label={filter.label}
                    selected={isSelected}

                    onPress={() => {
                      setSelectedQuickFilters((current) =>
                        isSelected
                          ? current.filter((x) => x !== filter.id)
                          : [...current, filter.id]
                      );
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          <Box gap={2}>
            <Text role="titleSm">الترتيب</Text>
            <Box style={{ flexDirection: resolveRowDirection(direction), flexWrap: 'wrap' }} gap={2}>
              {sortModes.map((item) => (
                <Chip
                  key={item.id}
                  label={item.label}
                  selected={sortMode === item.id}

                  onPress={() => setSortMode(item.id)}
                />
              ))}
            </Box>
          </Box>

          <Box layoutDirection="row" gap={2} style={{ flexDirection: resolveRowDirection(direction), marginTop: spacing[2] }}>
            <Button
              label="تطبيق"
              style={{ flex: 1 }}
              onPress={() => setAdvancedPanelVisible(false)}
            />
            {hasActiveFilters && (
              <Button
                label="مسح الكل"
                tone="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  handleClearFilters();
                  setAdvancedPanelVisible(false);
                }}
              />
            )}
          </Box>
        </Box>
      </Sheet>

      {/* ML-016: AcceptanceTimerSheet — confirms acceptance before calling onOpenOrderAction */}
      <AcceptanceTimerSheet
        visible={acceptSheetVisible}
        orderId={acceptingOrderId ?? ''}
        orderSummary={filteredItems.find((o) => o.id === acceptingOrderId)?.orderCode ?? 'طلب جديد'}
        onAccept={() => {
          setAcceptSheetVisible(false);
          if (acceptingOrderId) onOpenOrderAction?.('accept', acceptingOrderId);
          setAcceptingOrderId(null);
        }}
        onDecline={() => {
          setAcceptSheetVisible(false);
          setAcceptingOrderId(null);
        }}
        onClose={() => {
          setAcceptSheetVisible(false);
          setAcceptingOrderId(null);
        }}
      />
    </>
  );
}

// export { DshPartnerOrdersScreen as PartnerOrdersHomeScreen };

export type PartnerOrdersInboxScreenState = PartnerOrdersHomeScreenState;
export type PartnerOrdersInboxListItem = PartnerOrderItem;
export type PartnerOrdersInboxScreenProps = {
  state?: PartnerOrdersInboxScreenState;
  items?: readonly PartnerOrdersInboxListItem[];
  searchMode?: boolean | undefined;
  onCloseSearch?: (() => void) | undefined;
  // ML-020: explicit mark-ready callback — triggered when partner confirms order ready for pickup
  onMarkReady?: (orderId: string) => void;
  onOpenNextOrder?: (orderId: string) => void;
  onRetry?: (() => void) | undefined;
};

export function PartnerOrdersInboxScreen({ state = 'empty', items, searchMode, onCloseSearch, onMarkReady, onOpenNextOrder, onRetry }: PartnerOrdersInboxScreenProps) {
  return (
    <DshPartnerOrdersScreen
      state={state}
      items={items}
      searchMode={searchMode}
      onCloseSearch={onCloseSearch}
      onOpenOrderAction={(actionId, orderId) => {
        if (actionId === 'ready') {
          onMarkReady?.(orderId);
          return;
        }
        onOpenNextOrder?.(orderId);
      }}
      onRetry={onRetry}
    />
  );
}

export type OrdersInboxScreenProps = PartnerOrdersInboxScreenProps;

export function OrdersInboxScreen(props: OrdersInboxScreenProps) {
  return <PartnerOrdersInboxScreen {...props} />;
}

// export default OrdersInboxScreen; // Unused default export