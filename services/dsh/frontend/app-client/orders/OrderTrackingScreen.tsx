import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  Header,
  ListItem,
  LoadingState,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import {
  resolveTrackingTitle,
  toDispatchCardViewModel,
  useClientTrackingController,
} from "../../shared/dispatch";

type Props = {
  readonly orderId: string;
  readonly onBack?: () => void;
};

export function OrderTrackingScreen({ orderId, onBack }: Props) {
  const controller = useClientTrackingController(orderId);

  if (controller.state.kind === "loading") {
    return <LoadingState title="جاري تحميل حالة الطلب..." />;
  }

  if (controller.state.kind === "error") {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل حالة الطلب"
        description={controller.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={controller.reload}
      />
    );
  }

  if (controller.state.kind !== "tracking_active" && controller.state.kind !== "delivered") {
    return null;
  }

  const assignment = controller.state.assignment;
  const vm = toDispatchCardViewModel(assignment);

  return (
    <ScrollScreen>
      <Header
        title={resolveTrackingTitle(assignment)}
        subtitle={vm.orderLabel}
        actions={<Badge label={vm.deliveryLabel} tone={controller.state.kind === "delivered" ? "success" : "info"} />}
      />

      <Card>
        <View style={styles.card}>
          <Text role="titleMd">مراحل حالة الطلب</Text>
          <View style={styles.timeline}>
            {vm.timeline.map((step) => (
              <Badge key={step.id} label={step.label} tone={step.complete ? "success" : "neutral"} />
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <ListItem title="الكابتن" subtitle={vm.captainLabel} />
        <ListItem title="الحالة الحالية" subtitle={vm.deliveryLabel} />
        <ListItem title="إثبات التسليم" subtitle={vm.proofLabel} />
      </Card>

      {controller.state.kind === "delivered" ? (
        <StateView tone="success" title="تم التسليم" description="تم إغلاق دورة التوصيل بعد رفع إثبات التسليم." />
      ) : (
        <StateView tone="info" title="التوصيل جارٍ" description="سيتم تحديث الحالة مع تقدم الكابتن في دورة التوصيل." />
      )}

      {onBack && <Button label="العودة للطلبات" tone="secondary" onPress={onBack} />}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    gap: spacing[3],
  },
  timeline: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
});

export default OrderTrackingScreen;
