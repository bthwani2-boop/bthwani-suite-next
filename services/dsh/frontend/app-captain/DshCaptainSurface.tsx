import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, StateView, colorRoles, spacing } from "@bthwani/ui-kit";
import { useIdentitySession } from "@bthwani/core-identity";
import { DshCaptainOrderJourneyRenderer } from "./DshCaptainOrderJourneyRenderer";
import { useDshCaptainSurfaceModel } from "./useDshCaptainSurfaceModel";
import type { DshCaptainRoute } from "./dsh-captain.types";
import type { DshCaptainNavigationCommand } from "../shared/delivery/captain.surface.types";
import { useCameraPhotoCapture } from "../shared/media/useCameraPhotoCapture";
import { CaptainAssignmentOfferPanel } from "./orders/CaptainAssignmentOfferPanel";
import { BottomNavBar } from "./components/BottomNavBar";
import { ModernPremiumHeader } from "./components/ModernPremiumHeader";

export type DshCaptainSurfaceProps = {
  readonly captainId?: string;
  readonly command?: DshCaptainNavigationCommand;
};

type IconName = React.ComponentProps<typeof Icon>["name"];
type AppearanceMode = "lightPremium" | "darkPremium";

const ACCOUNT_ITEMS: ReadonlyArray<{
  readonly route: DshCaptainRoute;
  readonly title: string;
  readonly subtitle: string;
  readonly badgeLabel: string;
  readonly icon: IconName;
}> = [
  { route: "account-profile", title: "بيانات الكابتن", subtitle: "الهوية والحالة والتقييم المثبت", badgeLabel: "هوية", icon: "person-outline" },
  { route: "account-orders", title: "المهمة الحالية", subtitle: "العرض أو التكليف النشط من DSH", badgeLabel: "تشغيل", icon: "bag-outline" },
  { route: "account-finance", title: "المالية", subtitle: "COD والمستحقات والخصومات من WLT", badgeLabel: "WLT", icon: "wallet-outline" },
  { route: "account-docs", title: "الوثائق والتقييم", subtitle: "اعتمادات Workforce وتقييم العملاء", badgeLabel: "Workforce", icon: "document-text-outline" },
  { route: "account-shifts", title: "التوفر وعدم التوفر", subtitle: "إبلاغ الفترات دون ورديات أو حضور", badgeLabel: "تغطية", icon: "calendar-outline" },
  { route: "account-support", title: "الإعدادات", subtitle: "المظهر ووضع موصل المتجر", badgeLabel: "إعدادات", icon: "settings-outline" },
];

function CaptainBottomNavigation({
  route,
  setRoute,
  openActiveTask,
}: {
  readonly route: DshCaptainRoute;
  readonly setRoute: (route: DshCaptainRoute) => void;
  readonly openActiveTask: () => void;
}) {
  const items = [
    { id: "entry", label: "الرئيسية", icon: "home-outline", activeIcon: "home" },
    { id: "inbox", label: "الطلبات", icon: "bag-outline", activeIcon: "bag" },
    { id: "bell", label: "التنبيهات", icon: "notifications-outline", activeIcon: "notifications" },
    { id: "account", label: "الحساب", icon: "person-outline", activeIcon: "person" },
  ] as const;
  const launcherActive = route === "detail" || route === "map" || route === "pod-submission";

  return (
    <View style={styles.bottomNavShell}>
      <BottomNavBar
        activeId={route}
        launcherLabel="المهمة"
        launcherIcon="navigate"
        launcherActive={launcherActive}
        onLauncherPress={openActiveTask}
        onSelect={(id) => setRoute(id as DshCaptainRoute)}
        items={items}
      />
    </View>
  );
}

function AuthenticatedCaptainSurface({
  captainId,
  command,
}: {
  readonly captainId: string;
  readonly command: DshCaptainNavigationCommand;
}) {
  const {
    state,
    actions,
    derived,
    activeAssignment,
    assignmentClosureNotice,
  } = useDshCaptainSurfaceModel(captainId, command);
  const camera = useCameraPhotoCapture();
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [appearanceMode, setAppearanceMode] = React.useState<AppearanceMode>("lightPremium");

  const accountNavItems = React.useMemo(
    () => ACCOUNT_ITEMS.map((item) => ({
      title: item.title,
      subtitle: item.subtitle,
      badgeLabel: item.badgeLabel,
      icon: item.icon,
      onPress: () => actions.openCaptainAccountSection(item.route),
    })),
    [actions],
  );

  const bottomNav = (
    <CaptainBottomNavigation
      route={state.route}
      setRoute={actions.setRoute}
      openActiveTask={() => actions.setRoute(activeAssignment ? "detail" : "inbox")}
    />
  );

  const offerBusy = state.inboxState === "offer-accepting" || state.declineSheetState === "loading";
  const offerError = state.inboxState === "error" || state.declineSheetState === "error"
    ? "تغيرت حالة العرض أو تعذر الوصول إلى DSH. حدّث صندوق المهام ثم أعد القرار."
    : undefined;
  const activeStageLabel = derived.activeSummary?.currentStageLabel;

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
            onPress: () => actions.setRoute("bell"),
          },
          {
            id: "account",
            accessibilityLabel: "فتح حساب الكابتن",
            icon: <Icon name="person-outline" size={21} color={colorRoles.surfaceBase} />,
            onPress: actions.openCaptainAccount,
          },
        ]}
        tickerStatus={activeAssignment ? "مهمة نشطة" : "جاهزية"}
        tickerMessage={activeAssignment
          ? `${derived.activeOrderDisplayId} · ${activeStageLabel ?? "مهمة قيد التنفيذ"}`
          : "لا توجد مهمة نشطة. تتم مزامنة صندوق العروض من DSH."}
        onTickerPress={() => actions.setRoute(activeAssignment ? "detail" : "inbox")}
      />

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
          onAccept={(assignmentId) => void actions.handleAcceptTask(assignmentId)}
          onDecline={(assignmentId, reason) => void actions.handleDeclineConfirm(assignmentId, reason)}
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
          setRoute={actions.setRoute}
          activeAssignmentId={state.activeAssignmentId}
          activeOrderId={state.activeOrderId}
          activeDeliveryStatus={state.activeDeliveryStatus}
          activeOrderDisplayId={derived.activeOrderDisplayId}
          activeSummary={state.activeAssignmentId ? derived.activeSummary : null}
          inboxItems={state.inboxItems}
          inboxState={state.inboxState}
          captainRuntimeId={captainId}
          captainPodRequired={derived.captainPodRequired}
          captainCollectsCod={derived.captainCollectsCod}
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
          onOpenOrder={actions.openOrderDetail}
          onRetryInbox={() => void actions.refreshInbox()}
          onConfirmPickup={() => void actions.confirmPickup()}
          onConfirmDelivery={() => void actions.confirmDelivery()}
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
          onBack={() => void actions.goBack()}
          onGoToInbox={actions.goToInbox}
          onGoToAccount={actions.openCaptainAccount}
          onClosePickupSheet={() => actions.setIsPickupSheetVisible(false)}
          onCloseDeliverySheet={() => actions.setIsDeliverySheetVisible(false)}
          onCloseDeclineSheet={() => actions.setIsDeclineSheetVisible(false)}
          onConfirmDecline={(assignmentId, reason) => void actions.handleDeclineConfirm(assignmentId, reason)}
          onAcceptTask={(assignmentId) => void actions.handleAcceptTask(assignmentId)}
          onDeclineTask={(assignmentId) => {
            actions.setDeclineOrderId(assignmentId);
            actions.setIsDeclineSheetVisible(true);
          }}
          onOpenSupportScreen={actions.openCaptainSupportScreen}
          onOpenSupportDirectory={actions.openSupportDirectory}
          onOpenCaptainAccountSection={actions.openCaptainAccountSection}
          onSetAppearanceMode={setAppearanceMode}
          onToggleStoreCourierMode={actions.toggleStoreCourierMode}
          onToggleAvailability={(available) => actions.setCaptainAvailabilityStatus(available ? "available" : "unavailable")}
          onPushLocation={actions.pushLocation}
        />
      </View>
    </View>
  );
}

export function DshCaptainSurface({ captainId, command }: DshCaptainSurfaceProps) {
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

  return <AuthenticatedCaptainSurface captainId={resolvedCaptainId} command={command ?? { token: 0, target: "home" }} />;
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
