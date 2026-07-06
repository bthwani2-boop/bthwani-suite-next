import React from 'react';
import { BackHandler, Platform, View, Pressable, StyleSheet, I18nManager } from 'react-native';
import { Button, Card, Icon, Text, spacing, colorRoles } from '@bthwani/ui-kit';
import type { DshPartnerSurfaceProps } from './dsh-partner.types';
import { storeScopeOptions } from './dsh-partner.navigation-bridge';
import { useDshPartnerSurfaceModel } from './useDshPartnerSurfaceModel';
import { PlatformVarsProvider, FeatureFlagProvider, usePlatformVars } from '../shared/platform';
import { PartnerStoreScopeSheet } from './store/PartnerStoreScopeSheet';
import { DshPartnerRouteRenderer } from './DshPartnerRouteRenderer';
import { configureIdentitySession } from '@bthwani/core-identity';
import { resolveIdentityApiBaseUrl } from '../shared/_kernel/identity-api-base-url';

configureIdentitySession(resolveIdentityApiBaseUrl());

const COLORS = {
  background: colorRoles.surfaceBase,
  surface: colorRoles.surfaceBase,
  text: colorRoles.brandStructure,
  textMuted: colorRoles.brandStructure,
  brand: colorRoles.brandStructure,
  brandAction: colorRoles.brandAction,
  line: colorRoles.surfaceBase,
  success: colorRoles.brandStructure,
  white: colorRoles.surfaceBase,
};

export function DshPartnerSurface(props: DshPartnerSurfaceProps) {
  return (
    <PlatformVarsProvider>
      <FeatureFlagProvider>
        <DshPartnerSurfaceInner {...props} />
      </FeatureFlagProvider>
    </PlatformVarsProvider>
  );
}

function DshPartnerSurfaceInner({ initialRoute = 'inbox', initialOrderId = '' }: DshPartnerSurfaceProps = {}) {
  const { dshAuthBearerToken, dshClientId } = usePlatformVars();

  const {
    state,
    actions,
    selectedStoreScope,
    runtimePartnerProfile,
    partnerOrdersState,
    partnerOrders,
    deliveryOpsSummary,
  } = useDshPartnerSurfaceModel(initialRoute, initialOrderId);

  const {
    route,
    storeScopeVisible,
    accountHubSection,
    ordersSearchMode,
    selectedStoreScopeId,
    editingProductId,
    activeOrderId,
    supportNav,
  } = state;

  const selectedSupportScreen = supportNav.screen;
  const supportCommandContext = supportNav.context;

  const setRoute = actions.setRoute;
  const setActiveOrderId = actions.setActiveOrderId;
  const setOrdersSearchMode = actions.setOrdersSearchMode;
  const setAccountHubSection = actions.setAccountHubSection;
  const setEditingProductId = actions.setEditingProductId;

  const openStoreScope = actions.openStoreScope;
  const setStoreScopeVisible = actions.setStoreScopeVisible;
  const setSelectedStoreScopeId = actions.setSelectedStoreScopeId;
  const setSelectedSupportScreen = actions.setSelectedSupportScreen;
  const setSupportCommandContext = actions.setSupportCommandContext;
  const openOrdersBoard = actions.openOrdersBoard;
  const openOrdersSearch = actions.openOrdersSearch;
  const openAccountHub = actions.openAccountHub;
  const goBackToHub = actions.goBackToHub;
  const openSupportDirectory = actions.openSupportDirectory;
  const returnToSupportDirectory = actions.returnToSupportDirectory;
  const openSupportScreen = actions.openSupportScreen;
  const openInventoryManagement = actions.openInventoryManagement;
  const openStoreCourier = actions.openStoreCourier;
  const openSupportCommandFromOperationalFlow = actions.handleOperationalFlowNavigation;
  const handleMarkReady = actions.handleMarkReady;

  React.useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return actions.handleHardwareBackPress();
    });
    return () => subscription.remove();
  }, [actions]);

  const isRTL = I18nManager.isRTL;
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  // Custom premium header replacement
  const topBar = (
    <View style={[styles.headerContainer, { flexDirection: rowDirection }]}>
      <Pressable onPress={() => openAccountHub('profile')} style={styles.profileButton}>
        <Icon name="person-circle-outline" size={28} tone="brand" />
      </Pressable>

      <Pressable onPress={openStoreScope} style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 2 }}>
        <Text role="bodyStrong" style={{ color: COLORS.text }}>{runtimePartnerProfile.storeName}</Text>
        <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 4 }}>
          <Text role="caption" tone="muted">{`${selectedStoreScope.label} · ${runtimePartnerProfile.activeZoneLabel}`}</Text>
          <Icon name="chevron-down" size={12} tone="muted" />
        </View>
      </Pressable>

      <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing[3] }}>
        <Pressable accessibilityLabel="البحث عن الطلبات" onPress={openOrdersSearch}>
          <Icon name="search-outline" size={24} tone="brand" />
        </Pressable>
        <Pressable accessibilityLabel="الإشعارات" onPress={() => { setActiveOrderId(initialOrderId); setRoute('bell'); }}>
          <Icon name="notifications-outline" size={24} tone="brand" />
        </Pressable>
      </View>
    </View>
  );

  const storeScopeSheet = (
    <PartnerStoreScopeSheet
      visible={storeScopeVisible}
      onClose={() => setStoreScopeVisible(false)}
      options={storeScopeOptions}
      selectedId={selectedStoreScopeId}
      onSelect={setSelectedStoreScopeId}
    />
  );

  const showBottomNav = route !== 'entry';
  const bottomActiveId = React.useMemo(() => {
    if (route === 'inbox') return 'orders';
    if (route === 'home') {
      if (accountHubSection === 'wallet') return 'wallet';
      if (accountHubSection === 'operations') return 'operations';
      if (accountHubSection === 'inventory') return 'inventory';
      return 'profile';
    }
    if (route === 'inventory-management') return 'inventory';
    if (route === 'support-directory' || route === 'support-screen' || route === 'order-rejection') return 'operations';
    return '';
  }, [route, accountHubSection]);

  const navItems = [
    { id: 'operations', label: 'العمليات', icon: 'people-outline', activeIcon: 'people' },
    { id: 'wallet', label: 'المحفظة', icon: 'wallet-outline', activeIcon: 'wallet' },
    { id: 'orders', label: 'الطلبات', icon: 'receipt-outline', activeIcon: 'receipt' },
    { id: 'inventory', label: 'المخزون', icon: 'cube-outline', activeIcon: 'cube' },
    { id: 'profile', label: 'حسابي', icon: 'person-outline', activeIcon: 'person' },
  ];

  const handleNavSelect = (id: string) => {
    if (id === 'orders') openOrdersBoard();
    else if (id === 'profile') openAccountHub('hub');
    else if (id === 'wallet') openAccountHub('wallet');
    else if (id === 'inventory') openInventoryManagement();
    else if (id === 'operations') openSupportDirectory({ source: 'operations' });
  };

  // Custom Bottom Navigation Bar
  const bottomNavBar = showBottomNav ? (
    <View style={[styles.bottomNavContainer, { flexDirection: rowDirection }]}>
      {navItems.map((item) => {
        const isActive = bottomActiveId === item.id;
        const iconName = isActive ? item.activeIcon : item.icon;
        return (
          <Pressable
            key={item.id}
            onPress={() => handleNavSelect(item.id)}
            style={styles.navTab}
          >
            <Icon name={iconName as any} size={20} tone={isActive ? 'brand' : 'muted'} />
            <Text
              role="caption"
              style={{
                fontSize: 10,
                color: isActive ? COLORS.brand : COLORS.textMuted,
                fontWeight: isActive ? '700' : '400',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  const renderMainShell = (content: React.ReactNode): React.ReactElement => (
    <View style={styles.shellContainer}>
      {topBar}
      <View style={styles.mainContentContainer}>
        {content}
      </View>
      {storeScopeSheet}
      {bottomNavBar}
    </View>
  );

  const renderSurfaceShell = (content: React.ReactNode): React.ReactElement => (
    <View style={styles.shellContainer}>
      <View style={styles.surfaceContentContainer}>
        {content}
      </View>
      {storeScopeSheet}
      {bottomNavBar}
    </View>
  );

  return (
    <DshPartnerRouteRenderer
      route={route}
      initialOrderId={initialOrderId}
      activeOrderId={activeOrderId}
      ordersSearchMode={ordersSearchMode}
      accountHubSection={accountHubSection}
      editingProductId={editingProductId}
      selectedSupportScreen={selectedSupportScreen}
      supportCommandContext={supportCommandContext}
      partnerOrdersState={partnerOrdersState}
      partnerOrders={partnerOrders}
      runtimePartnerProfile={runtimePartnerProfile}
      selectedStoreScope={selectedStoreScope}
      selectedStoreScopeId={selectedStoreScopeId}
      deliveryOpsSummary={deliveryOpsSummary}
      dshAuthBearerToken={dshAuthBearerToken ?? undefined}
      dshClientId={dshClientId ?? undefined}
      renderMainShell={renderMainShell}
      renderSurfaceShell={renderSurfaceShell}
      setRoute={setRoute}
      setActiveOrderId={setActiveOrderId}
      setOrdersSearchMode={setOrdersSearchMode}
      setAccountHubSection={setAccountHubSection}
      setEditingProductId={setEditingProductId}
      setSupportState={({ screenId, commandContext }) => {
        setSelectedSupportScreen(screenId);
        setSupportCommandContext(commandContext);
      }}
      openOrdersBoard={openOrdersBoard}
      openOrdersSearch={openOrdersSearch}
      openAccountHub={openAccountHub}
      goBackToHub={goBackToHub}
      openSupportDirectory={openSupportDirectory}
      returnToSupportDirectory={returnToSupportDirectory}
      openSupportScreen={openSupportScreen}
      openInventoryManagement={openInventoryManagement}
      openStoreCourier={openStoreCourier}
      openSupportCommandFromOperationalFlow={openSupportCommandFromOperationalFlow}
      handleMarkReady={handleMarkReady}
    />
  );
}

const styles = StyleSheet.create({
  shellContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  profileButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContentContainer: {
    flex: 1,
    marginTop: -2,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'visible',
    paddingBottom: Platform.OS === 'android' ? 72 : 80,
  },
  surfaceContentContainer: {
    flex: 1,
    overflow: 'visible',
    paddingBottom: Platform.OS === 'android' ? 72 : 80,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1000,
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  navTab: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
});

export default DshPartnerSurface;
