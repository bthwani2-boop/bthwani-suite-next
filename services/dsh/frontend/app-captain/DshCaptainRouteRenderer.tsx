import React from "react";
import { View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Box,
  Button,
  Divider,
  Icon,
  KeyValueList,
  MobileScrollView,
  StateView,
  Text,
  TopBar,
  spacing,
} from "@bthwani/ui-kit";
import type { DshCaptainRoute } from "./dsh-captain.types";
import type {
  CaptainAvailabilityMeta,
  CaptainDeliveryExceptionDraft,
  CaptainSupportRoute,
  DshCaptainLocationPush,
} from "../shared/delivery";
import { DshEntryScreen } from "./account/DshCaptainEntryScreen";
import {
  CaptainDeliveryConfirmSheet,
  CaptainOrderDetailScreen,
  CaptainOrdersInboxScreen,
  CaptainPickupConfirmSheet,
} from "./orders/DshCaptainOrdersScreen";
import { DshCaptainMapScreen } from "./orders/DshCaptainMapScreen";
import { DshCaptainPoDSubmissionScreen } from "./orders/DshCaptainPoDSubmissionScreen";
import { WltCaptainFinanceScreen } from "@bthwani/wlt/app-captain/finance";
import { DshCaptainSupportDirectoryScreen } from "./account/DshCaptainOperationsScreen";
import { DshCaptainAccountSettingsContent } from "./account/DshCaptainAccountSettingsContent";
import { CaptainAccountNavRow } from "./account/CaptainAccountNavRow";
import { CaptainStorePickupContextScreen } from "./store/CaptainStorePickupContextScreen";
import { OfferDeclineSheet } from "./orders/OfferDeclineSheet";
import { CaptainSupportScreenRouter } from "./account/CaptainSupportScreenRouter";
import type { DshCaptainOrderBellItem, DshCaptainOrdersScreenState } from "../shared/orders";
import type { DshDeliveryException } from "../shared/dispatch";
import { ActorNotificationsPanel } from "../shared/notifications";
import { ProviderRatingSummaryPanel } from "../shared/provider-ratings/ProviderRatingSummaryPanel";
import { ProviderAvailabilityNoticesPanel } from "../shared/workforce/ProviderAvailabilityNoticesPanel";

type BThwaniAppearanceMode = "lightPremium" | "darkPremium";
type CaptainOrderDetailSummary = React.ComponentProps<typeof CaptainOrderDetailScreen>["summary"];
type CaptainOrdersInboxScreenState = DshCaptainOrdersScreenState;
type PodScreenState = NonNullable<React.ComponentProps<typeof DshCaptainPoDSubmissionScreen>["state"]>;
type IconName = React.ComponentProps<typeof Icon>["name"];

export type DshCaptainRouteRendererProps = {
  readonly route: DshCaptainRoute;
  readonly activeAssignmentId: string;
  readonly activeOrderId: string;
  readonly activeOrderDisplayId: string;
  readonly activeSummary: CaptainOrderDetailSummary | null;
  readonly inboxItems: readonly DshCaptainOrderBellItem[];
  readonly inboxState: CaptainOrdersInboxScreenState;
  readonly captainRuntimeId: string;
  readonly captainPodRequired: boolean;
  readonly captainCollectsCod: boolean;
  readonly isStoreCourierMode: boolean;
  readonly isCaptainAvailable: boolean;
  readonly selectedSupportScreen: CaptainSupportRoute;
  readonly isPickupSheetVisible: boolean;
  readonly isDeliverySheetVisible: boolean;
  readonly isDeclineSheetVisible: boolean;
  readonly declineOrderId: string;
  readonly declineSheetState: "ready" | "loading" | "success" | "error";
  readonly pickupSheetState: "ready" | "loading" | "success" | "error";
  readonly captainPodState: PodScreenState;
  readonly captainPodPhotoUri: string | undefined;
  readonly showBottomNav: boolean;
  readonly bottomNavNode: React.ReactNode;
  readonly dshClientId?: string | null;
  readonly captainDisplayName: string;
  readonly currentAvailabilityMeta: CaptainAvailabilityMeta;
  readonly captainAccountNavItems: ReadonlyArray<{
    readonly title: string;
    readonly subtitle: string;
    readonly badgeLabel: string;
    readonly icon: IconName;
    readonly onPress: () => void;
  }>;
  readonly walletBalanceLabel?: string | null;
  readonly appearanceHydrated: boolean;
  readonly appearanceMode: BThwaniAppearanceMode;
  readonly wltSummaryLabel: string;
  readonly onOpenOrder: (id: string) => void;
  readonly onRetryInbox: () => void;
  readonly onConfirmPickup: () => void;
  readonly onConfirmDelivery: () => void;
  readonly onConfirmPodSubmission: () => void;
  readonly onReportPodFailure: (draft: CaptainDeliveryExceptionDraft) => Promise<DshDeliveryException | undefined>;
  readonly onCapturePhoto: () => void;
  readonly onRetryPod: () => void;
  readonly onBack: () => void;
  readonly onGoToInbox: () => void;
  readonly onGoToAccount: () => void;
  readonly onClosePickupSheet: () => void;
  readonly onCloseDeliverySheet: () => void;
  readonly onCloseDeclineSheet: () => void;
  readonly onConfirmDecline: (orderId: string, reason: string) => void;
  readonly onAcceptTask: (orderId: string) => void;
  readonly onDeclineTask: (id: string) => void;
  readonly onOpenSupportScreen: (screenId: CaptainSupportRoute) => void;
  readonly onOpenSupportDirectory: () => void;
  readonly onOpenCaptainAccountSection: (route: DshCaptainRoute) => void;
  readonly onSetAppearanceMode: (mode: BThwaniAppearanceMode) => void;
  readonly onToggleStoreCourierMode: (next: boolean) => void;
  readonly onToggleAvailability: (available: boolean) => void;
  readonly onPushLocation: (push: DshCaptainLocationPush) => Promise<unknown>;
};

const routeHeaderMeta: Partial<Record<DshCaptainRoute, { readonly title: string; readonly subtitle: string }>> = {
  entry: { title: "بوابة التنفيذ", subtitle: "العروض والتوفر والتنفيذ من DSH." },
  inbox: { title: "صندوق الطلبات", subtitle: "العروض والتكليفات الحية." },
  detail: { title: "تفاصيل الطلب", subtitle: "راجع الحقيقة قبل التنفيذ." },
  map: { title: "خريطة المهمة", subtitle: "الموقع الحي للمهمة الحالية." },
  "pod-submission": { title: "إثبات التسليم", subtitle: "التقاط وإرسال الإثبات المطلوب." },
  "pickup-dropoff": { title: "الاستلام والتسليم", subtitle: "لا تُعرض بيانات غير مربوطة." },
  "store-pickup-context": { title: "سياق استلام المتجر", subtitle: "قراءة سياقية من DSH." },
  bell: { title: "الإشعارات", subtitle: "تنبيهات الطلبات والعروض." },
};

function MissingAssignment({ onGoToInbox }: { readonly onGoToInbox: () => void }) {
  return (
    <StateView
      title="لا توجد مهمة نشطة"
      description="اختر عرضًا أو مهمة حقيقية من صندوق الطلبات أولًا."
      tone="warning"
      actionLabel="فتح صندوق الطلبات"
      onActionPress={onGoToInbox}
    />
  );
}

function FloatingBottomNav({ visible, children }: { readonly visible: boolean; readonly children: React.ReactNode }) {
  if (!visible) return null;
  return <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000 }}>{children}</View>;
}

export function DshCaptainRouteRenderer(props: DshCaptainRouteRendererProps) {
  const identity = useIdentitySession();
  const {
    route,
    activeAssignmentId,
    activeOrderId,
    activeOrderDisplayId,
    activeSummary,
    inboxItems,
    inboxState,
    captainRuntimeId,
    captainPodRequired,
    captainCollectsCod,
    isStoreCourierMode,
    isCaptainAvailable,
    selectedSupportScreen,
    isPickupSheetVisible,
    isDeliverySheetVisible,
    isDeclineSheetVisible,
    declineOrderId,
    declineSheetState,
    pickupSheetState,
    captainPodState,
    captainPodPhotoUri,
    showBottomNav,
    bottomNavNode,
    dshClientId,
    captainDisplayName,
    currentAvailabilityMeta,
    captainAccountNavItems,
    walletBalanceLabel,
    appearanceHydrated,
    appearanceMode,
    wltSummaryLabel,
    onOpenOrder,
    onRetryInbox,
    onConfirmPickup,
    onConfirmDelivery,
    onConfirmPodSubmission,
    onReportPodFailure,
    onCapturePhoto,
    onRetryPod,
    onBack,
    onGoToInbox,
    onGoToAccount,
    onClosePickupSheet,
    onCloseDeliverySheet,
    onCloseDeclineSheet,
    onConfirmDecline,
    onAcceptTask,
    onDeclineTask,
    onOpenSupportScreen,
    onOpenSupportDirectory,
    onSetAppearanceMode,
    onToggleStoreCourierMode,
    onToggleAvailability,
    onPushLocation,
  } = props;

  const hasActiveAssignment = Boolean(activeAssignmentId && activeOrderId && activeSummary);
  const captainEntryState = inboxState === "loading" ? "loading" : inboxState === "error" ? "error" : "ready";

  function renderFlow(): React.ReactNode {
    if (route === "entry") {
      return (
        <DshEntryScreen
          state={captainEntryState}
          isAvailable={isCaptainAvailable}
          onToggleAvailability={onToggleAvailability}
          onOpenOffersPress={onGoToInbox}
          {...(hasActiveAssignment
            ? {
                onOpenExecutionPress: () => onOpenOrder(activeAssignmentId),
                ...(captainPodRequired ? { onOpenProofCapturePress: () => onOpenOrder(activeAssignmentId) } : {}),
              }
            : {})}
        />
      );
    }

    if (route === "inbox") {
      return <CaptainOrdersInboxScreen state={inboxState} items={[...inboxItems]} onRetry={onRetryInbox} onOpenOrder={onOpenOrder} onOpenNextOrder={onOpenOrder} />;
    }

    if (route === "detail") {
      if (!activeSummary) return <MissingAssignment onGoToInbox={onGoToInbox} />;
      return (
        <>
          <Box gap={3}>
            <CaptainOrderDetailScreen summary={activeSummary} onConfirmPickup={onConfirmPickup} onConfirmDelivery={onConfirmDelivery} onOpenNextOrder={onGoToInbox} onRetry={onRetryInbox} />
          </Box>
          <CaptainPickupConfirmSheet visible={isPickupSheetVisible} orderTitle={activeSummary.orderId} state={pickupSheetState} onConfirm={onConfirmPickup} onCancel={onClosePickupSheet} />
          <CaptainDeliveryConfirmSheet visible={isDeliverySheetVisible} orderTitle={activeSummary.orderId} onConfirm={onConfirmDelivery} onCancel={onCloseDeliverySheet} />
          <OfferDeclineSheet visible={isDeclineSheetVisible} offerId={declineOrderId} state={declineSheetState} onConfirmDecline={onConfirmDecline} onClose={onCloseDeclineSheet} />
        </>
      );
    }

    if (route === "bell") {
      return (
        <Box gap={3}>
          <ActorNotificationsPanel authKind={identity.state.kind} title="إشعارات الكابتن" emptyDescription="ستظهر هنا إشعارات العروض والالتقاط والتسليم." />
          <Button label="فتح صندوق الطلبات" tone="secondary" fullWidth={false} onPress={onGoToInbox} />
        </Box>
      );
    }

    if (route === "orderchat") {
      return <StateView title="مراسلات الطلب غير مفعلة" description="لا يوجد عقد محادثة حي ومثبت للكابتن في هذه الرحلة." tone="warning" actionLabel="العودة إلى المهمة" onActionPress={onBack} />;
    }

    if (route === "map") {
      if (!hasActiveAssignment) return <MissingAssignment onGoToInbox={onGoToInbox} />;
      return <DshCaptainMapScreen assignmentId={activeAssignmentId} orderId={activeOrderId} captainId={captainRuntimeId} currentStageLabel={activeSummary?.currentStageLabel ?? "مهمة نشطة"} onBack={onBack} onPushLocation={onPushLocation} />;
    }

    if (route === "pickup-dropoff") {
      return <StateView title="تفاصيل الاستلام غير مكتملة" description="عدد الأصناف واسم العميل ومرحلة الاستلام لا تُستنتج محليًا. استخدم تفاصيل المهمة الحية." tone="warning" actionLabel="فتح تفاصيل المهمة" onActionPress={() => (hasActiveAssignment ? onOpenOrder(activeAssignmentId) : onGoToInbox())} />;
    }

    if (route === "store-pickup-context") return <CaptainStorePickupContextScreen />;

    if (route === "pod-submission") {
      if (!hasActiveAssignment || !captainPodRequired) {
        return <StateView title="إثبات التسليم غير مطلوب" description="لم تعد المهمة الحية متطلب PoD صالحًا لهذا الكابتن." tone="warning" actionLabel="العودة إلى المهمة" onActionPress={onBack} />;
      }
      return <DshCaptainPoDSubmissionScreen state={captainPodState} assignmentId={activeAssignmentId} orderId={activeOrderId} exceptionReportingEnabled={!isStoreCourierMode} onCapturePhoto={onCapturePhoto} onConfirm={onConfirmPodSubmission} onReportFailure={onReportPodFailure} onRetry={onRetryPod} onBack={captainPodState === "success" ? onGoToInbox : onBack} {...(captainPodPhotoUri ? { photoUri: captainPodPhotoUri } : {})} />;
    }

    if (route === "account-finance") {
      if (!dshClientId) return <StateView title="الهوية المالية غير مربوطة" description="لا يمكن فتح مالية الكابتن دون معرف DSH/WLT موثق." tone="warning" actionLabel="العودة للحساب" onActionPress={onGoToAccount} />;
      return <WltCaptainFinanceScreen onBack={onGoToAccount} dshClientId={dshClientId} />;
    }

    if (route === "account-profile") {
      return (
        <Box gap={4}>
          <KeyValueList items={[
            { label: "معرف الكابتن", value: captainDisplayName },
            { label: "النوع", value: "DSH", tone: "success" },
            { label: "التوفر", value: currentAvailabilityMeta.label, tone: "warning" },
          ]} />
          <ProviderRatingSummaryPanel kind="captain" title="تقييم العملاء لي" />
        </Box>
      );
    }

    if (route === "account-orders") {
      if (!activeSummary) return <MissingAssignment onGoToInbox={onGoToInbox} />;
      return <KeyValueList items={[
        { label: "الطلب النشط", value: `#${activeOrderDisplayId}`, tone: "success" },
        { label: "المرحلة الحالية", value: activeSummary.currentStageLabel, tone: "info" },
        { label: "الاستلام", value: activeSummary.pickupLabel },
        { label: "التسليم", value: activeSummary.dropoffLabel },
        { label: "الخطوة التالية", value: activeSummary.nextActionLabel, tone: "warning" },
      ]} />;
    }

    if (route === "account-docs") {
      return (
        <Box gap={4}>
          <StateView title="الوثائق" description="تُراجع وثائق الكابتن واعتماداته من Workforce قبل التفعيل التشغيلي." tone="info" />
          <ProviderRatingSummaryPanel kind="captain" title="تقييم العملاء لي" />
        </Box>
      );
    }

    if (route === "account-shifts") {
      return <ProviderAvailabilityNoticesPanel providerLabel="الكابتن" hasActiveAssignment={hasActiveAssignment} />;
    }

    if (route === "account-support") {
      return <DshCaptainAccountSettingsContent appearanceHydrated={appearanceHydrated} appearanceMode={appearanceMode} isStoreCourierMode={isStoreCourierMode} onSetAppearanceMode={onSetAppearanceMode} onToggleStoreCourierMode={onToggleStoreCourierMode} />;
    }

    if (route === "account") {
      return (
        <Box gap={4}>
          <Box layoutDirection="row" align="center" gap={3} style={{ flexDirection: "row-reverse" }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", borderWidth: 1 }}>
              <Icon name="person" size={28} tone="brand" />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
              <Text role="titleSm">{captainDisplayName}</Text>
              <Box layoutDirection="row" align="center" gap={2} style={{ flexDirection: "row-reverse" }}>
                <Badge label="كابتن DSH" tone="info" />
                <Badge label={currentAvailabilityMeta.label} tone="warning" />
              </Box>
            </View>
          </Box>
          <Divider />
          <KeyValueList items={[
            { label: wltSummaryLabel, value: walletBalanceLabel ?? "افتح المالية لقراءة رصيد WLT" },
            { label: "حالة التوفر", value: currentAvailabilityMeta.label, tone: "warning" },
          ]} />
          <ProviderRatingSummaryPanel kind="captain" title="تقييم العملاء لي" />
          <Divider />
          <Box gap={0}>{captainAccountNavItems.map((item) => <CaptainAccountNavRow key={item.title} title={item.title} subtitle={item.subtitle} badgeLabel={item.badgeLabel} icon={item.icon} onPress={item.onPress} />)}</Box>
        </Box>
      );
    }

    if (route === "support-directory") return <DshCaptainSupportDirectoryScreen onOpenScreen={(id) => onOpenSupportScreen(id as CaptainSupportRoute)} />;

    if (route === "support-screen") {
      if (!dshClientId) return <StateView title="هوية الكابتن غير مربوطة" description="لا يمكن تنفيذ الدعم التشغيلي أو COD دون معرف DSH موثق." tone="warning" actionLabel="العودة إلى الدليل" onActionPress={onOpenSupportDirectory} />;
      return <CaptainSupportScreenRouter selectedSupportScreen={selectedSupportScreen} onBack={onOpenSupportDirectory} onNavigate={onOpenSupportScreen} captainCollectsCod={captainCollectsCod} dshClientId={dshClientId} activeOrderId={activeOrderId} onAcceptTask={onAcceptTask} onDeclineTask={onDeclineTask} />;
    }

    return <StateView title="مسار كابتن غير معروف" description={`لم يُربط المسار ${route} بقدرة تشغيلية.`} tone="danger" actionLabel="فتح صندوق الطلبات" onActionPress={onGoToInbox} />;
  }

  const accountRouteTitle: Partial<Record<DshCaptainRoute, { readonly title: string; readonly subtitle: string }>> = {
    "account-finance": { title: "المالية", subtitle: "المحفظة والمستحقات من WLT." },
    "account-profile": { title: "بيانات الكابتن", subtitle: "الهوية والحالة والتقييم المثبت." },
    "account-orders": { title: "الطلبات", subtitle: "المهمة النشطة الحية." },
    "account-docs": { title: "الوثائق والتقييم", subtitle: "اعتمادات Workforce وتقييم العملاء." },
    "account-shifts": { title: "التوفر وعدم التوفر", subtitle: "إبلاغ الفترات دون ورديات أو حضور وظيفي." },
    "account-support": { title: "الإعدادات", subtitle: "المظهر وخيارات السطح." },
    account: { title: "حساب الكابتن", subtitle: "الهوية والمالية والتقييم والحالة المثبتة." },
    "support-directory": { title: "دليل الدعم", subtitle: "المسارات التشغيلية المسجلة." },
    "support-screen": { title: selectedSupportScreen === "cod-liability" ? "ذمة الدفع عند الاستلام" : "الدعم", subtitle: "المسار المفتوح من الدليل." },
  };

  const meta = accountRouteTitle[route] ?? routeHeaderMeta[route];
  const contentBottomPadding = showBottomNav ? spacing[10] + spacing[8] : spacing[6];

  return (
    <View style={{ flex: 1 }}>
      {meta ? <TopBar variant="secondary" title={meta.title} subtitle={meta.subtitle} /> : null}
      <View style={{ flex: 1 }}>
        <MobileScrollView fill padding={0} gap={0} contentContainerStyle={{ paddingBottom: contentBottomPadding }}>
          <Box padding={4} gap={4}>{renderFlow()}</Box>
        </MobileScrollView>
      </View>
      <FloatingBottomNav visible={showBottomNav}>{bottomNavNode}</FloatingBottomNav>
    </View>
  );
}
