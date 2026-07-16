import React from 'react';
import { Pressable, View } from 'react-native';
import {
  Badge,
  Box,
  Button,
  Divider,
  Icon,
  MobileScrollView,
  StateView,
  Surface,
  Text,
  TextField,
  useDirection,
  radius,
  spacing,
} from '@bthwani/ui-kit';

import {
  getWltDshPartnerOperationalModeCommission,
  WltDshPartnerBridge,
} from '../../shared/finance/partner-finance';
import { mapPublishStageToPartnerActivationStatus, resolveDshStoreClientVisibility } from '../../shared/partner/dsh-client-visibility.model';
import type { DshPartnerHubSurfaceProps, PartnerHubSection } from '../dsh-partner.types';
import { getDshControlPanelGovernanceEntry } from '../../shared/orders/orders.contract';
import {
  getDshPartnerJourneyStep,
  type DshPartnerLifecycleStage,
} from '../../shared/partner/partner.journey';
import {
  getDshPartnerActivationStateMetadata,
  getDshPartnerActivationStatusLabel,
  isDshPartnerActivationComplete,
  isDshPartnerClientVisible,
} from '../../shared/partner/partner-activation.model';
import { usePartnerSelfController } from '../../shared/partner/use-partner-self-controller';
import { useIdentitySession } from '@bthwani/core-identity';
import { useDshEntityMedia } from '../../shared/media/useDshEntityMedia';
import { PartnerHubStoreHero } from './PartnerHubStoreHero';
import { PartnerCatalogManagementScreen } from '../catalog/PartnerCatalogManagementScreen';
import { StoreProfileScreen } from '../store/StoreProfileScreen';
import { PartnerOnboardingStatusView } from './PartnerOnboardingStatusView';

import type {
  BThwaniAppearanceMode,
  DshCanonicalStoreCard,
  NotificationPreferenceId,
  NotificationPreferenceState,
  PartnerCoverageZone,
  PartnerOperationalMode,
  SummaryItem,
} from '../../shared/partner/partner-hub.types';
import {
  hubNavigationItems,
  HubNavRow,
  HubSectionShell,
  partnerHubBottomInset,
  partnerHubTheme as theme,
  sectionCopy,
} from './PartnerHubNav';
import { OperationsPanel } from './PartnerOperationsPanel';
import { AnalyticsInsightsPanel } from './PartnerAnalyticsInsightsPanel';
import { PartnerHubSettingsPanel } from './PartnerHubSettingsPanel';

function useAppPartnerAppearance() {
  const [mode, setMode] = React.useState<BThwaniAppearanceMode>('lightPremium');
  return {
    hydrated: true,
    mode,
    setMode,
  };
}

const defaultNotificationPreferences: NotificationPreferenceState = {
  orders: true,
  operations: true,
  inventory: true,
  finance: true,
  marketing: false,
  system: true,
  sound: true,
  dailyDigest: false,
  priorityOnly: false,
};

export function DshPartnerHubSurface(props: DshPartnerHubSurfaceProps) {

  const {
    state = 'ready',
    section,
    onSectionChange,
    storeName = 'متجر الفخامة',
    branchLabel = 'الرياض، فرع الياسمين',
    cityLabel = 'الرياض',
    managerLabel = 'خالد',
    todayHoursLabel = '09:00 - 23:00',
    storeOpen = true,
    listingEnabled = true,
    activeZoneLabel = 'الياسمين / الندى',
    activeOrdersCount = 13,

    onOpenOrdersBoard,
    onOpenOrdersSearch,
    onOpenStoreScope,
    onOpenSupportDirectory,
    onOpenWalletHub,
    onOpenBell,
    onOpenOperationalFlow,
    onOpenSupportScreen,
    onOpenStoreCourierSetup,
    onToggleAvailability,
    canonicalStoreId,
    dshClientId,
    walletBalanceLabel,
    // ML-T1: partner lifecycle stage for readiness status summary (read-only, summary-only per on-demand contract)
    partnerLifecycleStage = 'partner-review' as DshPartnerLifecycleStage,
  } = props as DshPartnerHubSurfaceProps & { partnerLifecycleStage?: DshPartnerLifecycleStage; dshClientId?: string | null };

  const [isAvailable, setIsAvailable] = React.useState<boolean>(storeOpen);
  const [resolvedListingEnabled, setResolvedListingEnabled] = React.useState<boolean>(listingEnabled);


  const { direction } = useDirection();

  const partnersGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('partners'), []);
  const catalogsGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('catalogs'), []);
  const marketingGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('marketing'), []);
  const financeGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('finance'), []);
  // ML-T1: journey map reference — summary-only; details on-demand per on-demand contract
  const partnerStatusStep = React.useMemo(() => getDshPartnerJourneyStep(undefined), []);
  const {
    hydrated: appearanceHydrated,
    mode: appearanceMode,
    setMode: setAppearanceMode,
  } = useAppPartnerAppearance();
  const [internalSection, setInternalSection] = React.useState<PartnerHubSection>('hub');
  const [notificationPreferences, setNotificationPreferences] = React.useState<NotificationPreferenceState>(defaultNotificationPreferences);
  const [showAdvancedNotifications, setShowAdvancedNotifications] = React.useState<boolean>(false);
  const activeSection = section ?? internalSection;
  const updateSection = onSectionChange ?? setInternalSection;
  const activeCanonicalStore = React.useMemo((): DshCanonicalStoreCard | undefined => {
    return undefined;
  }, []);
  const identity = useIdentitySession();
  const {
    statusState: selfStatusState,
    readinessState: selfReadinessState,
    readinessViewModel: selfReadinessViewModel,
    reload: reloadSelfStatus,
  } = usePartnerSelfController(identity.state.kind);
  const resolvedActivationStatus = selfStatusState.kind === 'success'
    ? selfStatusState.partner.activationStatus
    : mapPublishStageToPartnerActivationStatus(activeCanonicalStore?.publishStage);
  // Publication gate split (shared model owns the decision, this surface renders it):
  // partner_active/client_hidden = internally active, NOT client-facing yet.
  // client_visible = full operational surfaces tied to client exposure.
  const isClientVisibleStage = isDshPartnerClientVisible(resolvedActivationStatus);
  const isInternalActiveOnly =
    identity.state.kind === 'authenticated' &&
    selfStatusState.kind === 'success' &&
    isDshPartnerActivationComplete(resolvedActivationStatus) &&
    !isClientVisibleStage;
  const _storeMediaId = activeCanonicalStore?.id ?? canonicalStoreId;
  const resolvedActiveZoneLabel = activeCanonicalStore?.zoneLabel ?? activeZoneLabel;

  const storeMediaState = useDshEntityMedia(_storeMediaId, 'store');
  const storeMediaAssets = storeMediaState.kind === 'ready' ? storeMediaState.assets : [];
  const storeCoverUrl = storeMediaAssets.find((a) => a.purpose === 'cover')?.public_url;
  const storeLogoUrl = storeMediaAssets.find((a) => a.purpose === 'logo')?.public_url;

  const [selectedModeId, setSelectedModeId] = React.useState<string>('pickup');
  const resolvedStoreName = activeCanonicalStore?.storeName ?? storeName;
  const resolvedCityLabel = activeCanonicalStore?.cityLabel ?? cityLabel;
  const resolvedBranchLabel = activeCanonicalStore?.branchLabel ?? branchLabel;
  const resolvedManagerLabel = activeCanonicalStore?.managerName ?? managerLabel;
  const resolvedTodayHoursLabel = activeCanonicalStore?.operatingHoursLabel ?? todayHoursLabel;
  const [branchContact] = React.useState('011 555 0123');

  const activeHubNavigationItems = React.useMemo(() => {
    return hubNavigationItems.filter((item) => item.id !== 'profile');
  }, []);

  const [fetchedServiceModes, setFetchedServiceModes] = React.useState<PartnerOperationalMode[]>([]);
  const [fetchedCoverageZones, setFetchedCoverageZones] = React.useState<PartnerCoverageZone[]>([]);
  const [coverageZonesError, setCoverageZonesError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!canonicalStoreId) return;

    import('../../shared/partner/partner.api').then(({ fetchPartnerStoreSettings, fetchPartnerStoreCoverageZones }) => {
      fetchPartnerStoreSettings(canonicalStoreId).then((raw) => {
        const res = raw as { deliveryModes?: string[]; storeOpen?: boolean; listingEnabled?: boolean } | undefined;
        const backendModes = res?.deliveryModes || [];
        const mappedModes: PartnerOperationalMode[] = [
          { id: 'pickup', title: 'استلم بنفسك', subtitle: 'استلام من الفرع مباشرة.', commission: getWltDshPartnerOperationalModeCommission('pickup'), enabled: backendModes.includes('pickup') },
          { id: 'partner_delivery', title: 'توصيل المتجر', subtitle: 'قناة توصيل داخلية بموصل الشريك.', commission: getWltDshPartnerOperationalModeCommission('partner_delivery'), enabled: backendModes.includes('delivery') },
          { id: 'bthwani_delivery', title: 'توصيل بثواني', subtitle: 'توصيل عبر كابتن بثواني.', commission: getWltDshPartnerOperationalModeCommission('bthwani_delivery'), enabled: backendModes.includes('express') },
        ];
        setFetchedServiceModes(mappedModes);
        if (typeof res?.storeOpen === 'boolean') setIsAvailable(res.storeOpen);
        if (typeof res?.listingEnabled === 'boolean') setResolvedListingEnabled(res.listingEnabled);
      }).catch(() => {});

      fetchPartnerStoreCoverageZones(canonicalStoreId).then((zones) => {
        setFetchedCoverageZones(zones);
        setCoverageZonesError(null);
      }).catch(() => {
        setCoverageZonesError('تعذّر تحميل مناطق التغطية. حاول مرة أخرى.');
      });
    }).catch(() => {});
  }, [canonicalStoreId]);

  const serviceModes = fetchedServiceModes.length > 0 ? fetchedServiceModes : [
    { id: 'pickup', title: 'استلم بنفسك', subtitle: 'استلام من الفرع مباشرة.', commission: getWltDshPartnerOperationalModeCommission('pickup'), enabled: true },
    { id: 'partner_delivery', title: 'توصيل المتجر', subtitle: 'قناة توصيل داخلية بموصل الشريك.', commission: getWltDshPartnerOperationalModeCommission('partner_delivery'), enabled: true },
    { id: 'bthwani_delivery', title: 'توصيل بثواني', subtitle: 'توصيل عبر كابتن بثواني.', commission: getWltDshPartnerOperationalModeCommission('bthwani_delivery'), enabled: false },
  ] as PartnerOperationalMode[];

  const coverageZonesToUse = fetchedCoverageZones;

  const storeVisibility = React.useMemo(() => {
    return resolveDshStoreClientVisibility({
      ...(activeCanonicalStore?.publishStage !== undefined ? { publishStage: activeCanonicalStore.publishStage } : {}),
      activationStatus: resolvedActivationStatus,
      catalogPublished: resolvedListingEnabled,
      deliveryModesReady: serviceModes.some((mode) => mode.enabled),
      serviceabilityAvailable: true,
      storeOpen: isAvailable,
    });
  }, [resolvedListingEnabled, activeCanonicalStore?.publishStage, resolvedActivationStatus, serviceModes, isAvailable]);

  const visibilityLabel = resolvedListingEnabled ? 'مفعّل' : 'موقوف';

  const enabledNotificationChannelsCount = React.useMemo(
    () => ['orders', 'operations', 'inventory', 'finance', 'marketing', 'system'].filter((key) => notificationPreferences[key as NotificationPreferenceId]).length,
    [notificationPreferences],
  );

  function updateNotificationPreference(preferenceId: NotificationPreferenceId, nextValue: boolean) {
    // Optimistic UI update
    setNotificationPreferences((current) => ({
      ...current,
      [preferenceId]: nextValue,
    }));
    // Wire to backend
    import('../../shared/notifications/notifications.api').then(({ updateNotificationPreferences }) => {
      updateNotificationPreferences(preferenceId, nextValue).catch(() => {
        // Rollback on failure (simplified)
        setNotificationPreferences((current) => ({
          ...current,
          [preferenceId]: !nextValue,
        }));
      });
    }).catch(console.error);
  }

  function openOrderAlerts() {
    onOpenOperationalFlow?.('order-alerts');
    onOpenBell?.();
  }

  function openOperationsDirectory() {
    onOpenOperationalFlow?.('order-issue-queue');
    onOpenSupportDirectory?.();
    onOpenSupportScreen?.('order-issue-queue');
  }

  const openOrdersSearch = React.useCallback(() => {
    if (onOpenOrdersSearch) {
      onOpenOrdersSearch();
      return;
    }

    onOpenOrdersBoard?.();
  }, [onOpenOrdersBoard, onOpenOrdersSearch]);

  const summaryItems = React.useMemo<readonly SummaryItem[]>(
    () => [
      { id: 'store-status', label: 'حالة المتجر', value: isAvailable ? 'مفتوح الآن' : 'مغلق الآن', tone: isAvailable ? 'success' : 'warning' },
      { id: 'active-orders', label: 'الطلبات النشطة', value: String(activeOrdersCount), tone: 'brand' },
      { id: 'hours', label: 'ساعات العمل', value: resolvedTodayHoursLabel, tone: 'info' },
    ],
    [activeOrdersCount, resolvedTodayHoursLabel, isAvailable],
  );

  if (state !== 'ready') {
    const isLoading = state === 'loading';
    const tone = state === 'offline' ? 'warning' : state === 'empty' ? 'neutral' : state === 'loading' ? 'neutral' : 'danger';

    return (
      <StateView
        loading={isLoading}
        tone={tone}
        title="مركز حساب الشريك"
        description="نجهز الآن نموذج التنقل الخاص بالحساب. سيبقى المسار واضحًا ومضغوطًا حتى يكتمل التحميل."
        actionLabel={onOpenOrdersBoard ? 'فتح الطلبات' : undefined}
        onActionPress={onOpenOrdersBoard}
      />
    );
  }

  if (identity.state.kind === 'authenticated' && (selfStatusState.kind === 'idle' || selfStatusState.kind === 'loading')) {
    return <StateView loading title="جاري تحميل حالة الانضمام…" />;
  }

  if (identity.state.kind === 'authenticated' && selfStatusState.kind === 'error') {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل حالة الانضمام"
        description={selfStatusState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={reloadSelfStatus}
      />
    );
  }

  if (identity.state.kind === 'authenticated' && selfStatusState.kind === 'success' && !isDshPartnerActivationComplete(selfStatusState.partner.activationStatus)) {
    return (
      <PartnerOnboardingStatusView
        selfStatusState={selfStatusState as any}
        selfReadinessState={selfReadinessState}
        selfReadinessViewModel={selfReadinessViewModel}
        reloadSelfStatus={reloadSelfStatus}
      />
    );
  }

  if (activeSection !== 'hub') {
    if (activeSection === 'profile') {
      return (
        <HubSectionShell title={sectionCopy.profile.title} description={sectionCopy.profile.description} icon={sectionCopy.profile.icon} onBack={() => updateSection('hub')}>
          <StoreProfileScreen
            storeName={resolvedStoreName}
            branchLabel={resolvedBranchLabel}
            cityLabel={resolvedCityLabel}
            managerLabel={resolvedManagerLabel}
            todayHoursLabel={resolvedTodayHoursLabel}
            activeZoneLabel={resolvedActiveZoneLabel}
            storeOpen={isAvailable}
            listingEnabled={resolvedListingEnabled}
            {...(activeCanonicalStore?.id !== undefined ? { canonicalStoreId: activeCanonicalStore.id } : {})}
            {...(activeCanonicalStore?.sourceRecordId !== undefined ? { sourceRecordId: activeCanonicalStore.sourceRecordId } : {})}
            {...(activeCanonicalStore?.deliveryReadinessLabel !== undefined ? { deliveryReadinessLabel: activeCanonicalStore.deliveryReadinessLabel } : {})}
            {...(activeCanonicalStore?.coverageSummary !== undefined ? { coverageSummary: activeCanonicalStore.coverageSummary } : {})}
            {...(activeCanonicalStore?.publishStage !== undefined ? { publishStage: activeCanonicalStore.publishStage } : {})}
            activationStatus={resolvedActivationStatus}
            serviceModes={serviceModes}
            {...(onOpenStoreScope !== undefined ? { onOpenStoreScope } : {})}
          />
        </HubSectionShell>
      );
    }

    if (activeSection === 'analytics') {
      // Growth/marketing surfaces imply client exposure — locked until client_visible.
      if (isInternalActiveOnly) {
        return (
          <HubSectionShell title={sectionCopy.analytics.title} description={sectionCopy.analytics.description} icon={sectionCopy.analytics.icon} onBack={() => updateSection('hub')}>
            <StateView
              tone="warning"
              title="التحليلات والتسويق غير متاحة قبل الظهور للعملاء"
              description="الشريك نشط داخليًا، المتجر غير ظاهر للعملاء حتى اكتمال بوابات النشر. تُفتح مؤشرات النمو والتسويق بعد تفعيل الظهور من لوحة التحكم."
            />
          </HubSectionShell>
        );
      }
      return (
        <HubSectionShell title={sectionCopy.analytics.title} description={sectionCopy.analytics.description} icon={sectionCopy.analytics.icon} onBack={() => updateSection('hub')}>
          <AnalyticsInsightsPanel storeName={resolvedStoreName} />
        </HubSectionShell>
      );
    }

    if (activeSection === 'wallet') {
      return (
        <WltDshPartnerBridge
          branchLabel={resolvedBranchLabel}
          activeZoneLabel={resolvedActiveZoneLabel}
          serviceModes={serviceModes.map((mode) => ({
            id: mode.id,
            label: mode.title,
            description: mode.subtitle,
            enabled: mode.enabled,
          }))}
          onBack={() => updateSection('hub')}
          onOpenExpandedWallet={onOpenWalletHub}
          onOpenSettlementReview={onOpenWalletHub}
          onOpenFinancialReport={onOpenWalletHub}
          dshClientId={dshClientId}
          canonicalStoreId={canonicalStoreId}
        />
      );
    }

    if (activeSection === 'settings') {
      return (
        <HubSectionShell title={sectionCopy.settings.title} description={sectionCopy.settings.description} icon={sectionCopy.settings.icon} onBack={() => updateSection('hub')}>
          <PartnerHubSettingsPanel
            appearanceMode={appearanceMode}
            setAppearanceMode={setAppearanceMode}
            notificationPreferences={notificationPreferences}
            updateNotificationPreference={updateNotificationPreference}
            showAdvancedNotifications={showAdvancedNotifications}
            setShowAdvancedNotifications={setShowAdvancedNotifications}
            resolvedListingEnabled={resolvedListingEnabled}
            isAvailable={isAvailable}
            todayHoursLabel={todayHoursLabel}
            openOrderAlerts={openOrderAlerts}
            {...(onOpenStoreScope !== undefined ? { onOpenStoreScope } : {})}
            openOperationsDirectory={openOperationsDirectory}
          />
        </HubSectionShell>
      );
    }

    if (activeSection === 'inventory') {
      return (
        <HubSectionShell title={sectionCopy.inventory.title} description={sectionCopy.inventory.description} icon={sectionCopy.inventory.icon} onBack={() => updateSection('hub')}>
          <PartnerCatalogManagementScreen />
        </HubSectionShell>
      );
    }

    if (activeSection === 'operations') {
      return (
        <OperationsPanel
          branchLabel={resolvedBranchLabel}
          cityLabel={resolvedCityLabel}
          storeName={resolvedStoreName}
          todayHoursLabel={resolvedTodayHoursLabel}
          storeOpen={isAvailable}
          activeZoneLabel={resolvedActiveZoneLabel}
          serviceModes={serviceModes}
          coverageZonesToUse={coverageZonesToUse}
          coverageZonesError={coverageZonesError}
          teamMembers={props.teamMembers ?? []}
          onBack={() => updateSection('hub')}
          {...(onOpenStoreCourierSetup !== undefined ? { onOpenStoreCourierSetup } : {})}
          {...(props.onOpenTeamManagement !== undefined ? { onOpenTeamManagement: props.onOpenTeamManagement } : {})}
          listingEnabled={resolvedListingEnabled}
          storeVisibility={storeVisibility}
          visibilityLabel={visibilityLabel}
        />
      );
    }

    const copy = sectionCopy[activeSection as Exclude<PartnerHubSection, 'hub'>];

    return (
      <HubSectionShell
        title={copy.title}
        description={copy.description}
        icon={copy.icon}
        onBack={() => updateSection('hub')}
      />
    );
  }

  return (
    <Box style={{ flex: 1, position: 'relative' }} background="background">
      <MobileScrollView fill padding={0} gap={4} contentContainerStyle={{ paddingBottom: partnerHubBottomInset }}>
        {/* Store header */}
        <PartnerHubStoreHero
          direction={direction}
          resolvedStoreName={resolvedStoreName}
          resolvedBranchLabel={resolvedBranchLabel}
          resolvedActiveZoneLabel={resolvedActiveZoneLabel}
          isAvailable={isAvailable}
          onOpenStoreScope={onOpenStoreScope}
          serviceModes={serviceModes}
          selectedModeId={selectedModeId}
          setSelectedModeId={setSelectedModeId}
        />

        <Box padding={4} gap={4}>
          {isInternalActiveOnly ? (
            <Surface
              style={{
                padding: spacing[3],
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: theme.warning,
              }}
            >
              <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing[2] }}>
                <Icon name="eye-off-outline" size={18} tone="warning" />
                <Text role="bodyStrong" tone="warning" style={{ flex: 1, textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                  الشريك نشط داخليًا، المتجر غير ظاهر للعملاء حتى اكتمال بوابات النشر
                </Text>
              </View>
            </Surface>
          ) : null}
          {/* 1) Wallet Balance Block */}
          <Box gap={2} paddingY={2}>
            <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
                <Text role="caption" tone="muted">رصيد المتجر الحالي</Text>
                <Text role="titleLg" tone="action">{walletBalanceLabel ?? '—'}</Text>
              </View>
              <Button
                label="عرض المحفظة"
                tone="secondary"
                fullWidth={false}
                onPress={() => updateSection('wallet')}
              />
            </View>
          </Box>

          <Divider />
          {/* 4) Main Sections Nav — icon + title + subtitle + chevron, RTL-correct */}
          <View style={{ gap: spacing[2] }}>
            {activeHubNavigationItems.map((item) => (
              <HubNavRow
                key={item.id}
                title={item.title}
                description={item.description}
                icon={item.icon}
                onPress={() => updateSection(item.section)}
              />
            ))}
          </View>
        </Box>
      </MobileScrollView>
    </Box>
  );
}

export type PartnerHomeScreenProps = Omit<DshPartnerHubSurfaceProps, 'section'>;

function PartnerHomeScreen(props: PartnerHomeScreenProps) {
  return <DshPartnerHubSurface {...props} section="hub" />;
}

export type OperationsScreenProps = Omit<DshPartnerHubSurfaceProps, 'section'>;

function OperationsScreen(props: OperationsScreenProps) {
  return <DshPartnerHubSurface {...props} section="operations" />;
}

export type PartnerSettingsScreenProps = Omit<DshPartnerHubSurfaceProps, 'section'>;

function PartnerSettingsScreen(props: PartnerSettingsScreenProps) {
  return <DshPartnerHubSurface {...props} section="settings" />;
}
