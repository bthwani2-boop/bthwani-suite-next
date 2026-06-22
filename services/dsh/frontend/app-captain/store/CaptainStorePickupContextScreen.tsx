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
        title="جاهزية نقطة الاستلام"
        subtitle="تحقق من المتجر والموقع قبل بدء مهمة التوصيل"
        actions={
          <Badge
            label={captain.operatingLabel}
            tone={captain.store.isOpen ? "success" : "warning"}
          />
        }
      />
      <Card>
        <View style={styles.hero}>
          <Text role="titleLg">{captain.store.displayName}</Text>
          <Text tone="secondary">{captain.store.categoryLabel}</Text>
          <View style={styles.badges}>
            <Badge label={captain.pickupLabel} tone={captain.pickupEnabled ? "success" : "warning"} />
            <Badge label={captain.locationLabel} tone="info" />
          </View>
        </View>
      </Card>

      <Text role="titleMd">ملخص الاستلام</Text>
      <Card>
        <ListItem title="موقع الاستلام" subtitle={captain.locationLabel} />
        <ListItem title="الوقت المتوقع" subtitle={captain.estimatedWindowLabel} />
        <ListItem title="طرق الخدمة" subtitle={captain.serviceModesLabel} />
      </Card>

      <Text role="titleMd">فحص ما قبل الوصول</Text>
      <Card>
        {captain.pickupChecks.map((check) => (
          <ListItem
            key={check.id}
            title={check.label}
            subtitle={check.detail}
            trailing={<Badge label={check.ready ? "جاهز" : "متوقف"} tone={check.ready ? "success" : "warning"} />}
          />
        ))}
      </Card>

      <Card>
        <View style={styles.cardContent}>
          <Text role="titleSm">تعليمات الكابتن</Text>
          <Text tone="secondary">{captain.pickupInstruction}</Text>
          <Text role="caption" tone="muted">
            هذه الشاشة لا تعيّن طلبًا ولا تؤكد استلامًا. دورة المهمة الكاملة تتبع DSH-007.
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
  hero: {
    padding: spacing[4],
    gap: spacing[2],
  },
  badges: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
});
