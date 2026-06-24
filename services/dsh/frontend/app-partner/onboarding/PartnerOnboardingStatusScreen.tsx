import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/app-shell";
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
        subtitle="تعرّف على مراحل التحقق الميداني ومتطلبات التفعيل"
        actions={<Badge label={vm.statusLabel} tone={headerBadgeTone} />
      />
      <Card>
        <View style={styles.hero}>
          <Text role="titleLg">{vm.isComplete ? "مبروك! متجرك جاهز للتشغيل" : "التأهيل الميداني قيد التقدم"}</Text>
          <Text tone="secondary">
            {vm.isComplete
              ? "تم إتمام كل الزيارات الميدانية وحل جميع التصعيدات."
              : "يقوم فريقنا الميداني بمراجعة متجرك والتحقق من استيفائه لمعايير الجودة."}
          </Text>
        </View>
      </Card>
      <View style={styles.metrics}>
        <Card><View style={styles.metric}><Text role="titleLg">{vm.completedVisits}</Text><Text role="caption" tone="muted">زيارات مكتملة</Text></View></Card>
        <Card><View style={styles.metric}><Text role="titleLg">{vm.totalVisits}</Text><Text role="caption" tone="muted">إجمالي الزيارات</Text></View></Card>
        <Card><View style={styles.metric}><Text role="titleLg" tone={vm.hasOpenEscalations ? "danger" : undefined}>{state.status.openEscalations}</Text><Text role="caption" tone="muted">تصعيدات مفتوحة</Text></View></Card>
      </View>
      {vm.hasOpenEscalations && (
        <Card><View style={styles.notice}><Text role="titleSm" tone="warning">هناك تصعيدات تحتاج حلاً</Text><Text tone="secondary">فريق العمليات يراجع التصعيدات المرفوعة.</Text></View></Card>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing[4], gap: spacing[2] },
  metrics: { flexDirection: "row-reverse", gap: spacing[3] },
  metric: { flex: 1, padding: spacing[4], alignItems: "center", gap: spacing[1] },
  notice: { padding: spacing[4], gap: spacing[2] },
});
