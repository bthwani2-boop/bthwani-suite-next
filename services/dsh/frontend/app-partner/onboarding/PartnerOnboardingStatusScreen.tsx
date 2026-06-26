import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import {
  usePartnerSelfController,
  getDshPartnerActivationStatusLabel,
  getDshPartnerActivationStateMetadata,
  getDshPartnerReadinessChecklist,
  isDshPartnerClientVisible,
} from "../../shared/partner";

export function PartnerOnboardingStatusScreen() {
  const identity = useIdentitySession();
  const { statusState, readinessState, reload } = usePartnerSelfController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل الدخول مطلوب"
        description="يجب تسجيل دخولك كشريك للاطلاع على حالة التأهيل."
      />
    );
  }
  if (statusState.kind === "loading" || statusState.kind === "idle") {
    return <StateView title="جاري تحميل حالة التأهيل…" />;
  }
  if (statusState.kind === "forbidden") {
    return <StateView title="غير مصرح" description="ليس لديك صلاحية عرض هذه البيانات." />;
  }
  if (statusState.kind === "not_found") {
    return <StateView title="لم يتم إيجاد ملف الشريك" description="تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ." />;
  }
  if (statusState.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل حالة التأهيل"
        description={statusState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={reload}
      />
    );
  }

  const partner = statusState.partner;
  const status = partner.activationStatus;
  const meta = getDshPartnerActivationStateMetadata(status);
  const statusLabel = getDshPartnerActivationStatusLabel(status);
  const checklist = getDshPartnerReadinessChecklist(status);
  const isVisible = isDshPartnerClientVisible(status);
  const isDeactivated = status === "partner_deactivated";
  const isRejected = status === "ops_rejected";

  const headerTone = isVisible ? "success" : isDeactivated || isRejected ? "danger" : "info";

  return (
    <ScrollScreen>
      <Header
        title="حالة تأهيل الشريك"
        subtitle="تعرّف على مرحلة التأهيل ومتطلبات التفعيل"
        actions={<Badge label={statusLabel} tone={headerTone} />}
      />

      <Card
        padding="$5"
        gap="$2"
        tone={isVisible ? "success" : isDeactivated || isRejected ? "danger" : "default"}
      >
        <Text role="titleLg">
          {isVisible
            ? "متجرك مرئي للعملاء"
            : isDeactivated
            ? "تم إيقاف الحساب"
            : isRejected
            ? "تم رفض الطلب"
            : meta.nextAction}
        </Text>
        {meta.blockedReason !== "" && (
          <Text tone="secondary">{meta.blockedReason}</Text>
        )}
      </Card>

      <View style={styles.checklist}>
        {checklist.map((item) => (
          <Card
            key={item.id}
            padding="$3"
            gap="$1"
            tone={item.satisfied ? "success" : "default"}
          >
            <Text role="label" tone={item.satisfied ? "success" : "muted"}>
              {item.satisfied ? "✓ " : "○ "}
              {item.label}
            </Text>
            {!item.satisfied && item.blockedReason != null && (
              <Text role="caption" tone="muted">{item.blockedReason}</Text>
            )}
          </Card>
        ))}
      </View>

      {readinessState.kind === "success" && (
        <Card padding="$4" gap="$2">
          <Text role="titleSm">جاهزية المتطلبات</Text>
          {readinessState.readiness.checklist.map((item) => (
            <Text
              key={item.id}
              tone={item.satisfied ? "success" : "muted"}
              role="body"
            >
              {item.satisfied ? "✓" : "○"} {item.label}
            </Text>
          ))}
        </Card>
      )}

      <Button label="تحديث" onPress={reload} tone="ghost" />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  checklist: { gap: spacing[2], marginTop: spacing[3] },
});
