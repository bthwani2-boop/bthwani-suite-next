import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  StateView,
  Text,
  TextField,
  TopBar,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import {
  TICKET_CATEGORY_LABELS,
  usePartnerSupportController,
  type DshCreateTicketInput,
  type DshSupportTicket,
  type DshTicketCategory,
  type DshTicketPriority,
} from "../../shared/support";
import type {
  DshPartnerSupportCommandFilterId,
  DshPartnerSupportIssueCategoryId,
  DshPartnerSupportRouteId,
} from "../../shared/partner/partner.types";

export type PartnerSupportScreenProps = {
  readonly onBack?: () => void;
  readonly onOpenScreen?: (screenId: DshPartnerSupportRouteId) => void;
  readonly initialFilterId?: DshPartnerSupportCommandFilterId;
  readonly initialCaseId?: string | null;
  readonly initialIssueCategoryId?: DshPartnerSupportIssueCategoryId | null;
  readonly initialSupportRouteId?: DshPartnerSupportRouteId | null;
};

const STATUS_LABELS: Record<DshSupportTicket["status"], string> = {
  open: "مفتوحة",
  in_review: "قيد المراجعة",
  pending_user: "بانتظار ردك",
  resolved: "محلولة",
  closed: "مغلقة",
};

const PRIORITY_LABELS: Record<DshTicketPriority, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "مرتفعة",
  urgent: "عاجلة",
};

const CATEGORIES = Object.keys(TICKET_CATEGORY_LABELS) as DshTicketCategory[];
const PRIORITIES: DshTicketPriority[] = ["normal", "high", "urgent", "low"];

function categoryFromPartnerContext(
  issueCategory: DshPartnerSupportIssueCategoryId | null | undefined,
  orderId: string | null | undefined,
): DshTicketCategory {
  if (orderId) return "order_issue";
  const value = issueCategory ?? "";
  if (value.includes("inventory") || value.includes("product") || value.includes("store")) return "store_quality";
  if (value.includes("payment") || value.includes("wallet")) return "payment_reference";
  if (value.includes("login") || value.includes("account")) return "account_access";
  if (value.includes("delivery") || value.includes("courier")) return "delivery_issue";
  if (value.includes("app") || value.includes("technical")) return "app_bug";
  return "other";
}

function ticketTone(status: DshSupportTicket["status"]): "success" | "info" | "warning" | "danger" {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "pending_user") return "warning";
  if (status === "open") return "danger";
  return "info";
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ar");
}

export function PartnerSupportScreen({
  onBack,
  onOpenScreen: _onOpenScreen,
  initialFilterId: _initialFilterId,
  initialCaseId,
  initialIssueCategoryId,
  initialSupportRouteId: _initialSupportRouteId,
}: PartnerSupportScreenProps) {
  const controller = usePartnerSupportController(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<DshTicketCategory>(() =>
    categoryFromPartnerContext(initialIssueCategoryId, initialCaseId),
  );
  const [priority, setPriority] = React.useState<DshTicketPriority>("normal");
  const [messageBody, setMessageBody] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const submitTicket = async () => {
    const normalizedSubject = subject.trim();
    const normalizedDescription = description.trim();
    if (normalizedSubject.length < 3) {
      setFormError("اكتب عنوانًا واضحًا من ثلاثة أحرف على الأقل.");
      return;
    }
    if (normalizedDescription.length < 5) {
      setFormError("اشرح المشكلة بتفصيل كافٍ.");
      return;
    }
    setFormError(null);
    const input: DshCreateTicketInput = {
      subject: normalizedSubject,
      description: normalizedDescription,
      category,
      priority,
      ...(initialCaseId ? { orderId: initialCaseId } : {}),
    };
    const ok = await controller.createTicket(input);
    if (ok) {
      setSubject("");
      setDescription("");
      setPriority("normal");
      setShowCreate(false);
    }
  };

  const sendMessage = async () => {
    const ok = await controller.sendMessage(messageBody);
    if (ok) setMessageBody("");
  };

  if (controller.state.kind === "loading") {
    return (
      <View style={styles.root}>
        <TopBar title="دعم الشريك" {...(onBack ? { onBack } : {})} />
        <StateView loading title="جارٍ تحميل تذاكر الدعم" />
      </View>
    );
  }

  if (controller.state.kind === "error") {
    return (
      <View style={styles.root}>
        <TopBar title="دعم الشريك" {...(onBack ? { onBack } : {})} />
        <StateView
          tone="danger"
          title="تعذر تحميل دعم الشريك"
          description={controller.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={controller.reload}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopBar title="دعم الشريك" {...(onBack ? { onBack } : {})} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {controller.mutationError ? (
          <Card style={styles.errorCard}>
            <Text tone="danger" style={styles.rtl}>{controller.mutationError}</Text>
            <Button label="إغلاق" tone="ghost" size="sm" onPress={controller.clearMutationError} />
          </Card>
        ) : null}

        <View style={styles.headerRow}>
          <Button
            label={showCreate ? "إلغاء إنشاء التذكرة" : "تذكرة جديدة"}
            tone={showCreate ? "ghost" : "primary"}
            size="sm"
            disabled={controller.mutating}
            onPress={() => setShowCreate((current) => !current)}
          />
          <View style={styles.headerCopy}>
            <Text role="titleMd" style={styles.rtl}>تذاكر حساب الشريك</Text>
            <Text role="bodySm" tone="muted" style={styles.rtl}>
              كل تذكرة ومحادثة مرتبطة بهوية الشريك، ولا يمكن فتح تذكرة تخص شريكًا آخر.
            </Text>
          </View>
        </View>

        {showCreate ? (
          <Card style={styles.formCard}>
            <Text role="titleSm" style={styles.rtl}>إنشاء تذكرة دعم</Text>
            {initialCaseId ? (
              <Text role="caption" tone="muted" style={styles.rtl}>
                سترتبط التذكرة بالطلب {initialCaseId}، ويثبت الخادم أن الطلب يتبع متجرًا ضمن نطاق الشريك.
              </Text>
            ) : null}
            <TextField
              label="عنوان المشكلة"
              value={subject}
              onChangeText={setSubject}
              placeholder="مثال: تعذر تحديث حالة الطلب"
            />
            <TextField
              label="تفاصيل المشكلة"
              value={description}
              onChangeText={setDescription}
              placeholder="اشرح ما حدث وما النتيجة المتوقعة"
            />
            <Text role="bodyStrong" style={styles.rtl}>التصنيف</Text>
            <View style={styles.choiceRow}>
              {CATEGORIES.map((item) => (
                <Button
                  key={item}
                  label={TICKET_CATEGORY_LABELS[item]}
                  tone={category === item ? "primary" : "ghost"}
                  size="sm"
                  onPress={() => setCategory(item)}
                />
              ))}
            </View>
            <Text role="bodyStrong" style={styles.rtl}>الأولوية</Text>
            <View style={styles.choiceRow}>
              {PRIORITIES.map((item) => (
                <Button
                  key={item}
                  label={PRIORITY_LABELS[item]}
                  tone={priority === item ? "secondary" : "ghost"}
                  size="sm"
                  onPress={() => setPriority(item)}
                />
              ))}
            </View>
            {formError ? <Text tone="danger" style={styles.rtl}>{formError}</Text> : null}
            <Button
              label={controller.mutating ? "جارٍ الإرسال…" : "إرسال التذكرة"}
              tone="primary"
              disabled={controller.mutating}
              onPress={() => void submitTicket()}
            />
          </Card>
        ) : null}

        {controller.tickets.length === 0 ? (
          <StateView
            title="لا توجد تذاكر"
            description="أنشئ تذكرة عند وجود مشكلة تشغيلية حقيقية. لن تُعرض حالات أو أرقام طلبات تجريبية."
            actionLabel="إنشاء أول تذكرة"
            onActionPress={() => setShowCreate(true)}
          />
        ) : (
          <View style={styles.ticketList}>
            {controller.tickets.map((ticket) => (
              <Card key={ticket.id} style={styles.ticketCard}>
                <View style={styles.ticketTitleRow}>
                  <View style={styles.badges}>
                    <Badge label={STATUS_LABELS[ticket.status]} tone={ticketTone(ticket.status)} />
                    <Badge label={PRIORITY_LABELS[ticket.priority]} tone="info" />
                  </View>
                  <Text role="titleSm" style={styles.rtl}>{ticket.subject}</Text>
                </View>
                <Text role="bodySm" style={styles.rtl}>{ticket.description}</Text>
                <Text role="caption" tone="muted" style={styles.rtl}>
                  {TICKET_CATEGORY_LABELS[ticket.category]} · {formatTime(ticket.updatedAt)}
                </Text>
                {ticket.orderId ? (
                  <Text role="caption" tone="muted" style={styles.rtl}>الطلب: {ticket.orderId}</Text>
                ) : null}
                <Button
                  label={controller.selectedTicketId === ticket.id ? "التذكرة مفتوحة" : "فتح المحادثة"}
                  tone={controller.selectedTicketId === ticket.id ? "secondary" : "ghost"}
                  size="sm"
                  onPress={() => controller.selectTicket(ticket.id)}
                />
              </Card>
            ))}
          </View>
        )}

        {controller.selectedTicketId ? (
          <Card style={styles.detailCard}>
            {controller.detailState.kind === "loading" ? (
              <StateView loading title="جارٍ تحميل المحادثة" />
            ) : controller.detailState.kind === "error" ? (
              <StateView
                tone="danger"
                title="تعذر تحميل المحادثة"
                description={controller.detailState.message}
                actionLabel="إعادة المحاولة"
                onActionPress={controller.reloadDetail}
              />
            ) : controller.detailState.kind === "ready" ? (
              <>
                <View style={styles.ticketTitleRow}>
                  <Badge
                    label={STATUS_LABELS[controller.detailState.ticket.status]}
                    tone={ticketTone(controller.detailState.ticket.status)}
                  />
                  <Text role="titleMd" style={styles.rtl}>{controller.detailState.ticket.subject}</Text>
                </View>
                <Text role="bodySm" style={styles.rtl}>{controller.detailState.ticket.description}</Text>
                <View style={styles.messages}>
                  {controller.detailState.messages.length === 0 ? (
                    <Text role="bodySm" tone="muted" style={styles.rtl}>لا توجد رسائل بعد.</Text>
                  ) : (
                    controller.detailState.messages.map((message) => (
                      <Card key={message.id} style={styles.messageCard}>
                        <Text role="bodySm" style={styles.rtl}>{message.body}</Text>
                        <Text role="caption" tone="muted" style={styles.rtl}>
                          {message.senderRole === "partner" ? "الشريك" : "فريق الدعم"} · {formatTime(message.createdAt)}
                        </Text>
                      </Card>
                    ))
                  )}
                </View>
                {controller.detailState.ticket.status === "closed" ? (
                  <StateView
                    tone="success"
                    title="التذكرة مغلقة"
                    description="أنشئ تذكرة جديدة إذا ظهرت مشكلة مختلفة."
                  />
                ) : (
                  <>
                    <TextField
                      label="رسالتك"
                      value={messageBody}
                      onChangeText={setMessageBody}
                      placeholder="اكتب ردًا لفريق الدعم"
                    />
                    <Button
                      label={controller.mutating ? "جارٍ الإرسال…" : "إرسال الرسالة"}
                      tone="primary"
                      disabled={controller.mutating || messageBody.trim().length === 0}
                      onPress={() => void sendMessage()}
                    />
                  </>
                )}
              </>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  content: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  rtl: { textAlign: "right" },
  errorCard: { padding: spacing[3], gap: spacing[2] },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  headerCopy: { flex: 1, gap: spacing[1] },
  formCard: { padding: spacing[4], gap: spacing[3] },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  ticketList: { gap: spacing[3] },
  ticketCard: { padding: spacing[3], gap: spacing[2] },
  ticketTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[2] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing[1] },
  detailCard: { padding: spacing[4], gap: spacing[3] },
  messages: { gap: spacing[2] },
  messageCard: { padding: spacing[3], gap: spacing[1] },
});

export default PartnerSupportScreen;
