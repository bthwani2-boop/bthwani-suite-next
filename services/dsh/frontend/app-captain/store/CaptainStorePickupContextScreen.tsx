import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Badge,
  Card,
  Header,
  ListItem,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import {
  toStoreRoleStatePresentation,
  useStoreRoleContextController,
} from "../../shared/store";

type Props = Readonly<{ storeId?: string }>;

export function CaptainStorePickupContextScreen({ storeId }: Props) {
  const controller = useStoreRoleContextController({
    ...(storeId !== undefined ? { storeId } : {}),
    actorRole: "captain",
    contextMode: "pickup-context",
  });
  const state = controller.state;

  if (state.kind !== "success") {
    const { retryable, ...presentation } = toStoreRoleStatePresentation(state, {
      loading: "جاري تحميل سياق الاستلام",
      empty: "لا يوجد متجر متاح للاستلام",
      error: "تعذر تحميل سياق الاستلام",
    });
    return (
      <StateView
        {...presentation}
        {...(retryable
          ? { actionLabel: "إعادة المحاولة", onActionPress: controller.retry }
          : {})}
      />
    );
  }

  const { captain } = state;
  return (
    <ScrollScreen>
        <Header
          title="سياق الاستلام من المتجر"
          subtitle="بيانات قراءة فقط قبل دورة التوصيل"
          actions={
            <Badge
              label={captain.operatingLabel}
              tone={captain.store.isOpen ? "success" : "warning"}
            />
          }
        />
        <Card>
          <View style={styles.cardContent}>
            <Text role="titleLg">{captain.store.displayName}</Text>
            <Text tone="secondary">{captain.store.categoryLabel}</Text>
            <Badge
              label={captain.pickupLabel}
              tone={captain.pickupEnabled ? "success" : "warning"}
            />
          </View>
        </Card>

        <Card>
          <ListItem
            title="موقع الاستلام"
            subtitle={captain.locationLabel}
          />
          <ListItem
            title="حالة المتجر"
            subtitle={captain.operatingLabel}
          />
          <ListItem
            title="طرق الخدمة"
            subtitle={captain.store.deliveryModes.join("، ") || "غير محددة"}
          />
        </Card>

        <Card>
          <View style={styles.cardContent}>
            <Text role="titleSm">قراءة فقط</Text>
            <Text tone="secondary">
              لا تتضمن هذه الشاشة تعيين طلب أو تأكيد استلام أو دورة توصيل أو
              أي بيانات مالية.
            </Text>
          </View>
        </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    padding: spacing[4],
    gap: spacing[2],
  },
});
