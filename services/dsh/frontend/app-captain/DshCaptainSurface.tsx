import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  AppHeader,
  BottomNavBar,
  Icon,
  StateView,
  Surface,
  Text,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import type { IconName } from "@bthwani/ui-kit";
import { DshCaptainOrderJourneyRenderer } from "./DshCaptainOrderJourneyRenderer";
import { useDshCaptainSurfaceModel } from "./useDshCaptainSurfaceModel";
import type { DshCaptainRoute } from "./dsh-captain.types";
import { useCameraPhotoCapture } from "../shared/media/useCameraPhotoCapture";

export type DshCaptainSurfaceProps = {
  readonly captainId?: string;
};

const BOTTOM_NAV_ITEMS: ReadonlyArray<{
  readonly id: DshCaptainRoute;
  readonly label: string;
  readonly icon: IconName;
}> = [
  { id: "account", label: "الحساب", icon: "person-outline" },
  { id: "inbox", label: "الطلبات", icon: "bag-outline" },
  { id: "entry", label: "الرئيسية", icon: "home-outline" },
];

function AuthenticatedCaptainSurface({ captainId }: { readonly captainId: string }) {
  const insets = useSafeAreaInsets();
  const model = useDshCaptainSurfaceModel(captainId);
  const camera = useCameraPhotoCapture();
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  const {
    path,
    inbox,
    availability,
    gps,
    pod,
    finance,
    decline,
    derived,
    appearanceHydrated,
    appearanceMode,
    setAppearanceMode,
    actions,
  } = model;

  const accountItems = React.useMemo(
    () => [
      {
        id: "profile",
        title: "بيانات الكابتن",
        subtitle: "الهوية والحالة التشغيلية المثبتة",
        badgeLabel: "هوية",
        icon: "person-outline" as IconName,
      },
      {
        id: "orders",
        title: "المهمة الحالية",
        subtitle: "العرض أو التكليف النشط من DSH",
        badgeLabel: derived.activeSummary ? "نشطة" : "لا توجد",
        icon: "bag-outline" as IconName,
      },
      {
        id: "finance",
        title: "المالية",
        subtitle: "المحفظة وCOD والمستحقات من WLT",
        badgeLabel: finance.walletBalanceLabel ? "WLT" : "غير متاح",
        icon: "wallet-outline" as IconName,
      },
      {
        id: "docs",
        title: "الوثائق والتقييم",
        subtitle: "يتطلب ربط Workforce موثقًا",
        badgeLabel: "غير مربوط",
        icon: "document-text-outline" as IconName,
      },
      {
        id: "shifts",
        title: "الدوام والإجازات",
        subtitle: "يتطلب ربط Workforce موثقًا",
        badgeLabel: "غير مربوط",
        icon: "calendar-outline" as IconName,
      },
      {
        id: "support",
        title: "الإعدادات",
        subtitle: "المظهر وخيارات السطح غير التشغيلية",
        badgeLabel: "إعدادات",
        icon: "settings-outline" as IconName,
      },
    ],
    [derived.activeSummary, finance.walletBalanceLabel],
  );

  const accountNavItems = React.useMemo(
    () =>
      accountItems.map((item) => ({
        title: item.title,
        subtitle: item.subtitle,
        badgeLabel: item.badgeLabel,
        icon: item.icon,
        onPress: () => actions.handleAccountItemPress(item.id),
      })),
    [accountItems, actions],
  );

  const bottomNav = (
    <BottomNavBar
      items={BOTTOM_NAV_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        icon: <Icon name={item.icon} size={22} tone="muted" />,
        activeIcon: <Icon name={item.icon} size={22} tone="brand" />,
      }))}
      activeId={path.route}
      onSelect={(id) => path.setRoute(id as DshCaptainRoute)}
      launcherIcon={<Icon name="grid-outline" size={24} tone="inverted" />}
      launcherLabel="الدعم"
      onLauncherPress={actions.openSupportDirectory}
      direction="rtl"
      bottomInset={insets.bottom}
    />
  );

  const showBottomNav =
    path.route === "entry" ||
    path.route === "inbox" ||
    path.route === "account";

  return (
    <View style={styles.root}>
      <AppHeader
        title="بثواني كابتن"
        subtitle={availability.currentAvailabilityMeta.label}
        topInset={insets.top}
        direction="rtl"
        actions={[
          {
            icon: (
              <Icon
                name="notifications-outline"
                size={20}
                color={colorRoles.surfaceBase}
              />
            ),
            accessibilityLabel: "إشعارات الكابتن",
            onPress: () => path.setRoute("bell"),
          },
        ]}
      />

      <Surface tone="raised" padding={3} style={styles.statusStrip}>
        <View style={styles.statusRow}>
          <Text role="caption" tone="muted">
            التوفر: {availability.currentAvailabilityMeta.label}
          </Text>
          <Text role="caption" tone="muted">
            GPS: {gps.currentGpsStatusMeta.label}
          </Text>
        </View>
        {!availability.availabilityMutationReady ? (
          <Text role="caption" tone="warning" align="start">
            تعديل التوفر محجوب حتى يكتمل عقد DSH وحفظ الحالة.
          </Text>
        ) : null}
      </Surface>

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
          route={path.route}
          setRoute={path.setRoute}
          activeAssignmentId={derived.activeAssignmentId}
          activeOrderId={path.activeOrderId}
          activeOrderDisplayId={derived.activeOrderDisplayId}
          activeSummary={derived.activeSummary ?? null}
          inboxItems={inbox.inboxItems}
          inboxState={inbox.inboxState}
          captainRuntimeId={captainId}
          captainPodRequired={derived.captainPodRequired}
          captainCollectsCod={derived.captainCollectsCod}
          isStoreCourierMode={path.isStoreCourierMode}
          selectedSupportScreen={path.selectedSupportScreen}
          isPickupSheetVisible={path.isPickupSheetVisible}
          isDeliverySheetVisible={path.isDeliverySheetVisible}
          isDeclineSheetVisible={inbox.decline.isDeclineSheetVisible}
          declineOrderId={inbox.decline.declineOrderId}
          declineSheetState={decline.declineSheetState}
          pickupSheetState={path.pickupSheetState}
          captainPodState={pod.podState}
          captainPodPhotoUri={pod.podPhotoUri}
          showBottomNav={showBottomNav}
          bottomNavNode={bottomNav}
          dshClientId={captainId}
          captainDisplayName={captainId}
          currentAvailabilityMeta={availability.currentAvailabilityMeta}
          captainAccountNavItems={accountNavItems}
          walletBalanceLabel={finance.walletBalanceLabel}
          appearanceHydrated={appearanceHydrated}
          appearanceMode={appearanceMode}
          wltSummaryLabel="الرصيد من WLT"
          onOpenOrder={path.openOrder}
          onRetryInbox={actions.retryInbox}
          onConfirmPickup={path.confirmPickup}
          onConfirmDelivery={path.confirmDelivery}
          onConfirmPodSubmission={pod.confirmSubmission}
          onReportPodFailure={pod.reportFailure}
          onCapturePhoto={() => {
            void camera
              .captureFromCamera()
              .then((asset) => {
                if (asset) pod.setPodPhotoUri(asset.uri);
              })
              .catch((error: unknown) => {
                setCameraError(
                  error instanceof Error
                    ? error.message
                    : "تعذر الوصول إلى الكاميرا.",
                );
              });
          }}
          onRetryPod={pod.retry}
          onBack={path.goBack}
          onGoToInbox={path.goToInbox}
          onGoToAccount={path.goToAccount}
          onClosePickupSheet={path.closePickupSheet}
          onCloseDeliverySheet={path.closeDeliverySheet}
          onCloseDeclineSheet={inbox.decline.closeDecline}
          onConfirmDecline={actions.confirmDecline}
          onAcceptTask={actions.acceptTask}
          onDeclineTask={actions.declineTask}
          onOpenSupportScreen={actions.openSupportScreen}
          onOpenSupportDirectory={actions.openSupportDirectory}
          onOpenCaptainAccountSection={actions.openCaptainAccountSection}
          onSetAppearanceMode={setAppearanceMode}
          onToggleStoreCourierMode={path.setStoreCourierMode}
          onPushLocation={(push) =>
            actions.pushLocation(push, captainId, gps.gpsStatus)
          }
        />
      </View>
    </View>
  );
}

export function DshCaptainSurface({ captainId }: DshCaptainSurfaceProps) {
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

  const resolvedCaptainId = identity.state.subject.trim() || captainId?.trim() || "";
  if (!resolvedCaptainId) {
    return (
      <StateView
        title="هوية الكابتن غير مكتملة"
        description="الجلسة لا تحتوي معرف actor صالحًا لربط DSH وWLT."
        tone="danger"
      />
    );
  }

  return <AuthenticatedCaptainSurface captainId={resolvedCaptainId} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorRoles.surfaceBase,
  },
  statusStrip: {
    marginHorizontal: spacing[3],
    marginTop: spacing[2],
    gap: spacing[2],
  },
  statusRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
  },
  content: {
    flex: 1,
  },
});
