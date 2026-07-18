import React from "react";
import { View } from "react-native";
import {
  Box,
  Button,
  Divider,
  Icon,
  MobileScrollView,
  StateView,
  Surface,
  Text,
  useDirection,
  radius,
  spacing,
} from "@bthwani/ui-kit";
import { useIdentitySession } from "@bthwani/core-identity";

import {
  getWltDshPartnerOperationalModeCommission,
  WltDshPartnerBridge,
} from "../../shared/finance/partner-finance";
import { resolveDshStoreClientVisibility } from "../../shared/partner/dsh-client-visibility.model";
import {
  isDshPartnerActivationComplete,
  isDshPartnerClientVisible,
} from "../../shared/partner/partner-activation.model";
import { usePartnerSelfController } from "../../shared/partner/use-partner-self-controller";
import {
  fetchPartnerStoreCoverageZones,
  fetchPartnerStoreSettings,
} from "../../shared/partner/partner.api";
import type {
  BThwaniAppearanceMode,
  NotificationPreferenceId,
  NotificationPreferenceState,
  PartnerCoverageZone,
  PartnerOperationalMode,
} from "../../shared/partner/partner-hub.types";
import type {
  DshPartnerHubSurfaceProps,
  PartnerHubSection,
} from "../dsh-partner.types";
import { PartnerHubStoreHero } from "./PartnerHubStoreHero";
import { PartnerCatalogManagementScreen } from "../catalog/PartnerCatalogManagementScreen";
import { StoreProfileScreen } from "../store/StoreProfileScreen";
import { PartnerOnboardingStatusView } from "./PartnerOnboardingStatusView";
import {
  hubNavigationItems,
  HubNavRow,
  HubSectionShell,
  partnerHubBottomInset,
  partnerHubTheme as theme,
  sectionCopy,
} from "./PartnerHubNav";
import { OperationsPanel } from "./PartnerOperationsPanel";
import { AnalyticsInsightsPanel } from "./PartnerAnalyticsInsightsPanel";
import { PartnerHubSettingsPanel } from "./PartnerHubSettingsPanel";

function useAppPartnerAppearance() {
  const [mode, setMode] = React.useState<BThwaniAppearanceMode>("lightPremium");
  return { hydrated: true, mode, setMode };
}

const failClosedNotificationPreferences: NotificationPreferenceState = {
  orders: false,
  operations: false,
  inventory: false,
  finance: false,
  marketing: false,
  system: false,
  sound: false,
  dailyDigest: false,
  priorityOnly: false,
};

type PartnerStoreSettingsPayload = {
  readonly deliveryModes: readonly string[];
  readonly storeOpen: boolean;
  readonly listingEnabled: boolean;
};

type StoreRuntimeState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "success";
      readonly settings: PartnerStoreSettingsPayload;
      readonly serviceModes: readonly PartnerOperationalMode[];
      readonly coverageZones: readonly PartnerCoverageZone[];
    }
  | { readonly kind: "error"; readonly message: string };

function parseStoreSettings(raw: unknown): PartnerStoreSettingsPayload {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("أعاد DSH إعدادات متجر غير صالحة.");
  }
  const value = raw as Record<string, unknown>;
  if (
    !Array.isArray(value.deliveryModes) ||
    !value.deliveryModes.every((mode) => typeof mode === "string") ||
    typeof value.storeOpen !== "boolean" ||
    typeof value.listingEnabled !== "boolean"
  ) {
    throw new Error("إعدادات المتجر لا تطابق العقد المتوقع.");
  }
  return {
    deliveryModes: value.deliveryModes,
    storeOpen: value.storeOpen,
    listingEnabled: value.listingEnabled,
  };
}

function mapServiceModes(
  backendModes: readonly string[],
): readonly PartnerOperationalMode[] {
  return [
    {
      id: "pickup",
      title: "استلم بنفسك",
      subtitle: "استلام من الفرع مباشرة.",
      commission: getWltDshPartnerOperationalModeCommission("pickup"),
      enabled: backendModes.includes("pickup"),
    },
    {
      id: "partner_delivery",
      title: "توصيل المتجر",
      subtitle: "توصيل داخلي يديره الشريك.",
      commission: getWltDshPartnerOperationalModeCommission("partner_delivery"),
      enabled: backendModes.includes("partner_delivery"),
    },
    {
      id: "bthwani_delivery",
      title: "توصيل بثواني",
      subtitle: "توصيل عبر كابتن بثواني.",
      commission: getWltDshPartnerOperationalModeCommission("bthwani_delivery"),
      enabled: backendModes.includes("bthwani_delivery"),
    },
  ];
}

export function DshPartnerHubSurface(props: DshPartnerHubSurfaceProps) {
  const {
    state = "loading",
    section,
    onSectionChange,
    storeName,
    branchLabel,
    cityLabel,
    managerLabel,
    todayHoursLabel,
    storeOpen = false,
    listingEnabled = false,
    activeZoneLabel,
    activeOrdersCount = 0,
    onOpenOrdersBoard,
    onOpenOrdersSearch,
    onOpenStoreScope,
    onOpenSupportDirectory,
    onOpenWalletHub,
    onOpenBell,
    onOpenOperationalFlow,
    onOpenSupportScreen,
    onOpenStoreCourierSetup,
    canonicalStoreId,
    dshClientId,
    walletBalanceLabel,
  } = props;

  const identity = useIdentitySession();
  const { direction } = useDirection();
  const {
    statusState: selfStatusState,
    readinessState: selfReadinessState,
    readinessViewModel: selfReadinessViewModel,
    reload: reloadSelfStatus,
  } = usePartnerSelfController(identity.state.kind);
  const {
    hydrated: appearanceHydrated,
    mode: appearanceMode,
    setMode: setAppearanceMode,
  } = useAppPartnerAppearance();

  const [internalSection, setInternalSection] =
    React.useState<PartnerHubSection>("hub");
  const [notificationPreferences, setNotificationPreferences] =
    React.useState<NotificationPreferenceState>(
      failClosedNotificationPreferences,
    );
  const [notificationError, setNotificationError] = React.useState<string | null>(
    null,
  );
  const [showAdvancedNotifications, setShowAdvancedNotifications] =
    React.useState(false);
  const [selectedModeId, setSelectedModeId] = React.useState<string>("");
  const [storeRuntime, setStoreRuntime] = React.useState<StoreRuntimeState>({
    kind: "idle",
  });

  const activeSection = section ?? internalSection;
  const updateSection = onSectionChange ?? setInternalSection;
  const activeHubNavigationItems = React.useMemo(
    () => hubNavigationItems.filter((item) => item.id !== "profile"),
    [],
  );

  const loadStoreRuntime = React.useCallback(async () => {
    if (!canonicalStoreId || identity.state.kind !== "authenticated") return;
    setStoreRuntime({ kind: "loading" });
    try {
      const [rawSettings, coverageZones] = await Promise.all([
        fetchPartnerStoreSettings(canonicalStoreId),
        fetchPartnerStoreCoverageZones(canonicalStoreId),
      ]);
      const settings = parseStoreSettings(rawSettings);
      const serviceModes = mapServiceModes(settings.deliveryModes);
      setStoreRuntime({
        kind: "success",
        settings,
        serviceModes,
        coverageZones,
      });
      const firstEnabled = serviceModes.find((mode) => mode.enabled);
      setSelectedModeId(firstEnabled?.id ?? "");
    } catch (error) {
      setStoreRuntime({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "تعذر تحميل إعدادات المتجر ومناطق التغطية.",
      });
      setSelectedModeId("");
    }
  }, [canonicalStoreId, identity.state.kind]);

  React.useEffect(() => {
    void loadStoreRuntime();
  }, [loadStoreRuntime]);

  const updateNotificationPreference = React.useCallback(
    (preferenceId: NotificationPreferenceId, nextValue: boolean) => {
      const previous = notificationPreferences[preferenceId];
      setNotificationError(null);
      setNotificationPreferences((current) => ({
        ...current,
        [preferenceId]: nextValue,
      }));
      void import("../../shared/notifications/notifications.api")
        .then(({ updateNotificationPreferences }) =>
          updateNotificationPreferences(preferenceId, nextValue),
        )
        .catch((error: unknown) => {
          setNotificationPreferences((current) => ({
            ...current,
            [preferenceId]: previous,
          }));
          setNotificationError(
            error instanceof Error
              ? error.message
              : "تعذر حفظ تفضيل الإشعار.",
          );
        });
    },
    [notificationPreferences],
  );

  const openOrderAlerts = React.useCallback(() => {
    onOpenOperationalFlow?.("order-alerts");
    onOpenBell?.();
  }, [onOpenBell, onOpenOperationalFlow]);

  const openOperationsDirectory = React.useCallback(() => {
    onOpenOperationalFlow?.("order-issue-queue");
    onOpenSupportDirectory?.();
    onOpenSupportScreen?.("order-issue-queue");
  }, [onOpenOperationalFlow, onOpenSupportDirectory, onOpenSupportScreen]);

  const openOrdersSearch = React.useCallback(() => {
    if (onOpenOrdersSearch) onOpenOrdersSearch();
    else onOpenOrdersBoard?.();
  }, [onOpenOrdersBoard, onOpenOrdersSearch]);

  if (state !== "ready") {
    return (
      <StateView
        loading={state === "loading"}
        tone={
          state === "offline" || state === "disabled"
            ? "warning"
            : state === "empty" || state === "loading"
              ? "neutral"
              : "danger"
        }
        title="مركز حساب الشريك"
        description="لا تُعرض حالة تشغيلية ناجحة حتى تكتمل حالة الطلبات والمتجر من DSH."
        {...(onOpenOrdersBoard
          ? {
              actionLabel: "فتح الطلبات",
              onActionPress: onOpenOrdersBoard,
            }
          : {})}
      />
    );
  }

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        tone="warning"
        title="تسجيل الدخول مطلوب"
        description="يجب استخدام جلسة شريك صالحة قبل تحميل حالة المتجر."
      />
    );
  }

  if (!canonicalStoreId) {
    return (
      <StateView
        tone="warning"
        title="اختر متجرًا محددًا"
        description="لا يمكن فتح Hub التشغيلي على نطاق كل المتاجر."
        {...(onOpenStoreScope
          ? {
              actionLabel: "اختيار المتجر",
              onActionPress: onOpenStoreScope,
            }
          : {})}
      />
    );
  }

  if (
    !storeName?.trim() ||
    !branchLabel?.trim() ||
    !cityLabel?.trim() ||
    !managerLabel?.trim() ||
    !todayHoursLabel?.trim() ||
    !activeZoneLabel?.trim()
  ) {
    return (
      <StateView
        tone="danger"
        title="بيانات المتجر غير مكتملة"
        description="رفض Hub استخدام أسماء أو ساعات أو نطاقات افتراضية."
        actionLabel="إعادة تحميل حالة المتجر"
        onActionPress={() => void loadStoreRuntime()}
      />
    );
  }

  if (
    selfStatusState.kind === "idle" ||
    selfStatusState.kind === "loading"
  ) {
    return <StateView loading title="جاري تحميل حالة الانضمام…" />;
  }

  if (selfStatusState.kind === "error") {
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

  if (selfStatusState.kind !== "success") {
    return (
      <StateView
        tone="danger"
        title="حالة شريك غير قابلة للعرض"
        description="لم يعد DSH حالة نجاح أو خطأ صريحة."
      />
    );
  }

  if (
    !isDshPartnerActivationComplete(
      selfStatusState.partner.activationStatus,
    )
  ) {
    return (
      <PartnerOnboardingStatusView
        selfStatusState={selfStatusState}
        selfReadinessState={selfReadinessState}
        selfReadinessViewModel={selfReadinessViewModel}
        reloadSelfStatus={reloadSelfStatus}
      />
    );
  }

  if (storeRuntime.kind === "idle" || storeRuntime.kind === "loading") {
    return <StateView loading title="جاري تحميل إعدادات المتجر…" />;
  }

  if (storeRuntime.kind === "error") {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل حقيقة المتجر"
        description={storeRuntime.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void loadStoreRuntime()}
      />
    );
  }

  const resolvedStoreOpen = storeRuntime.settings.storeOpen;
  const resolvedListingEnabled = storeRuntime.settings.listingEnabled;
  const serviceModes = storeRuntime.serviceModes;
  const coverageZones = storeRuntime.coverageZones;
  const activationStatus = selfStatusState.partner.activationStatus;
  const isClientVisibleStage = isDshPartnerClientVisible(activationStatus);
  const isInternalActiveOnly =
    isDshPartnerActivationComplete(activationStatus) && !isClientVisibleStage;
  const serviceabilityVerified = false;
  const storeVisibility = resolveDshStoreClientVisibility({
    activationStatus,
    catalogPublished: resolvedListingEnabled,
    deliveryModesReady: serviceModes.some((mode) => mode.enabled),
    serviceabilityAvailable: serviceabilityVerified,
    storeOpen: resolvedStoreOpen,
  });
  const visibilityLabel = resolvedListingEnabled ? "مفعّل" : "موقوف";

  if (activeSection !== "hub") {
    if (activeSection === "profile") {
      return (
        <HubSectionShell
          title={sectionCopy.profile.title}
          description={sectionCopy.profile.description}
          icon={sectionCopy.profile.icon}
          onBack={() => updateSection("hub")}
        >
          <StoreProfileScreen
            storeName={storeName}
            branchLabel={branchLabel}
            cityLabel={cityLabel}
            managerLabel={managerLabel}
            todayHoursLabel={todayHoursLabel}
            activeZoneLabel={activeZoneLabel}
            storeOpen={resolvedStoreOpen}
            listingEnabled={resolvedListingEnabled}
            canonicalStoreId={canonicalStoreId}
            activationStatus={activationStatus}
            serviceModes={serviceModes}
            {...(onOpenStoreScope ? { onOpenStoreScope } : {})}
          />
        </HubSectionShell>
      );
    }

    if (activeSection === "analytics") {
      return (
        <HubSectionShell
          title={sectionCopy.analytics.title}
          description={sectionCopy.analytics.description}
          icon={sectionCopy.analytics.icon}
          onBack={() => updateSection("hub")}
        >
          {isInternalActiveOnly ? (
            <StateView
              tone="warning"
              title="التحليلات والتسويق غير متاحة قبل الظهور للعملاء"
              description="الشريك نشط داخليًا، لكن المتجر غير ظاهر للعملاء حتى اكتمال بوابات النشر."
            />
          ) : (
            <AnalyticsInsightsPanel storeName={storeName} />
          )}
        </HubSectionShell>
      );
    }

    if (activeSection === "wallet") {
      return (
        <WltDshPartnerBridge
          branchLabel={branchLabel}
          activeZoneLabel={activeZoneLabel}
          serviceModes={serviceModes.map((mode) => ({
            id: mode.id,
            label: mode.title,
            description: mode.subtitle,
            enabled: mode.enabled,
          }))}
          onBack={() => updateSection("hub")}
          onOpenExpandedWallet={onOpenWalletHub}
          onOpenSettlementReview={onOpenWalletHub}
          onOpenFinancialReport={onOpenWalletHub}
          dshClientId={dshClientId}
          canonicalStoreId={canonicalStoreId}
        />
      );
    }

    if (activeSection === "settings") {
      return (
        <HubSectionShell
          title={sectionCopy.settings.title}
          description={sectionCopy.settings.description}
          icon={sectionCopy.settings.icon}
          onBack={() => updateSection("hub")}
        >
          {notificationError ? (
            <StateView
              tone="danger"
              title="تعذر حفظ تفضيل الإشعار"
              description={notificationError}
            />
          ) : null}
          <PartnerHubSettingsPanel
            appearanceMode={appearanceMode}
            appearanceHydrated={appearanceHydrated}
            setAppearanceMode={setAppearanceMode}
            notificationPreferences={notificationPreferences}
            updateNotificationPreference={updateNotificationPreference}
            showAdvancedNotifications={showAdvancedNotifications}
            setShowAdvancedNotifications={setShowAdvancedNotifications}
            resolvedListingEnabled={resolvedListingEnabled}
            isAvailable={resolvedStoreOpen}
            todayHoursLabel={todayHoursLabel}
            openOrderAlerts={openOrderAlerts}
            {...(onOpenStoreScope ? { onOpenStoreScope } : {})}
            openOperationsDirectory={openOperationsDirectory}
          />
        </HubSectionShell>
      );
    }

    if (activeSection === "inventory") {
      return (
        <HubSectionShell
          title={sectionCopy.inventory.title}
          description={sectionCopy.inventory.description}
          icon={sectionCopy.inventory.icon}
          onBack={() => updateSection("hub")}
        >
          <PartnerCatalogManagementScreen storeId={canonicalStoreId} />
        </HubSectionShell>
      );
    }

    if (activeSection === "operations") {
      return (
        <OperationsPanel
          branchLabel={branchLabel}
          cityLabel={cityLabel}
          storeName={storeName}
          todayHoursLabel={todayHoursLabel}
          storeOpen={resolvedStoreOpen}
          activeZoneLabel={activeZoneLabel}
          serviceModes={serviceModes}
          coverageZonesToUse={coverageZones}
          coverageZonesError={null}
          teamMembers={props.teamMembers ?? []}
          onBack={() => updateSection("hub")}
          {...(onOpenStoreCourierSetup
            ? { onOpenStoreCourierSetup }
            : {})}
          {...(props.onOpenTeamManagement
            ? { onOpenTeamManagement: props.onOpenTeamManagement }
            : {})}
          listingEnabled={resolvedListingEnabled}
          storeVisibility={storeVisibility}
          visibilityLabel={visibilityLabel}
        />
      );
    }

    const copy = sectionCopy[activeSection as Exclude<PartnerHubSection, "hub">];
    return (
      <HubSectionShell
        title={copy.title}
        description={copy.description}
        icon={copy.icon}
        onBack={() => updateSection("hub")}
      />
    );
  }

  return (
    <Box style={{ flex: 1, position: "relative" }} background="background">
      <MobileScrollView
        fill
        padding={0}
        gap={4}
        contentContainerStyle={{ paddingBottom: partnerHubBottomInset }}
      >
        <PartnerHubStoreHero
          direction={direction}
          resolvedStoreName={storeName}
          resolvedBranchLabel={branchLabel}
          resolvedActiveZoneLabel={activeZoneLabel}
          isAvailable={resolvedStoreOpen}
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
              <View
                style={{
                  flexDirection: direction === "rtl" ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: spacing[2],
                }}
              >
                <Icon name="eye-off-outline" size={18} tone="warning" />
                <Text
                  role="bodyStrong"
                  tone="warning"
                  style={{
                    flex: 1,
                    textAlign: direction === "rtl" ? "right" : "left",
                  }}
                >
                  الشريك نشط داخليًا، والمتجر غير ظاهر للعملاء حتى اكتمال بوابات
                  النشر.
                </Text>
              </View>
            </Surface>
          ) : null}

          {!serviceabilityVerified ? (
            <Surface
              style={{
                padding: spacing[3],
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: theme.warning,
              }}
            >
              <Text role="bodySm" tone="warning">
                لم تُثبت قابلية الخدمة لنطاق المتجر بعد؛ لذلك لا تمنح هذه الشاشة
                حالة ظهور مكتملة للعملاء.
              </Text>
            </Surface>
          ) : null}

          <Box gap={2} paddingY={2}>
            <View
              style={{
                flexDirection: direction === "rtl" ? "row-reverse" : "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  gap: 2,
                  alignItems: direction === "rtl" ? "flex-end" : "flex-start",
                }}
              >
                <Text role="caption" tone="muted">
                  رصيد المتجر الحالي
                </Text>
                <Text role="titleLg" tone="action">
                  {walletBalanceLabel ?? "—"}
                </Text>
              </View>
              <Button
                label="عرض المحفظة"
                tone="secondary"
                fullWidth={false}
                onPress={() => updateSection("wallet")}
              />
            </View>
          </Box>

          <Divider />

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

          <Surface style={{ padding: spacing[3], borderRadius: radius.md }}>
            <Text role="caption" tone="muted">
              الطلبات النشطة: {activeOrdersCount}
            </Text>
          </Surface>
        </Box>
      </MobileScrollView>
    </Box>
  );
}

export type PartnerHomeScreenProps = Omit<
  DshPartnerHubSurfaceProps,
  "section"
>;

function PartnerHomeScreen(props: PartnerHomeScreenProps) {
  return <DshPartnerHubSurface {...props} section="hub" />;
}

export type OperationsScreenProps = Omit<
  DshPartnerHubSurfaceProps,
  "section"
>;

function OperationsScreen(props: OperationsScreenProps) {
  return <DshPartnerHubSurface {...props} section="operations" />;
}

export type PartnerSettingsScreenProps = Omit<
  DshPartnerHubSurfaceProps,
  "section"
>;

function PartnerSettingsScreen(props: PartnerSettingsScreenProps) {
  return <DshPartnerHubSurface {...props} section="settings" />;
}
