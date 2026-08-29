import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text, spacing, colorRoles } from '@bthwani/ui-kit';
import type { DshPartnerSurfaceProps, PartnerHubSection } from './dsh-partner.types';
import { useDshPartnerSurfaceModel } from './useDshPartnerSurfaceModel';
import { PlatformVarsProvider, usePlatformVars } from '../shared/platform';
import { PartnerStoreScopeSheet } from './store/PartnerStoreScopeSheet';
import { DshPartnerOrderJourneyRenderer } from './DshPartnerOrderJourneyRenderer';

const COLORS = {
  background: colorRoles.surfaceMuted,
  surface: colorRoles.surfaceBase,
  text: colorRoles.textPrimary,
  textMuted: colorRoles.textMuted,
  brand: colorRoles.brandAction,
  brandSoft: colorRoles.brandActionSoft,
  line: colorRoles.borderSubtle,
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

function DshPartnerSurfaceInner({ route, navigation, appearance }: DshPartnerSurfaceProps) {
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
    teamError,
  } = useDshPartnerSurfaceModel(route.kind);

  const accountHubSection: PartnerHubSection = route.kind === 'home' ? route.section : 'hub';
  const bottomActiveId = React.useMemo(() => {
    if (route.kind === 'inbox') return 'orders';
    if (route.kind === 'home') {
      if (accountHubSection === 'wallet') return 'wallet';
      if (accountHubSection === 'operations') return 'operations';
      if (accountHubSection === 'inventory') return 'inventory';
      return 'profile';
    }
    if (
      route.kind === 'inventory-management'
      || route.kind === 'product-edit'
      || route.kind === 'category-management'
      || route.kind === 'product-media'
      || route.kind === 'product-controls'
    ) return 'inventory';
    if (
      route.kind === 'support-directory'
      || route.kind === 'support-screen'
      || route.kind === 'store-courier'
      || route.kind === 'commercial-model'
    ) return 'operations';
    return '';
  }, [route, accountHubSection]);

  const storeScopeSheet = (
    <PartnerStoreScopeSheet
      visible={state.storeScopeVisible}
      onClose={() => actions.setStoreScopeVisible(false)}
      options={scopes}
      selectedId={state.selectedStoreScopeId}
      onSelect={actions.setSelectedStoreScopeId}
    />
  );

  if (isLoadingScopes || !selectedStoreScope) {
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
            <Text role="bodyStrong" style={styles.emptyStateTitle}>اختر الفرع النشط</Text>
            <Text role="body" style={styles.emptyStateDesc}>
              لديك أكثر من فرع. يجب اختيار الفرع صراحةً قبل تنفيذ أي عملية تشغيلية.
            </Text>
            <Button label="اختيار الفرع" onPress={actions.openStoreScope} />
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

  if (scopesError) {
    return (
      <View style={styles.shellContainer}>
        <View style={styles.emptyStateContainer}>
          <Icon name="warning-outline" size={48} tone="danger" />
          <Text role="bodyStrong" style={styles.emptyStateTitle}>تعذر التحقق من صلاحية المتجر</Text>
          <Text role="body" style={styles.emptyStateDesc}>{scopesError}</Text>
          <Button label="اختيار متجر آخر" onPress={actions.openStoreScope} />
        </View>
        {storeScopeSheet}
      </View>
    );
  }

  const topBar = (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
      <Pressable
        onPress={() => navigation.navigate({ kind: 'home', section: 'profile' })}
        style={styles.profileButton}
        accessibilityLabel="الملف التعريفي للمتجر"
      >
        <View style={styles.profileAvatar}>
          <Icon name="storefront-outline" size={22} tone="brand" />
        </View>
      </Pressable>
      <Pressable onPress={actions.openStoreScope} style={styles.storeScopeButton} accessibilityLabel="تغيير الفرع النشط">
        <Text role="bodyStrong" style={styles.storeNameText}>{runtimePartnerProfile.storeName}</Text>
        <View style={styles.storeScopeDetails}>
          <Text role="caption" tone="muted">{`${selectedStoreScope.displayName} · ${runtimePartnerProfile.activeZoneLabel}`}</Text>
          <Icon name="chevron-down" size={14} tone="muted" />
        </View>
      </Pressable>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityLabel="البحث عن الطلبات"
          onPress={() => navigation.navigate({ kind: 'inbox', search: true })}
          style={styles.headerActionButton}
        >
          <Icon name="search-outline" size={22} tone="brand" />
        </Pressable>
        <Pressable
          accessibilityLabel="الإشعارات"
          onPress={() => navigation.navigate({ kind: 'bell' })}
          style={styles.headerActionButton}
        >
          <Icon name="notifications-outline" size={22} tone="brand" />
        </Pressable>
      </View>
    </View>
  );

  const navItems: readonly PartnerNavItem[] = [
    { id: 'operations', label: 'العمليات', icon: 'people-outline', activeIcon: 'people' },
    { id: 'wallet', label: 'المحفظة', icon: 'wallet-outline', activeIcon: 'wallet' },
    { id: 'orders', label: 'الطلبات', icon: 'receipt-outline', activeIcon: 'receipt' },
    { id: 'inventory', label: 'المخزون', icon: 'cube-outline', activeIcon: 'cube' },
    { id: 'profile', label: 'حسابي', icon: 'person-outline', activeIcon: 'person' },
  ];

  const handleNavSelect = (id: PartnerNavItem['id']) => {
    if (id === 'orders') navigation.navigate({ kind: 'inbox' });
    else if (id === 'profile') navigation.navigate({ kind: 'home', section: 'hub' });
    else if (id === 'wallet') navigation.navigate({ kind: 'home', section: 'wallet' });
    else if (id === 'inventory') navigation.navigate({ kind: 'inventory-management' });
    else navigation.navigate({ kind: 'support-directory', context: {
      filterId: 'all',
      highlightedCaseId: null,
      highlightedIssueCategoryId: null,
      preferredOperationalFlowId: null,
      preferredSupportRouteId: null,
      source: 'operations',
    } });
  };

  const bottomNavBar = route.kind !== 'entry' ? (
    <View style={[styles.bottomNavContainer, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {navItems.map((item) => {
        const isActive = bottomActiveId === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => handleNavSelect(item.id)}
            style={[styles.navTab, isActive && styles.navTabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={[styles.navIconWrapper, isActive && styles.navIconWrapperActive]}>
              <Icon name={isActive ? item.activeIcon : item.icon} size={22} tone={isActive ? 'brand' : 'muted'} />
            </View>
            <Text role="caption" style={[styles.navTabText, isActive ? styles.navTabTextActive : styles.navTabTextInactive]}>
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
      <View style={styles.mainContentContainer}>{content}</View>
      {storeScopeSheet}
      {bottomNavBar}
    </View>
  );
  const renderSurfaceShell = (content: React.ReactNode): React.ReactElement => (
    <View style={styles.shellContainer}>
      <View style={styles.surfaceContentContainer}>{content}</View>
      {storeScopeSheet}
      {bottomNavBar}
    </View>
  );

  return (
    <DshPartnerOrderJourneyRenderer
      route={route}
      navigation={navigation}
      appearance={appearance}
      partnerOrdersState={partnerOrdersState}
      partnerOrders={partnerOrders}
      runtimePartnerProfile={runtimePartnerProfile}
      selectedStoreScope={selectedStoreScope}
      deliveryOpsSummary={deliveryOpsSummary}
      {...(dshClientId ? { dshClientId } : {})}
      renderMainShell={renderMainShell}
      renderSurfaceShell={renderSurfaceShell}
      openStoreScope={actions.openStoreScope}
      refreshOrders={actions.refreshOrders}
      teamMembers={teamMembers}
      isTeamLoading={isTeamLoading}
      teamError={teamError}
      onInviteMember={actions.onInviteMember}
      onMemberAction={actions.onMemberAction}
      scopes={scopes}
    />
  );
}

const styles = StyleSheet.create({
  shellContainer: { flex: 1, position: 'relative', backgroundColor: COLORS.background },
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
  profileButton: { justifyContent: 'center', alignItems: 'center' },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeScopeButton: { flex: 1, marginHorizontal: spacing[3], gap: 2 },
  storeNameText: { color: COLORS.text, fontSize: 15 },
  storeScopeDetails: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  headerActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[2] },
  emptyStateTitle: { color: COLORS.text, textAlign: 'center' },
  emptyStateDesc: { color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  mainContentContainer: { flex: 1, paddingBottom: 76 },
  surfaceContentContainer: { flex: 1, paddingBottom: 76 },
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
  navTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 2 },
  navTabActive: {},
  navIconWrapper: { width: 36, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navIconWrapperActive: { backgroundColor: COLORS.brandSoft },
  navTabText: { fontSize: 11 },
  navTabTextActive: { color: COLORS.brand, fontWeight: '700' },
  navTabTextInactive: { color: COLORS.textMuted, fontWeight: '500' },
});
