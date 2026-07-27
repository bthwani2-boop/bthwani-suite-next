import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  TopBar,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import {
  useSupportTicketController,
  SUPPORT_CLIENT_CATEGORIES,
  buildSupportTicketViewModel,
  TICKET_CATEGORY_LABELS,
  type DshTicketCategory,
} from "../../shared/support";

export type SupportTicketScreenProps = {
  readonly onOpenTicket?: (ticketId: string) => void;
  readonly onBack?: () => void;
};

export function SupportTicketScreen({ onOpenTicket, onBack }: SupportTicketScreenProps = {}) {
  const identity = useIdentitySession();
  const { listState, actionState, reload, submitTicket, resetAction } =
    useSupportTicketController(identity.state.kind);
  const [showForm, setShowForm] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<DshTicketCategory>("other");

  const closeForm = React.useCallback(() => {
    setShowForm(false);
    resetAction();
  }, [resetAction]);

  const handleSubmit = React.useCallback(async () => {
    const ok = await submitTicket({
      subject: subject.trim(),
      description: description.trim(),
      category,
    });
    if (!ok) return;
    setShowForm(false);
    setSubject("");
    setDescription("");
  }, [category, description, subject, submitTicket]);

  if (identity.state.kind !== "authenticated") {
    return (
      <View style={styles.root}>
        <TopBar title="الدعم والمساعدة" {...(onBack ? { onBack } : {})} />
        <StateView title="تسجيل الدخول مطلوب" description="يجب تسجيل دخولك للوصول إلى الدعم." />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopBar
        title="الدعم والمساعدة"
        subtitle="أنشئ تذكرة أو تابع طلباتك السابقة"
        {...(onBack ? { onBack } : {})}
      />
      <ScrollScreen contentContainerStyle={styles.content}>
        <Button
          label={showForm ? "إغلاق النموذج" : "تذكرة جديدة"}
          tone={showForm ? "secondary" : "primary"}
          disabled={actionState.kind === "submitting"}
          onPress={() => {
            resetAction();
            setShowForm((value) => !value);
          }}
        />

        {showForm ? (
          <Card>
            <View style={styles.form}>
              <Text role="titleSm">تفاصيل التذكرة</Text>
              <View style={styles.chips}>
                {SUPPORT_CLIENT_CATEGORIES.map((item) => (
                  <Button
                    key={item}
                    label={TICKET_CATEGORY_LABELS[item]}
                    tone={category === item ? "primary" : "ghost"}
                    disabled={actionState.kind === "submitting"}
                    onPress={() => setCategory(item)}
                  />
                ))}
              </View>
              <TextField
                label="الموضوع"
                value={subject}
                onChangeText={setSubject}
                placeholder="وصف مختصر للمشكلة"
                maxLength={160}
              />
              <TextField
                label="التفاصيل"
                value={description}
                onChangeText={setDescription}
                placeholder="اشرح المشكلة بتفصيل"
                multiline
                maxLength={4000}
              />
              {actionState.kind === "error" ? (
                <Text tone="danger">{actionState.message}</Text>
              ) : null}
              <View style={styles.formActions}>
                <Button
                  label={actionState.kind === "submitting" ? "جاري الإرسال…" : "إرسال التذكرة"}
                  tone="primary"
                  disabled={
                    subject.trim().length < 3 ||
                    description.trim().length < 10 ||
                    actionState.kind === "submitting"
                  }
                  onPress={() => void handleSubmit()}
                />
                <Button
                  label="إلغاء"
                  tone="ghost"
                  disabled={actionState.kind === "submitting"}
                  onPress={closeForm}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {actionState.kind === "success" ? (
          <Card>
            <View style={styles.notice} accessibilityLiveRegion="polite">
              <Text tone="success">تم إرسال تذكرتك وقراءتها من DSH</Text>
              <Button label="إغلاق" tone="ghost" onPress={resetAction} />
            </View>
          </Card>
        ) : null}

        {listState.kind === "loading" ? <StateView title="جاري تحميل التذاكر…" /> : null}
        {listState.kind === "error" ? (
          <StateView
            title="تعذر تحميل التذاكر"
            description={listState.message}
            actionLabel="إعادة المحاولة"
            onActionPress={() => void reload()}
          />
        ) : null}
        {listState.kind === "empty" ? (
          <StateView title="لا توجد تذاكر" description="لم تفتح أي تذاكر دعم بعد." />
        ) : null}
        {listState.kind === "success"
          ? listState.tickets.map((ticket) => {
              const view = buildSupportTicketViewModel(ticket);
              return (
                <Card key={view.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`فتح التذكرة ${view.subject}`}
                    testID={`support-ticket-${view.id}`}
                    onPress={() => onOpenTicket?.(view.id)}
                  >
                    <View style={styles.ticketRow}>
                      <View style={styles.ticketInfo}>
                        <Text role="titleSm">{view.subject}</Text>
                        <Text role="caption" tone="muted">{view.categoryLabel}</Text>
                        <Text role="caption" tone="muted">{view.createdAt}</Text>
                      </View>
                      <Badge label={view.statusLabel} tone={view.statusTone} />
                    </View>
                  </Pressable>
                </Card>
              );
            })
          : null}
      </ScrollScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceWarm },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] },
  form: { padding: spacing[4], gap: spacing[3] },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  formActions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  notice: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[3],
  },
  ticketRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[3],
  },
  ticketInfo: { flex: 1, gap: spacing[1] },
});
