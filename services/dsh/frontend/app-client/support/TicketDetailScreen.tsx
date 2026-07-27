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
  TextField,
  TopBar,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import { useTicketDetailController, buildSupportTicketViewModel } from "../../shared/support";

type Props = {
  readonly ticketId: string;
  readonly onBack?: () => void;
};

export function TicketDetailScreen({ ticketId, onBack }: Props) {
  const identity = useIdentitySession();
  const {
    detailState,
    messageListState,
    messageActionState,
    sendMessage,
    resetMessageAction,
    reloadDetail,
    reloadMessages,
  } = useTicketDetailController(ticketId, identity.state.kind);
  const [reply, setReply] = React.useState("");

  const handleSend = React.useCallback(async () => {
    const ok = await sendMessage({ body: reply.trim() });
    if (ok) setReply("");
  }, [reply, sendMessage]);

  if (identity.state.kind !== "authenticated") {
    return (
      <View style={styles.root}>
        <TopBar title="تفاصيل التذكرة" {...(onBack ? { onBack } : {})} />
        <StateView title="تسجيل الدخول مطلوب" description="يجب تسجيل الدخول لقراءة التذكرة." />
      </View>
    );
  }

  if (detailState.kind === "loading" || detailState.kind === "idle") {
    return (
      <View style={styles.root}>
        <TopBar title="تفاصيل التذكرة" {...(onBack ? { onBack } : {})} />
        <StateView loading title="جاري تحميل التذكرة…" />
      </View>
    );
  }

  if (detailState.kind === "error") {
    return (
      <View style={styles.root}>
        <TopBar title="تفاصيل التذكرة" {...(onBack ? { onBack } : {})} />
        <StateView
          tone="danger"
          title="تعذر تحميل التذكرة"
          description={detailState.message}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void reloadDetail()}
        />
      </View>
    );
  }

  if (detailState.kind !== "success") {
    return (
      <View style={styles.root}>
        <TopBar title="تفاصيل التذكرة" {...(onBack ? { onBack } : {})} />
        <StateView tone="danger" title="التذكرة غير متاحة" />
      </View>
    );
  }

  const ticket = detailState.ticket;
  const view = buildSupportTicketViewModel(ticket);
  const replyAllowed = ticket.status !== "closed" && ticket.status !== "resolved";

  return (
    <View style={styles.root}>
      <TopBar
        title={view.subject}
        subtitle={`#${view.id.slice(0, 8)}`}
        {...(onBack ? { onBack } : {})}
      />
      <ScrollScreen contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <Badge label={view.statusLabel} tone={view.statusTone} />
          <Button
            label="تحديث"
            tone="ghost"
            size="sm"
            onPress={() => void Promise.all([reloadDetail(), reloadMessages()])}
          />
        </View>

        {messageListState.kind === "loading" || messageListState.kind === "idle" ? (
          <StateView loading title="جاري تحميل المحادثة…" />
        ) : null}
        {messageListState.kind === "error" ? (
          <StateView
            tone="danger"
            title="تعذر تحميل رسائل التذكرة"
            description={messageListState.message}
            actionLabel="إعادة المحاولة"
            onActionPress={() => void reloadMessages()}
          />
        ) : null}
        {messageListState.kind === "success" && messageListState.messages.length === 0 ? (
          <StateView title="لا توجد رسائل بعد" description="أرسل أول رسالة لتوضيح المشكلة." />
        ) : null}
        {messageListState.kind === "success"
          ? messageListState.messages.map((message) => (
              <Card key={message.id}>
                <View style={styles.message}>
                  <View style={styles.messageMeta}>
                    <Text role="caption" tone="muted">{message.senderRole}</Text>
                    <Text role="caption" tone="muted">{message.createdAt}</Text>
                  </View>
                  <Text style={styles.messageBody}>{message.body}</Text>
                </View>
              </Card>
            ))
          : null}

        {replyAllowed ? (
          <Card>
            <View style={styles.replyForm}>
              <TextField
                label="ردّك"
                value={reply}
                onChangeText={(value) => {
                  setReply(value);
                  if (messageActionState.kind !== "idle") resetMessageAction();
                }}
                placeholder="اكتب ردك هنا…"
                multiline
                maxLength={4000}
              />
              {messageActionState.kind === "error" ? (
                <Text tone="danger">{messageActionState.message}</Text>
              ) : null}
              {messageActionState.kind === "success" ? (
                <Text tone="success">تم إرسال الرد وقراءته من DSH</Text>
              ) : null}
              <Button
                label={messageActionState.kind === "submitting" ? "جاري الإرسال…" : "إرسال"}
                tone="primary"
                disabled={reply.trim().length < 2 || messageActionState.kind === "submitting"}
                onPress={() => void handleSend()}
              />
            </View>
          </Card>
        ) : (
          <StateView
            tone="neutral"
            title="التذكرة مغلقة"
            description="يمكن قراءة المحادثة، لكن لا يمكن إضافة رد جديد بعد الإغلاق."
          />
        )}
      </ScrollScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceWarm },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] },
  statusRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  message: { padding: spacing[3], gap: spacing[2] },
  messageMeta: { flexDirection: "row-reverse", justifyContent: "space-between" },
  messageBody: { textAlign: "right" },
  replyForm: { padding: spacing[4], gap: spacing[2] },
});
