import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
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
  useSupportTicketController,
  SUPPORT_CLIENT_CATEGORIES,
  buildSupportTicketViewModel,
  TICKET_CATEGORY_LABELS,
  type DshTicketCategory,
} from "../../shared/support";

export type SupportTicketScreenProps = {
  readonly onOpenTicket?: (ticketId: string) => void;
};

export function SupportTicketScreen({ onOpenTicket }: SupportTicketScreenProps = {}) {
  const identity = useIdentitySession();
  const { listState, actionState, reload, submitTicket, resetAction } =
    useSupportTicketController(identity.state.kind);
  const [showForm, setShowForm] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<DshTicketCategory>("other");

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="يجب تسجيل دخولك للوصول إلى الدعم." />;
  }

  function handleSubmit() {
    void submitTicket({ subject: subject.trim(), description: description.trim(), category }).then(() => {
      setShowForm(false);
      setSubject("");
      setDescription("");
    });
  }

  return (
    <ScrollScreen>
      <Header
        title="الدعم والمساعدة"
        subtitle="أنشئ تذكرة أو تابع طلباتك السابقة"
        actions={<Button label="تذكرة جديدة" tone="primary" onPress={() => setShowForm(!showForm)} />}
      />

      {showForm && (
        <Card>
          <View style={styles.form}>
            <Text role="titleSm">تفاصيل التذكرة</Text>
            <View style={styles.chips}>
              {SUPPORT_CLIENT_CATEGORIES.map((c) => (
                <Button key={c} label={TICKET_CATEGORY_LABELS[c]} tone={category === c ? "primary" : "ghost"} onPress={() => setCategory(c)} />
              ))}
            </View>
            <TextField label="الموضوع" value={subject} onChangeText={setSubject} placeholder="وصف مختصر للمشكلة" />
            <TextField label="التفاصيل" value={description} onChangeText={setDescription} placeholder="اشرح المشكلة بتفصيل" multiline />
            {actionState.kind === "error" && <Text tone="danger">{actionState.message}</Text>}
            <View style={styles.formActions}>
              <Button label={actionState.kind === "submitting" ? "جاري الإرسال…" : "إرسال التذكرة"} tone="primary" disabled={subject.trim().length < 3 || description.trim().length < 10 || actionState.kind === "submitting"} onPress={handleSubmit} />
              <Button label="إلغاء" tone="ghost" onPress={() => setShowForm(false)} />
            </View>
          </View>
        </Card>
      )}

      {actionState.kind === "success" && (
        <Card><View style={styles.notice}><Text tone="success">تم إرسال تذكرتك بنجاح</Text><Button label="إغلاق" tone="ghost" onPress={resetAction} /></View></Card>
      )}

      {listState.kind === "loading" && <StateView title="جاري تحميل التذاكر…" />}
      {listState.kind === "error" && <StateView title="تعذر تحميل التذاكر" description={listState.message} actionLabel="إعادة المحاولة" onActionPress={() => void reload()} />}
      {listState.kind === "empty" && <StateView title="لا توجد تذاكر" description="لم تفتح أي تذاكر دعم بعد." />}
      {listState.kind === "success" &&
        listState.tickets.map((t) => {
          const vm = buildSupportTicketViewModel(t);
          return (
            <Card key={vm.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`فتح التذكرة ${vm.subject}`}
                testID={`support-ticket-${vm.id}`}
                onPress={() => onOpenTicket?.(vm.id)}
              >
                <View style={styles.ticketRow}>
                  <View style={styles.ticketInfo}>
                    <Text role="titleSm">{vm.subject}</Text>
                    <Text role="caption" tone="muted">{vm.categoryLabel}</Text>
                    <Text role="caption" tone="muted">{vm.createdAt}</Text>
                  </View>
                  <Badge label={vm.statusLabel} tone={vm.statusTone} />
                </View>
              </Pressable>
            </Card>
          );
        })}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing[4], gap: spacing[3] },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  formActions: { flexDirection: "row-reverse", gap: spacing[2] },
  notice: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  ticketRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  ticketInfo: { flex: 1, gap: spacing[1] },
});
