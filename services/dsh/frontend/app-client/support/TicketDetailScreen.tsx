import React from "react";
import { StyleSheet, View } from "react-native";
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
import { useTicketDetailController, TICKET_STATUS_LABELS } from "../../shared/support";

type Props = { readonly ticketId: string };

export function TicketDetailScreen({ ticketId }: Props) {
  const identity = useIdentitySession();
  const { detailState, messageListState, messageActionState, sendMessage, resetMessageAction } =
    useTicketDetailController(ticketId, identity.state.kind);
  const [reply, setReply] = React.useState("");

  if (identity.state.kind !== "authenticated") return null;
  if (detailState.kind === "loading") return <StateView title="جاري تحميل التذكرة…" />;
  if (detailState.kind === "error") return <StateView title="تعذر تحميل التذكرة" description={detailState.message} />;
  if (detailState.kind !== "success") return null;

  const ticket = detailState.ticket;

  function handleSend() {
    void sendMessage({ body: reply.trim() }).then(() => setReply(""));
  }

  return (
    <ScrollScreen>
      <Header
        title={ticket.subject}
        subtitle={`#${ticket.id.slice(0, 8)}`}
        actions={<Badge label={TICKET_STATUS_LABELS[ticket.status]} tone={ticket.status === "resolved" || ticket.status === "closed" ? "success" : "info"} />}
      />

      {messageListState.kind === "success" &&
        messageListState.messages.map((m) => (
          <Card key={m.id}>
            <View style={styles.message}>
              <View style={styles.messageMeta}>
                <Text role="caption" tone="muted">{m.senderRole}</Text>
                <Text role="caption" tone="muted">{m.createdAt}</Text>
              </View>
              <Text>{m.body}</Text>
            </View>
          </Card>
        ))}

      {ticket.status !== "closed" && ticket.status !== "resolved" && (
        <Card>
          <View style={styles.replyForm}>
            <TextField label="ردّك" value={reply} onChangeText={setReply} placeholder="اكتب ردك هنا…" multiline />
            {messageActionState.kind === "error" && <Text tone="danger">{messageActionState.message}</Text>}
            <Button label={messageActionState.kind === "submitting" ? "جاري الإرسال…" : "إرسال"} tone="primary" disabled={reply.trim().length < 2 || messageActionState.kind === "submitting"} onPress={handleSend} />
          </View>
        </Card>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  message: { padding: spacing[3], gap: spacing[1] },
  messageMeta: { flexDirection: "row-reverse", justifyContent: "space-between" },
  replyForm: { padding: spacing[4], gap: spacing[2] },
});
