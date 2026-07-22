import React from "react";
import { TextInput, View } from "react-native";
import { Badge, Box, Button, KeyValueList, StateView, Text, useTheme } from "@bthwani/ui-kit";
import type { WltDshCodReference } from "@bthwani/wlt/frontend/shared/dsh/wlt-dsh-boundary.types";
import {
  collectDshCaptainCod,
  remitDshCaptainCod,
  type WltCodCustodyMutationResult,
} from "./wlt-cod.api";

export type CaptainCodCustodyActionsProps = {
  readonly records: readonly WltDshCodReference[];
  readonly onMutated: () => void;
};

type ActionState =
  | { readonly kind: "ready" }
  | { readonly kind: "submitting"; readonly recordId: string }
  | { readonly kind: "success"; readonly result: WltCodCustodyMutationResult }
  | { readonly kind: "error"; readonly message: string };

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown; body?: unknown };
    if (typeof candidate.message === "string" && candidate.message) return candidate.message;
    if (typeof candidate.body === "string" && candidate.body) return candidate.body;
  }
  return "تعذر تنفيذ حركة العهدة. راجع الإثبات وحالة السجل ثم أعد المحاولة.";
}

function amountLabel(amountMinorUnits: number, currency: string): string {
  return `${(amountMinorUnits / 100).toLocaleString()} ${currency}`;
}

export function CaptainCodCustodyActions({ records, onMutated }: CaptainCodCustodyActionsProps) {
  const theme = useTheme() as any;
  const actionable = records.filter((record) => record.status === "pending_collection" || record.status === "collected");
  const [actualByRecord, setActualByRecord] = React.useState<Record<string, string>>({});
  const [proofByRecord, setProofByRecord] = React.useState<Record<string, string>>({});
  const [state, setState] = React.useState<ActionState>({ kind: "ready" });

  const runCollection = React.useCallback(async (record: WltDshCodReference) => {
    const actualText = actualByRecord[record.id]?.trim() ?? "";
    const actualMajorUnits = Number(actualText.replace(/,/g, "."));
    const actualAmountMinorUnits = Math.round(actualMajorUnits * 100);
    const proofReference = proofByRecord[record.id]?.trim() ?? "";
    if (!Number.isFinite(actualMajorUnits) || actualAmountMinorUnits <= 0 || proofReference.length < 3) {
      setState({ kind: "error", message: "أدخل المبلغ المستلم فعليًا ومرجع إثبات صالحًا." });
      return;
    }
    setState({ kind: "submitting", recordId: record.id });
    try {
      const result = await collectDshCaptainCod(record.id, {
        actualAmountMinorUnits,
        proofReference,
        note: `captain-app collection for order ${record.orderId}`,
      });
      setState({ kind: "success", result });
      onMutated();
    } catch (error) {
      setState({ kind: "error", message: messageFromError(error) });
    }
  }, [actualByRecord, onMutated, proofByRecord]);

  const runRemittance = React.useCallback(async (record: WltDshCodReference) => {
    const proofReference = proofByRecord[record.id]?.trim() ?? "";
    if (proofReference.length < 3) {
      setState({ kind: "error", message: "أدخل رقم إيصال أو مرجع إثبات تسليم العهدة." });
      return;
    }
    setState({ kind: "submitting", recordId: record.id });
    try {
      const result = await remitDshCaptainCod(record.id, {
        proofReference,
        note: `captain-app remittance for order ${record.orderId}`,
      });
      setState({ kind: "success", result });
      onMutated();
    } catch (error) {
      setState({ kind: "error", message: messageFromError(error) });
    }
  }, [onMutated, proofByRecord]);

  if (actionable.length === 0) {
    return (
      <StateView
        tone="success"
        title="لا توجد حركة عهدة مطلوبة"
        description="جميع سجلات COD المعروضة مودعة أو لا تتطلب إجراءً من الكابتن."
      />
    );
  }

  return (
    <Box gap={3}>
      <Text role="bodyStrong">تنفيذ التحصيل وتسليم العهدة</Text>
      <Text role="bodySm" tone="muted">
        كل حركة تتطلب مبلغًا فعليًا أو إثبات تسليم، وتُرحّل إلى دفتر WLT بقيد مزدوج. أي فرق يفتح حالة مصالحة تلقائيًا.
      </Text>

      {state.kind === "error" ? (
        <StateView tone="danger" title="لم تُنفذ الحركة" description={state.message} actionLabel="إغلاق" onActionPress={() => setState({ kind: "ready" })} />
      ) : null}
      {state.kind === "success" ? (
        <StateView
          tone={state.result.reconciliationCase ? "warning" : "success"}
          title={state.result.replayed ? "الحركة مسجلة مسبقًا" : "تم تسجيل حركة العهدة"}
          description={state.result.reconciliationCase
            ? `تم فتح مصالحة للفرق: ${amountLabel(state.result.custodyEvidence.differenceMinorUnits, state.result.custodyEvidence.currency)}`
            : `القيد: ${state.result.custodyEvidence.ledgerTransactionId}`}
          actionLabel="إغلاق"
          onActionPress={() => setState({ kind: "ready" })}
        />
      ) : null}

      {actionable.map((record) => {
        const busy = state.kind === "submitting" && state.recordId === record.id;
        const collectionPending = record.status === "pending_collection";
        return (
          <Box key={record.id} gap={3} style={{ borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 12 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text role="bodyStrong">طلب #{record.orderId}</Text>
              <Badge label={collectionPending ? "إثبات تحصيل" : "تسليم عهدة"} tone={collectionPending ? "info" : "warning"} />
            </View>
            <KeyValueList
              dense
              items={[
                { label: "المبلغ المتوقع", value: amountLabel(record.amountMinorUnits, record.currency) },
                { label: "الحالة", value: collectionPending ? "بانتظار التحصيل" : "محصل وغير مودع", tone: collectionPending ? "info" : "warning" },
              ]}
            />
            {collectionPending ? (
              <TextInput
                value={actualByRecord[record.id] ?? ""}
                onChangeText={(value) => setActualByRecord((current) => ({ ...current, [record.id]: value }))}
                placeholder="المبلغ المستلم فعليًا بالوحدة الرئيسية"
                keyboardType="decimal-pad"
                editable={!busy}
                style={{ borderWidth: 1, borderColor: theme.line, color: theme.text, backgroundColor: theme.surfaceInset, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, textAlign: "right" }}
              />
            ) : null}
            <TextInput
              value={proofByRecord[record.id] ?? ""}
              onChangeText={(value) => setProofByRecord((current) => ({ ...current, [record.id]: value }))}
              placeholder={collectionPending ? "مرجع إثبات التحصيل" : "رقم إيصال/مرجع تسليم العهدة"}
              editable={!busy}
              style={{ borderWidth: 1, borderColor: theme.line, color: theme.text, backgroundColor: theme.surfaceInset, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, textAlign: "right" }}
            />
            <Button
              label={busy ? "جارٍ التسجيل..." : collectionPending ? "تأكيد التحصيل" : "تأكيد تسليم العهدة"}
              disabled={busy}
              onPress={() => void (collectionPending ? runCollection(record) : runRemittance(record))}
            />
          </Box>
        );
      })}
    </Box>
  );
}
