import React from 'react';
import { ActivityIndicator, BackHandler, Platform, View, Pressable, StyleSheet, I18nManager } from 'react-native';
import { Icon, Text, spacing, colorRoles } from '@bthwani/ui-kit';
import type { DshPartnerSurfaceProps } from './dsh-partner.types';
import { useDshPartnerSurfaceModel } from './useDshPartnerSurfaceModel';
import { PlatformVarsProvider, FeatureFlagProvider, usePlatformVars } from '../shared/platform';
import { PartnerStoreScopeSheet } from './store/PartnerStoreScopeSheet';
import { DshPartnerOrderJourneyRenderer } from './DshPartnerOrderJourneyRenderer';

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

type PartnerNavIconName = React.ComponentProps<typeof Icon>['name'];
type PartnerNavItem = {
  readonly id: 'operations' | 'wallet' | 'orders' | 'inventory' | 'profile';
  readonly label: string;
  readonly icon: PartnerNavIconName;
  readonly activeIcon: PartnerNavIconName;
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
  const { dshClientId } = usePlatformVars();

  const {
    state,
    actions,
    scopes,
    selectedStoreScope,
    isLoadingScopes,
    scopesError,
    runtimePartnerProfile,
    partnerOrdersState,
    partnerOrders,
    deliveryOpsSummary,
    teamMembers,
    isTeamLoading,
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

  React.useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return actions.handleHardwareBackPress();
    });
    return () => subscription.remove();
  }, [actions]);

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

  if (!selectedStoreScope) {
    if (isLoadingScopes) {
      return (
        <View style={styles.shellContainer}>
          <View style={styles.centerLoading}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.shellContainer}>
        <View style={styles.emptyStateContainer}>
          <Icon name="warning-outline" size={48} tone="muted" />
          <Text role="bodyStrong" style={styles.emptyStateTitle}>
            {scopesError ? 'حدث خطأ أثناء تحميل الفروع' : 'لا يوجد فروع مسجلة'}
          </Text>
          <Text role="body" style={styles.emptyStateDesc}>
            {scopesError ? 'يرجى المحاولة لاحقاً' : 'يرجى التواصل مع الدعم الفني لإضافة فروع لحسابك'}
          </Text>
        </View>
      </View>
    );
  }

  const isRTL = I18nManager.isRTL;
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  const topBar = (
    <View style={[styles.headerContainer, { flexDirection: rowDirection }]}>
      <Pressable onPress={() => openAccountHub('profile')} style={styles.profileButton}>
        <Icon name="person-circle-outline" size={28} tone="brand" />
      </Pressable>

      <Pressable onPress={openStoreScope} style={[styles.storeScopeButton, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text role="bodyStrong" style={styles.storeNameText}>{runtimePartnerProfile.storeName}</Text>
        <View style={[styles.storeScopeDetails, { flexDirection: rowDirection }]}>
          <Text role="caption" tone="muted">{`${selectedStoreScope.displayName} · ${runtimePartnerProfile.activeZoneLabel}`}</Text>
          <Icon name="chevron-down" size={12} tone="muted" />
        </View>
      </Pressable>

      <View style={[styles.headerActions, { flexDirection: rowDirection }]}>
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
      options={scopes}
      selectedId={selectedStoreScopeId ?? ''}
      onSelect={setSelectedStoreScopeId}
    />
  );

  const showBottomNav = route !== 'entry';

  const navItems: readonly PartnerNavItem[] = [
    { id: 'operations', label: 'العمليات', icon: 'people-outline', activeIcon: 'people' },
    { id: 'wallet', label: 'المحفظة', icon: 'wallet-outline', activeIcon: 'wallet' },
    { id: 'orders', label: 'الطلبات', icon: 'receipt-outline', activeIcon: 'receipt' },
    { id: 'inventory', label: 'المخزون', icon: 'cube-outline', activeIcon: 'cube' },
    { id: 'profile', label: 'حسابي', icon: 'person-outline', activeIcon: 'person' },
  ];

  const handleNavSelect = (id: PartnerNavItem['id']) => {
    if (id === 'orders') openOrdersBoard();
    else if (id === 'profile') openAccountHub('hub');
    else if (id === 'wallet') openAccountHub('wallet');
    else if (id === 'inventory') openInventoryManagement();
    else if (id === 'operations') openSupportDirectory({ source: 'operations' });
  };

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
            <Icon name={iconName} size={20} tone={isActive ? 'brand' : 'muted'} />
            <Text
              role="caption"
              style={[
                styles.navTabText,
                isActive ? styles.navTabTextActive : styles.navTabTextInactive,
              ]}
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
    <DshPartnerOrderJourneyRenderer
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
      openStoreScope={() => setStoreScopeVisible(true)}
      openSupportCommandFromOperationalFlow={openSupportCommandFromOperationalFlow}
      refreshOrders={actions.refreshOrders}
      teamMembers={teamMembers}
      isTeamLoading={isTeamLoading}
      onInviteMember={actions.onInviteMember}
      onMemberAction={actions.onMemberAction}
      scopes={scopes}
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
  storeScopeButton: {
    flex: 1,
    gap: 2,
  },
  storeNameText: {
    color: COLORS.text,
  },
  storeScopeDetails: {
    alignItems: 'center',
    gap: 4,
  },
  headerActions: {
    alignItems: 'center',
    gap: spacing[3],
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    color: COLORS.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateDesc: {
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
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
  navTabText: {
    fontSize: 10,
  },
  navTabTextActive: {
    color: COLORS.brand,
    fontWeight: '700',
  },
  navTabTextInactive: {
    color: COLORS.textMuted,
    fontWeight: '400',
  },
});

// export default DshPartnerSurface; // Unused default export
