import React from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  StateView,
  Text,
  TextField,
} from "@bthwani/ui-kit";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  addActorSupportMessage,
  createActorSupportTicket,
  fetchActorSupportMessages,
  fetchActorSupportTickets,
  markActorSupportMessagesRead,
  type DshSupportMessage,
  type DshSupportTicket,
} from "../../shared/support";
import {
  clearSupportMutationAttempt,
  getOrCreateSupportMutationAttempt,
} from "../../shared/support/support-mutation-attempt";

export type CaptainOrderSupportConversationScreenProps = {
  readonly orderId?: string;
  readonly composerEnabled: boolean;
  readonly onBack: () => void;
};

type LoadState = "idle" | "loading" | "ready" | "error";
type MutationState = "idle" | "creating" | "sending";

const CLOSED_STATUSES = new Set<DshSupportTicket["status"]>(["resolved", "closed"]);

const SENDER_LABELS: Readonly<Record<DshSupportMessage["senderRole"], string>> = {
  client: "العميل",
  partner: "الشريك",
  captain: "الكابتن",
  operator: "الدعم",
  system: "النظام",
};

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return timestamp.toLocaleString("ar-YE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function selectOrderTicket(
  tickets: readonly DshSupportTicket[],
  orderId: string,
): DshSupportTicket | null {
  return [...tickets]
    .filter((ticket) => ticket.orderId === orderId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

export function CaptainOrderSupportConversationScreen({
  orderId,
  composerEnabled,
  onBack,
}: CaptainOrderSupportConversationScreenProps) {
  const [loadState, setLoadState] = React.useState<LoadState>("idle");
  const [mutationState, setMutationState] = React.useState<MutationState>("idle");
  const [ticket, setTicket] = React.useState<DshSupportTicket | null>(null);
  const [messages, setMessages] = React.useState<readonly DshSupportMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");

  const load = React.useCallback(async () => {
    if (!orderId) return;
    setLoadState("loading");
    setErrorMessage("");
    try {
      const tickets = await fetchActorSupportTickets();
      const selected = selectOrderTicket(tickets, orderId);
      setTicket(selected);
      if (selected) {
        const readback = await fetchActorSupportMessages(selected.id);
        await markActorSupportMessagesRead(selected.id);
        setMessages(readback);
      } else {
        setMessages([]);
      }
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "تعذر تحميل محادثة الطلب من DSH.",
      );
    }
  }, [orderId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createConversation = React.useCallback(async () => {
    if (!orderId || mutationState !== "idle") return;
    const input = {
      orderId,
      subject: `تواصل الكابتن حول الطلب ${orderId}`,
      description: "قناة دعم تشغيلية مرتبطة بالطلب النشط ومسار التوصيل.",
      category: "delivery_issue" as const,
      priority: "high" as const,
    };
    const fingerprint = JSON.stringify(input);
    setMutationState("creating");
    setErrorMessage("");
    try {
      const attempt = await getOrCreateSupportMutationAttempt({
        scope: "actor",
        operation: "create-order-conversation",
        entityId: orderId,
        fingerprint,
      });
      const created = await createActorSupportTicket(input, attempt.context);
      await clearSupportMutationAttempt({
        scope: "actor",
        operation: "create-order-conversation",
        entityId: orderId,
        fingerprint,
      });
      const readback = await fetchActorSupportMessages(created.id);
      await markActorSupportMessagesRead(created.id);
      setTicket(created);
      setMessages(readback);
      setLoadState("ready");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "تعذر إنشاء محادثة الطلب.",
      );
    } finally {
      setMutationState("idle");
    }
  }, [mutationState, orderId]);

  const sendMessage = React.useCallback(async () => {
    const body = draft.trim();
    if (!ticket || body.length < 2 || mutationState !== "idle") return;
    const fingerprint = JSON.stringify({ ticketId: ticket.id, body });
    setMutationState("sending");
    setErrorMessage("");
    try {
      const attempt = await getOrCreateSupportMutationAttempt({
        scope: "actor",
        operation: "send-order-message",
        entityId: ticket.id,
        fingerprint,
      });
      await addActorSupportMessage(ticket.id, { body }, attempt.context);
      await clearSupportMutationAttempt({
        scope: "actor",
        operation: "send-order-message",
        entityId: ticket.id,
        fingerprint,
      });
      const [updatedTicket, readback] = await Promise.all([
        fetchActorSupportTickets(),
        fetchActorSupportMessages(ticket.id),
      ]);
      await markActorSupportMessagesRead(ticket.id);
      setTicket(selectOrderTicket(updatedTicket, ticket.orderId) ?? ticket);
      setMessages(readback);
      setDraft("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "تعذر إرسال الرسالة إلى DSH.",
      );
    } finally {
      setMutationState("idle");
    }
  }, [draft, mutationState, ticket]);

  if (!orderId) {
    return (
      <StateView
        title="لا يوجد طلب نشط للمحادثة"
        description="افتح مهمة حية أولًا حتى ترتبط التذكرة بمعرف الطلب الصحيح."
        tone="warning"
        actionLabel="العودة"
        onActionPress={onBack}
      />
    );
  }

  if ((loadState === "idle" || loadState === "loading") && !ticket) {
    return <StateView loading title="جارٍ تحميل محادثة الطلب من DSH" />;
  }

  if (loadState === "error" && !ticket) {
    return (
      <StateView
        title="تعذر تحميل محادثة الطلب"
        description={errorMessage}
        tone="danger"
        actionLabel="إعادة المحاولة"
        onActionPress={() => void load()}
      />
    );
  }

  if (!ticket) {
    return (
      <StateView
        title="لا توجد محادثة دعم لهذا الطلب"
        description="سيتم إنشاء تذكرة تشغيلية حقيقية مرتبطة بالطلب، ثم تظهر لدى فريق الدعم."
        tone="neutral"
        actionLabel={mutationState === "creating" ? "جارٍ الإنشاء" : "بدء محادثة دعم"}
        onActionPress={() => void createConversation()}
      />
    );
  }

  const isClosed = CLOSED_STATUSES.has(ticket.status);
  const canSend = composerEnabled && !isClosed && draft.trim().length >= 2 && mutationState === "idle";

  return (
    <Box gap={4}>
      <Box gap={2}>
        <Text role="titleMd">محادثة دعم الطلب</Text>
        <Text role="bodySm" tone="muted">الطلب: {ticket.orderId} · التذكرة: {ticket.id}</Text>
        <Box layoutDirection="row" gap={2}>
          <Badge label={TICKET_STATUS_LABELS[ticket.status]} tone={isClosed ? "success" : "warning"} />
          <Badge label={TICKET_PRIORITY_LABELS[ticket.priority]} tone={ticket.priority === "urgent" || ticket.priority === "high" ? "danger" : "neutral"} />
        </Box>
      </Box>

      <Box gap={2}>
        {messages.length === 0 ? (
          <StateView
            title="لا توجد رسائل بعد"
            description="اكتب أول تحديث تشغيلي مرتبط بالطلب."
            tone="neutral"
          />
        ) : messages.map((message) => (
          <Card key={message.id} padding={3} gap={1}>
            <Box layoutDirection="row" justify="space-between" align="center" gap={2}>
              <Text role="bodyStrong">{SENDER_LABELS[message.senderRole]}</Text>
              <Text role="caption" tone="muted">{formatTimestamp(message.createdAt)}</Text>
            </Box>
            <Text role="bodySm">{message.body}</Text>
          </Card>
        ))}
      </Box>

      {composerEnabled ? (
        <Box gap={2}>
          <TextField
            label="رسالة تشغيلية قصيرة"
            value={draft}
            onChangeText={setDraft}
            placeholder={isClosed ? "التذكرة مغلقة" : "مثال: وصلت إلى نقطة الاستلام وأحتاج تدخل الدعم."}
            multiline
            disabled={isClosed || mutationState !== "idle"}
          />
          {errorMessage ? <Text role="caption" tone="danger">{errorMessage}</Text> : null}
          <Button
            label={mutationState === "sending" ? "جارٍ الإرسال" : "إرسال إلى الدعم"}
            disabled={!canSend}
            onPress={() => void sendMessage()}
          />
        </Box>
      ) : (
        <StateView
          title="وضع القراءة"
          description="افتح إجراء إرسال الرسالة من دليل الدعم لإضافة تحديث جديد."
          tone="neutral"
        />
      )}

      <Box layoutDirection="row" gap={2}>
        <Button label="تحديث المحادثة" tone="secondary" onPress={() => void load()} />
        <Button label="العودة" tone="ghost" onPress={onBack} />
      </Box>
    </Box>
  );
}
