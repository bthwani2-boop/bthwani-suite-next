import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import type { WltDshCodReference } from "@bthwani/wlt";
import { Badge, Box, Button, KeyValueList, StateView, Text, useTheme } from "@bthwani/ui-kit";
import { fetchPartnerCodRecords, remitPartnerCodRecord } from "./wlt-partner-cod.api";

type PanelState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly records: readonly WltDshCodReference[] }
  | { readonly kind: "error"; readonly message: string };

function amountLabel(value: number, currency: string): string {
  return `${(value / 100).toLocaleString("ar-YE")} ${currency}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
  return "تعذر تنفيذ حركة تسليم العهدة.";
}

export function PartnerCodCustodyPanel() {
  const theme = useTheme() as any;
  const styles = React.useMemo(
    () => StyleSheet.create({
      header: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
      },
      recordCard: {
        borderWidth: 1,
        borderColor: theme.line,
        borderRadius: 12,
        padding: 12,
      },
      input: {
        borderWidth: 1,
        borderColor: theme.line,
        color: theme.text,
        backgroundColor: theme.surfaceInset,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
        textAlign: "right",
      },
    }),
    [theme.line, theme.surfaceInset, theme.text],
  );
  const [state, setState] = React.useState<PanelState>({ kind: "loading" });
  const [proofByRecord, setProofByRecord] = React.useState<Record<string, string>>({});
  const [busyRecordId, setBusyRecordId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ tone: "success" | "danger" | "warning"; title: string; description: string } | null>(null);

  const load = React.useCallback(async () => {
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", records: await fetchPartnerCodRecords() });
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const remit = React.useCallback(async (record: WltDshCodReference) => {
    const proof = proofByRecord[record.id]?.trim() ?? "";
    if (proof.length < 3) {
      setNotice({ tone: "danger", title: "الإثبات غير مكتمل", description: "أدخل رقم إيصال أو مرجع تسليم صالحًا." });
      return;
    }
    setBusyRecordId(record.id);
    setNotice(null);
    try {
      const result = await remitPartnerCodRecord(record.id, proof, `partner app custody handoff for order ${record.orderId}`);
      setNotice({
        tone: result.reconciliationCase ? "warning" : "success",
        title: result.replayed ? "التسليم مسجل مسبقًا" : "تم تسليم العهدة",
        description: result.reconciliationCase
          ? `السجل مرتبط بمصالحة فرق بقيمة ${amountLabel(result.reconciliationCase.differenceMinorUnits, result.reconciliationCase.currency)}.`
          : `تم إنشاء القيد ${result.custodyEvidence.ledgerTransactionId}.`,
      });
      await load();
    } catch (error) {
      setNotice({ tone: "danger", title: "تعذر تسليم العهدة", description: errorMessage(error) });
    } finally {
      setBusyRecordId(null);
    }
  }, [load, proofByRecord]);

  if (state.kind === "loading") return <StateView loading tone="info" title="جاري تحميل عهدة COD..." />;
  if (state.kind === "error") return <StateView tone="danger" title="تعذر تحميل عهدة COD" description={state.message} actionLabel="إعادة المحاولة" onActionPress={() => void load()} />;

  const collected = state.records.filter((record) => record.status === "collected");
  const pending = state.records.filter((record) => record.status === "pending_collection");
  const remitted = state.records.filter((record) => record.status === "remitted");

  return (
    <Box gap={3}>
      <View style={styles.header}>
        <Text role="bodyStrong">عهدة COD للطلبات</Text>
        <Badge label={`${collected.length} بانتظار التسليم`} tone={collected.length > 0 ? "warning" : "success"} />
      </View>
      <KeyValueList
        dense
        items={[
          { label: "بانتظار التحصيل", value: String(pending.length), tone: pending.length > 0 ? "info" : "neutral" },
          { label: "محصل وغير مودع", value: String(collected.length), tone: collected.length > 0 ? "warning" : "success" },
          { label: "مودع", value: String(remitted.length), tone: "success" },
        ]}
      />
      {notice ? <StateView tone={notice.tone} title={notice.title} description={notice.description} actionLabel="إغلاق" onActionPress={() => setNotice(null)} /> : null}
      {collected.length === 0 ? (
        <StateView tone="success" title="لا توجد عهدة بانتظار التسليم" description="لا توجد سجلات COD محصلة وغير مودعة مرتبطة بالشريك حاليًا." />
      ) : null}
      {collected.map((record) => {
        const busy = busyRecordId === record.id;
        return (
          <Box key={record.id} gap={3} style={styles.recordCard}>
            <Text role="bodyStrong">طلب #{record.orderId}</Text>
            <KeyValueList dense items={[
              { label: "العهدة", value: amountLabel(record.amountMinorUnits, record.currency), tone: "warning" },
              { label: "المحصل", value: `${record.collectorType} · ${record.collectorId}` },
            ]} />
            <TextInput
              value={proofByRecord[record.id] ?? ""}
              onChangeText={(value) => setProofByRecord((current) => ({ ...current, [record.id]: value }))}
              placeholder="رقم إيصال/مرجع استلام العهدة"
              editable={!busy}
              style={styles.input}
            />
            <Button label={busy ? "جارٍ التسجيل..." : "تأكيد استلام وتسليم العهدة"} disabled={busy} onPress={() => void remit(record)} />
          </Box>
        );
      })}
    </Box>
  );
}
