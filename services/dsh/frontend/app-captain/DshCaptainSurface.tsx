import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Box,
  Button,
  Icon,
  StateView,
  Surface,
  Text,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import { DshCaptainOrderJourneyRenderer } from "./DshCaptainOrderJourneyRenderer";
import { useDshCaptainSurfaceModel } from "./useDshCaptainSurfaceModel";
import type { DshCaptainRoute } from "./dsh-captain.types";
import type { DshCaptainNavigationCommand } from "../shared/delivery/captain.surface.types";
import { useCameraPhotoCapture } from "../shared/media/useCameraPhotoCapture";

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
  { route: "account-profile", title: "بيانات الكابتن", subtitle: "الهوية والحالة التشغيلية المثبتة", badgeLabel: "هوية", icon: "person-outline" },
  { route: "account-orders", title: "المهمة الحالية", subtitle: "العرض أو التكليف النشط من DSH", badgeLabel: "تشغيل", icon: "bag-outline" },
  { route: "account-finance", title: "المالية", subtitle: "COD والمستحقات من WLT", badgeLabel: "WLT", icon: "wallet-outline" },
  { route: "account-docs", title: "الوثائق والتقييم", subtitle: "قراءة Workforce الموثقة", badgeLabel: "Workforce", icon: "document-text-outline" },
  { route: "account-shifts", title: "الدوام والإجازات", subtitle: "الوردية والتوفر التشغيلي", badgeLabel: "Workforce", icon: "calendar-outline" },
  { route: "account-support", title: "الإعدادات", subtitle: "المظهر ووضع موصل المتجر", badgeLabel: "إعدادات", icon: "settings-outline" },
];

function CaptainBottomNavigation({
  route,
  setRoute,
  openSupportDirectory,
}: {
  readonly route: DshCaptainRoute;
  readonly setRoute: (route: DshCaptainRoute) => void;
  readonly openSupportDirectory: () => void;
}) {
  const items: ReadonlyArray<{ readonly id: DshCaptainRoute; readonly label: string }> = [
    { id: "entry", label: "الرئيسية" },
    { id: "inbox", label: "الطلبات" },
    { id: "account", label: "الحساب" },
  ];
  return (
    <Surface tone="raised" padding={2}>
      <Box layoutDirection="row" gap={2} style={{ justifyContent: "space-between" }}>
        {items.map((item) => (
          <Button
            key={item.id}
            label={item.label}
            size="sm"
            tone={route === item.id ? "brand" : "ghost"}
            fullWidth={false}
            onPress={() => setRoute(item.id)}
          />
        ))}
        <Button label="الدعم" size="sm" tone="ghost" fullWidth={false} onPress={openSupportDirectory} />
      </Box>
    </Surface>
  );
}

function AuthenticatedCaptainSurface({
  captainId,
  command,
}: {
  readonly captainId: string;
  readonly command: DshCaptainNavigationCommand;
}) {
  const insets = useSafeAreaInsets();
  const { state, actions, derived, assignmentClosureNotice } = useDshCaptainSurfaceModel(captainId, command);
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
      openSupportDirectory={actions.openSupportDirectory}
    />
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Surface tone="raised" padding={3} style={styles.statusStrip}>
        <Box layoutDirection="row" gap={3} style={{ justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text role="bodyStrong">بثواني كابتن</Text>
            <Text role="caption" tone="muted">{derived.currentAvailabilityMeta.label} · GPS: {state.gpsStatus}</Text>
          </View>
          <Button label="الإشعارات" size="sm" tone="ghost" fullWidth={false} onPress={() => actions.setRoute("bell")} />
        </Box>
      </Surface>

      {assignmentClosureNotice ? (
        <StateView
          title="أغلقت المهمة"
          description={assignmentClosureNotice}
          tone="warning"
          actionLabel="إغلاق"
          onActionPress={actions.dismissAssignmentClosureNotice}
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
          activeOrderDisplayId={derived.activeOrderDisplayId}
          activeSummary={state.activeAssignmentId ? derived.activeSummary : null}
          inboxItems={state.inboxItems}
          inboxState={state.inboxState}
          captainRuntimeId={captainId}
          captainPodRequired={derived.captainPodRequired}
          captainCollectsCod={derived.captainCollectsCod}
          isStoreCourierMode={derived.isStoreCourierMode}
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

  return (
    <AuthenticatedCaptainSurface
      captainId={resolvedCaptainId}
      command={command ?? { token: 0, target: "home" }}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorRoles.surfaceBase,
  },
  statusStrip: {
    marginHorizontal: spacing[3],
    marginTop: spacing[2],
  },
  content: {
    flex: 1,
  },
});
