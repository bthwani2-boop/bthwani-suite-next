import React from "react";
import { Box, Button, Card, StateView, Text, TextField } from "@bthwani/ui-kit";
import {
  CaptainCashInError,
  clearCaptainCashInMutationContext,
  clearCaptainCashInSession,
  createCaptainCashInSession,
  getOrCreateCaptainCashInMutationContext,
  loadStoredCaptainCashInSession,
  mutateCaptainCashInSession,
  readCaptainCashInSession,
  storeCaptainCashInSession,
  type CaptainCashInSession,
} from "./captain-cash-in.api";

type PanelState = "idle" | "loading" | "ready" | "unknown" | "success" | "error";

function sessionLabel(status: string): string {
  switch (status) {
    case "reference_created": return "تم إنشاء نية Cash-In";
    case "authorized": return "تمت الموافقة — بانتظار الإيداع";
    case "captured": return "تم الإيداع في محفظة WLT";
    case "provider_result_unknown": return "نتيجة المزود غير محسومة";
    case "authorization_pending":
    case "capture_pending": return "النتيجة قيد المطابقة";
    case "failed": return "فشلت العملية نهائيًا";
    default: return status;
  }
}

function isUnknownStatus(status: string): boolean {
  return status === "provider_result_unknown" || status === "authorization_pending" || status === "capture_pending";
}

export function CaptainCashInPanel({ actorId }: { readonly actorId: string | null | undefined }) {
  const [amountText, setAmountText] = React.useState("");
  const [session, setSession] = React.useState<CaptainCashInSession | null>(null);
  const [panelState, setPanelState] = React.useState<PanelState>("idle");
  const [message, setMessage] = React.useState("");

  const refresh = React.useCallback(async () => {
    if (!actorId || !session) return;
    setPanelState("loading");
    try {
      const readback = await readCaptainCashInSession(session.id);
      setSession(readback);
      await storeCaptainCashInSession(actorId, readback);
      setPanelState(readback.status === "captured" ? "success" : isUnknownStatus(readback.status) ? "unknown" : "ready");
      setMessage(isUnknownStatus(readback.status) ? "لا توجد إعادة محاولة تلقائية؛ انتظر المطابقة أو أعد تحديث الحالة." : "");
    } catch (error) {
      const normalized = error instanceof CaptainCashInError ? error : new CaptainCashInError("error", "READBACK_FAILED", "تعذر قراءة حالة Cash-In من WLT.");
      setPanelState(normalized.state === "unknown" ? "unknown" : "error");
      setMessage(normalized.message);
    }
  }, [actorId, session]);

  React.useEffect(() => {
    let cancelled = false;
    setSession(null);
    setPanelState("idle");
    setMessage("");
    if (!actorId) return () => { cancelled = true; };
    void loadStoredCaptainCashInSession(actorId).then((stored) => {
      if (cancelled || !stored) return;
      setSession(stored);
      void readCaptainCashInSession(stored.id).then((readback) => {
        if (cancelled) return;
        setSession(readback);
        void storeCaptainCashInSession(actorId, readback);
        setPanelState(readback.status === "captured" ? "success" : isUnknownStatus(readback.status) ? "unknown" : "ready");
      }).catch((error: unknown) => {
        if (cancelled) return;
        const normalized = error instanceof CaptainCashInError ? error : new CaptainCashInError("unknown", "READBACK_UNKNOWN", "تعذر التحقق من نتيجة Cash-In بعد إعادة التشغيل.");
        setPanelState(normalized.state === "not_found" ? "error" : "unknown");
        setMessage(normalized.message);
      });
    }).catch((error: unknown) => {
      if (cancelled) return;
      const normalized = error instanceof CaptainCashInError ? error : new CaptainCashInError("error", "LOCAL_STATE_UNAVAILABLE", "تعذر قراءة حالة Cash-In المحلية؛ أوقفنا العملية حفاظًا على الاتساق.");
      setPanelState("error");
      setMessage(normalized.message);
    });
    return () => { cancelled = true; };
  }, [actorId]);

  const advance = React.useCallback(async () => {
    if (!actorId) {
      setPanelState("error");
      setMessage("هوية الكابتن غير متاحة؛ أوقفنا Cash-In حفاظًا على العزل.");
      return;
    }
    setPanelState("loading");
    setMessage("");
    try {
      let current = session;
      const amountMinorUnits = Number.parseInt(amountText.trim(), 10);
      if (!current) {
        if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits <= 0) {
          throw new CaptainCashInError("error", "INVALID_AMOUNT", "أدخل مبلغًا صحيحًا موجبًا بوحدة الريال الأصغر.");
        }
        const fingerprint = `${actorId}|${amountMinorUnits}|YER`;
        const context = await getOrCreateCaptainCashInMutationContext({ operation: "create", fingerprint });
        current = await createCaptainCashInSession({
          topupReference: context.topupReference,
          amountMinorUnits,
          currency: "YER",
          idempotencyKey: context.idempotencyKey,
          correlationId: context.correlationId,
        });
        setSession(current);
        await storeCaptainCashInSession(actorId, current);
        await clearCaptainCashInMutationContext("create");
      }
      if (current.status === "reference_created") {
        const context = await getOrCreateCaptainCashInMutationContext({ operation: "authorize", sessionId: current.id, fingerprint: `${current.id}|authorize` });
        current = await mutateCaptainCashInSession({ sessionId: current.id, operation: "authorize", idempotencyKey: context.idempotencyKey, correlationId: context.correlationId });
        setSession(current);
        await storeCaptainCashInSession(actorId, current);
        await clearCaptainCashInMutationContext("authorize", current.id);
      }
      if (current.status === "authorized") {
        const context = await getOrCreateCaptainCashInMutationContext({ operation: "capture", sessionId: current.id, fingerprint: `${current.id}|capture` });
        current = await mutateCaptainCashInSession({ sessionId: current.id, operation: "capture", idempotencyKey: context.idempotencyKey, correlationId: context.correlationId });
        setSession(current);
        await storeCaptainCashInSession(actorId, current);
        await clearCaptainCashInMutationContext("capture", current.id);
      }
      if (current.status === "captured") {
        setPanelState("success");
        setMessage("تمت قراءة القيد النهائي من WLT؛ لا يوجد أثر مالي محلي إضافي.");
      } else if (isUnknownStatus(current.status)) {
        setPanelState("unknown");
        setMessage("النتيجة غير محسومة؛ حدّث الحالة من WLT قبل أي محاولة جديدة.");
      } else {
        setPanelState("ready");
        setMessage(sessionLabel(current.status));
      }
    } catch (error) {
      const normalized = error instanceof CaptainCashInError ? error : new CaptainCashInError("unknown", "CASH_IN_UNKNOWN", "تعذر تحديد نتيجة Cash-In؛ لا تكرر العملية قبل readback.");
      setPanelState(normalized.state === "unknown" ? "unknown" : "error");
      setMessage(normalized.message);
      if (session) void refresh();
    }
  }, [actorId, amountText, refresh, session]);

  const reset = React.useCallback(async () => {
    await clearCaptainCashInSession();
    if (session) {
      await clearCaptainCashInMutationContext("authorize", session.id);
      await clearCaptainCashInMutationContext("capture", session.id);
    }
    setSession(null);
    setPanelState("idle");
    setMessage("");
  }, [session]);

  if (!actorId) {
    return <StateView title="Cash-In غير متاح" description="لا يمكن تمويل المحفظة دون هوية Captain موثقة من Identity/DSH." tone="warning" />;
  }

  const terminal = session?.status === "captured" || session?.status === "failed";
  return (
    <Card padding={4} gap={3}>
      <Box gap={1}>
        <Text role="titleSm">Cash-In لمحفظة الكابتن</Text>
        <Text role="bodySm" tone="muted">يمر الطلب عبر جلسة WLT الحالية فقط؛ لا تُعرض نتيجة محلية ولا يُعاد provider unknown تلقائيًا.</Text>
      </Box>
      {!session ? (
        <TextField label="المبلغ (ريال يمني)" value={amountText} onChangeText={setAmountText} keyboardType="numeric" placeholder="مثال: 5000" />
      ) : (
        <Box gap={1}>
          <Text role="bodyStrong">الجلسة: {session.id}</Text>
          <Text role="bodySm" tone="muted">{sessionLabel(session.status)} · {session.amountMinorUnits.toLocaleString("ar-YE")} {session.currency}</Text>
        </Box>
      )}
      {message ? <Text role="bodySm" tone={panelState === "error" ? "danger" : panelState === "unknown" ? "warning" : "muted"}>{message}</Text> : null}
      {panelState === "unknown" ? <StateView title="نتيجة تحتاج readback" description="توقفت إعادة المحاولة حتى تؤكد WLT الحالة النهائية." tone="warning" actionLabel="تحديث الحالة" onActionPress={() => void refresh()} /> : null}
      {!terminal && panelState !== "unknown" ? <Button label={panelState === "loading" ? "جارٍ التحقق من WLT" : session ? "متابعة Cash-In" : "بدء Cash-In"} disabled={panelState === "loading"} onPress={() => void advance()} /> : null}
      {session && !terminal ? <Button label="تحديث readback" tone="secondary" disabled={panelState === "loading"} onPress={() => void refresh()} /> : null}
      {session ? <Button label="بدء جلسة أخرى" tone="ghost" disabled={panelState === "loading"} onPress={() => void reset()} /> : null}
    </Card>
  );
}
