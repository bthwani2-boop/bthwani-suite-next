import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  StateView,
  Surface,
  Text,
  TopBar,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import { useClientPickupSessionController } from "../../shared/pickup/use-pickup-controller";
import type { PickupActionStage } from "../../shared/pickup/use-pickup-controller";

type Props = {
  readonly orderId: string;
  readonly onBack?: () => void;
};

const STAGE_LABELS: Readonly<Record<PickupActionStage, string>> = {
  not_ready: "طلبك قيد التجهيز",
  ready: "طلبك جاهز للاستلام من الفرع",
  notified: "تم إرسال رمز الاستلام إليك",
  customer_arrived: "تم تسجيل وصولك، أكمل التحقق مع الموظف",
  verified: "تم استلام طلبك بنجاح",
  no_show: "انتهت جلسة الاستلام لعدم الحضور",
  cancelled: "تم إلغاء الاستلام مع الطلب",
};

const STAGE_TONE: Readonly<Record<PickupActionStage, "neutral" | "success" | "warning" | "danger" | "info">> = {
  not_ready: "neutral",
  ready: "info",
  notified: "warning",
  customer_arrived: "warning",
  verified: "success",
  no_show: "danger",
  cancelled: "danger",
};

export function PickupSessionScreen({ orderId, onBack }: Props) {
  const { state, refresh } = useClientPickupSessionController(orderId);

  if (!state.loaded) {
    return (
      <StateView
        title="جارٍ تحميل حالة الاستلام"
        description="نقرأ حالة جلسة الاستلام الخاصة بطلبك."
        loading
      />
    );
  }

  if (state.isError) {
    return (
      <View style={styles.errorRoot}>
        <StateView
          tone="danger"
          title="تعذر فتح حالة الاستلام"
          description={state.message ?? "حدث خطأ غير متوقع."}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void refresh()}
        />
        {onBack ? <Button label="العودة" tone="secondary" onPress={onBack} /> : null}
      </View>
    );
  }

  const { session, stage } = state;
  const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
  const expired = expiresAt !== null && expiresAt.getTime() <= Date.now();

  return (
    <View style={styles.root}>
      <TopBar title="استلام الطلب من الفرع" onBack={onBack} />
      <View style={styles.content}>
        <Surface tone="raised" gap={3}>
          <Badge label={STAGE_LABELS[stage]} tone={STAGE_TONE[stage]} />
          {stage === "ready" || stage === "notified" ? (
            <Text role="bodySm" tone="muted">
              سيصلك رمز الاستلام عبر الإشعارات. أظهره لموظف الفرع عند الوصول ولا تشاركه مع أي شخص آخر.
            </Text>
          ) : null}
          {stage === "customer_arrived" ? (
            <Text role="bodySm" tone="muted">
              أخبر موظف الفرع برمز الاستلام المرسل إليك لإتمام التسليم.
            </Text>
          ) : null}
          {stage === "no_show" ? (
            <Text role="bodySm" tone="muted">
              لم يتم رصد حضورك خلال نافذة الاستلام. تواصل مع الفرع أو الدعم لإعادة الجدولة.
            </Text>
          ) : null}
          {stage === "verified" ? (
            <Text role="bodySm" tone="muted">تم تسليم طلبك بنجاح. شكرًا لاستخدامك بثواني.</Text>
          ) : null}
          {stage === "cancelled" ? (
            <Text role="bodySm" tone="muted">تم إلغاء هذا الطلب، ولن تتمكن من إكمال استلامه.</Text>
          ) : null}
        </Surface>

        {session && expiresAt ? (
          <Surface tone="raised" gap={2}>
            <View style={styles.detailRow}>
              <Text role="bodySm" tone="muted">نافذة الاستلام</Text>
              <Text role="bodyStrong">{expiresAt.toLocaleString("ar-YE")}</Text>
            </View>
            {expired && (stage === "ready" || stage === "notified") ? (
              <Text role="bodySm" tone="danger">انتهت نافذة الاستلام الحالية، سيتولى الفرع أو المشغل تمديدها أو إعادة الجدولة.</Text>
            ) : null}
            <View style={styles.detailRow}>
              <Text role="bodySm" tone="muted">محاولات التحقق</Text>
              <Text role="bodyStrong">{`${session.attemptCount} / ${session.maxAttempts}`}</Text>
            </View>
          </Surface>
        ) : null}

        <Button
          label="تحديث الحالة"
          accessibilityLabel="تحديث حالة الاستلام"
          tone="secondary"
          onPress={() => void refresh()}
        />
        {onBack ? <Button label="العودة للطلبات" tone="ghost" onPress={onBack} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  errorRoot: {
    flex: 1,
    justifyContent: "center",
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceWarm,
  },
  content: {
    flex: 1,
    padding: spacing[4],
    gap: spacing[3],
  },
  detailRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[3],
  },
});
