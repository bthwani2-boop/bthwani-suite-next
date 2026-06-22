import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/app-shell";
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

export function PartnerStoreScreen() {
  const identity = useIdentitySession();
  const controller = useStoreRoleContextController(identity.state.kind);
  const [reason, setReason] = React.useState("");
  const state = controller.state;

  if (identity.state.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <Header title="دخول الشريك" subtitle="هوية موثقة لإدارة متجرك فقط" />
        <AuthLoginCard
          title="تسجيل دخول الشريك"
          subtitle="استخدم حساب الشريك المحلي المصرح به لهذا المتجر."
          loading={identity.state.kind === "authenticating"}
          {...(identity.state.kind === "error" ? { error: identity.state.message } : {})}
          onSubmit={(username, password) => void identity.login(username, password)}
        />
      </ScrollScreen>
    );
  }

  if (state.kind !== "success") {
    const { retryable, ...presentation } = toStoreRoleStatePresentation(state, {
      loading: "جاري تحميل المتجر",
      empty: "لا يوجد متجر متاح",
      error: "تعذر تحميل متجر الشريك",
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

  const partner = controller.experience?.partner;
  if (!partner) return null;
  return (
    <ScrollScreen>
      <Header
        title="مركز تشغيل المتجر"
        subtitle="ملخص جاهزية متجرك وظهوره للعملاء"
        actions={
          <Badge
            label={partner.store.isOpen ? "نشط الآن" : "متوقف"}
            tone={partner.store.isOpen ? "success" : "warning"}
          />
        }
      />

      <Card>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text role="titleLg">{partner.store.displayName}</Text>
            <Text tone="secondary">
              {partner.store.categoryLabel} · {partner.store.cityCode} / {partner.store.serviceAreaCode}
            </Text>
            <View style={styles.badges}>
              <Badge label={partner.operatingLabel} tone={partner.store.isOpen ? "success" : "warning"} />
              <Badge label={partner.visibilityLabel} tone={partner.store.isVisible ? "info" : "neutral"} />
            </View>
          </View>
          <View style={styles.score}>
            <Text role="display">{partner.readinessPercent}%</Text>
            <Text role="caption" tone="muted">جاهزية البيانات</Text>
          </View>
        </View>
      </Card>

      <View style={styles.metrics}>
        <Card>
          <View style={styles.metric}>
            <Text role="titleLg">{partner.checks.length - partner.attentionCount}</Text>
            <Text role="caption" tone="muted">عناصر جاهزة</Text>
          </View>
        </Card>
        <Card>
          <View style={styles.metric}>
            <Text role="titleLg">{partner.attentionCount}</Text>
            <Text role="caption" tone="muted">تحتاج مراجعة</Text>
          </View>
        </Card>
      </View>

      <Text role="titleMd">حالة التشغيل</Text>
      <Card>
        <ListItem title="طرق الخدمة" subtitle={partner.serviceModesLabel} />
        <ListItem title="الرؤية للعملاء" subtitle={partner.visibilityLabel} />
        <ListItem title="جاهزية الكتالوج" subtitle={partner.catalogReadinessSummary} />
      </Card>

      <Text role="titleMd">قائمة الجاهزية</Text>
      <Card>
        {partner.checks.map((check) => (
          <ListItem
            key={check.id}
            title={check.label}
            subtitle={check.detail}
            trailing={
              <Badge
                label={check.ready ? "جاهز" : "يحتاج إجراء"}
                tone={check.ready ? "success" : "warning"}
              />
            }
          />
        ))}
      </Card>

      <Card>
        <View style={styles.cardContent}>
          <Text role="titleSm">الإجراء التالي</Text>
          <Text tone="secondary">{partner.nextAction}</Text>
          <Text role="caption" tone="muted">
            إدارة المنتجات والطلبات ليست ضمن DSH-001، وتبقى مرتبطة بمواضيعها المعتمدة.
          </Text>
        </View>
      </Card>

      <Text role="titleMd">تحديث حالة التشغيل</Text>
      <Card>
        <View style={styles.cardContent}>
          <TextField
            label="سبب التغيير"
            value={reason}
            onChangeText={setReason}
            placeholder="اكتب سببًا تشغيليًا واضحًا"
          />
          <View style={styles.actions}>
            <Button
              label="تشغيل المتجر"
              tone="success"
              disabled={reason.trim().length < 3 || controller.actionState.kind === "submitting"}
              onPress={() => void controller.submit({
                kind: "partner",
                storeId: partner.store.id,
                input: {
                  expectedVersion: partner.store.version,
                  status: "active",
                  deliveryModes: [...partner.store.deliveryModes],
                  reason: reason.trim(),
                },
              })}
            />
            <Button
              label="إيقاف مؤقت"
              tone="secondary"
              disabled={reason.trim().length < 3 || controller.actionState.kind === "submitting"}
              onPress={() => void controller.submit({
                kind: "partner",
                storeId: partner.store.id,
                input: {
                  expectedVersion: partner.store.version,
                  status: "temporarily_closed",
                  deliveryModes: [...partner.store.deliveryModes],
                  reason: reason.trim(),
                },
              })}
            />
          </View>
          {controller.actionState.kind === "success" && (
            <Text tone="success">تم حفظ الإجراء وتسجيله في سجل التدقيق.</Text>
          )}
          {(controller.actionState.kind === "error" || controller.actionState.kind === "conflict") && (
            <Text tone="danger">{controller.actionState.message}</Text>
          )}
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
  badges: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  hero: {
    padding: spacing[4],
    gap: spacing[4],
  },
  heroCopy: {
    gap: spacing[2],
  },
  score: {
    alignItems: "flex-end",
    gap: spacing[1],
  },
  metrics: {
    flexDirection: "row-reverse",
    gap: spacing[3],
  },
  actions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  metric: {
    minWidth: 128,
    padding: spacing[4],
    alignItems: "center",
    gap: spacing[1],
  },
});
