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
  fetchOwnPayoutDestination,
  fetchOwnPayoutRequests,
  isVerifiedPayoutDestination,
  type ActorPayoutRequest,
  type PayoutActorType,
  type PayoutAmountMode,
  type PayoutDestination,
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function newAttemptKey(actorType: PayoutActorType): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `payout:${actorType}:${uuid}`;
  throw new Error("Secure randomness is unavailable; refusing to create a payout idempotency key");
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

export function PayoutDestinationPanel({
  actorType,
  currency = "YER",
  title = "وجهة الصرف وطلبات الدفع",
  embedded = false,
}: PayoutDestinationPanelProps) {
  const theme = useTheme() as any;
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [amountMode, setAmountMode] = useState<PayoutAmountMode>("FULL_AVAILABLE");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
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
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  }, [actorType]);

  useEffect(() => { void load(); }, [load]);

  const submit = useCallback(async () => {
    if (state.kind !== "ready" || !isVerifiedPayoutDestination(state.destination)) {
      setActionError("لا يمكن طلب الصرف قبل أن تعتمد المالية وجهة المحفظة الرسمية.");
      return;
    }

    let amountMinorUnits: number | undefined;
    if (amountMode === "SPECIFIED") {
      const parsedAmount = parseWltMajorInputToMinorUnits(amount, currency);
      if (!parsedAmount.ok || parsedAmount.minorUnits <= 0) {
        setActionError("مبلغ طلب الصرف غير صالح.");
        return;
      }
      amountMinorUnits = parsedAmount.minorUnits;
    }

    setActionError(null);
    setBusy(true);
    if (!attemptKeyRef.current) attemptKeyRef.current = newAttemptKey(actorType);
    try {
      await createOwnPayoutRequest(actorType, amountMode, amountMinorUnits, currency, attemptKeyRef.current);
      attemptKeyRef.current = null;
      setAmount("");
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [actorType, amount, amountMode, currency, load, state]);

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
            وجهة الصرف الرسمية بيانات مالية محكومة تديرها المالية فقط. يعرض التطبيق نسخة مقنّعة للقراءة ولا يسمح بتعديلها.
          </Text>
        </View>
        <Badge
          label={destinationVerified ? "وجهة موثقة" : state.destination ? "التحقق مطلوب" : "الوجهة غير جاهزة"}
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
              title="الصرف محظور حتى اعتماد المالية"
              description="لا يمكن إنشاء طلب صرف قبل توثيق الإصدار الحالي من المحفظة الرسمية. لا يمكن تغيير هذه البيانات من التطبيق."
            />
          ) : null}
        </>
      ) : (
        <StateView
          tone="warning"
          title="وجهة الصرف غير جاهزة"
          description="تتم إضافة وتغيير والتحقق من وجهة الصرف الرسمية من قسم المالية وفق الصلاحيات والموافقات المعتمدة."
        />
      )}

      <Divider />
      <Text role="titleSm" style={{ textAlign: "right" }}>طلب صرف جديد</Text>
      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
        يختار WLT تلقائيًا وجهة الصرف الرسمية الموثقة ويثبت إصدارها داخل الطلب. لا يرسل التطبيق أي معرف وجهة أو بيانات محفظة.
      </Text>
      <View style={{ flexDirection: "row-reverse", gap: spacing[2] }}>
        <View style={{ flex: 1 }}>
          <Button
            label="صرف كامل الرصيد المتاح"
            tone={amountMode === "FULL_AVAILABLE" ? "brand" : "secondary"}
            disabled={busy || !destinationVerified}
            onPress={() => { setAmountMode("FULL_AVAILABLE"); setAmount(""); attemptKeyRef.current = null; }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="صرف مبلغ محدد"
            tone={amountMode === "SPECIFIED" ? "brand" : "secondary"}
            disabled={busy || !destinationVerified}
            onPress={() => { setAmountMode("SPECIFIED"); attemptKeyRef.current = null; }}
          />
        </View>
      </View>
      {amountMode === "SPECIFIED" ? (
        <TextInput
          value={amount}
          onChangeText={(value) => { setAmount(value); attemptKeyRef.current = null; }}
          placeholder={`المبلغ بـ ${currency}`}
          placeholderTextColor={theme.textMuted}
          editable={!busy && destinationVerified}
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
      ) : (
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          سيحسب WLT الرصيد المؤهل للصرف لحظة إنشاء الطلب بعد جميع الحجوزات والقيود والتسويات.
        </Text>
      )}
      <Button
        label={busy ? "جارٍ إرسال الطلب…" : "إرسال طلب الصرف"}
        tone="brand"
        disabled={busy || !destinationVerified}
        onPress={submit}
      />

      <Divider />
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
        <Text role="titleSm">سجل طلبات الصرف</Text>
        <Button label="تحديث" tone="secondary" size="sm" disabled={busy} onPress={load} />
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
