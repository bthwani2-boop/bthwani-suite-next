import React, { useCallback, useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import {
  Badge,
  Box,
  Button,
  Divider,
  StateView,
  Text,
  spacing,
  useTheme,
} from "@bthwani/ui-kit";
import {
  createOwnPayoutRequest,
  deactivateOwnPayoutDestination,
  fetchOwnPayoutDestination,
  fetchOwnPayoutRequests,
  saveOwnPayoutDestination,
  type ActorPayoutRequest,
  type PayoutActorType,
  type PayoutDestination,
  type PayoutDestinationInput,
} from "./payout.api";

export type PayoutDestinationPanelProps = {
  readonly actorType: PayoutActorType;
  readonly currency?: string;
  readonly title?: string;
  readonly embedded?: boolean;
};

type PanelState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "ready";
      readonly destination: PayoutDestination | null;
      readonly requests: readonly ActorPayoutRequest[];
    };

type DestinationTextField = Exclude<
  keyof PayoutDestinationInput,
  "settlementPreference" | "bankAccountHolderMatchesOwner"
>;

const EMPTY_INPUT: PayoutDestinationInput = {
  beneficiaryName: "",
  bankName: "",
  bankBranch: "",
  accountNumber: "",
  iban: "",
  payoutMobileNumber: "",
  settlementPreference: "bank",
  bankAccountHolderMatchesOwner: true,
  bankNotes: "",
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function newAttemptKey(actorType: PayoutActorType): string {
  return `payout:${actorType}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function statusMeta(status: string): { readonly label: string; readonly tone: "neutral" | "success" | "warning" | "danger" } {
  const map: Record<string, { readonly label: string; readonly tone: "neutral" | "success" | "warning" | "danger" }> = {
    pending: { label: "بانتظار المراجعة", tone: "warning" },
    approved: { label: "معتمد", tone: "warning" },
    provider_pending: { label: "قيد الإرسال", tone: "warning" },
    processing: { label: "قيد المعالجة", tone: "warning" },
    provider_result_unknown: { label: "تحتاج مطابقة", tone: "danger" },
    completed: { label: "مكتمل", tone: "success" },
    rejected: { label: "مرفوض", tone: "danger" },
    failed: { label: "فشل موثق", tone: "danger" },
  };
  return map[status] ?? { label: status, tone: "neutral" };
}

function amountLabel(minorUnits: number, currency: string): string {
  return `${(minorUnits / 100).toLocaleString("ar-YE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function DestinationSummary({ destination }: { readonly destination: PayoutDestination }) {
  return (
    <View style={{ gap: spacing[1], alignItems: "flex-end" }}>
      <Text role="bodyStrong" style={{ textAlign: "right" }}>{destination.beneficiaryName}</Text>
      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
        {destination.settlementPreference === "mobile_money" ? "محفظة هاتف" : destination.settlementPreference === "manual" ? "صرف يدوي" : "حساب بنكي"}
      </Text>
      {destination.bankName ? <Text role="caption" tone="muted">{destination.bankName} · {destination.bankBranch || "بدون فرع"}</Text> : null}
      {destination.maskedAccountNumber ? <Text role="caption">الحساب: {destination.maskedAccountNumber}</Text> : null}
      {destination.maskedIban ? <Text role="caption">IBAN: {destination.maskedIban}</Text> : null}
      {destination.maskedMobileNumber ? <Text role="caption">الهاتف: {destination.maskedMobileNumber}</Text> : null}
      <Text role="caption" tone="muted">آخر تحديث: {destination.updatedAt}</Text>
    </View>
  );
}

function DestinationEditor({
  value,
  disabled,
  onChange,
}: {
  readonly value: PayoutDestinationInput;
  readonly disabled: boolean;
  readonly onChange: (next: PayoutDestinationInput) => void;
}) {
  const theme = useTheme() as any;
  const field = (key: DestinationTextField, placeholder: string, secure = false) => (
    <TextInput
      value={String(value[key] ?? "")}
      onChangeText={(text) => onChange({ ...value, [key]: text })}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      editable={!disabled}
      secureTextEntry={secure}
      autoCapitalize="none"
      style={{
        minHeight: 46,
        borderWidth: 1,
        borderColor: theme.line,
        borderRadius: 10,
        paddingHorizontal: spacing[3],
        color: theme.text,
        textAlign: "right",
        backgroundColor: theme.surface,
      }}
    />
  );
  return (
    <View style={{ gap: spacing[2] }}>
      {field("beneficiaryName", "اسم المستفيد")}
      <View style={{ flexDirection: "row-reverse", gap: spacing[2] }}>
        <Button
          label="حساب بنكي"
          tone={value.settlementPreference === "bank" ? "brand" : "secondary"}
          size="sm"
          disabled={disabled}
          onPress={() => onChange({ ...value, settlementPreference: "bank" })}
        />
        <Button
          label="محفظة هاتف"
          tone={value.settlementPreference === "mobile_money" ? "brand" : "secondary"}
          size="sm"
          disabled={disabled}
          onPress={() => onChange({ ...value, settlementPreference: "mobile_money" })}
        />
      </View>
      {value.settlementPreference === "bank" ? (
        <>
          {field("bankName", "اسم البنك")}
          {field("bankBranch", "الفرع")}
          {field("accountNumber", "رقم الحساب", true)}
          {field("iban", "IBAN", true)}
        </>
      ) : (
        field("payoutMobileNumber", "رقم محفظة الهاتف", true)
      )}
      <Button
        label={value.bankAccountHolderMatchesOwner ? "تم تأكيد تطابق صاحب الحساب" : "أكد تطابق صاحب الحساب"}
        tone={value.bankAccountHolderMatchesOwner ? "success" : "secondary"}
        size="sm"
        disabled={disabled}
        onPress={() => onChange({ ...value, bankAccountHolderMatchesOwner: !value.bankAccountHolderMatchesOwner })}
      />
      {field("bankNotes", "ملاحظات اختيارية")}
    </View>
  );
}

export function PayoutDestinationPanel({
  actorType,
  currency = "YER",
  title = "وجهة الصرف وطلبات الدفع",
  embedded = false,
}: PayoutDestinationPanelProps) {
  const theme = useTheme() as any;
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [editor, setEditor] = useState<PayoutDestinationInput>(EMPTY_INPUT);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<"save" | "deactivate" | "submit" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const attemptKeyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const [destination, requests] = await Promise.all([
        fetchOwnPayoutDestination(actorType),
        fetchOwnPayoutRequests(actorType),
      ]);
      setState({ kind: "ready", destination, requests });
      if (destination) {
        setEditor((current) => ({
          ...current,
          beneficiaryName: destination.beneficiaryName,
          bankName: destination.bankName,
          bankBranch: destination.bankBranch,
          settlementPreference: destination.settlementPreference === "mobile_money" ? "mobile_money" : destination.settlementPreference === "manual" ? "manual" : "bank",
          bankAccountHolderMatchesOwner: true,
        }));
      }
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  }, [actorType]);

  useEffect(() => { void load(); }, [load]);

  const saveDestination = useCallback(async () => {
    setActionError(null);
    if (!editor.beneficiaryName.trim()) {
      setActionError("اسم المستفيد مطلوب.");
      return;
    }
    if (!editor.bankAccountHolderMatchesOwner) {
      setActionError("يجب تأكيد تطابق صاحب الحساب مع صاحب الملف.");
      return;
    }
    if (editor.settlementPreference === "bank" && !editor.accountNumber.trim() && !editor.iban.trim()) {
      setActionError("أدخل رقم الحساب أو IBAN.");
      return;
    }
    if (editor.settlementPreference === "mobile_money" && !editor.payoutMobileNumber.trim()) {
      setActionError("رقم محفظة الهاتف مطلوب.");
      return;
    }
    setBusy("save");
    try {
      await saveOwnPayoutDestination(actorType, editor);
      setEditor((current) => ({ ...current, accountNumber: "", iban: "", payoutMobileNumber: "" }));
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }, [actorType, editor, load]);

  const deactivate = useCallback(async () => {
    setActionError(null);
    setBusy("deactivate");
    try {
      await deactivateOwnPayoutDestination(actorType);
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }, [actorType, load]);

  const submit = useCallback(async () => {
    if (state.kind !== "ready" || !state.destination) return;
    const normalized = Number(amount.trim());
    const amountMinorUnits = Math.round(normalized * 100);
    if (!Number.isFinite(normalized) || normalized <= 0 || !Number.isSafeInteger(amountMinorUnits)) {
      setActionError("مبلغ طلب الصرف غير صالح.");
      return;
    }
    setActionError(null);
    setBusy("submit");
    if (!attemptKeyRef.current) attemptKeyRef.current = newAttemptKey(actorType);
    try {
      await createOwnPayoutRequest(actorType, state.destination.id, amountMinorUnits, currency, attemptKeyRef.current);
      attemptKeyRef.current = null;
      setAmount("");
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }, [actorType, amount, currency, load, state]);

  if (state.kind === "loading") {
    return <StateView loading title="جارٍ تحميل الصرف" description="تُجلب الوجهة والطلبات من WLT عبر DSH." />;
  }
  if (state.kind === "error") {
    return <StateView tone="danger" title="تعذر تحميل الصرف" description={state.message} actionLabel="إعادة المحاولة" onActionPress={load} />;
  }

  return (
    <Box padding={embedded ? 3 : 4} gap={4} style={{ backgroundColor: theme.surfaceInset, borderRadius: 16 }}>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[3] }}>
        <View style={{ alignItems: "flex-end", flex: 1 }}>
          <Text role="titleMd" style={{ textAlign: "right" }}>{title}</Text>
          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>البيانات الحساسة مشفرة في WLT ولا تظهر هنا إلا مقنّعة.</Text>
        </View>
        <Badge label={state.destination ? "وجهة فعالة" : "الوجهة ناقصة"} tone={state.destination ? "success" : "warning"} />
      </View>

      {actionError ? <StateView tone="danger" title="تعذر تنفيذ الإجراء" description={actionError} /> : null}

      {state.destination ? (
        <>
          <DestinationSummary destination={state.destination} />
          <Button label={busy === "deactivate" ? "جارٍ التعطيل…" : "تعطيل الوجهة"} tone="danger" size="sm" disabled={busy !== null} onPress={deactivate} />
        </>
      ) : (
        <StateView tone="warning" title="أضف وجهة صرف أولاً" description="لن يقبل WLT أي طلب صرف غير مرتبط بوجهة فعالة مملوكة لنفس الحساب." />
      )}

      <Divider />
      <Text role="titleSm" style={{ textAlign: "right" }}>{state.destination ? "استبدال وجهة الصرف" : "إنشاء وجهة الصرف"}</Text>
      <DestinationEditor value={editor} disabled={busy !== null} onChange={setEditor} />
      <Button label={busy === "save" ? "جارٍ الحفظ…" : "حفظ الوجهة"} tone="brand" disabled={busy !== null} onPress={saveDestination} />

      <Divider />
      <Text role="titleSm" style={{ textAlign: "right" }}>طلب صرف جديد</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder={`المبلغ بـ ${currency}`}
        placeholderTextColor={theme.textMuted}
        editable={busy === null && Boolean(state.destination)}
        keyboardType="decimal-pad"
        style={{
          minHeight: 46,
          borderWidth: 1,
          borderColor: theme.line,
          borderRadius: 10,
          paddingHorizontal: spacing[3],
          color: theme.text,
          textAlign: "right",
          backgroundColor: theme.surface,
        }}
      />
      <Button
        label={busy === "submit" ? "جارٍ إرسال الطلب…" : "إرسال طلب الصرف"}
        tone="brand"
        disabled={busy !== null || !state.destination}
        onPress={submit}
      />

      <Divider />
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
        <Text role="titleSm">سجل طلبات الصرف</Text>
        <Button label="تحديث" tone="secondary" size="sm" disabled={busy !== null} onPress={load} />
      </View>
      {state.requests.length === 0 ? (
        <StateView tone="neutral" title="لا توجد طلبات صرف" description="تظهر الطلبات هنا بعد قبولها من WLT." />
      ) : (
        <View style={{ gap: spacing[3] }}>
          {state.requests.map((request) => {
            const status = statusMeta(request.status);
            return (
              <View key={request.id} style={{ borderTopWidth: 1, borderTopColor: theme.line, paddingTop: spacing[3], gap: spacing[1] }}>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] }}>
                  <Text role="bodyStrong">{amountLabel(request.amountMinorUnits, request.currency)}</Text>
                  <Badge label={status.label} tone={status.tone} />
                </View>
                <Text role="caption" tone="muted" style={{ textAlign: "right" }}>{request.requestedAt}</Text>
                {request.status === "provider_result_unknown" ? (
                  <Text role="caption" tone="danger" style={{ textAlign: "right" }}>الأموال ما زالت محجوزة حتى تنهي المالية مطابقة المزود.</Text>
                ) : null}
                {request.providerReference ? <Text role="caption" style={{ textAlign: "right" }}>مرجع المزود: {request.providerReference}</Text> : null}
                {request.failureReason ? <Text role="caption" tone="danger" style={{ textAlign: "right" }}>{request.failureReason}</Text> : null}
              </View>
            );
          })}
        </View>
      )}
    </Box>
  );
}

export default PayoutDestinationPanel;
