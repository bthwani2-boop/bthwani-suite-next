import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { Badge, Card, Header, ScrollScreen, StateView, Text, spacing, statusScale } from "@bthwani/ui-kit";
import { usePartnerSelfController, getDshPartnerActivationStatusLabel, getDshPartnerReadinessChecklist } from "../../shared/partner";
import type { DshPartnerActivationStatus } from "../../shared/partner";

export function PartnerActivationStatusScreen() {
  const identity = useIdentitySession();
  const c = usePartnerSelfController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل الدخول مطلوب"
        description="يجب تسجيل دخولك كشريك للاطلاع على حالة التأهيل."
      />
    );
  }

  if (c.statusState.kind === "loading" || c.statusState.kind === "idle") {
    return <StateView title="جاري تحميل حالة التأهيل…" />;
  }
  if (c.statusState.kind === "not_found") {
    return (
      <StateView
        title="لم يتم إيجاد ملف الشريك"
        description="تواصل مع فريق الدعم لإنشاء ملف شريكك."
      />
    );
  }
  if (c.statusState.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل حالة التأهيل"
        description={c.statusState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={c.reload}
      />
    );
  }

  const vm = c.statusViewModel!;
  const status = vm.onboardingStatus as DshPartnerActivationStatus;
  const checklist = getDshPartnerReadinessChecklist(status);
  const statusLabel = getDshPartnerActivationStatusLabel(status);
  const isActive = status === "client_visible" || status === "partner_active";
  const isRejected = status === "ops_rejected";
  const isDeactivated = status === "partner_deactivated";
  const badgeTone = isActive ? "success" : isRejected || isDeactivated ? "danger" : "info";

  return (
    <ScrollScreen>
      <Header
        title="حالة تأهيل متجرك"
        subtitle="تعرّف على مرحلة التأهيل الحالية وما تحتاجه للانتقال للمرحلة التالية"
        actions={<Badge label={statusLabel} tone={badgeTone} />}
      />

      <Card>
        <View style={styles.hero}>
          <Text role="titleLg">
            {isActive
              ? "مبروك! متجرك مفعّل ونشط"
              : isRejected
              ? "تم رفض طلب التأهيل"
              : isDeactivated
              ? "متجرك موقوف مؤقتاً"
              : "ملف التأهيل قيد المعالجة"}
          </Text>
          <Text tone="secondary">
            {vm.nextAction || (isActive ? "تابع متجرك وحافظ على جودة الخدمة." : "فريق العمليات يراجع ملفك.")}
          </Text>
          {vm.blockedReason ? (
            <Text tone="warning">{vm.blockedReason}</Text>
          ) : null}
          {isRejected && vm.rejectionReason ? (
            <View style={styles.rejectionBox}>
              <Text role="titleSm" tone="danger">سبب الرفض</Text>
              <Text tone="secondary">{vm.rejectionReason}</Text>
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={styles.section}>
          <Text role="titleMd">قائمة الجاهزية</Text>
          {checklist.map(item => (
            <View key={item.id} style={styles.checkItem}>
              <Text tone={item.satisfied ? "success" : "muted"}>
                {item.satisfied ? "✓" : "○"}
              </Text>
              <View style={styles.checkContent}>
                <Text role="bodyMd" tone={item.satisfied ? undefined : "muted"}>{item.label}</Text>
                {!item.satisfied && item.blockedReason ? (
                  <Text role="caption" tone="warning">{item.blockedReason}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </Card>

      {c.readinessViewModel && (
        <Card>
          <View style={styles.section}>
            <Text role="titleMd">الجاهزية التفصيلية</Text>
            {c.readinessViewModel.items.map(item => (
              <View key={item.id} style={[styles.readinessItem, item.satisfied ? styles.readinessDone : styles.readinessPending]}>
                <Text role="bodyMd" tone={item.satisfied ? "success" : "warning"}>{item.label}</Text>
                <Text tone={item.satisfied ? "success" : "muted"}>{item.satisfied ? "✓" : "✗"}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing[4], gap: spacing[2] },
  section: { padding: spacing[4], gap: spacing[3] },
  checkItem: { flexDirection: "row-reverse", gap: spacing[2], alignItems: "flex-start" },
  checkContent: { flex: 1, gap: spacing[1] },
  rejectionBox: { marginTop: spacing[2], padding: spacing[3], borderRadius: spacing[2], backgroundColor: statusScale.dangerSoft, gap: spacing[1] },
  readinessItem: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[2], borderRadius: spacing[1] },
  readinessDone: { backgroundColor: statusScale.successSoft },
  readinessPending: { backgroundColor: statusScale.warningSoft },
});
