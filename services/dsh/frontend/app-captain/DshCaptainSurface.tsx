import React from 'react';
import { BackHandler, Platform, View } from 'react-native';

let useSafeAreaInsets: () => { top: number; bottom: number; left: number; right: number } = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
try {
  // eslint-disable-next-line no-eval
  const r: any = eval('require');
  const safe = r('react-native-safe-area-context');
  if (safe && typeof safe.useSafeAreaInsets === 'function') {
    useSafeAreaInsets = safe.useSafeAreaInsets;
  }
} catch (err) {
  void err;
}

import {
  Box, colorPalette, Icon, MobileScrollView,
  StateView, Surface, useTheme,
} from '@bthwani/ui-kit';
type BThwaniAppearanceMode = 'lightPremium' | 'darkPremium';

import { BottomNavBar } from './components/BottomNavBar';
import { MobileWorkspaceHeader } from './components/MobileWorkspaceHeader';
import { ModernPremiumHeader } from './components/ModernPremiumHeader';
import { useIdentitySession } from '@bthwani/core-identity';

const SurfaceAny = Surface as any;

function useAppCaptainAppearance() {
  const [mode, setMode] = React.useState<BThwaniAppearanceMode>('lightPremium');
  return { hydrated: true, mode, setMode };
}

import { wltDshCaptainUiCopy, buildWltDshCaptainTopBarLocationLabel } from '../shared/finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_captain_wlt_dsh_captain_ui_copy.facade';
import { DshCaptainStoreCourierHomeContent } from './store/DshCaptainStoreCourierHomeContent';
import { DshCaptainMapLayer } from './orders/DshCaptainMapLayer';
import { DshCaptainHomeOrderPanel } from './orders/DshCaptainHomeOrderPanel';
import { DshCaptainRouteRenderer } from './DshCaptainRouteRenderer';
import type { DshCaptainRoute, DshCaptainSurfaceProps } from './dsh-captain.types';
import { useDshCaptainSurfaceModel } from './useDshCaptainSurfaceModel';
import { PlatformVarsProvider, FeatureFlagProvider, usePlatformVars } from '../shared';
import { useNotificationsController } from '../shared/notifications';
import type { DshCaptainOrdersScreen } from './orders/DshCaptainOrdersScreen';

type CaptainOrderDetailSummary = React.ComponentProps<typeof DshCaptainOrdersScreen>['summary'];

export function DshCaptainSurface(props: DshCaptainSurfaceProps) {
  return (
    <PlatformVarsProvider>
      <FeatureFlagProvider>
        <DshCaptainSurfaceInner {...props} />
      </FeatureFlagProvider>
    </PlatformVarsProvider>
  );
}

function DshCaptainSurfaceInner({ command, captainId, walletBalanceLabel }: DshCaptainSurfaceProps) {
  const identity = useIdentitySession();
  const { theme } = useTheme();
  const { dshAuthBearerToken, dshClientId } = usePlatformVars();
  
  // Enforce Identity Bootstrap: User identity comes from token subject/session, not from props.
  const captainRuntimeId = identity.state.kind === 'authenticated' ? identity.state.identity.subject || '' : '';
  const { hydrated: appearanceHydrated, mode: appearanceMode, setMode: setAppearanceMode } = useAppCaptainAppearance();
  const insets = useSafeAreaInsets();

  const { state: ui, actions, derived } = useDshCaptainSurfaceModel(command, captainRuntimeId);
  const notifications = useNotificationsController(identity.state.kind);
  const notificationBadgeCount = notifications.state.kind === 'success' ? notifications.state.unreadCount : 0;

  React.useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => actions.goBack());
    return () => sub.remove();
  }, [actions.goBack]);

  // ── UI-only: account nav menu items (display strings + route callbacks) ────
  const captainAccountNavItems = React.useMemo(() => [
    { title: 'بيانات الكابتن',                   subtitle: 'الهوية، النوع، والحالة الحالية.',      badgeLabel: 'مباشر',                          icon: 'person-outline',       onPress: () => actions.openCaptainAccountSection('account-profile') },
    { title: wltDshCaptainUiCopy.financeTitle,    subtitle: wltDshCaptainUiCopy.financeSubtitle,    badgeLabel: wltDshCaptainUiCopy.badgeLabel, icon: 'wallet-outline',    onPress: () => actions.openCaptainAccountSection('account-finance') },
    { title: 'الطلبات',                          subtitle: 'الطلب النشط والسجل المختصر.',          badgeLabel: 'نشط',                             icon: 'receipt-outline',      onPress: () => actions.openCaptainAccountSection('account-orders') },
    { title: 'الوثائق والتقييم',                 subtitle: 'الملفات، التقييم، والمستوى.',          badgeLabel: 'جاهز',                            icon: 'document-text-outline', onPress: () => actions.openCaptainAccountSection('account-docs') },
    { title: 'الدوام / الإجازات',                subtitle: 'الحضور وجدول اليوم.',                  badgeLabel: 'اليوم',                           icon: 'calendar-outline',     onPress: () => actions.openCaptainAccountSection('account-shifts') },
    { title: 'الإعدادات',                        subtitle: 'المظهر ووضع التطبيق.',                 badgeLabel: 'محلي',                            icon: 'settings-outline',     onPress: () => actions.openCaptainAccountSection('account-support') },
    { title: 'الدعم',                             subtitle: 'دليل مسارات DSH.',                    badgeLabel: 'مفتوح',                           icon: 'help-circle-outline',  onPress: actions.openSupportDirectory },
  ] as const, [actions.openCaptainAccountSection, actions.openSupportDirectory]);

  // ── UI-only: bottom nav bar JSX (pure visual composition) ─────────────────
  const captainBottomNavBar = derived.isStoreCourierMode ? (
    <BottomNavBar
      activeId={derived.captainBottomActiveId}
      direction="rtl"
      launcherLabel="طلباتي"
      launcherIcon="receipt-outline"
      launcherActive={ui.route === 'home'}
      onLauncherPress={() => actions.setRoute('home')}
      onSelect={(id: string) => {
        if (id === 'history') actions.openCaptainAccountSection('account-orders');
        if (id === 'earnings') actions.openCaptainAccountSection('account-finance');
        if (id === 'support') actions.openSupportDirectory();
        if (id === 'profile') actions.openCaptainAccount();
      }}
      items={[
        { id: 'history',  label: 'السجل',   icon: 'time-outline',        activeIcon: 'time' },
        { id: 'support',  label: 'الدعم',    icon: 'help-circle-outline', activeIcon: 'help-circle' },
        { id: 'earnings', label: 'مستحقاتي', icon: 'cash-outline',        activeIcon: 'cash' },
        { id: 'profile',  label: 'حسابي',    icon: 'person-outline',      activeIcon: 'person' },
      ]}
    />
  ) : (
    <BottomNavBar
      activeId={derived.captainBottomActiveId}
      direction="rtl"
      launcherLabel="الخريطة"
      launcherIcon="map-outline"
      launcherActive={ui.route === 'home' || ui.route === 'map'}
      onLauncherPress={() => actions.setRoute('home')}
      onSelect={(id: string) => {
        if (id === 'orders') actions.setRoute('inbox');
        if (id === 'wallet') actions.openCaptainAccountSection('account-finance');
        if (id === 'support') actions.openSupportDirectory();
        if (id === 'profile') actions.openCaptainAccount();
      }}
      items={[
        { id: 'orders',  label: 'الطلبات', icon: 'receipt-outline',    activeIcon: 'receipt' },
        { id: 'wallet',  label: 'المحفظة', icon: 'wallet-outline',      activeIcon: 'wallet' },
        { id: 'support', label: 'الدعم',   icon: 'help-circle-outline', activeIcon: 'help-circle' },
        { id: 'profile', label: 'حسابي',   icon: 'person-outline',      activeIcon: 'person' },
      ]}
    />
  );

  // ── AMN mode: early UI-only return ─────────────────────────────────────────
  if (ui.activeServiceType === 'amn') {
    return (
      <Box style={{ flex: 1 }} background="background">
        <MobileWorkspaceHeader
          title="AMN — قيد الربط"
          description="هذا المسار غير نشط داخل DSH حاليًا."
          icon="alert-circle-outline"
          backLabel="العودة إلى DSH"
          onBack={() => actions.handleSelectServiceType('dsh')}
        />
        <SurfaceAny tone="raised" padding={0} gap={0} radiusToken="none" border={false} style={{ flex: 1, marginTop: -2, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
          <MobileScrollView fill padding={4} gap={4}>
            <StateView tone="warning" title="AMN غير نشط داخل هذا السطح" description="DSH هو السياق التنفيذي النشط." actionLabel="العودة إلى DSH" onActionPress={() => actions.handleSelectServiceType('dsh')} />
          </MobileScrollView>
        </SurfaceAny>
      </Box>
    );
  }

  // ── Top bar (pure UI) ──────────────────────────────────────────────────────
  const topBar = (
    <ModernPremiumHeader
      title={derived.isStoreCourierMode ? 'موصل المتجر' : ''}
      locationLabel={derived.isStoreCourierMode ? 'وضع موصل المتجر — طلبات المتجر فقط' : buildWltDshCaptainTopBarLocationLabel(walletBalanceLabel)}
      actions={[
        { id: 'account',       icon: <Icon name="person-outline"       size={20} color={colorPalette.white} />, accessibilityLabel: 'الحساب',    onPress: actions.openCaptainAccount },
        { id: 'search',        icon: <Icon name="search-outline"        size={20} color={colorPalette.white} />, accessibilityLabel: 'البحث',     onPress: actions.openSupportDirectory },
        { id: 'notifications', icon: <Icon name="notifications-outline" size={20} color={colorPalette.white} />, badgeCount: notificationBadgeCount, accessibilityLabel: 'الإشعارات', onPress: () => actions.setRoute('bell') },
        ...(derived.isStoreCourierMode ? [] : [{
          id: 'wallet',
          icon: <Icon name="wallet-outline" size={20} color={colorPalette.white} />,
          accessibilityLabel: wltDshCaptainUiCopy.walletAccessibilityLabel,
          onPress: () => actions.openCaptainSupportScreen('cod-liability'),
        }]),
      ]}
      tickerStatus={derived.isStoreCourierMode ? 'موصل المتجر' : derived.homeTicker.statusLabel}
      tickerMessage={derived.isStoreCourierMode ? 'انتظر تعيين الطلب التالي.' : derived.homeTicker.message}
      onTickerPress={derived.isStoreCourierMode ? undefined : derived.homeTicker.onPress}
      direction="rtl"
    />
  );

  // ── Non-home routes → RouteRenderer handles ALL rendering ─────────────────
  if (ui.route !== 'home') {
    const activeSummary = derived.activeSummary as NonNullable<CaptainOrderDetailSummary>;
    const activeOrderDisplayId = derived.activeOrderDisplayId;
    const orderChatState = ui.inboxState === 'delivered' ? 'readOnly' : 'active';

    return (
      <DshCaptainRouteRenderer
        route={ui.route}
        activeAssignmentId={ui.activeAssignmentId}
        activeOrderId={ui.activeOrderId}
        activeOrderDisplayId={activeOrderDisplayId}
        activeSummary={activeSummary}
        inboxItems={ui.inboxItems}
        inboxState={ui.inboxState}
        orderChatState={orderChatState}
        captainRuntimeId={captainRuntimeId}
        captainPodRequired={derived.captainPodRequired}
        captainCollectsCod={derived.captainCollectsCod}
        isStoreCourierMode={derived.isStoreCourierMode}
        selectedSupportScreen={ui.selectedSupportScreen}
        isPickupSheetVisible={ui.isPickupSheetVisible}
        isDeliverySheetVisible={ui.isDeliverySheetVisible}
        isDeclineSheetVisible={ui.isDeclineSheetVisible}
        declineOrderId={ui.declineOrderId}
        declineSheetState={ui.declineSheetState}
        pickupSheetState={ui.pickupSheetState}
        captainPodState={ui.captainPodState}
        captainPodPhotoUri={ui.captainPodPhotoUri}
        activeOrderMessages={ui.activeOrderMessages}
        activeOrderDraft={ui.activeOrderDraft}
        showBottomNav={derived.showBottomNav}
        bottomNavNode={captainBottomNavBar}
        dshAuthBearerToken={dshAuthBearerToken}
        dshClientId={dshClientId}
        isCaptainAvailable={derived.isCaptainAvailable}
        captainDisplayName=""
        currentAvailabilityMeta={derived.currentAvailabilityMeta}
        captainAccountNavItems={captainAccountNavItems}
        walletBalanceLabel={walletBalanceLabel || null}
        appearanceHydrated={appearanceHydrated}
        appearanceMode={appearanceMode}
        wltSummaryLabel={wltDshCaptainUiCopy.summaryLabel}
        onOpenOrder={actions.openOrderDetail}
        onRetryInbox={actions.refreshInbox}
        onConfirmPickup={actions.confirmPickup}
        onConfirmDelivery={actions.confirmDelivery}
        onConfirmPodSubmission={actions.confirmPodSubmission}
        onReportPodFailure={actions.reportPodFailure}
        onCapturePhoto={async () => {
          try {
            const ImagePicker = await import('expo-image-picker');
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              actions.setCaptainPodState('error');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              quality: 0.5,
              base64: false,
            });
            if (!result.canceled && result.assets[0]) {
              actions.setCaptainPodPhotoUri(result.assets[0].uri);
              actions.setCaptainPodMediaKey(`local-pod-${Date.now()}`);
              actions.setCaptainPodState('success');
            } else {
              actions.setCaptainPodState('ready');
            }
          } catch (err) {
            console.warn('PoD capture failed', err);
            actions.setCaptainPodState('retry-required');
          }
        }}
        onRetryPod={() => actions.setCaptainPodState('ready')}
        onBack={actions.goBack}
        onGoToInbox={actions.goToInbox}
        onGoToAccount={actions.openCaptainAccount}
        onClosePickupSheet={() => { actions.setIsPickupSheetVisible(false); actions.setPickupSheetState('ready'); }}
        onCloseDeliverySheet={() => actions.setIsDeliverySheetVisible(false)}
        onCloseDeclineSheet={() => actions.setIsDeclineSheetVisible(false)}
        onConfirmDecline={actions.handleDeclineConfirm}
        onAcceptTask={actions.handleAcceptTask}
        onDeclineTask={(id) => { actions.setDeclineOrderId(id); actions.setIsDeclineSheetVisible(true); }}
        onOpenSupportScreen={actions.openCaptainSupportScreen}
        onOpenSupportDirectory={actions.openSupportDirectory}
        onOpenCaptainAccountSection={actions.openCaptainAccountSection}
        onToggleCaptainAvailability={() => actions.setCaptainAvailabilityStatus((c: any) => c === 'available' ? 'unavailable' : 'available')}
        onSetAppearanceMode={setAppearanceMode}
        onToggleStoreCourierMode={actions.toggleStoreCourierMode}
        onPushLocation={actions.pushLocation}
        onRingBell={() => {}}
      />
    );
  }

  // ── Home screen (route === 'home') ─────────────────────────────────────────
  const activeSummary = derived.activeSummary as NonNullable<CaptainOrderDetailSummary>;

  const orderPanelNode = (
    <DshCaptainHomeOrderPanel
      isAvailable={derived.isCaptainAvailable}
      availabilityLabel={derived.currentAvailabilityMeta.label}
      availabilityDescription={derived.currentAvailabilityMeta.description}
      availabilityChipTone={derived.currentAvailabilityMeta.chipTone}
      orderBadgeLabel={derived.currentAvailabilityMeta.orderBadgeLabel}
      inboxState={ui.inboxState as Parameters<typeof DshCaptainHomeOrderPanel>[0]['inboxState']}
      activeOrderDisplayId={derived.activeOrderDisplayId}
      activeSummary={activeSummary as any}
      activeOrderPhase={ui.activeOrderPhase}
      activeOrderExpanded={ui.activeOrderExpanded}
      activeOrderMessages={ui.activeOrderMessages}
      activeOrderDraft={ui.activeOrderDraft}
      onSetActiveOrderDraft={actions.setActiveOrderDraft}
      onCycleAvailability={() => actions.setCaptainAvailabilityStatus((c: any) => c === 'available' ? 'unavailable' : 'available')}
      onOpenInbox={actions.goToInbox}
      onRetryInbox={actions.resetInboxState}
      onExpandOrder={() => actions.setActiveOrderExpanded(true)}
      onCollapseOrder={() => actions.setActiveOrderExpanded(false)}
      onConfirmPickup={actions.confirmPickup}
      onConfirmDelivery={actions.confirmDelivery}
      onOpenMap={() => actions.setRoute('map')}
      onSendMessage={actions.sendQuickMessage}
    />
  );

  return (
    <Box style={{ flex: 1, position: 'relative' }} background="background">
      {topBar}
      <Box background="background" padding={0} gap={0} radiusToken="none" border={false} style={{ flex: 1, marginTop: -2, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', paddingBottom: derived.showBottomNav ? (Platform.OS === 'android' ? 112 : 80) : 0 }}>
        {derived.isStoreCourierMode ? (
          <DshCaptainStoreCourierHomeContent
            courierStage={ui.storeCourierStage}
            showBottomNav={derived.showBottomNav}
            isAndroid={Platform.OS === 'android'}
            safeAreaBottom={insets.bottom}
            onMarkPickedUp={() => { actions.setStoreCourierStage('picked_up'); actions.setActiveOrderPhase('delivery'); }}
            onMarkOutForDelivery={() => { actions.setStoreCourierStage('out_for_delivery'); actions.setActiveOrderPhase('delivery'); }}
            onOpenProof={actions.openStoreCourierProof}
            onMarkDeliveryFailed={() => { actions.setStoreCourierStage('delivery_failed'); actions.openSupportDirectory(); }}
            onRetryDelivery={() => actions.setStoreCourierStage(ui.storeCourierStage === 'picked_up' ? 'ready_for_pickup' : 'out_for_delivery')}
            onOpenSupport={actions.openSupportDirectory}
            onOpenOrders={() => actions.openCaptainAccountSection('account-orders')}
            bottomNavNode={captainBottomNavBar}
          />
        ) : (
          <DshCaptainMapLayer
            isAvailable={derived.isCaptainAvailable}
            availabilityLabel={derived.currentAvailabilityMeta.label}
            isGpsEnabled={derived.isGpsEnabled}
            onToggleAvailability={(v) => actions.setCaptainAvailabilityStatus(v ? 'available' : 'unavailable')}
            onToggleGps={(v) => actions.setGpsStatus(v ? 'ready' : 'disabled')}
            orderPanelNode={orderPanelNode}
            bottomNavOffset={derived.showBottomNav ? (Platform.OS === 'android' ? 112 : 80) : 0}
            safeAreaBottom={insets.bottom}
            showBottomNav={derived.showBottomNav}
          />
        )}
      </Box>
      {derived.showBottomNav && (
        <View style={{ position: 'absolute', bottom: 50, left: 16, right: 16, zIndex: 1000 }}>
          {captainBottomNavBar}
        </View>
      )}
    </Box>
  );
}

// export default DshCaptainSurface; // Unused default export