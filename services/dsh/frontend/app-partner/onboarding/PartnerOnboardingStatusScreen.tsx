import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { usePartnerOnboardingStatusController, buildOnboardingStatusViewModel } from "../../shared/field-readiness";

type Props = { readonly storeId: string };

export function PartnerOnboardingStatusScreen({ storeId }: Props) {
  const identity = useIdentitySession();
  const { state, reload } = usePartnerOnboardingStatusController(storeId, identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="يجب تسجيل دخولك كشريك للاطلاع على حالة التأهيل." />;
  }
  if (state.kind === "loading" || state.kind === "idle") return <StateView title="جاري تحميل حالة التأهيل…" />;
  if (state.kind === "error") {
    return <StateView title="تعذر تحميل حالة التأهيل" description={state.message} actionLabel="إعادة المحاولة" onActionPress={reload} />;
  }

  const vm = buildOnboardingStatusViewModel(state.status);
  const headerBadgeTone = vm.isComplete ? "success" : vm.hasOpenEscalations ? "danger" : "info";

  return (
    <ScrollScreen>
      <Header
        title="حالة تأهيل المتجر"
        subtitle="تعرّف على مراحل التحقق الميداني ومتمتطلبات التفعيل"
        actions={<Badge label={vm.statusLabel} tone={headerBadgeTone} />}
      />
      <Card padding="$5" gap="$2" tone={vm.isComplete ? "success" : "default"}>
        <Text role="titleLg">{vm.isComplete ? "مبروك! متجرك جاهز للتشغيل" : "التأهيل الميداني قيد التقدم"}</Text>
        <Text tone="secondary">
          {vm.isComplete
            ? "تم إتمام كل الزيارات الميدانية وحل جميع التصعيدات."
            : "يقوم فريقنا الميداني بمراجعة متجرك والتحقق من استيفائه لمعايير الجودة."}
        </Text>
      </Card>
      <View style={styles.metrics}>
        <Card fill padding="$4" centered gap="$1">
          <Text role="titleLg">{vm.completedVisits}</Text>
          <Text role="caption" tone="muted">زيارات مكتملة</Text>
        </Card>
        <Card fill padding="$4" centered gap="$1">
          <Text role="titleLg">{vm.totalVisits}</Text>
          <Text role="caption" tone="muted">إجمالي الزيارات</Text>
        </Card>
        <Card fill padding="$4" centered gap="$1">
          <Text role="titleLg" tone={vm.hasOpenEscalations ? "danger" : "default"}>{state.status.openEscalations}</Text>
          <Text role="caption" tone="muted">تصعيدات مفتوحة</Text>
        </Card>
      </View>
      {vm.hasOpenEscalations && (
        <Card padding="$4" gap="$2" tone="danger">
          <Text role="titleSm" tone="danger">هناك تصعيدات تحتاج حلاً</Text>
          <Text tone="secondary">فريق العمليات يراجع التصعيدات المرفوعة حالياً.</Text>
        </Card>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row-reverse", gap: spacing[3], marginTop: spacing[3] },
});
