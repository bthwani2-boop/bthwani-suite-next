// app-field — DshFieldVisitScreen
// Screen for managing field visits and launching the readiness checklist.
import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  StateView,
  Text,
  Header,
  IconButton,
  Icon,
  spacing,
  colorRoles,
  radius,
  borders,
} from "@bthwani/ui-kit";
import { useFieldVisitController, buildVisitViewModel } from "../../shared/field-readiness";

type Props = {
  readonly storeId: string;
  readonly onBack?: () => void;
  readonly onGoToChecklist?: (visitId: string) => void;
};

export function DshFieldVisitScreen({ storeId, onBack, onGoToChecklist }: Props) {
  const identity = useIdentitySession();
  const { listState, actionState, reload, startVisit, completeVisit, resetAction } =
    useFieldVisitController(storeId, identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="تسجيل الدخول مطلوب" />
        <StateView
          title="تسجيل الدخول مطلوب"
          description="يجب تسجيل دخولك كموظف ميداني للوصول لزيارات تأهيل الشركاء."
        />
      </View>
    );
  }

  if (listState.kind === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="تحميل الزيارات" />
        <StateView title="جاري تحميل الزيارات…" loading />
      </View>
    );
  }

  if (listState.kind === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="خطأ في التحميل" />
        <StateView
          title="تعذر تحميل الزيارات"
          description={listState.message}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void reload()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <View style={{ paddingHorizontal: spacing[4] }}>
        <Header
          title="زيارات التأهيل الميداني"
          leading={
            onBack ? (
              <IconButton
                icon={<Icon name="arrow-back" size={20} tone="brand" mirrored />}
                accessibilityLabel="رجوع"
                onPress={onBack}
                tone="ghost"
              />
            ) : undefined
          }
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}
        showsVerticalScrollIndicator={false}
      >
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
                      <View style={{ flexDirection: 'row-reverse', gap: spacing[2], marginTop: spacing[2] }}>
                        <Button
                          label="قائمة التحقق"
                          tone="primary"
                          size="sm"
                          onPress={() => onGoToChecklist?.(vm.id)}
                        />
                        <Button
                          label="إتمام الزيارة"
                          tone="success"
                          size="sm"
                          disabled={actionState.kind === "submitting"}
                          onPress={() => void completeVisit(vm.id)}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            );
          })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    padding: spacing[4],
    gap: spacing[2],
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "bold",
    color: colorRoles.textPrimary,
  },
  headerSubtitle: {
    textAlign: "right",
  },
  visitCard: {
    padding: spacing[3],
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    marginBottom: spacing[2],
  },
  visitRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  visitInfo: {
    alignItems: "flex-end",
  },
  visitTitle: {
    fontWeight: "bold",
  },
  visitDate: {
    marginTop: 2,
  },
  visitActions: {
    alignItems: "flex-start",
    gap: spacing[1],
  },
  noticeCard: {
    borderColor: colorRoles.danger,
    borderWidth: 1,
    padding: spacing[2],
  },
  successCard: {
    borderColor: colorRoles.success,
    borderWidth: 1,
    padding: spacing[2],
  },
  noticeRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
