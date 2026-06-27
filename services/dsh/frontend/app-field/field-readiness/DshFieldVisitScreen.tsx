import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { useFieldVisitController, buildVisitViewModel } from "../../shared/field-readiness";

/**
 * DshFieldVisitScreen
 *
 * تابع لتطبيق الميداني (app-field) — يُستخدم لتسجيل الزيارات الميدانية لتأهيل الشركاء
 * وإثبات الجاهزية التشغيلية قبل تفعيل الشريك في لوحة التحكم تحت قسم الشركاء.
 *
 * السياق: يُبدأ الموظف الميداني زيارة لمتجر/شريك معين، ويُكمل قائمة جاهزية التحقق الميداني،
 * ثم يرفع نتيجة الزيارة لتظهر في لوحة تحكم قسم الشركاء (Partner Readiness Approvals).
 */

type Props = { readonly storeId: string };

export function DshFieldVisitScreen({ storeId }: Props) {
  const identity = useIdentitySession();
  const { listState, actionState, reload, startVisit, completeVisit, resetAction } =
    useFieldVisitController(storeId, identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل الدخول مطلوب"
        description="يجب تسجيل دخولك كموظف ميداني للوصول لزيارات تأهيل الشركاء."
      />
    );
  }

  if (listState.kind === "loading") {
    return <StateView title="جاري تحميل الزيارات…" loading />;
  }

  if (listState.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل الزيارات"
        description={listState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void reload()}
      />
    );
  }

  return (
    <ScrollScreen>
      {/* رأس الشاشة + زر بدء زيارة جديدة */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text role="titleMd" style={styles.headerTitle}>
            زيارات التأهيل الميداني
          </Text>
          <Button
            label="بدء زيارة جديدة"
            tone="primary"
            disabled={actionState.kind === "submitting"}
            onPress={() => void startVisit({ visitType: "onboarding" })}
          />
        </View>
        <Text role="caption" tone="muted" style={styles.headerSubtitle}>
          الزيارات الميدانية مرتبطة بمسار اعتماد الشركاء في لوحة التحكم
        </Text>
      </Card>

      {/* حالة العملية */}
      {actionState.kind === "error" && (
        <Card style={styles.noticeCard}>
          <View style={styles.noticeRow}>
            <Text tone="danger">{actionState.message}</Text>
            <Button label="إغلاق" tone="ghost" onPress={resetAction} />
          </View>
        </Card>
      )}

      {actionState.kind === "success" && (
        <Card style={styles.successCard}>
          <View style={styles.noticeRow}>
            <Text tone="success">✓ تم بدء الزيارة الميدانية بنجاح</Text>
            <Button label="إغلاق" tone="ghost" onPress={resetAction} />
          </View>
        </Card>
      )}

      {/* قائمة الزيارات */}
      {listState.kind === "empty" && (
        <StateView
          title="لا توجد زيارات مسجّلة"
          description="ابدأ أول زيارة ميدانية لتأهيل هذا الشريك."
          actionLabel="بدء الزيارة"
          onActionPress={() => void startVisit({ visitType: "onboarding" })}
        />
      )}

      {listState.kind === "success" &&
        listState.visits.map((visit) => {
          const vm = buildVisitViewModel(visit);
          return (
            <Card key={vm.id} style={styles.visitCard}>
              <View style={styles.visitRow}>
                <View style={styles.visitInfo}>
                  <Text role="titleSm" style={styles.visitTitle}>
                    {vm.visitTypeLabel}
                  </Text>
                  <Text role="caption" tone="muted" style={styles.visitDate}>
                    {vm.startedAt}
                  </Text>
                </View>
                <View style={styles.visitActions}>
                  <Badge
                    label={vm.statusLabel}
                    tone={vm.isComplete ? "success" : vm.isInProgress ? "info" : "warning"}
                  />
                  {vm.isInProgress && (
                    <Button
                      label="إتمام الزيارة"
                      tone="success"
                      disabled={actionState.kind === "submitting"}
                      onPress={() => void completeVisit(vm.id)}
                    />
                  )}
                </View>
              </View>
            </Card>
          );
        })}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    padding: spacing[4],
    gap: spacing[2],
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "bold",
    color: "#1E293B",
  },
  headerSubtitle: {
    textAlign: "right",
    color: "#64748B",
    marginTop: 4,
  },
  noticeCard: {
    padding: spacing[3],
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  successCard: {
    padding: spacing[3],
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  noticeRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  visitCard: {
    padding: spacing[4],
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: spacing[2],
  },
  visitRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  visitInfo: {
    flex: 1,
    gap: spacing[1],
  },
  visitTitle: {
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "right",
  },
  visitDate: {
    color: "#64748B",
    textAlign: "right",
  },
  visitActions: {
    alignItems: "flex-end",
    gap: spacing[2],
  },
});

export default DshFieldVisitScreen;
