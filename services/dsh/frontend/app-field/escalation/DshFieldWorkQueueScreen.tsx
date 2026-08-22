// app-field — DshFieldWorkQueueScreen
// مركز عمل واحد للمهام المسندة والزيارات والتصعيدات الخاصة بالمندوب.
import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { Badge, Button, Card, StateView, Text, Header, spacing, colorRoles, radius } from "@bthwani/ui-kit";
import {
  useFieldWorkQueueController,
  buildVisitViewModel,
  ESCALATION_SEVERITY_LABELS,
  ESCALATION_CATEGORY_LABELS,
  ESCALATION_STATUS_LABELS,
} from "../../shared/field-readiness";
import {
  listFieldOnboardingAssignments,
  openFieldOnboardingAssignment,
  type FieldOnboardingAssignment,
} from "../../shared/field-assignment";
import { DshFieldProblemState } from "../components/DshFieldProblemNotice";
import { FieldOnboardingAssignmentCard } from "../components/FieldOnboardingAssignmentCard";

type Props = {
  readonly onBack?: () => void;
  readonly onOpenVisit: (storeId: string) => void;
  readonly onOpenEscalation: (storeId: string, visitId?: string) => void;
  readonly onOpenAssignment: (assignment: FieldOnboardingAssignment) => void;
};

export function DshFieldWorkQueueScreen({ onBack, onOpenVisit, onOpenEscalation, onOpenAssignment }: Props) {
  const identity = useIdentitySession();
  const { state, reload } = useFieldWorkQueueController(identity.state.kind);
  const [assignments, setAssignments] = React.useState<readonly FieldOnboardingAssignment[]>([]);
  const [assignmentLoading, setAssignmentLoading] = React.useState(true);
  const [assignmentError, setAssignmentError] = React.useState<string | null>(null);
  const [openingAssignmentId, setOpeningAssignmentId] = React.useState<string | null>(null);

  const reloadAssignments = React.useCallback(async () => {
    if (identity.state.kind !== "authenticated") {
      setAssignmentLoading(false);
      return;
    }
    setAssignmentLoading(true);
    setAssignmentError(null);
    try {
      setAssignments(await listFieldOnboardingAssignments());
    } catch {
      setAssignmentError("تعذر تحميل المهام المسندة. تحقق من الاتصال ثم أعد المحاولة.");
    } finally {
      setAssignmentLoading(false);
    }
  }, [identity.state.kind]);

  React.useEffect(() => {
    void reloadAssignments();
  }, [reloadAssignments]);

  const reloadAll = React.useCallback(() => {
    void reload();
    void reloadAssignments();
  }, [reload, reloadAssignments]);

  const openAssignment = React.useCallback(async (assignment: FieldOnboardingAssignment) => {
    setOpeningAssignmentId(assignment.id);
    setAssignmentError(null);
    try {
      const opened = assignment.status === "assigned"
        ? await openFieldOnboardingAssignment(assignment.id, { expectedVersion: assignment.version })
        : assignment;
      setAssignments((current) => current.map((item) => item.id === opened.id ? opened : item));
      onOpenAssignment(opened);
    } catch {
      setAssignmentError("تعذر فتح المهمة. أعد تحميل القائمة ثم حاول مجددًا.");
    } finally {
      setOpeningAssignmentId(null);
    }
  }, [onOpenAssignment]);

  if (identity.state.kind !== "authenticated") {
    return (
      <View style={styles.root}>
        <Header title="مهامي" />
        <StateView tone="danger" title="تسجيل الدخول مطلوب" description="سجّل دخولك لعرض مهامك الميدانية المفتوحة." {...(onBack ? { actionLabel: "رجوع", onActionPress: onBack } : {})} />
      </View>
    );
  }

  const queueError = state.kind === "error" ? state.problem : null;
  const visits = state.kind === "success" ? state.queue.visits : [];
  const escalations = state.kind === "success" ? state.queue.escalations : [];
  const hasTasks = assignments.length > 0 || visits.length > 0 || escalations.length > 0;

  if (assignmentLoading && assignments.length === 0 && !queueError) {
    return (
      <View style={styles.root}>
        <Header title="مهامي" />
        <StateView loading title="جارٍ تحميل مهامك الميدانية…" />
      </View>
    );
  }

  if (queueError && assignments.length === 0 && !assignmentLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.topActions}>
          {onBack ? <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} /> : null}
          <Button label="تحديث" tone="secondary" size="sm" fullWidth={false} onPress={reloadAll} />
        </View>
        <Header title="مهامي" />
        <DshFieldProblemState problem={queueError} handlers={{ refresh_record: reloadAll, refresh_scope: reloadAll }} onRetry={reloadAll} />
      </View>
    );
  }

  if (!assignmentLoading && !hasTasks && !assignmentError && !queueError) {
    return (
      <View style={styles.root}>
        <View style={styles.topActions}>
          {onBack ? <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} /> : null}
          <Button label="تحديث" tone="secondary" size="sm" fullWidth={false} onPress={reloadAll} />
        </View>
        <Header title="مهامي" />
        <StateView tone="neutral" title="لا توجد مهام مفتوحة حاليًا" description="ستظهر هنا مهام المتاجر والزيارات والتصعيدات التي تحتاج إنجازك." />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topActions}>
        {onBack ? <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} /> : null}
        <Button label="تحديث" tone="secondary" size="sm" fullWidth={false} onPress={reloadAll} />
      </View>
      <Header title="مهامي" subtitle="متاجر وزيارات تحتاج إنجازك" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {assignmentError ? <StateView tone="warning" title="تعذر تحديث مهام المتاجر" description={assignmentError} actionLabel="إعادة المحاولة" onActionPress={reloadAssignments} /> : null}
        {queueError ? <DshFieldProblemState problem={queueError} handlers={{ refresh_record: reloadAll, refresh_scope: reloadAll }} onRetry={reloadAll} /> : null}
        {assignments.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Badge label={`${assignments.length} ${assignments.length === 1 ? "مهمة" : "مهام"}`} tone="info" />
              <Text role="bodyStrong" style={styles.sectionTitle}>متاجر مسندة إليك</Text>
            </View>
            {assignments.map((assignment) => (
              <FieldOnboardingAssignmentCard
                key={assignment.id}
                assignment={assignment}
                loading={openingAssignmentId === assignment.id}
                onPress={() => void openAssignment(assignment)}
              />
            ))}
          </View>
        ) : null}

        {visits.length > 0 ? (
          <View style={styles.section}>
            <Text role="bodyStrong" style={styles.sectionTitle}>الزيارات الجارية</Text>
            {visits.map((visit) => {
              const viewModel = buildVisitViewModel(visit);
              const isStale = visit.isStale;
              return (
                <Pressable key={viewModel.id} onPress={() => !isStale && onOpenVisit(viewModel.storeId)} disabled={isStale}>
                  <Card style={[styles.itemCard, isStale && styles.itemCardStale]}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text role="titleSm" style={[styles.itemTitle, isStale && styles.itemTextStale]}>{viewModel.visitTypeLabel}</Text>
                        <Text role="caption" tone="muted" style={styles.itemMeta}>{viewModel.startedAt}</Text>
                      </View>
                      {isStale ? <Badge label="صلاحية ملغاة" tone="neutral" /> : <Badge label={viewModel.statusLabel} tone={viewModel.isComplete ? "success" : "info"} />}
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
            {escalations.map((escalation) => {
              const isStale = escalation.isStale;
              return (
                <Pressable key={escalation.id} onPress={() => !isStale && onOpenEscalation(escalation.storeId, escalation.visitId || undefined)} disabled={isStale}>
                  <Card style={[styles.itemCard, isStale && styles.itemCardStale]}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text role="titleSm" style={[styles.itemTitle, isStale && styles.itemTextStale]} numberOfLines={2}>{escalation.description}</Text>
                        <Text role="caption" tone="muted" style={styles.itemMeta}>{ESCALATION_CATEGORY_LABELS[escalation.category]}</Text>
                      </View>
                      {isStale ? <Badge label="صلاحية ملغاة" tone="neutral" /> : <View style={{ gap: spacing[1], alignItems: "flex-end" }}><Badge label={ESCALATION_STATUS_LABELS[escalation.status]} tone={escalation.status === "resolved" ? "success" : escalation.status === "open" ? "info" : "warning"} /><Badge label={ESCALATION_SEVERITY_LABELS[escalation.severity]} tone={escalation.severity === "critical" || escalation.severity === "high" ? "danger" : "warning"} /></View>}
                    </View>
                    {!isStale && escalation.resolutionNote ? <View style={styles.note}><Text role="caption" tone="muted" style={styles.noteLabel}>رد الإدارة:</Text><Text role="bodySm" style={styles.noteText}>{escalation.resolutionNote}</Text></View> : null}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  scroll: { flex: 1 },
  topActions: { flexDirection: "row-reverse", justifyContent: "space-between", paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: 48 },
  section: { gap: spacing[2] },
  sectionHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { textAlign: "right", fontWeight: "bold", color: colorRoles.textPrimary },
  itemCard: { padding: spacing[3], backgroundColor: colorRoles.surfaceBase, borderRadius: radius.md, borderWidth: 1, borderColor: colorRoles.borderSubtle },
  itemCardStale: { backgroundColor: colorRoles.surfaceMuted, borderColor: colorRoles.borderSubtle, opacity: 0.7 },
  itemRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  itemInfo: { flex: 1, alignItems: "flex-end" },
  itemTitle: { fontWeight: "bold", textAlign: "right" },
  itemTextStale: { color: colorRoles.textMuted, textDecorationLine: "line-through" },
  itemMeta: { marginTop: 2, textAlign: "right" },
  note: { marginTop: spacing[2], paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colorRoles.borderSubtle },
  noteLabel: { textAlign: "right", fontWeight: "bold" },
  noteText: { textAlign: "right" },
});
