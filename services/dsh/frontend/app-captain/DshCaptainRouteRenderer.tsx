import React from 'react';
import { View } from 'react-native';
import { useIdentitySession } from '@bthwani/core-identity';
import { Badge, Box, Button, Divider, Icon, KeyValueList, MobileScrollView, Text, TopBar, spacing, colorRoles } from '@bthwani/ui-kit';
type BThwaniAppearanceMode = 'lightPremium' | 'darkPremium';
import type { DshCaptainRoute } from './dsh-captain.types';
import type { CaptainSupportRoute, CaptainAvailabilityMeta, CompactOrderChatMessage, DshCaptainLocationPush } from '../shared/delivery';
import { DshEntryScreen } from './account/DshCaptainEntryScreen';
import {
  CaptainDeliveryConfirmSheet,
  CaptainOrderDetailScreen,
  CaptainOrdersInboxScreen,
  CaptainPickupConfirmSheet,
  DshCaptainBellScreen,
  DshCaptainOrderChatScreen,
} from './orders/DshCaptainOrdersScreen';
import { DshCaptainMapScreen } from './orders/DshCaptainMapScreen';
import { DshCaptainPickupDropoffScreen } from './orders/DshCaptainPickupDropoffScreen';
import { DshCaptainPoDSubmissionScreen } from './orders/DshCaptainPoDSubmissionScreen';
import { DshCaptainFinanceScreen } from './account/DshCaptainFinanceScreen';
import { DshCaptainSupportDirectoryScreen } from './account/DshCaptainOperationsScreen';
import { DshCaptainAccountSettingsContent } from './account/DshCaptainAccountSettingsContent';
import { CaptainAccountNavRow } from './account/CaptainAccountNavRow';
import { CaptainStorePickupContextScreen } from './store/CaptainStorePickupContextScreen';
import { OfferDeclineSheet } from './orders/OfferDeclineSheet';
import { CaptainSupportScreenRouter } from './account/CaptainSupportScreenRouter';
import type { DshCaptainBellEvent } from '../shared/orders/orders.state-machine';
import { ActorNotificationsPanel } from '../shared/notifications';

type CaptainOrderDetailSummary = React.ComponentProps<typeof CaptainOrderDetailScreen>['summary'];
type CaptainOrdersInboxScreenState = NonNullable<React.ComponentProps<typeof CaptainOrdersInboxScreen>>['state'];
type PodScreenState = NonNullable<React.ComponentProps<typeof DshCaptainPoDSubmissionScreen>['state']>;

export type DshCaptainRouteRendererProps = {
  route: DshCaptainRoute;
  activeOrderId: string;
  activeOrderDisplayId: string;
  activeSummary: CaptainOrderDetailSummary;
  inboxState: CaptainOrdersInboxScreenState;
  orderChatState: 'readOnly' | 'active';
  captainRuntimeId: string;
  captainPodRequired: boolean;
  captainCollectsCod: boolean;
  isStoreCourierMode: boolean;
  selectedSupportScreen: CaptainSupportRoute;
  isPickupSheetVisible: boolean;
  isDeliverySheetVisible: boolean;
  isDeclineSheetVisible: boolean;
  declineOrderId: string;
  declineSheetState: 'ready' | 'loading' | 'success' | 'error';
  pickupSheetState: 'ready' | 'loading' | 'success' | 'error';
  captainPodState: PodScreenState;
  captainPodPhotoUri: string | undefined;
  activeOrderMessages: CompactOrderChatMessage[];
  activeOrderDraft: string;
  showBottomNav: boolean;
  bottomNavNode: React.ReactNode;
  dshAuthBearerToken?: string | null;
  dshClientId?: string | null;
  // Props for account/profile routes
  isCaptainAvailable: boolean;
  captainDisplayName: string;
  currentAvailabilityMeta: CaptainAvailabilityMeta;
  captainAccountNavItems: ReadonlyArray<{
    title: string;
    subtitle: string;
    badgeLabel: string;
    icon: string;
    onPress: () => void;
  }>;
  walletBalanceLabel?: string | null;
  appearanceHydrated: boolean;
  appearanceMode: BThwaniAppearanceMode;
  wltSummaryLabel: string;
  onOpenOrder: (id: string) => void;
  onRetryInbox: () => void;
  onConfirmPickup: () => void;
  onConfirmDelivery: () => void;
  onConfirmPodSubmission: () => void;
  onReportPodFailure: () => void;
  onCapturePhoto: () => void;
  onRetryPod: () => void;
  onBack: () => void;
  onGoToInbox: () => void;
  onGoToAccount: () => void;
  onClosePickupSheet: () => void;
  onCloseDeliverySheet: () => void;
  onCloseDeclineSheet: () => void;
  onConfirmDecline: (orderId: string, reason: string) => void;
  onAcceptTask: (orderId: string) => void;
  onDeclineTask: (id: string) => void;
  onOpenSupportScreen: (screenId: CaptainSupportRoute) => void;
  onOpenSupportDirectory: () => void;
  onOpenCaptainAccountSection: (route: DshCaptainRoute) => void;
  onToggleCaptainAvailability: () => void;
  onSetAppearanceMode: (mode: BThwaniAppearanceMode) => void;
  onToggleStoreCourierMode: (next: boolean) => void;
  onPushLocation: (push: DshCaptainLocationPush) => Promise<any>;
  onRingBell: () => void;
};

const routeHeaderMeta: Partial<Record<DshCaptainRoute, { title: string; subtitle: string }>> = {
  entry:             { title: 'بوابة التنفيذ',      subtitle: 'ابدأ من الفرز والقبول.' },
  inbox:             { title: 'صندوق الطلبات',      subtitle: 'الطلب النشط أولًا.' },
  detail:            { title: 'تفاصيل الطلب',       subtitle: 'راجع الطلب قبل التنفيذ.' },
  orderchat:         { title: 'تواصل الطلب',         subtitle: 'مراسلات قصيرة.' },
  map:               { title: 'خريطة المهمة',        subtitle: 'عرض المسار.' },
  'pickup-dropoff':  { title: 'الاستلام والتسليم',   subtitle: 'مراحل التسليم.' },
  'pod-submission':  { title: 'إثبات التسليم',       subtitle: 'التقاط صورة الإثبات.' },
};

export function DshCaptainRouteRenderer(props: DshCaptainRouteRendererProps) {
  const identity = useIdentitySession();
  const {
    route, activeOrderId, activeOrderDisplayId, activeSummary, inboxState, orderChatState,
    captainRuntimeId, captainPodRequired, captainCollectsCod, isStoreCourierMode,
    selectedSupportScreen, isPickupSheetVisible, isDeliverySheetVisible, isDeclineSheetVisible,
    declineOrderId, declineSheetState, pickupSheetState, captainPodState, captainPodPhotoUri,
    activeOrderMessages, activeOrderDraft, showBottomNav, bottomNavNode,
    dshAuthBearerToken, dshClientId,
    isCaptainAvailable, captainDisplayName, currentAvailabilityMeta, captainAccountNavItems,
    walletBalanceLabel, appearanceHydrated, appearanceMode, wltSummaryLabel,
    onOpenOrder, onRetryInbox, onConfirmPickup, onConfirmDelivery, onConfirmPodSubmission,
    onReportPodFailure, onCapturePhoto, onRetryPod, onBack, onGoToInbox, onGoToAccount,
    onClosePickupSheet, onCloseDeliverySheet, onCloseDeclineSheet, onConfirmDecline,
    onAcceptTask, onDeclineTask, onOpenSupportScreen, onOpenSupportDirectory,
    onOpenCaptainAccountSection, onToggleCaptainAvailability,
    onSetAppearanceMode, onToggleStoreCourierMode, onPushLocation, onRingBell,
  } = props;

  void captainRuntimeId;
  void activeOrderDisplayId;
  void captainCollectsCod;
  void activeOrderMessages;
  void activeOrderDraft;
  void onRingBell;
  void walletBalanceLabel;

  const captainEntryState = inboxState === 'loading' ? 'loading' : inboxState === 'empty' ? 'empty' : 'ready';

  function renderFlow(): React.ReactNode {
    if (route === 'entry') return (
      <DshEntryScreen
        state={captainEntryState}
        onOpenOffersPress={onGoToInbox}
        onOpenExecutionPress={() => onOpenOrder(activeOrderId)}
        onOpenProofCapturePress={() => onOpenOrder(activeOrderId)}
      />
    );

    if (route === 'inbox') return (
      <CaptainOrdersInboxScreen
        state={inboxState}
        onRetry={onRetryInbox}
        onOpenOrder={onOpenOrder}
        onOpenNextOrder={onOpenOrder}
      />
    );

    if (route === 'detail') return (
      <>
        <Box gap={3}>
          <CaptainOrderDetailScreen
            summary={activeSummary as any}
            onConfirmPickup={onConfirmPickup}
            onConfirmDelivery={onConfirmDelivery}
            onOpenNextOrder={onGoToInbox}
            onRetry={() => {}}
          />
          <Button label="فتح تواصل الطلب" tone="secondary" fullWidth={false} onPress={() => onOpenSupportScreen('orders-list')} />
          <Button label="مرحلة الاستلام والتسليم" tone="secondary" fullWidth={false} onPress={() => onOpenSupportScreen('order-pickup')} />
        </Box>
        <CaptainPickupConfirmSheet
          visible={isPickupSheetVisible}
          orderTitle={activeSummary?.orderId ?? ''}
          state={pickupSheetState}
          onConfirm={onConfirmPickup}
          onCancel={onClosePickupSheet}
        />
        <CaptainDeliveryConfirmSheet
          visible={isDeliverySheetVisible}
          orderTitle={activeSummary?.orderId ?? ''}
          onConfirm={onConfirmDelivery}
          onCancel={onCloseDeliverySheet}
        />
        <OfferDeclineSheet
          visible={isDeclineSheetVisible}
          offerId={declineOrderId}
          state={declineSheetState}
          onConfirmDecline={onConfirmDecline}
          onClose={onCloseDeclineSheet}
        />
      </>
    );

    if (route === 'bell') return (
      <Box gap={3}>
        <ActorNotificationsPanel
          authKind={identity.state.kind}
          title="إشعارات الكابتن"
          emptyDescription="ستظهر هنا إشعارات العروض، الالتقاط، والتواصل التشغيلي للكابتن."
        />
        <Box layoutDirection="row" gap={2} style={{ flexDirection: 'row-reverse', flexWrap: 'wrap' }}>
          <Button label="فتح صندوق الطلبات" tone="secondary" fullWidth={false} onPress={onGoToInbox} />
          <Button label="فتح الطلب النشط" fullWidth={false} onPress={() => onOpenOrder(activeOrderId)} />
        </Box>
      </Box>
    );

    if (route === 'orderchat') return (
      <DshCaptainOrderChatScreen
        orderId={activeSummary?.orderId ?? ''}
        pickupLabel={activeSummary?.pickupLabel ?? ''}
        dropoffLabel={activeSummary?.dropoffLabel ?? ''}
        state={orderChatState}
      />
    );

    if (route === 'map') return (
      <DshCaptainMapScreen
        orderId={activeOrderId}
        captainId={captainRuntimeId || ''}
        onBack={onBack}
        onPushLocation={onPushLocation}
      />
    );

    if (route === 'pickup-dropoff') return (
      <DshCaptainPickupDropoffScreen
        mode="pickup"
        orderId={activeOrderId}
        storeName={activeSummary?.pickupLabel ?? ''}
        customerName="العميل"
        address={activeSummary?.dropoffLabel ?? ''}
        itemsCount={3}
        onConfirm={() => onOpenSupportScreen('proof-upload')}
        onReportIssue={onGoToInbox}
        onBack={onBack}
        onRingBell={() => {
          void ({ orderId: activeOrderId, captainId: captainRuntimeId, timestamp: new Date().toISOString(), proximityState: 'bell_rang' } satisfies DshCaptainBellEvent);
        }}
      />
    );

    if (route === 'store-pickup-context') return <CaptainStorePickupContextScreen />;

    if (route === 'pod-submission' && captainPodRequired) return (
      <DshCaptainPoDSubmissionScreen
        state={captainPodState}
        orderId={activeOrderId}
        onCapturePhoto={onCapturePhoto}
        onConfirm={onConfirmPodSubmission}
        onReportFailure={onReportPodFailure}
        onRetry={onRetryPod}
        onBack={captainPodState === 'success' ? onGoToInbox : onBack}
        photoUri={captainPodPhotoUri || ''}
      />
    );

    if (route === 'account-finance') return (
      <DshCaptainFinanceScreen
        onBack={onGoToAccount}
        dshAuthBearerToken={dshAuthBearerToken || null}
        dshClientId={dshClientId || null}
      />
    );

    if (route === 'account-profile') return (
      <KeyValueList items={[
        { label: 'الاسم', value: captainDisplayName },
        { label: 'النوع', value: 'DSH', tone: 'success' },
        { label: 'الحالة', value: currentAvailabilityMeta.label, tone: currentAvailabilityMeta.chipTone === 'success' ? 'success' : 'warning' },
        { label: 'التقييم', value: '4.9 / 5', tone: 'info' },
        { label: 'المستوى', value: 'Elite 3', tone: 'brand' },
      ]} />
    );

    if (route === 'account-orders') return (
      <KeyValueList items={[
        { label: 'الطلب النشط', value: `#${activeOrderDisplayId}`, tone: 'success' },
        { label: 'المرحلة الحالية', value: activeSummary?.currentStageLabel ?? '', tone: 'info' },
        { label: 'الاستلام', value: activeSummary?.pickupLabel ?? '' },
        { label: 'التسليم', value: activeSummary?.dropoffLabel ?? '' },
        { label: 'الخطوة التالية', value: activeSummary?.nextActionLabel ?? '', tone: 'warning' },
      ]} />
    );

    if (route === 'account-docs') return (
      <KeyValueList items={[
        { label: 'التقييم', value: '4.9 / 5', tone: 'info' },
        { label: 'المستوى', value: 'Elite 3', tone: 'brand' },
        { label: 'حالة المراجعة', value: 'جاهز' },
        { label: 'الاعتماد الحقيقي', value: 'قيد الربط', tone: 'warning' },
      ]} />
    );

    if (route === 'account-shifts') return (
      <KeyValueList items={[
        { label: 'حالة الدوام', value: isCaptainAvailable ? 'متاح اليوم' : 'غير متاح اليوم', tone: isCaptainAvailable ? 'success' : 'warning' },
        { label: 'جدول اليوم', value: 'صباحي', tone: 'brand' },
        { label: 'الإجازة القادمة', value: 'قيد المراجعة' },
      ]} />
    );

    if (route === 'account-support') return (
      <DshCaptainAccountSettingsContent
        appearanceHydrated={appearanceHydrated}
        appearanceMode={appearanceMode}
        isStoreCourierMode={isStoreCourierMode}
        onSetAppearanceMode={onSetAppearanceMode}
        onToggleStoreCourierMode={onToggleStoreCourierMode}
      />
    );

    if (route === 'account') return (
      <Box gap={4}>
        <Box layoutDirection="row" align="center" gap={3} style={{ flexDirection: 'row-reverse' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }}>
            <Icon name="person" size={28} tone="brand" />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            <Text role="titleSm">{captainDisplayName}</Text>
            <Box layoutDirection="row" align="center" gap={2} style={{ flexDirection: 'row-reverse' }}>
              <Badge label="كابتن DSH" tone="success" />
              <Badge label={currentAvailabilityMeta.label} tone={currentAvailabilityMeta.chipTone as any} />
            </Box>
          </View>
        </Box>
        <Divider />
        <Box layoutDirection="row" gap={3} style={{ flexDirection: 'row-reverse', flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 80, alignItems: 'center', gap: 1 }}>
            <Text role="caption" tone="muted">التقييم</Text>
            <Text role="bodyStrong" tone="info">4.9 ★</Text>
          </View>
          <View style={{ flex: 1, minWidth: 80, alignItems: 'center', gap: 1 }}>
            <Text role="caption" tone="muted">المستوى</Text>
            <Text role="bodyStrong" tone="action" style={{ color: colorRoles.brandAction } as any}>Elite 3</Text>
          </View>
          <View style={{ flex: 1, minWidth: 80, alignItems: 'center', gap: 1 }}>
            <Text role="caption" tone="muted">{wltSummaryLabel}</Text>
            <Text role="bodyStrong" tone="success">{walletBalanceLabel ?? '—'}</Text>
          </View>
        </Box>
        <Divider />
        <Box gap={0}>
          {captainAccountNavItems.map((item) => (
            <CaptainAccountNavRow
              key={item.title}
              title={item.title}
              subtitle={item.subtitle}
              badgeLabel={item.badgeLabel}
              icon={item.icon as any}
              onPress={item.onPress}
            />
          ))}
        </Box>
      </Box>
    );

    if (route === 'support-directory') return (
      <DshCaptainSupportDirectoryScreen
        onOpenScreen={(id) => onOpenSupportScreen(id as CaptainSupportRoute)}
      />
    );

    if (route === 'support-screen') return (
      <CaptainSupportScreenRouter
        selectedSupportScreen={selectedSupportScreen}
        onBack={onOpenSupportDirectory}
        onNavigate={onOpenSupportScreen}
        captainCollectsCod={captainCollectsCod}
        dshAuthBearerToken={dshAuthBearerToken || ''}
        dshClientId={dshClientId || ''}
        activeOrderId={activeOrderId}
        onAcceptTask={onAcceptTask}
        onDeclineTask={onDeclineTask}
      />
    );

    return null;
  }

  const accountRouteTitle: Partial<Record<DshCaptainRoute, { title: string; subtitle: string }>> = {
    'account-finance':  { title: 'المالية',               subtitle: 'المحفظة والمستحقات.' },
    'account-profile':  { title: 'بيانات الكابتن',        subtitle: 'الهوية والحالة والملف التشغيلي.' },
    'account-orders':   { title: 'الطلبات',               subtitle: 'الطلب النشط والسجل المختصر.' },
    'account-docs':     { title: 'الوثائق والتقييم',      subtitle: 'الملفات والمستوى وجاهزية الاعتماد.' },
    'account-shifts':   { title: 'الدوام / الإجازات',     subtitle: 'الحضور وجدول اليوم.' },
    'account-support':  { title: 'الإعدادات',             subtitle: 'المظهر ووضع التطبيق.' },
    'account':          { title: 'حساب الكابتن',          subtitle: 'ملف التشغيل والمالية والدوام.' },
    'support-directory': { title: 'دليل الدعم',           subtitle: 'كل مسارات DSH المتبقية.' },
    'support-screen': {
      title: selectedSupportScreen === 'cod-liability' ? 'ذمة الدفع عند الاستلام' : 'الدعم',
      subtitle: 'المسار المفتوح من الدليل.',
    },
    'bell': { title: 'الإشعارات', subtitle: 'تنبيهات الطلبات الجديدة.' },
  };

  const accountMeta = accountRouteTitle[route];
  if (accountMeta) {
    return (
      <DshCaptainAccountShell
        title={accountMeta.title}
        subtitle={accountMeta.subtitle}
        showBottomNav={showBottomNav}
        bottomNavNode={bottomNavNode}
        onToggleAvailability={onToggleCaptainAvailability}
        onOpenCaptainAccountSection={onOpenCaptainAccountSection}
      >
        {renderFlow()}
      </DshCaptainAccountShell>
    );
  }

  const meta = routeHeaderMeta[route];
  return (
    <View style={{ flex: 1 }}>
      {meta && <TopBar variant="secondary" title={meta.title} subtitle={meta.subtitle} />}
      <View style={{ flex: 1, paddingBottom: showBottomNav ? 80 : 0 }}>
        <MobileScrollView fill padding={0} gap={0} contentContainerStyle={{ paddingBottom: spacing[8] }}>
          <Box padding={4} gap={4}>{renderFlow()}</Box>
        </MobileScrollView>
      </View>
      {showBottomNav && (
        <View style={{ position: 'absolute', bottom: 50, left: 16, right: 16, zIndex: 1000 }}>
          {bottomNavNode}
        </View>
      )}
    </View>
  );
}

export function DshCaptainAccountShell({
  title,
  subtitle,
  children,
  showBottomNav,
  bottomNavNode,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  showBottomNav: boolean;
  bottomNavNode: React.ReactNode;
  onToggleAvailability?: () => void;
  onOpenCaptainAccountSection?: (route: DshCaptainRoute) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <TopBar variant="secondary" title={title} subtitle={subtitle} />
      <View style={{ flex: 1, paddingBottom: showBottomNav ? 80 : 0 }}>
        <MobileScrollView fill padding={0} gap={0} contentContainerStyle={{ paddingBottom: spacing[8] }}>
          <Box padding={4} gap={4}>{children}</Box>
        </MobileScrollView>
      </View>
      {showBottomNav && (
        <View style={{ position: 'absolute', bottom: 50, left: 16, right: 16, zIndex: 1000 }}>
          {bottomNavNode}
        </View>
      )}
    </View>
  );
}
