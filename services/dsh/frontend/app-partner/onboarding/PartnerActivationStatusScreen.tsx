import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity, ScrollView } from "react-native";
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
  lightThemeColors,
} from "@bthwani/ui-kit";
import { usePartnerSelfController, getDshPartnerActivationStatusLabel } from "../../shared/partner";
import type { DshPartnerActivationStatus } from "../../shared/partner";

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
  const statusLabel = getDshPartnerActivationStatusLabel(status);
  const isActive = status === "client_visible" || status === "partner_active";
  const isRejected = status === "ops_rejected";
  const isDeactivated = status === "partner_deactivated";
  const badgeTone = isActive ? "success" : isRejected || isDeactivated ? "danger" : "warning";

  // Customize checklist items for the onboarding flow matching screenshot
  const displayChecklist = [
    { id: "catalog", label: "📋 ملخص الكتالوج", satisfied: false, statusLabel: "غير جاهز" },
    { id: "hours", label: "🕐 ساعات العمل", satisfied: false, statusLabel: "غير جاهز" },
    { id: "contact", label: "📞 رقم التواصل", satisfied: false, statusLabel: "غير جاهز" },
    { id: "documents", label: "📁 وثائق الشراكة", satisfied: true, statusLabel: "جاهز" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Tab Header Switcher */}
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {subTab === "status" && (
          <>
            {/* Status Hero Card */}
            <Card
              padding="$5"
              gap="$3"
              style={{
                backgroundColor: "#FFF",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
              }}
            >
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Text role="titleMd" style={{ fontWeight: "bold", color: "#1E293B" }}>
                  حالة التسجيل والجاهزية
                </Text>
                <Badge label={`الحالة الحالية: ${statusLabel}`} tone={badgeTone} />
              </View>

              <Text role="body" style={{ color: "#475569", lineHeight: 22, textAlign: "right", marginTop: 8 }}>
                تم إرسال طلب الانضمام الخاص بك بنجاح. يرجى تزويد ممثل بثواني بالوثائق المطلوبة لاعتماد الحساب.
              </Text>
            </Card>

            {/* Checklist Requirements */}
            <Card
              padding="$5"
              gap="$3"
              style={{
                backgroundColor: "#FFF",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
              }}
            >
              <Text role="titleMd" style={{ fontWeight: "bold", color: "#1E293B", textAlign: "right", marginBottom: 8 }}>
                جاهزية الشريك
              </Text>

              <View style={{ gap: 12 }}>
                {displayChecklist.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: "row-reverse",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#F1F5F9",
                    }}
                  >
                    <Text role="body" style={{ fontWeight: "600", color: "#334155" }}>
                      {item.label}
                    </Text>
                    <Badge
                      label={item.statusLabel}
                      tone={item.satisfied ? "success" : "danger"}
                    />
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        {subTab === "requirements" && (
          <Card padding="$5" style={{ backgroundColor: "#FFF" }}>
            <Text role="titleMd" style={{ fontWeight: "bold", textAlign: "right", marginBottom: 12 }}>
              متطلبات التفعيل
            </Text>
            <Text role="body" style={{ textAlign: "right", color: "#475569", lineHeight: 20 }}>
              يتطلب التفعيل استكمال الوثائق الثبوتية وسجل تجاري ساري المفعول، بالإضافة إلى ربط الحساب البنكي للتسويات.
            </Text>
          </Card>
        )}

        {subTab === "documents" && (
          <Card padding="$5" style={{ backgroundColor: "#FFF" }}>
            <Text role="titleMd" style={{ fontWeight: "bold", textAlign: "right", marginBottom: 12 }}>
              مستندات الشراكة
            </Text>
            <Text role="body" style={{ textAlign: "right", color: "#475569", lineHeight: 20 }}>
              يرجى تحميل نسخة واضحة من بطاقة الهوية والسجل التجاري في قسم المستندات بالبوابة.
            </Text>
          </Card>
        )}
      </ScrollView>
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
    borderBottomColor: "#FF500D",
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
