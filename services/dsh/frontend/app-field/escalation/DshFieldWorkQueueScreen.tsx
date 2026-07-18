// app-field — DshFieldWorkQueueScreen
// The authenticated field agent's open visits and escalations across stores.
import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
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
      <View style={styles.root}>
        <Header title="مهام التحقق" />
        <StateView
          tone="danger"
          title="تسجيل الدخول مطلوب"
          description="سجّل دخولك لعرض مهامك الميدانية المفتوحة."
          {...(onBack ? { actionLabel: "رجوع", onActionPress: onBack } : {})}
        />
      </View>
    );
  }

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <View style={styles.root}>
        <Header title="مهام التحقق" />
        <StateView loading title="جارٍ تحميل مهامك الميدانية…" />
      </View>
    );
  }

  if (state.kind === "error") {
    return (
      <View style={styles.root}>
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
      <View style={styles.root}>
        <View style={styles.topActions}>
          {onBack ? <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} /> : null}
          <Button label="تحديث" tone="secondary" size="sm" fullWidth={false} onPress={() => void reload()} />
        </View>
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
    <View style={styles.root}>
      <View style={styles.topActions}>
        {onBack ? <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} /> : null}
        <Button label="تحديث" tone="secondary" size="sm" fullWidth={false} onPress={() => void reload()} />
      </View>
      <Header title="مهام التحقق" subtitle="زياراتك وتصعيداتك المفتوحة عبر كل المتاجر" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {visits.length > 0 ? (
          <View style={styles.section}>
            <Text role="bodyStrong" style={styles.sectionTitle}>الزيارات الجارية</Text>
            {visits.map((visit) => {
              const viewModel = buildVisitViewModel(visit);
              return (
                <Pressable key={viewModel.id} onPress={() => onOpenVisit(viewModel.storeId)}>
                  <Card style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text role="titleSm" style={styles.itemTitle}>{viewModel.visitTypeLabel}</Text>
                        <Text role="caption" tone="muted" style={styles.itemMeta}>{viewModel.startedAt}</Text>
                      </View>
                      <Badge label={viewModel.statusLabel} tone={viewModel.isComplete ? "success" : "info"} />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {escalations.length > 0 ? (
          <View style={styles.section}>
            <Text role="bodyStrong" style={styles.sectionTitle}>التصعيدات المفتوحة</Text>
            {escalations.map((escalation) => (
              <Pressable
                key={escalation.id}
                onPress={() => onOpenEscalation(escalation.storeId, escalation.visitId || undefined)}
              >
                <Card style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text role="titleSm" style={styles.itemTitle} numberOfLines={2}>{escalation.description}</Text>
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
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  topActions: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: 48 },
  section: { gap: spacing[2] },
  sectionTitle: { textAlign: "right", fontWeight: "bold", color: colorRoles.textPrimary },
  itemCard: {
    padding: spacing[3],
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  itemRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  itemInfo: { flex: 1, alignItems: "flex-end" },
  itemTitle: { fontWeight: "bold", textAlign: "right" },
  itemMeta: { marginTop: 2, textAlign: "right" },
});
