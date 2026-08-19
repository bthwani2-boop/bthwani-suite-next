import React from 'react';
import { ActivityIndicator, BackHandler, Platform, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text, spacing, colorRoles, radius } from '@bthwani/ui-kit';
import type { DshPartnerSurfaceProps } from './dsh-partner.types';
import { useDshPartnerSurfaceModel } from './useDshPartnerSurfaceModel';
import { PlatformVarsProvider, usePlatformVars } from '../shared/platform';
import { PartnerStoreScopeSheet } from './store/PartnerStoreScopeSheet';
import { DshPartnerOrderJourneyRenderer } from './DshPartnerOrderJourneyRenderer';

const COLORS = {
  background: colorRoles.surfaceMuted,
  surface: colorRoles.surfaceBase,
  surfaceElevated: colorRoles.surfaceBase,
  text: colorRoles.textPrimary,
  textMuted: colorRoles.textMuted,
  brand: colorRoles.brandAction,
  brandSoft: colorRoles.brandActionSoft,
  line: colorRoles.borderSubtle,
  lineStrong: colorRoles.borderStrong,
  success: colorRoles.success,
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
      <DshPartnerSurfaceInner {...props} />
    </PlatformVarsProvider>
  );
}

function DshPartnerSurfaceInner({ initialRoute = 'inbox', initialOrderId = '' }: DshPartnerSurfaceProps = {}) {
  const insets = useSafeAreaInsets();
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

  const storeScopeSheet = (
    <PartnerStoreScopeSheet
      visible={storeScopeVisible}
      onClose={() => setStoreScopeVisible(false)}
      options={scopes}
      selectedId={selectedStoreScopeId ?? ''}
      onSelect={setSelectedStoreScopeId}
    />
  );

  if (!selectedStoreScope) {
    if (isLoadingScopes) {
      return (
        <View style={styles.shellContainer}>
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        </View>
      );
    }

    if (!scopesError && scopes.length > 1) {
      return (
        <View style={styles.shellContainer}>
          <View style={styles.emptyStateContainer}>
            <Icon name="storefront-outline" size={48} tone="brand" />
            <Text role="bodyStrong" style={styles.emptyStateTitle}>
              اختر الفرع النشط
            </Text>
            <Text role="body" style={styles.emptyStateDesc}>
              لديك أكثر من فرع. يجب اختيار الفرع صراحةً قبل تنفيذ أي عملية تشغيلية.
            </Text>
            <Button label="اختيار الفرع" onPress={openStoreScope} />
          </View>
          {storeScopeSheet}
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

  const topBar = (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
      <Pressable onPress={() => openAccountHub('profile')} style={styles.profileButton} accessibilityLabel="الملف التعريفي للمتجر">
        <View style={styles.profileAvatar}>
          <Icon name="storefront-outline" size={22} tone="brand" />
        </View>
      </Pressable>

      <Pressable onPress={openStoreScope} style={styles.storeScopeButton} accessibilityLabel="تغيير الفرع النشط">
        <Text role="bodyStrong" style={styles.storeNameText}>{runtimePartnerProfile.storeName}</Text>
        <View style={styles.storeScopeDetails}>
          <Text role="caption" tone="muted">{`${selectedStoreScope.displayName} · ${runtimePartnerProfile.activeZoneLabel}`}</Text>
          <Icon name="chevron-down" size={14} tone="muted" />
        </View>
      </Pressable>

      <View style={styles.headerActions}>
        <Pressable accessibilityLabel="البحث عن الطلبات" onPress={openOrdersSearch} style={styles.headerActionButton}>
          <Icon name="search-outline" size={22} tone="brand" />
        </Pressable>
        <Pressable accessibilityLabel="الإشعارات" onPress={() => { setActiveOrderId(initialOrderId); setRoute('bell'); }} style={styles.headerActionButton}>
          <Icon name="notifications-outline" size={22} tone="brand" />
        </Pressable>
      </View>
    </View>
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
    <View style={[styles.bottomNavContainer, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {navItems.map((item) => {
        const isActive = bottomActiveId === item.id;
        const iconName = isActive ? item.activeIcon : item.icon;
        return (
          <Pressable
            key={item.id}
            onPress={() => handleNavSelect(item.id)}
            style={[styles.navTab, isActive && styles.navTabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={[styles.navIconWrapper, isActive && styles.navIconWrapperActive]}>
              <Icon name={iconName} size={22} tone={isActive ? 'brand' : 'muted'} />
            </View>
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
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    shadowColor: colorRoles.shadowBase,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  profileButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeScopeButton: {
    flex: 1,
    marginHorizontal: spacing[3],
    gap: 2,
  },
  storeNameText: {
    color: COLORS.text,
    fontSize: 15,
  },
  storeScopeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: spacing[6],
    gap: spacing[2],
  },
  emptyStateTitle: {
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyStateDesc: {
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  mainContentContainer: {
    flex: 1,
    paddingBottom: 76,
  },
  surfaceContentContainer: {
    flex: 1,
    paddingBottom: 76,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: colorRoles.shadowBase,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
    paddingTop: spacing[2],
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  navTabActive: {},
  navIconWrapper: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapperActive: {
    backgroundColor: COLORS.brandSoft,
  },
  navTabText: {
    fontSize: 11,
  },
  navTabTextActive: {
    color: COLORS.brand,
    fontWeight: '700',
  },
  navTabTextInactive: {
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});

// export default DshPartnerSurface; // Unused default export
