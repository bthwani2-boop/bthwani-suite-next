import React from "react";
import {
  Badge,
  Box,
  borders,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  useFieldEscalationController,
  ESCALATION_SEVERITY_LABELS,
  ESCALATION_CATEGORY_LABELS,
  type DshEscalationStatus,
} from "../../../shared/field-readiness";

type FollowUpStatus = "resolved" | "escalated_further";

const FILTERS: ReadonlyArray<{ readonly label: string; readonly value: DshEscalationStatus | "" }> = [
  { label: "الكل", value: "" },
  { label: "مفتوح", value: "open" },
  { label: "قيد المراجعة", value: "acknowledged" },
  { label: "مصعّد للعمليات", value: "escalated_further" },
  { label: "محلول", value: "resolved" },
];

const STATUS_LABELS: Record<DshEscalationStatus, string> = {
  open: "مفتوح",
  acknowledged: "قيد المراجعة",
  escalated_further: "مصعّد للعمليات",
  resolved: "محلول",
};

export function FieldReadinessQueueScreen() {
  const { listState, actionState, loadOperatorEscalations, resolveEscalation, resetAction } =
    useFieldEscalationController("authenticated");
  const [activeFilter, setActiveFilter] = React.useState<DshEscalationStatus | "">("");
  const [followUp, setFollowUp] = React.useState<{ readonly id: string; readonly status: FollowUpStatus } | null>(null);
  const [resolutionNote, setResolutionNote] = React.useState("");

  function submitFollowUp() {
    if (!followUp || resolutionNote.trim().length < 5) return;
    void resolveEscalation(followUp.id, {
      status: followUp.status,
      resolutionNote: resolutionNote.trim(),
    }).then(() => {
      setFollowUp(null);
      setResolutionNote("");
      void loadOperatorEscalations(activeFilter || undefined);
    });
  }

  function handleAcknowledge(id: string) {
    void resolveEscalation(id, { status: "acknowledged" }).then(() => {
      void loadOperatorEscalations(activeFilter || undefined);
    });
  }

  function openFollowUp(id: string, status: FollowUpStatus) {
    setFollowUp((current) => current?.id === id && current.status === status ? null : { id, status });
    setResolutionNote("");
  }

  return (
    <ScrollScreen>
      <Header title="قائمة تصعيدات التحقق الميداني" subtitle="راجع التصعيدات الواردة من الموظفين الميدانيين واتخذ إجراءً موثقًا" />

      {actionState.kind === "error" ? (
        <Card>
          <Box style={styles.notice}>
            <Text tone="danger">{actionState.message}</Text>
            <Button label="إغلاق" tone="ghost" onPress={resetAction} />
          </Box>
        </Card>
      ) : null}

      <Card>
        <Box style={styles.filters}>
          {FILTERS.map((filter) => (
            <Button
              key={filter.value}
              label={filter.label}
              tone={activeFilter === filter.value ? "primary" : "ghost"}
              onPress={() => {
                setActiveFilter(filter.value);
                void loadOperatorEscalations(filter.value || undefined);
              }}
            />
          ))}
        </Box>
      </Card>

      {listState.kind === "loading" ? <StateView loading title="جاري تحميل التصعيدات…" /> : null}
      {listState.kind === "error" ? (
        <StateView
          tone="danger"
          title="تعذر التحميل"
          description={listState.message}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void loadOperatorEscalations(activeFilter || undefined)}
        />
      ) : null}
      {listState.kind === "empty" ? <StateView title="لا توجد تصعيدات" description="لا توجد تصعيدات بالفلتر الحالي." /> : null}

      {listState.kind === "success"
        ? listState.escalations.map((escalation) => {
            const followUpOpen = followUp?.id === escalation.id;
            return (
              <Card key={escalation.id}>
                <Box style={styles.escalationHeader}>
                  <Box style={styles.escalationMeta}>
                    <Text role="titleSm">{ESCALATION_CATEGORY_LABELS[escalation.category]}</Text>
                    <Text role="caption" tone="muted">متجر: {escalation.storeId}</Text>
                    <Text role="caption" tone="muted">{escalation.createdAt}</Text>
                  </Box>
                  <Box style={styles.badges}>
                    <Badge
                      label={ESCALATION_SEVERITY_LABELS[escalation.severity]}
                      tone={escalation.severity === "critical" ? "danger" : escalation.severity === "high" ? "warning" : "neutral"}
                    />
                    <Badge
                      label={STATUS_LABELS[escalation.status]}
                      tone={escalation.status === "resolved" ? "success" : escalation.status === "escalated_further" ? "danger" : escalation.status === "acknowledged" ? "info" : "warning"}
                    />
                  </Box>
                </Box>
                <Box style={styles.description}>
                  <Text tone="secondary">{escalation.description}</Text>
                  {escalation.resolutionNote ? <Text role="caption" tone="muted">آخر متابعة: {escalation.resolutionNote}</Text> : null}
                </Box>
                {escalation.status !== "resolved" ? (
                  <Box style={styles.actions}>
                    {escalation.status === "open" ? (
                      <Button
                        label="تأكيد الاستلام"
                        tone="secondary"
                        disabled={actionState.kind === "submitting"}
                        onPress={() => handleAcknowledge(escalation.id)}
                      />
                    ) : null}
                    <Button label="حل التصعيد" tone="success" onPress={() => openFollowUp(escalation.id, "resolved")} />
                    {escalation.status !== "escalated_further" ? (
                      <Button label="تصعيد أعلى" tone="danger" onPress={() => openFollowUp(escalation.id, "escalated_further")} />
                    ) : null}
                  </Box>
                ) : null}
                {followUpOpen ? (
                  <Box style={styles.resolveForm}>
                    <Text role="bodyStrong">
                      {followUp.status === "resolved" ? "توثيق حل التصعيد" : "توثيق سبب التصعيد الأعلى"}
                    </Text>
                    <TextField
                      label="ملاحظة المتابعة"
                      value={resolutionNote}
                      onChangeText={setResolutionNote}
                      placeholder="صف الإجراء أو سبب التصعيد"
                      multiline
                    />
                    <Box style={styles.formActions}>
                      <Button
                        label={actionState.kind === "submitting" ? "جاري الحفظ…" : "تأكيد الإجراء"}
                        tone={followUp.status === "resolved" ? "success" : "danger"}
                        disabled={resolutionNote.trim().length < 5 || actionState.kind === "submitting"}
                        onPress={submitFollowUp}
                      />
                      <Button label="إلغاء" tone="ghost" onPress={() => setFollowUp(null)} />
                    </Box>
                  </Box>
                ) : null}
              </Card>
            );
          })
        : null}
    </ScrollScreen>
  );
}

const styles = {
  notice: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  filters: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2], padding: spacing[3] },
  escalationHeader: { flexDirection: "row-reverse", justifyContent: "space-between", padding: spacing[3] },
  escalationMeta: { flex: 1, gap: spacing[1] },
  badges: { flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" },
  description: { paddingHorizontal: spacing[3], paddingBottom: spacing[3], gap: spacing[1] },
  actions: { flexDirection: "row-reverse", gap: spacing[2], paddingHorizontal: spacing[3], paddingBottom: spacing[3], flexWrap: "wrap" },
  resolveForm: { padding: spacing[3], gap: spacing[2], borderTopWidth: borders.hairline },
  formActions: { flexDirection: "row-reverse", gap: spacing[2] },
} as const;
