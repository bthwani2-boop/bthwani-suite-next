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

export function FieldStoreVerificationScreen({ storeId }: Props) {
  const controller = useStoreRoleContextController({
    ...(storeId !== undefined ? { storeId } : {}),
    actorRole: "field",
    contextMode: "verification",
  });
  const state = controller.state;

  if (state.kind !== "success") {
    const { retryable, ...presentation } = toStoreRoleStatePresentation(state, {
      loading: "جاري تحميل سياق المتجر",
      empty: "لا يوجد متجر للتحقق",
      error: "تعذر تحميل التحقق الميداني",
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

  const { field } = state;
  return (
    <ScrollScreen>
        <Header
          title="التحقق الميداني للمتجر"
          subtitle="سياق المتجر وأدلة الجاهزية المتاحة"
        />
        <Card>
          <View style={styles.cardContent}>
            <Text role="titleLg">{field.store.displayName}</Text>
            <Text tone="secondary">
              {field.store.serviceAreaCode} / {field.store.cityCode}
            </Text>
            <Badge
              label={field.verificationSummary}
              tone={field.checks.every((check) => check.ready) ? "success" : "warning"}
            />
          </View>
        </Card>

        <Text role="titleMd">قائمة التحقق</Text>
        <Card>
          {field.checks.map((check) => (
            <ListItem
              key={check.id}
              title={check.label}
              subtitle={check.detail}
              trailing={
                <Badge
                  label={check.ready ? "مثبت" : "ناقص"}
                  tone={check.ready ? "success" : "warning"}
                />
              }
            />
          ))}
        </Card>

        <Card>
          <View style={styles.cardContent}>
            <Text role="titleSm">حدود هذه الشاشة</Text>
            <Text tone="secondary">
              تعرض أدلة الجاهزية الموجودة في Store read-model فقط. لا تنفذ رفع
              وثائق أو اعتمادًا ميدانيًا أو workflow خارج المتجر.
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
