import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  Badge,
  Box,
  Button,
  Icon,
  StateView,
  Text,
  TopBar,
  brandScale,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import {
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
import type { OrderTruth } from "../../shared/order-truth";

export type OrderChatScreenProps = {
  readonly orderId: string;
  readonly fulfillmentMode?: OrderTruth["fulfillmentMode"] | undefined;
  readonly onBack?: () => void;
  readonly onOpenNotifications?: () => void;
};

type LoadState = "idle" | "loading" | "ready" | "error";
type MutationState = "idle" | "sending";

const CLOSED_STATUSES = new Set<DshSupportTicket["status"]>(["resolved", "closed"]);

const QUICK_REPLIES: Readonly<Record<OrderTruth["fulfillmentMode"], readonly string[]>> = {
  bthwani_delivery: [
    "هل اقتربت من العنوان؟",
    "الرجاء الاتصال بي عند الوصول",
    "العنوان دقيق وموضح في الخريطة",
  ],
  partner_delivery: [
    "هل اقترب السائق من العنوان؟",
    "الرجاء الاتصال بي عند الوصول",
    "العنوان دقيق وموضح في الخريطة",
  ],
  pickup: [
    "هل الطلب جاهز للاستلام؟",
    "أنا في الطريق إلى المتجر الآن",
    "وصلت عند مدخل المتجر",
  ],
};

function selectOrderTicket(
  tickets: readonly DshSupportTicket[],
  orderId: string,
): DshSupportTicket | null {
  return [...tickets]
    .filter((ticket) => ticket.orderId === orderId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return timestamp.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" });
}

function attachmentLabel(message: DshSupportMessage): string | null {
  if (message.attachments.length === 0) return null;
  return message.attachments
    .map((attachment) => `${attachment.fileName} · ${attachment.kind}`)
    .join("، ");
}

export function OrderChatScreen({
  orderId,
  fulfillmentMode = "bthwani_delivery",
  onBack,
  onOpenNotifications,
}: OrderChatScreenProps) {
  const [loadState, setLoadState] = React.useState<LoadState>("idle");
  const [mutationState, setMutationState] = React.useState<MutationState>("idle");
  const [ticket, setTicket] = React.useState<DshSupportTicket | null>(null);
  const [messages, setMessages] = React.useState<readonly DshSupportMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const scrollRef = React.useRef<ScrollView>(null);
  const isPickup = fulfillmentMode === "pickup";
  const partnerTitle = isPickup ? "محادثة المتجر" : "محادثة التوصيل";

  const readback = React.useCallback(async (selectedTicket: DshSupportTicket) => {
    const [nextMessages] = await Promise.all([
      fetchActorSupportMessages(selectedTicket.id),
      markActorSupportMessagesRead(selectedTicket.id),
    ]);
    setTicket(selectedTicket);
    setMessages(nextMessages);
  }, []);

  const loadConversation = React.useCallback(async () => {
    if (!orderId.trim()) return;
    setLoadState("loading");
    setErrorMessage("");
    try {
      const tickets = await fetchActorSupportTickets();
      let selected = selectOrderTicket(tickets, orderId);
      if (!selected) {
        const input = {
          orderId,
          subject: `${isPickup ? "محادثة استلام" : "محادثة توصيل"} الطلب ${orderId}`,
          description: isPickup
            ? "محادثة تشغيلية مرتبطة باستلام الطلب ومتابعة جاهزيته."
            : "محادثة تشغيلية مرتبطة بتوصيل الطلب ومتابعة الوصول.",
          category: isPickup ? ("order_issue" as const) : ("delivery_issue" as const),
          priority: "high" as const,
        };
        const fingerprint = JSON.stringify(input);
        const attempt = await getOrCreateSupportMutationAttempt({
          scope: "client",
          operation: "create-order-chat",
          entityId: orderId,
          fingerprint,
        });
        selected = await createActorSupportTicket(input, attempt.context);
        await clearSupportMutationAttempt({
          scope: "client",
          operation: "create-order-chat",
          entityId: orderId,
          fingerprint,
        });
      }
      await readback(selected);
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setErrorMessage(error instanceof Error ? error.message : "تعذر تحميل محادثة الطلب من DSH.");
    }
  }, [isPickup, orderId, readback]);

  React.useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  const sendMessage = React.useCallback(async () => {
    const body = draft.trim();
    if (!ticket || body.length < 2 || mutationState !== "idle" || CLOSED_STATUSES.has(ticket.status)) return;
    const fingerprint = JSON.stringify({ ticketId: ticket.id, body });
    setMutationState("sending");
    setErrorMessage("");
    try {
      const attempt = await getOrCreateSupportMutationAttempt({
        scope: "client",
        operation: "send-order-chat-msg",
        entityId: ticket.id,
        fingerprint,
      });
      await addActorSupportMessage(ticket.id, { body }, attempt.context);
      await clearSupportMutationAttempt({
        scope: "client",
        operation: "send-order-chat-msg",
        entityId: ticket.id,
        fingerprint,
      });
      const tickets = await fetchActorSupportTickets();
      await readback(selectOrderTicket(tickets, orderId) ?? ticket);
      setDraft("");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "تعذر إرسال الرسالة إلى DSH.");
    } finally {
      setMutationState("idle");
    }
  }, [draft, mutationState, orderId, readback, ticket]);

  if (loadState === "error" && !ticket) {
    return (
      <StateView
        title="تعذر تحميل محادثة الطلب"
        description={errorMessage}
        tone="danger"
        actionLabel="إعادة المحاولة"
        onActionPress={() => void loadConversation()}
      />
    );
  }

  if ((loadState === "idle" || loadState === "loading") && !ticket) {
    return <StateView loading title="جارٍ تحميل محادثة الطلب من DSH" />;
  }

  const isClosed = ticket ? CLOSED_STATUSES.has(ticket.status) : false;
  const quickReplies = QUICK_REPLIES[fulfillmentMode];

  return (
    <View style={styles.root}>
      <TopBar
        title={partnerTitle}
        subtitle={`الطلب #${orderId.slice(0, 8)}`}
        onBack={onBack}
        rightSlot={
          onOpenNotifications ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="الإشعارات"
              onPress={onOpenNotifications}
              style={styles.headerButton}
            >
              <Icon name="notifications-outline" size={20} color={colorRoles.textPrimary} />
            </Pressable>
          ) : undefined
        }
      />

      <View style={styles.banner}>
        <Icon name="shield-checkmark-outline" size={16} color={colorRoles.brandAction} />
        <Text role="caption" tone="muted" style={styles.bannerText}>
          محادثة مرتبطة بالطلب وتُحفظ لدى DSH. لا يتم عرض نجاح محلي قبل القراءة من الخادم.
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messageScroll}
        contentContainerStyle={styles.messageContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <StateView title="لا توجد رسائل بعد" description="اكتب أول تحديث مرتبط بالطلب." tone="neutral" />
        ) : messages.map((message) => {
          const isMe = message.senderRole === "client";
          const attachment = attachmentLabel(message);
          return (
            <View key={message.id} style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                <Box layoutDirection="row" justify="space-between" gap={2}>
                  <Text role="caption" style={isMe ? styles.lightText : styles.senderText}>
                    {isMe ? "أنت" : message.senderRole === "captain" ? "الكابتن" : message.senderRole === "partner" ? "المتجر" : "فريق العمليات"}
                  </Text>
                  <Text role="caption" style={isMe ? styles.lightMutedText : styles.mutedText}>{formatTimestamp(message.createdAt)}</Text>
                </Box>
                <Text role="bodySm" style={isMe ? styles.lightText : styles.messageText}>{message.body}</Text>
                {attachment ? (
                  <Badge label={`مرفق محفوظ: ${attachment}`} tone={isMe ? "neutral" : "info"} />
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.quickReplies}>
        {quickReplies.map((reply) => (
          <Pressable key={reply} style={styles.quickReply} disabled={isClosed || mutationState !== "idle"} onPress={() => setDraft(reply)}>
            <Text role="caption" style={styles.quickReplyText}>{reply}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={isClosed ? "التذكرة مغلقة" : "اكتب رسالتك…"}
          placeholderTextColor={colorRoles.textMuted}
          style={styles.input}
          multiline
          maxLength={4000}
          editable={!isClosed && mutationState === "idle"}
          textAlign="right"
        />
        <Button
          label={mutationState === "sending" ? "جارٍ الإرسال" : "إرسال"}
          disabled={isClosed || draft.trim().length < 2 || mutationState !== "idle"}
          leading={mutationState === "sending" ? <ActivityIndicator color="#ffffff" /> : <Icon name="send" size={18} color="#ffffff" />}
          onPress={() => void sendMessage()}
        />
      </View>
      {errorMessage ? <Text role="caption" tone="danger" style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brandScale.surface[50] },
  headerButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.04)" },
  banner: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: spacing[3], paddingVertical: 7, backgroundColor: "rgba(255, 80, 13, 0.08)" },
  bannerText: { flex: 1, textAlign: "right" },
  messageScroll: { flex: 1 },
  messageContent: { padding: spacing[3], gap: spacing[3] },
  bubbleRow: { width: "100%", flexDirection: "row" },
  bubbleRowMe: { justifyContent: "flex-start" },
  bubbleRowOther: { justifyContent: "flex-end" },
  bubble: { maxWidth: "84%", padding: spacing[3], borderRadius: 14, gap: 5 },
  bubbleMe: { backgroundColor: colorRoles.brandAction, borderBottomLeftRadius: 3 },
  bubbleOther: { backgroundColor: colorRoles.surfaceBase, borderBottomRightRadius: 3, borderWidth: 1, borderColor: colorRoles.borderSubtle },
  senderText: { color: colorRoles.brandAction, fontWeight: "700" },
  messageText: { color: colorRoles.textPrimary },
  mutedText: { color: colorRoles.textMuted },
  lightText: { color: "#ffffff" },
  lightMutedText: { color: "rgba(255,255,255,0.75)" },
  quickReplies: { flexDirection: "row-reverse", gap: 8, paddingHorizontal: spacing[3], paddingVertical: 6 },
  quickReply: { backgroundColor: colorRoles.surfaceBase, borderWidth: 1, borderColor: "rgba(255, 80, 13, 0.25)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  quickReplyText: { color: colorRoles.brandAction },
  composer: { flexDirection: "row-reverse", alignItems: "flex-end", gap: spacing[2], padding: spacing[3], borderTopWidth: 1, borderTopColor: colorRoles.borderSubtle, backgroundColor: colorRoles.surfaceBase },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[2], color: colorRoles.textPrimary, backgroundColor: brandScale.surface[50] },
  error: { paddingHorizontal: spacing[3], paddingBottom: spacing[2], textAlign: "right", backgroundColor: colorRoles.surfaceBase },
});
