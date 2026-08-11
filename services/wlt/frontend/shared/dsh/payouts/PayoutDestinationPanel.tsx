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
  isVerifiedPayoutDestination,
  saveOwnPayoutDestination,
  type ActorPayoutRequest,
  type PayoutActorType,
  type PayoutDestination,
  type PayoutDestinationInput,
} from "./payout.api";
import { formatWltMoney, parseWltMajorInputToMinorUnits } from "../finance/wlt-money";

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

type DestinationTextField = keyof PayoutDestinationInput;

const EMPTY_INPUT: PayoutDestinationInput = {
  beneficiaryName: "",
  officialWalletProviderKey: "",
  destinationReference: "",
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function newAttemptKey(actorType: PayoutActorType): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `payout:${actorType}:${uuid}`;
  return `payout:${actorType}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function statusMeta(status: string): { readonly label: string; readonly tone: "neutral" | "success" | "warning" | "danger" } {
  const map: Record<string, { readonly label: string; readonly tone: "neutral" | "success" | "warning" | "danger" }> = {
    pending: { label: "بانتظار المراجعة", tone: "warning" },
    approved: { label: "معتمد", tone: "warning" },
    provider_pending: { label: "قيد التنفيذ الخارجي", tone: "warning" },
    processing: { label: "قيد المعالجة", tone: "warning" },
    provider_result_unknown: { label: "تحتاج مطابقة", tone: "danger" },
    completed: { label: "مكتمل", tone: "success" },
    rejected: { label: "مرفوض", tone: "danger" },
    failed: { label: "فشل موثق", tone: "danger" },
  };
  return map[status] ?? { label: status, tone: "neutral" };
}

function verificationMeta(status: string): { readonly label: string; readonly tone: "neutral" | "success" | "warning" | "danger" } {
  const map: Record<string, { readonly label: string; readonly tone: "neutral" | "success" | "warning" | "danger" }> = {
    unverified: { label: "بانتظار التحقق", tone: "warning" },
    verified: { label: "موثقة", tone: "success" },
    requires_reverification: { label: "تتطلب إعادة تحقق", tone: "warning" },
    rejected: { label: "مرفوضة", tone: "danger" },
  };
  return map[status] ?? { label: status || "غير معروفة", tone: "neutral" };
}

function amountLabel(minorUnits: number, currency: string): string {
  return formatWltMoney(minorUnits, currency);
}

function DestinationSummary({ destination }: { readonly destination: PayoutDestination }) {
  const verification = verificationMeta(destination.destinationVerificationStatus);
  return (
    <View style={{ gap: spacing[1], alignItems: "flex-end" }}>
      <View style={{ flexDirection: "row-reverse", gap: spacing[2], alignItems: "center" }}>
        <Text role="bodyStrong" style={{ textAlign: "right" }}>{destination.beneficiaryName}</Text>
        <Badge label={verification.label} tone={verification.tone} />
      </View>
      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>محفظة إلكترونية رسمية</Text>
      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
        مزود المحفظة: {destination.officialWalletProviderKey}
      </Text>
      <Text role="caption" style={{ textAlign: "right" }}>
        المعرّف: {destination.maskedDestinationReference}
      </Text>
      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
        الإصدار: {destination.destinationVersion} · آخر تحديث: {destination.updatedAt}
      </Text>
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
      value={value[key]}
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
      {field("officialWalletProviderKey", "رمز مزود المحفظة الرسمية")}
      {field("destinationReference", "رقم / معرّف المحفظة الرسمية", true)}
      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
        تغيير المزود أو المعرّف ينشئ إصدارًا جديدًا غير موثق، ويظل الصرف محظورًا حتى التحقق منه.
      </Text>
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
        setEditor({
          beneficiaryName: destination.beneficiaryName,
          officialWalletProviderKey: destination.officialWalletProviderKey,
          destinationReference: "",
        });
      } else {
        setEditor(EMPTY_INPUT);
      }
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  }, [actorType]);

  useEffect(() => { void load(); }, [load]);

  const saveDestination = useCallback(async () => {
    setActionError(null);
    const beneficiaryName = editor.beneficiaryName.trim();
    const officialWalletProviderKey = editor.officialWalletProviderKey.trim().toLowerCase();
    const destinationReference = editor.destinationReference.trim();
    if (!beneficiaryName) {
      setActionError("اسم المستفيد مطلوب.");
      return;
    }
    if (!officialWalletProviderKey) {
      setActionError("مزود المحفظة الرسمية مطلوب.");
      return;
    }
    if (!destinationReference) {
      setActionError("رقم أو معرّف المحفظة الرسمية مطلوب.");
      return;
    }
    setBusy("save");
    try {
      await saveOwnPayoutDestination(actorType, {
        beneficiaryName,
        officialWalletProviderKey,
        destinationReference,
      });
      setEditor((current) => ({ ...current, destinationReference: "" }));
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
      attemptKeyRef.current = null;
      setAmount("");
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }, [actorType, load]);

  const submit = useCallback(async () => {
    if (state.kind !== "ready" || !isVerifiedPayoutDestination(state.destination)) {
      setActionError("لا يمكن طلب الصرف قبل التحقق من وجهة المحفظة الرسمية.");
      return;
    }
    const parsedAmount = parseWltMajorInputToMinorUnits(amount, currency);
    if (!parsedAmount.ok || parsedAmount.minorUnits <= 0) {
      setActionError("مبلغ طلب الصرف غير صالح.");
      return;
    }
    setActionError(null);
    setBusy("submit");
    if (!attemptKeyRef.current) attemptKeyRef.current = newAttemptKey(actorType);
    try {
      await createOwnPayoutRequest(actorType, state.destination.id, parsedAmount.minorUnits, currency, attemptKeyRef.current);
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

  const destinationVerified = isVerifiedPayoutDestination(state.destination);

  return (
    <Box padding={embedded ? 3 : 4} gap={4} style={{ backgroundColor: theme.surfaceInset, borderRadius: 16 }}>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[3] }}>
        <View style={{ alignItems: "flex-end", flex: 1 }}>
          <Text role="titleMd" style={{ textAlign: "right" }}>{title}</Text>
          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
            WLT يحفظ معرّف المحفظة مشفرًا، ولا يعيد إلى السطح إلا النسخة المقنّعة وحالة التحقق.
          </Text>
        </View>
        <Badge
          label={destinationVerified ? "وجهة موثقة" : state.destination ? "التحقق مطلوب" : "الوجهة ناقصة"}
          tone={destinationVerified ? "success" : "warning"}
        />
      </View>

      {actionError ? <StateView tone="danger" title="تعذر تنفيذ الإجراء" description={actionError} /> : null}

      {state.destination ? (
        <>
          <DestinationSummary destination={state.destination} />
          {!destinationVerified ? (
            <StateView
              tone="warning"
              title="الصرف محظور حتى التحقق"
              description="وجود الوجهة وحده لا يكفي. لا ينشئ WLT طلب صرف إلا بعد توثيق الإصدار الحالي من المحفظة الرسمية."
            />
          ) : null}
          <Button label={busy === "deactivate" ? "جارٍ التعطيل…" : "تعطيل الوجهة"} tone="danger" size="sm" disabled={busy !== null} onPress={deactivate} />
        </>
      ) : (
        <StateView tone="warning" title="أضف وجهة صرف أولاً" description="أضف محفظة إلكترونية رسمية ثم أكمل التحقق منها قبل إنشاء أي طلب صرف." />
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
        editable={busy === null && destinationVerified}
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
        disabled={busy !== null || !destinationVerified}
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
                  <Text role="caption" tone="danger" style={{ textAlign: "right" }}>الأموال ما زالت محجوزة حتى تنهي المالية مطابقة نتيجة التنفيذ الخارجي.</Text>
                ) : null}
                {request.providerReference ? <Text role="caption" style={{ textAlign: "right" }}>مرجع التنفيذ الخارجي: {request.providerReference}</Text> : null}
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
