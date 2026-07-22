import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Screen, StateView, Text, TextField, colorRoles, spacing } from "@bthwani/ui-kit";
import {
  canClientApproveSpecialRequestQuote,
  canClientCancelSpecialRequest,
  canClientRespondToInformation,
  clientCancellationActionLabel,
  isClientQuoteDecisionPending,
  specialRequestStatusLabel,
  specialRequestTypeLabel,
} from "./special-requests.actions";
import { useClientSpecialRequestsListController } from "./use-special-requests-controller";
import type {
  DshSpecialRequestInformationExchange,
  DshSpecialRequestResponse,
  SpecialRequestDetailBundle,
} from "./special-requests.types";

export type ClientSpecialRequestsScreenProps = {
  readonly onBack: () => void;
  readonly onCreateShein: () => void;
  readonly onCreateAwnak: () => void;
};

function quoteLabel(request: DshSpecialRequestResponse): string | null {
  if (request.estimatedAmountMinorUnits === null || request.estimatedAmountMinorUnits === undefined || !request.currency) {
    return null;
  }
  try {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: request.currency,
    }).format(request.estimatedAmountMinorUnits / 100);
  } catch {
    return `${request.estimatedAmountMinorUnits} ${request.currency}`;
  }
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("ar-YE");
}

function EvidenceRow({ label, value }: { readonly label: string; readonly value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  return <Text style={styles.secondaryText}>{label}: {String(value)}</Text>;
}

type RequestCardProps = {
  readonly request: DshSpecialRequestResponse;
  readonly detail: SpecialRequestDetailBundle | undefined;
  readonly isBusy: boolean;
  readonly onApprove: () => Promise<boolean>;
  readonly onCancel: () => Promise<boolean>;
  readonly onRespond: (
    exchange: DshSpecialRequestInformationExchange,
    response: string,
  ) => Promise<boolean>;
};

function RequestCard({ request, detail, isBusy, onApprove, onCancel, onRespond }: RequestCardProps) {
  const [responseDraft, setResponseDraft] = React.useState("");
  const amount = quoteLabel(request);
  const canApprove = canClientApproveSpecialRequestQuote(request);
  const canCancel = canClientCancelSpecialRequest(request);
  const canRespond = canClientRespondToInformation(request);
  const quoteDecisionPending = isClientQuoteDecisionPending(request);
  const cancellationLabel = clientCancellationActionLabel(request);
  const exchange = detail?.informationExchange;
  const execution = detail?.execution;
  const financial = detail?.financial;
  const latestException = execution?.latestException;
  const paymentSession = financial?.paymentSession;

  const submitResponse = React.useCallback(async () => {
    if (!exchange || exchange.status !== "pending" || !responseDraft.trim()) return;
    const accepted = await onRespond(exchange, responseDraft.trim());
    if (accepted) setResponseDraft("");
  }, [exchange, onRespond, responseDraft]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text role="titleSm" style={styles.rtlText}>{specialRequestTypeLabel(request)}</Text>
        <Text style={styles.statusText}>{specialRequestStatusLabel(request)}</Text>
      </View>
      <Text style={styles.secondaryText}>المرجع: {request.id}</Text>
      <Text style={styles.secondaryText}>النسخة: {request.version}</Text>
      {amount ? <Text style={styles.amountText}>العرض: {amount}</Text> : null}
      {request.rejectionReason ? (
        <Text style={styles.errorText}>سبب الرفض التشغيلي: {request.rejectionReason}</Text>
      ) : null}

      {canRespond && exchange?.status === "pending" ? (
        <View style={styles.section}>
          <Text role="titleSm" style={styles.rtlText}>معلومات مطلوبة</Text>
          <Text style={styles.warningText}>{exchange.question}</Text>
          <TextField
            label="ردك"
            value={responseDraft}
            onChangeText={setResponseDraft}
            placeholder="اكتب المعلومات المطلوبة بدقة"
            multiline
            numberOfLines={4}
            maxLength={2000}
            disabled={isBusy}
          />
          <Button
            label={isBusy ? "جاري إرسال الرد..." : "إرسال المعلومات ومتابعة المراجعة"}
            tone="primary"
            disabled={isBusy || responseDraft.trim().length === 0}
            onPress={() => void submitResponse()}
          />
        </View>
      ) : exchange ? (
        <View style={styles.section}>
          <Text role="titleSm" style={styles.rtlText}>سجل المعلومات</Text>
          <EvidenceRow label="سؤال المشغّل" value={exchange.question} />
          <EvidenceRow label="رد العميل" value={exchange.response} />
          <EvidenceRow label="حالة الجولة" value={exchange.status} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text role="titleSm" style={styles.rtlText}>خط التنفيذ والأدلة</Text>
        <EvidenceRow label="تم الشراء" value={formatTimestamp(request.purchasedAt)} />
        <EvidenceRow label="مرجع الاستلام الوارد" value={request.inboundReference} />
        <EvidenceRow label="تم الاستلام الوارد" value={formatTimestamp(request.inboundReceivedAt)} />
        <EvidenceRow label="اكتمل الفرز" value={formatTimestamp(request.sortingCompletedAt)} />
        <EvidenceRow label="جاهز للتوصيل" value={formatTimestamp(request.readyForDeliveryAt)} />
        <EvidenceRow label="الكابتن" value={execution?.captainId} />
        <EvidenceRow label="حالة الإسناد" value={execution?.assignmentStatus} />
        <EvidenceRow label="حالة التوصيل" value={execution?.deliveryStatus} />
        <EvidenceRow label="تم الاستلام" value={formatTimestamp(request.pickedUpAt)} />
        <EvidenceRow label="تم التسليم" value={formatTimestamp(request.deliveredAt)} />
        <EvidenceRow label="طريقة إثبات التسليم" value={execution?.podMethod} />
        <EvidenceRow label="مرجع إثبات التسليم" value={execution?.podReference} />
        <EvidenceRow label="ملاحظة التنفيذ" value={execution?.deliveryNote} />
      </View>

      {latestException ? (
        <View style={styles.exceptionSection}>
          <Text role="titleSm" style={styles.rtlText}>آخر استثناء تشغيلي</Text>
          <EvidenceRow label="السبب" value={latestException.reasonCode} />
          <EvidenceRow label="التفاصيل" value={latestException.note} />
          <EvidenceRow label="الشدة" value={latestException.severity} />
          <EvidenceRow label="الحالة" value={latestException.status} />
          <EvidenceRow label="قرار المعالجة" value={latestException.resolutionAction} />
          <EvidenceRow label="ملاحظة المعالجة" value={latestException.resolutionNote} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text role="titleSm" style={styles.rtlText}>القراءة المالية من WLT</Text>
        <EvidenceRow label="حالة القراءة" value={financial?.readState} />
        <EvidenceRow label="حالة جلسة الدفع" value={paymentSession?.status} />
        <EvidenceRow label="مرجع المزود" value={paymentSession?.providerReference} />
        <EvidenceRow label="القيمة بالوحدة الصغرى" value={paymentSession?.amountMinorUnits} />
        <EvidenceRow label="العملة" value={paymentSession?.currency} />
        <EvidenceRow label="قابلية التسوية" value={financial?.settlementApplicability} />
        <EvidenceRow label="سبب قرار التسوية" value={financial?.settlementReason} />
      </View>

      {canApprove || canCancel ? (
        <View style={styles.actionRow}>
          {canApprove ? (
            <Button
              label={isBusy ? "جاري الاعتماد..." : "اعتماد العرض والدفع"}
              tone="primary"
              disabled={isBusy}
              onPress={() => void onApprove()}
              style={styles.flexButton}
            />
          ) : null}
          {canCancel ? (
            <Button
              label={isBusy
                ? quoteDecisionPending ? "جاري رفض العرض..." : "جاري الإلغاء..."
                : cancellationLabel}
              tone="danger"
              disabled={isBusy}
              onPress={() => void onCancel()}
              style={styles.flexButton}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function ClientSpecialRequestsScreen({
  onBack,
  onCreateShein,
  onCreateAwnak,
}: ClientSpecialRequestsScreenProps) {
  const {
    requests,
    detailsByRequestId,
    total,
    loadState,
    busyRequestId,
    load,
    cancelRequest,
    approveQuote,
    respondInformation,
  } = useClientSpecialRequestsListController();

  if (loadState === "loading" && requests.length === 0) {
    return (
      <Screen padded>
        <StateView stateId="loading" title="جاري تحميل طلباتك الخاصة" description="تتم قراءة أحدث حالة من خدمة DSH." />
      </Screen>
    );
  }

  if (loadState === "offline" || loadState === "error" || loadState === "forbidden" || loadState === "conflict") {
    const stateCopy = {
      offline: { title: "تعذر الاتصال", description: "تحقق من الشبكة ثم أعد المحاولة." },
      error: { title: "تعذر تحميل الطلبات", description: "حدث خطأ أثناء قراءة طلباتك الخاصة." },
      forbidden: { title: "الوصول غير متاح", description: "أعد تسجيل الدخول بالحساب الذي أنشأ الطلبات." },
      conflict: { title: "تغيرت حالة الطلب", description: "أعد القراءة للحصول على النسخة الأحدث." },
    } as const;
    const copy = stateCopy[loadState];
    return (
      <Screen padded>
        <StateView title={copy.title} description={copy.description} actionLabel="إعادة المحاولة" onActionPress={() => void load()} />
      </Screen>
    );
  }

  return (
    <Screen padded>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Button label="رجوع" tone="secondary" onPress={onBack} />
          <View style={styles.headerCopy}>
            <Text role="headingSm" style={styles.rtlText}>طلباتي الخاصة</Text>
            <Text style={styles.secondaryText}>إجمالي الطلبات: {total}</Text>
          </View>
        </View>

        <View style={styles.createRow}>
          <Button label="طلب شي إن" tone="primary" onPress={onCreateShein} style={styles.flexButton} />
          <Button label="طلب عونك" tone="secondary" onPress={onCreateAwnak} style={styles.flexButton} />
        </View>

        {requests.length === 0 ? (
          <StateView
            stateId="empty"
            title="لا توجد طلبات خاصة"
            description="أنشئ طلب عونك أو طلب شراء مساعد من شي إن."
            actionLabel="طلب عونك"
            onActionPress={onCreateAwnak}
          />
        ) : (
          <View style={styles.list}>
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                detail={detailsByRequestId[request.id]}
                isBusy={busyRequestId === request.id}
                onApprove={() => approveQuote(request)}
                onCancel={() => cancelRequest(request)}
                onRespond={(exchange, response) => respondInformation(request, exchange, response)}
              />
            ))}
          </View>
        )}

        <Button label="تحديث الحالات والأدلة" tone="secondary" onPress={() => void load()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[4], paddingBottom: spacing[8] },
  headerRow: { alignItems: "center", flexDirection: "row", gap: spacing[3], justifyContent: "space-between" },
  headerCopy: { alignItems: "flex-end", flex: 1 },
  createRow: { flexDirection: "row", gap: spacing[3] },
  list: { gap: spacing[3] },
  card: {
    backgroundColor: colorRoles.surfaceBase,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[4],
  },
  cardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  section: { borderTopColor: colorRoles.borderSubtle, borderTopWidth: 1, gap: spacing[2], paddingTop: spacing[3] },
  exceptionSection: {
    backgroundColor: colorRoles.surfaceMuted,
    borderColor: colorRoles.warning,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[3],
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], marginTop: spacing[2] },
  flexButton: { flex: 1 },
  rtlText: { textAlign: "right", writingDirection: "rtl" },
  statusText: { color: colorRoles.brandAction, fontWeight: "700" },
  secondaryText: { color: colorRoles.textSecondary, textAlign: "right", writingDirection: "rtl" },
  amountText: { color: colorRoles.textPrimary, fontWeight: "700", textAlign: "right" },
  errorText: { color: colorRoles.danger, textAlign: "right" },
  warningText: { color: colorRoles.warning, fontWeight: "700", textAlign: "right" },
});
