// app-field — DshFieldWorkQueueScreen
// "مهام التحقق" — the field agent's own open visits and escalations across
// every store, regardless of onboarding-draft status. This is the reachable
// entry point into visit/checklist/escalation for a field actor whose
// current partner list has no non-draft partner yet.
import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Card,
  StateView,
  Text,
  Header,
  spacing,
  colorRoles,
  radius,
} from "@bthwani/ui-kit";
import {
  useFieldWorkQueueController,
  buildVisitViewModel,
  ESCALATION_SEVERITY_LABELS,
  ESCALATION_CATEGORY_LABELS,
} from "../../shared/field-readiness";

type Props = {
  readonly onBack?: () => void;
  readonly onOpenVisit: (storeId: string) => void;
  readonly onOpenEscalation: (storeId: string, visitId?: string) => void;
};

export function DshFieldWorkQueueScreen({ onBack, onOpenVisit, onOpenEscalation }: Props) {
  const identity = useIdentitySession();
  const { state, reload } = useFieldWorkQueueController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="مهام التحقق" />
        <StateView title="تسجيل الدخول مطلوب" description="سجّل دخولك لعرض مهامك الميدانية المفتوحة." />
      </View>
    );
  }

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="مهام التحقق" />
        <StateView loading title="جارٍ تحميل مهامك الميدانية…" />
      </View>
    );
  }

  if (state.kind === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="مهام التحقق" />
        <StateView
          tone="danger"
          title="تعذر تحميل المهام"
          description={state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void reload()}
        />
      </View>
    );
  }

  if (state.kind === "empty") {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="مهام التحقق" />
        <StateView
          tone="neutral"
          title="لا توجد مهام مفتوحة حاليًا"
          description="ستظهر هنا زياراتك الجارية وتصعيداتك المفتوحة عبر كل المتاجر."
        />
      </View>
    );
  }

  const { visits, escalations } = state.queue;

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header title="مهام التحقق" subtitle="زياراتك وتصعيداتك المفتوحة عبر كل المتاجر" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {visits.length > 0 && (
          <View style={{ gap: spacing[2] }}>
            <Text role="bodyStrong" style={styles.sectionTitle}>
              الزيارات الجارية
            </Text>
            {visits.map((visit) => {
              const vm = buildVisitViewModel(visit);
              return (
                <Pressable key={vm.id} onPress={() => onOpenVisit(vm.storeId)}>
                  <Card style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text role="titleSm" style={styles.itemTitle}>
                          {vm.visitTypeLabel}
                        </Text>
                        <Text role="caption" tone="muted" style={styles.itemMeta}>
                          {vm.startedAt}
                        </Text>
                      </View>
                      <Badge label={vm.statusLabel} tone={vm.isComplete ? "success" : "info"} />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}

        {escalations.length > 0 && (
          <View style={{ gap: spacing[2] }}>
            <Text role="bodyStrong" style={styles.sectionTitle}>
              التصعيدات المفتوحة
            </Text>
            {escalations.map((escalation) => (
              <Pressable
                key={escalation.id}
                onPress={() => onOpenEscalation(escalation.storeId, escalation.visitId || undefined)}
              >
                <Card style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text role="titleSm" style={styles.itemTitle} numberOfLines={2}>
                        {escalation.description}
                      </Text>
                      <Text role="caption" tone="muted" style={styles.itemMeta}>
                        {ESCALATION_CATEGORY_LABELS[escalation.category]}
                      </Text>
                    </View>
                    <Badge
                      label={ESCALATION_SEVERITY_LABELS[escalation.severity]}
                      tone={escalation.severity === "critical" || escalation.severity === "high" ? "danger" : "warning"}
                    />
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    textAlign: "right",
    fontWeight: "bold",
    color: colorRoles.textPrimary,
  },
  itemCard: {
    padding: spacing[3],
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  itemRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  itemInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  itemTitle: {
    fontWeight: "bold",
    textAlign: "right",
  },
  itemMeta: {
    marginTop: 2,
    textAlign: "right",
  },
});
