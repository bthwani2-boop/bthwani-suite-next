import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/app-shell";
import { devBypassLogin } from "@bthwani/core-identity";
import {
  AuthLoginCard,
  Badge,
  Button,
  Card,
  Header,
  ListItem,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  toStoreRoleStatePresentation,
  useStoreRoleContextController,
} from "../../shared/store";

export function CaptainStorePickupContextScreen() {
  const identity = useIdentitySession();
  const controller = useStoreRoleContextController(identity.state.kind);
  const [reason, setReason] = React.useState("");
  const state = controller.state;

  if (identity.state.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <Header title="دخول الكابتن" subtitle="سياق الاستلام مرتبط بالمهمة المعيّنة فقط" />
        <AuthLoginCard
          title="تسجيل دخول الكابتن"
          subtitle="بعد الدخول سيظهر متجر الاستلام المعيّن لهويتك."
          loading={identity.state.kind === "authenticating"}
          {...(identity.state.kind === "error" ? { error: identity.state.message } : {})}
          onSubmit={(username, password) => void identity.login(username, password)}
          onDevBypass={() => devBypassLogin("captain")}
        />
      </ScrollScreen>
    );
  }

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

  const captain = controller.experience?.captain;
  if (!captain) return null;
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

      <Text role="titleMd">تقرير نقطة الاستلام</Text>
      <Card>
        <View style={styles.cardContent}>
          <TextField
            label="ملاحظة الجاهزية"
            value={reason}
            onChangeText={setReason}
            placeholder="اكتب حالة نقطة الاستلام"
          />
          <View style={styles.actions}>
            <Button
              label="النقطة جاهزة"
              tone="success"
              disabled={reason.trim().length < 3 || controller.actionState.kind === "submitting"}
              onPress={() => void controller.submit({
                kind: "captain",
                storeId: captain.store.id,
                input: {
                  expectedVersion: captain.store.version,
                  readiness: "ready",
                  reason: reason.trim(),
                },
              })}
            />
            <Button
              label="يوجد عائق"
              tone="danger"
              disabled={reason.trim().length < 3 || controller.actionState.kind === "submitting"}
              onPress={() => void controller.submit({
                kind: "captain",
                storeId: captain.store.id,
                input: {
                  expectedVersion: captain.store.version,
                  readiness: "blocked",
                  reason: reason.trim(),
                },
              })}
            />
          </View>
          {controller.actionState.kind === "success" && (
            <Text tone="success">تم إرسال تقرير الجاهزية دون تغيير دورة الطلب.</Text>
          )}
          {(controller.actionState.kind === "error" || controller.actionState.kind === "conflict") && (
            <Text tone="danger">{controller.actionState.message}</Text>
          )}
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
  actions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
});
