import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Card,
  ListItem,
  ScrollScreen,
  StateView,
  Surface,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import {
  usePartnerSelfController,
  getDshPartnerActivationStatusLabel,
  getDshPartnerReadinessChecklist,
} from "../../shared/partner";
import type { DshPartnerActivationStatus } from "../../shared/partner";
import { PartnerRequirementsScreen } from "./PartnerRequirementsScreen";
import { PartnerDocumentsScreen } from "./PartnerDocumentsScreen";

export function PartnerActivationStatusScreen() {
  const identity = useIdentitySession();
  const c = usePartnerSelfController(identity.state.kind);
  const [subTab, setSubTab] = useState<"status" | "requirements" | "documents">("status");

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل الدخول مطلوب"
        description="يجب تسجيل دخولك كشريك للاطلاع على حالة التأهيل."
      />
    );
  }

  if (c.statusState.kind === "loading" || c.statusState.kind === "idle") {
    return <StateView title="جاري تحميل حالة التأهيل…" loading />;
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
        tone="danger"
        actionLabel="إعادة المحاولة"
        onActionPress={c.reload}
      />
    );
  }

  const vm = c.statusViewModel!;
  const status = vm.activationStatus as DshPartnerActivationStatus;
  const checklist = getDshPartnerReadinessChecklist(status);
  const statusLabel = getDshPartnerActivationStatusLabel(status);
  const isActive = status === "client_visible" || status === "partner_active";
  const isRejected = status === "ops_rejected";
  const isDeactivated = status === "partner_deactivated";
  const badgeTone = isActive ? "success" : isRejected || isDeactivated ? "danger" : "info";

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* ── Sub Navigation Switcher ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, subTab === "status" && styles.tabButtonActive]}
          onPress={() => setSubTab("status")}
        >
          <Text style={[styles.tabText, subTab === "status" && styles.tabTextActive]}>الحالة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, subTab === "requirements" && styles.tabButtonActive]}
          onPress={() => setSubTab("requirements")}
        >
          <Text style={[styles.tabText, subTab === "requirements" && styles.tabTextActive]}>المتطلبات</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, subTab === "documents" && styles.tabButtonActive]}
          onPress={() => setSubTab("documents")}
        >
          <Text style={[styles.tabText, subTab === "documents" && styles.tabTextActive]}>الوثائق</Text>
        </TouchableOpacity>
      </View>

      {/* ── Sub-view rendering ── */}
      <View style={{ flex: 1 }}>
        {subTab === "status" && (
          <ScrollScreen>
            {/* ── Hero card ── */}
            <Card tone={isActive ? "success" : isRejected || isDeactivated ? "danger" : "default"} padding="$5" gap="$3">
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Text role="titleLg">
                  {isActive
                    ? "مبروك! متجرك مفعّل ونشط"
                    : isRejected
                    ? "تم رفض طلب التأهيل"
                    : isDeactivated
                    ? "متجرك موقوف مؤقتاً"
                    : "ملف التأهيل قيد المعالجة"}
                </Text>
                <Badge label={statusLabel} tone={badgeTone} />
              </View>
              <Text tone="secondary">
                {vm.nextAction ||
                  (isActive
                    ? "تابع متجرك وحافظ على جودة الخدمة."
                    : "فريق العمليات يراجع ملفك.")}
              </Text>
              {vm.blockedReason ? (
                <Text tone="warning">{vm.blockedReason}</Text>
              ) : null}
              {isRejected && vm.rejectionReason ? (
                <Surface tone="danger" padding="$3" gap="$1" borderless>
                  <Text role="titleSm" tone="danger">سبب الرفض</Text>
                  <Text tone="secondary">{vm.rejectionReason}</Text>
                </Surface>
              ) : null}
            </Card>

            {/* ── Readiness checklist ── */}
            <Card padding="$5" gap="$2">
              <Text role="titleMd" style={{ marginBottom: 8 }}>قائمة الجاهزية</Text>
              {checklist.map((item) => (
                <ListItem
                  key={item.id}
                  title={item.label}
                  leading={
                    <Badge
                      tone={item.satisfied ? "success" : "warning"}
                      label={item.satisfied ? "جاهز" : "مطلوب"}
                    />
                  }
                  {...(!item.satisfied && item.blockedReason ? { subtitle: item.blockedReason } : {})}
                />
              ))}
            </Card>

            {/* ── Detailed readiness ── */}
            {c.readinessViewModel ? (
              <Card padding="$5" gap="$2">
                <Text role="titleMd" style={{ marginBottom: 8 }}>الجاهزية التفصيلية</Text>
                {c.readinessViewModel.items.map((item) => (
                  <ListItem
                    key={item.id}
                    title={item.label}
                    leading={
                      <Badge
                        tone={item.satisfied ? "success" : "warning"}
                        label={item.satisfied ? "مكتمل" : "معلق"}
                      />
                    }
                    {...(!item.satisfied && item.blockedReason ? { subtitle: item.blockedReason } : {})}
                  />
                ))}
                {c.readinessViewModel.allGatesPassed ? (
                  <Surface tone="success" padding="$3" gap="$1" style={{ marginTop: 8 }}>
                    <Text role="bodyStrong" tone="success" style={{ textAlign: "right" }}>جميع شروط الظهور مستوفاة ✓</Text>
                  </Surface>
                ) : null}
              </Card>
            ) : null}
          </ScrollScreen>
        )}

        {subTab === "requirements" && <PartnerRequirementsScreen />}
        {subTab === "documents" && <PartnerDocumentsScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row-reverse",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    height: 48,
    alignItems: "stretch",
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: "#FF500D", // active tab color matching App BRAND (Orange)
  },
  tabText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#FF500D",
    fontWeight: "700",
  },
});
