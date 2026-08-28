import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, StateView, colorRoles, spacing } from "@bthwani/ui-kit";
import { useIdentitySession } from "@bthwani/core-identity";
import { DshCaptainOrderJourneyRenderer } from "./DshCaptainOrderJourneyRenderer";
import { useDshCaptainSurfaceModel } from "./useDshCaptainSurfaceModel";
import type { DshCaptainRoute } from "./dsh-captain.types";
import type { DshCaptainSurfaceProps } from "./dsh-captain.types";
import {
  dshCaptainRouteFromNavigation,
  dshCaptainRouteAssignmentId,
  dshCaptainRouteSupportScreen,
  type DshCaptainAccountSection,
  type DshCaptainNavigation,
} from "./captain-navigation";
import { useCameraPhotoCapture } from "../shared/media/useCameraPhotoCapture";
import { CaptainAssignmentOfferPanel } from "./orders/CaptainAssignmentOfferPanel";
import { BottomNavBar } from "./components/BottomNavBar";
import { ModernPremiumHeader } from "./components/ModernPremiumHeader";

export type { DshCaptainSurfaceProps } from "./dsh-captain.types";

type IconName = React.ComponentProps<typeof Icon>["name"];
type AppearanceMode = "lightPremium" | "darkPremium";

type CaptainAccountItem = {
  readonly section: DshCaptainAccountSection;
  readonly title: string;
  readonly subtitle: string;
  readonly badgeLabel: string;
  readonly icon: IconName;
};

const ACCOUNT_ITEMS: readonly CaptainAccountItem[] = [
  { section: "profile", title: "بيانات الكابتن", subtitle: "الهوية والحالة والتقييم المثبت", badgeLabel: "هوية", icon: "person-outline" },
  { section: "orders", title: "المهمة الحالية", subtitle: "العرض أو التكليف النشط من DSH", badgeLabel: "تشغيل", icon: "bag-outline" },
  { section: "finance", title: "المالية", subtitle: "المحفظة والمستحقات والخصومات من WLT", badgeLabel: "WLT", icon: "wallet-outline" },
  { section: "docs", title: "الوثائق والتقييم", subtitle: "اعتمادات Workforce وتقييم العملاء", badgeLabel: "Workforce", icon: "document-text-outline" },
  { section: "shifts", title: "التوفر وعدم التوفر", subtitle: "إبلاغ الفترات دون ورديات أو حضور", badgeLabel: "تغطية", icon: "calendar-outline" },
  { section: "support", title: "الإعدادات", subtitle: "المظهر ووضع موصل المتجر", badgeLabel: "إعدادات", icon: "settings-outline" },
];

function bottomTabForRoute(route: DshCaptainRoute): "entry" | "inbox" | "bell" | "account" | "" {
  if (route === "home" || route === "entry") return "entry";
  if (route === "inbox") return "inbox";
  if (route === "bell") return "bell";
  if (route === "account" || route.startsWith("account-")) return "account";
  return "";
}

function CaptainBottomNavigation({
  route,
  navigation,
  operationalAssignmentId,
  operationalAssignmentAmbiguous,
}: {
  readonly route: DshCaptainRoute;
  readonly navigation: DshCaptainNavigation;
  readonly operationalAssignmentId: string;
  readonly operationalAssignmentAmbiguous: boolean;
}) {
  const items = [
    { id: "entry", label: "الرئيسية", icon: "home-outline", activeIcon: "home" },
    { id: "inbox", label: "الطلبات", icon: "bag-outline", activeIcon: "bag" },
    { id: "bell", label: "التنبيهات", icon: "notifications-outline", activeIcon: "notifications" },
    { id: "account", label: "الحساب", icon: "person-outline", activeIcon: "person" },
  ] as const;
  const launcherActive = route === "detail" || route === "map" || route === "pickup-dropoff" || route === "pod-submission";

  const openOperationalAssignment = () => {
    if (operationalAssignmentId && !operationalAssignmentAmbiguous) {
      navigation.navigate({ kind: "detail", assignmentId: operationalAssignmentId });
      return;
    }
    navigation.navigate({ kind: "inbox" });
  };

  return (
    <View style={styles.bottomNavShell}>
      <BottomNavBar
        activeId={bottomTabForRoute(route)}
        launcherLabel="المهمة"
        launcherIcon="navigate"
        launcherActive={launcherActive}
        onLauncherPress={openOperationalAssignment}
        onSelect={(id) => {
          if (id === "entry") navigation.navigate({ kind: "home" });
          else if (id === "inbox") navigation.navigate({ kind: "inbox" });
          else if (id === "bell") navigation.navigate({ kind: "bell" });
          else navigation.navigate({ kind: "account" });
        }}
        items={items}
      />
    </View>
  );
}

function AuthenticatedCaptainSurface({
  captainId,
  route,
  navigation,
}: {
  readonly captainId: string;
  readonly route: DshCaptainSurfaceProps["route"];
  readonly navigation: DshCaptainNavigation;
}) {
  const captainRoute = dshCaptainRouteFromNavigation(route);
  const routeAssignmentId = dshCaptainRouteAssignmentId(route) ?? "";
  const selectedSupportScreen = dshCaptainRouteSupportScreen(route);
  const {
    state,
    actions,
    derived,
    activeAssignment,
    assignmentClosureNotice,
    operationalAssignmentId,
    operationalAssignmentAmbiguous,
  } = useDshCaptainSurfaceModel(captainId, captainRoute, routeAssignmentId, selectedSupportScreen);
  const camera = useCameraPhotoCapture();
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [appearanceMode, setAppearanceMode] = React.useState<AppearanceMode>("lightPremium");
  const isActiveAssignmentOperational = Boolean(
    activeAssignment?.id
      && operationalAssignmentId
      && activeAssignment.id === operationalAssignmentId
      && !operationalAssignmentAmbiguous,
  );

  const goToInbox = React.useCallback(() => navigation.navigate({ kind: "inbox" }), [navigation]);
  const goToAccount = React.useCallback(() => navigation.navigate({ kind: "account" }), [navigation]);
  const openSupportDirectory = React.useCallback(() => {
    navigation.navigate({
      kind: "support-directory",
      ...(state.activeAssignmentId ? { assignmentId: state.activeAssignmentId } : {}),
    });
  }, [navigation, state.activeAssignmentId]);
  const openSupportScreen = React.useCallback((screenId: Parameters<typeof dshCaptainRouteSupportScreen>[0] extends never ? never : typeof selectedSupportScreen) => {
    navigation.navigate({
      kind: "support-screen",
      screenId,
      ...(state.activeAssignmentId ? { assignmentId: state.activeAssignmentId } : {}),
    });
  }, [navigation, state.activeAssignmentId]);
  const openOperationalAssignment = React.useCallback(() => {
    if (operationalAssignmentId && !operationalAssignmentAmbiguous) {
      navigation.navigate({ kind: "detail", assignmentId: operationalAssignmentId });
    } else {
      goToInbox();
    }
  }, [goToInbox, navigation, operationalAssignmentAmbiguous, operationalAssignmentId]);

  const accountNavItems = React.useMemo(
    () => ACCOUNT_ITEMS.map((item) => ({
      title: item.title,
      subtitle: item.subtitle,
      badgeLabel: item.badgeLabel,
      icon: item.icon,
      onPress: () => navigation.navigate({ kind: "account-section", section: item.section }),
    })),
    [navigation],
  );

  const bottomNav = (
    <CaptainBottomNavigation
      route={state.route}
      navigation={navigation}
      operationalAssignmentId={operationalAssignmentId}
      operationalAssignmentAmbiguous={operationalAssignmentAmbiguous}
    />
  );

  const offerBusy = state.inboxState === "offer-accepting" || state.declineSheetState === "loading";
  const offerError = state.inboxState === "error" || state.declineSheetState === "error"
    ? "تغيرت حالة العرض أو تعذر الوصول إلى DSH. حدّث صندوق المهام ثم أعد القرار."
    : undefined;

  const handleTickerPress = () => {
    if (derived.homeTicker.action === "toggle-availability") {
      actions.toggleAvailability();
      return;
    }
    if (derived.homeTicker.action === "reset-inbox") {
      void actions.refreshInbox();
      return;
    }
    if (derived.homeTicker.action === "toggle-order") {
      openOperationalAssignment();
      return;
    }
    goToInbox();
  };

  return (
    <View style={styles.root}>
      <ModernPremiumHeader
        title="بثواني كابتن"
        locationLabel={`${derived.currentAvailabilityMeta.label} · GPS: ${state.gpsStatus}`}
        actions={[
          {
            id: "notifications",
            accessibilityLabel: "فتح تنبيهات الكابتن",
            icon: <Icon name="notifications-outline" size={21} color={colorRoles.surfaceBase} />,
            onPress: () => navigation.navigate({ kind: "bell" }),
          },
          {
            id: "account",
            accessibilityLabel: "فتح حساب الكابتن",
            icon: <Icon name="person-outline" size={21} color={colorRoles.surfaceBase} />,
            onPress: goToAccount,
          },
        ]}
        tickerStatus={derived.homeTicker.statusLabel}
        tickerMessage={derived.homeTicker.message}
        onTickerPress={handleTickerPress}
      />

      {operationalAssignmentAmbiguous ? (
        <StateView
          title="توجد أكثر من مهمة تشغيلية نشطة"
          description="لن يختار التطبيق مهمة افتراضيًا. افتح صندوق الطلبات وحدد المهمة صراحةً."
          tone="warning"
          actionLabel="فتح صندوق الطلبات"
          onActionPress={goToInbox}
        />
      ) : null}

      {assignmentClosureNotice ? (
        <StateView
          title="أغلقت المهمة"
          description={assignmentClosureNotice}
          tone="warning"
          actionLabel="إغلاق"
          onActionPress={actions.dismissAssignmentClosureNotice}
        />
      ) : null}

      {activeAssignment?.status === "offered" ? (
        <CaptainAssignmentOfferPanel
          assignment={activeAssignment}
          busy={offerBusy}
          {...(offerError ? { errorMessage: offerError } : {})}
          onAccept={(assignmentId) => {
            void actions.handleAcceptTask(assignmentId).then((accepted) => {
              if (accepted) navigation.navigate({ kind: "detail", assignmentId }, "replace");
            });
          }}
          onDecline={(assignmentId, reason) => {
            void actions.handleDeclineConfirm(assignmentId, reason).then((declined) => {
              if (declined) navigation.navigate({ kind: "inbox" }, "replace");
            });
          }}
        />
      ) : null}

      {cameraError ? (
        <StateView
          title="تعذر التقاط الصورة"
          description={cameraError}
          tone="danger"
          actionLabel="إغلاق"
          onActionPress={() => setCameraError(null)}
        />
      ) : null}

      <View style={styles.content}>
        <DshCaptainOrderJourneyRenderer
          route={state.route}
          activeAssignmentId={state.activeAssignmentId}
          activeOrderId={state.activeOrderId}
          activeDeliveryStatus={state.activeDeliveryStatus}
          isActiveAssignmentOperational={isActiveAssignmentOperational}
          activeOrderDisplayId={derived.activeOrderDisplayId}
          activeSummary={state.activeAssignmentId ? derived.activeSummary : null}
          inboxItems={state.inboxItems}
          inboxState={state.inboxState}
          captainRuntimeId={captainId}
          captainPodRequired={derived.captainPodRequired && isActiveAssignmentOperational}
          isStoreCourierMode={derived.isStoreCourierMode}
          isCaptainAvailable={derived.isCaptainAvailable}
          selectedSupportScreen={state.selectedSupportScreen}
          isPickupSheetVisible={state.isPickupSheetVisible}
          isDeliverySheetVisible={state.isDeliverySheetVisible}
          isDeclineSheetVisible={state.isDeclineSheetVisible}
          declineOrderId={state.declineOrderId}
          declineSheetState={state.declineSheetState}
          pickupSheetState={state.pickupSheetState}
          captainPodState={state.captainPodState}
          captainPodPhotoUri={state.captainPodPhotoUri}
          showBottomNav={derived.showBottomNav}
          bottomNavNode={bottomNav}
          dshClientId={captainId}
          captainDisplayName={captainId}
          currentAvailabilityMeta={derived.currentAvailabilityMeta}
          captainAccountNavItems={accountNavItems}
          walletBalanceLabel={null}
          appearanceHydrated
          appearanceMode={appearanceMode}
          wltSummaryLabel="الرصيد من WLT"
          onOpenOrder={(assignmentId) => navigation.navigate({ kind: "detail", assignmentId })}
          onRetryInbox={() => void actions.refreshInbox()}
          onConfirmPickup={() => void actions.confirmPickup()}
          onConfirmDelivery={() => {
            void actions.confirmDelivery().then((readyForProof) => {
              if (
                readyForProof
                && operationalAssignmentId
                && !operationalAssignmentAmbiguous
              ) {
                navigation.navigate({ kind: "pod-submission", assignmentId: operationalAssignmentId });
              } else if (readyForProof) {
                goToInbox();
              }
            });
          }}
          onOpenPod={() => {
            if (isActiveAssignmentOperational && operationalAssignmentId) {
              navigation.navigate({ kind: "pod-submission", assignmentId: operationalAssignmentId });
            } else {
              goToInbox();
            }
          }}
          onConfirmPodSubmission={() => void actions.confirmPodSubmission()}
          onReportPodFailure={(draft) => actions.reportPodFailure(draft)}
          onCapturePhoto={() => {
            void camera.captureFromCamera().then((asset) => {
              if (asset) actions.setCaptainPodPhotoUri(asset.uri);
            }).catch((error: unknown) => {
              setCameraError(error instanceof Error ? error.message : "تعذر الوصول إلى الكاميرا.");
            });
          }}
          onRetryPod={() => actions.setCaptainPodState("ready")}
          onBack={navigation.back}
          onGoToInbox={goToInbox}
          onGoToAccount={goToAccount}
          onClosePickupSheet={() => actions.setIsPickupSheetVisible(false)}
          onCloseDeliverySheet={() => actions.setIsDeliverySheetVisible(false)}
          onCloseDeclineSheet={() => actions.setIsDeclineSheetVisible(false)}
          onConfirmDecline={(assignmentId, reason) => {
            void actions.handleDeclineConfirm(assignmentId, reason).then((declined) => {
              if (declined) navigation.navigate({ kind: "inbox" }, "replace");
            });
          }}
          onAcceptTask={(assignmentId) => {
            void actions.handleAcceptTask(assignmentId).then((accepted) => {
              if (accepted) navigation.navigate({ kind: "detail", assignmentId }, "replace");
            });
          }}
          onDeclineTask={(assignmentId) => {
            actions.setDeclineOrderId(assignmentId);
            actions.setIsDeclineSheetVisible(true);
          }}
          onOpenSupportScreen={openSupportScreen}
          onOpenSupportDirectory={openSupportDirectory}
          onOpenCaptainAccountSection={(nextRoute) => {
            const sectionByRoute: Partial<Record<DshCaptainRoute, DshCaptainAccountSection>> = {
              "account-profile": "profile",
              "account-finance": "finance",
              "account-orders": "orders",
              "account-docs": "docs",
              "account-shifts": "shifts",
              "account-support": "support",
            };
            const section = sectionByRoute[nextRoute];
            if (section) navigation.navigate({ kind: "account-section", section });
            else goToAccount();
          }}
          onSetAppearanceMode={setAppearanceMode}
          onToggleStoreCourierMode={(next) => {
            actions.toggleStoreCourierMode(next);
            navigation.navigate({ kind: "home" }, "replace");
          }}
          onToggleAvailability={(available) => actions.setCaptainAvailabilityStatus(available ? "available" : "unavailable")}
          onPushLocation={actions.pushLocation}
        />
      </View>
    </View>
  );
}

export function DshCaptainSurface({ captainId, route, navigation }: DshCaptainSurfaceProps) {
  const identity = useIdentitySession();

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل دخول الكابتن مطلوب"
        description="لا يمكن تحميل صندوق المهام أو المالية أو الموقع دون جلسة كابتن صالحة."
        tone="warning"
      />
    );
  }

  const resolvedCaptainId = identity.state.identity.subject.trim() || captainId?.trim() || "";
  if (!resolvedCaptainId) {
    return (
      <StateView
        title="هوية الكابتن غير مكتملة"
        description="الجلسة لا تحتوي معرف actor صالحًا لربط DSH وWLT."
        tone="danger"
      />
    );
  }

  return <AuthenticatedCaptainSurface captainId={resolvedCaptainId} route={route} navigation={navigation} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorRoles.surfaceBase,
  },
  content: {
    flex: 1,
  },
  bottomNavShell: {
    paddingTop: 20,
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
  },
});
