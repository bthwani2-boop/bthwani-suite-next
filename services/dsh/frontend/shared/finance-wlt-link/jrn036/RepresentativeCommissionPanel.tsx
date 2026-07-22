import React from "react";
import { View } from "react-native";
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
  fetchOwnJrn036Commissions,
  type Jrn036Commission,
  type Jrn036RepresentativeActorType,
} from "./jrn036.api";

type CommissionPanelState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly commissions: readonly Jrn036Commission[] };

export type RepresentativeCommissionPanelProps = {
  readonly actorType: Jrn036RepresentativeActorType;
  readonly title?: string;
  readonly embedded?: boolean;
};

function amountLabel(minorUnits: number, currency: string): string {
  const value = Number.isSafeInteger(minorUnits) ? minorUnits : 0;
  return `${(value / 100).toLocaleString("ar-YE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "قيد المراجعة",
    confirmed: "مؤكدة",
    settled: "مسوّاة",
    rejected: "مرفوضة",
    reversed: "معكوسة",
  };
  return labels[status] ?? status;
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "settled" || status === "confirmed") return "success";
  if (status === "pending") return "warning";
  if (status === "rejected" || status === "reversed") return "danger";
  return "neutral";
}

function sourceLabel(commission: Jrn036Commission): string {
  if (commission.sourceType === "field_visit") return "زيارة ميدانية";
  if (commission.sourceType === "delivery") return "توصيل طلب";
  if (commission.sourceType === "order") return "طلب مكتمل";
  return commission.sourceType || "مصدر تشغيلي";
}

function CommissionRow({ commission }: { readonly commission: Jrn036Commission }) {
  const theme = useTheme() as any;
  return (
    <View
      accessibilityLabel={`عمولة ${sourceLabel(commission)} بحالة ${statusLabel(commission.status)} وقيمة ${amountLabel(commission.amountMinorUnits, commission.currency)}`}
      style={{
        gap: spacing[2],
        paddingVertical: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.line,
      }}
    >
      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "center",
          gap: spacing[3],
        }}
      >
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text role="bodyStrong" style={{ textAlign: "right" }}>
            {sourceLabel(commission)} · {commission.commissionType}
          </Text>
          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
            المرجع: {commission.sourceId}
            {commission.commissionPolicyId
              ? ` · السياسة: ${commission.commissionPolicyId}`
              : ""}
          </Text>
        </View>
        <Badge label={statusLabel(commission.status)} tone={statusTone(commission.status)} />
      </View>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
        <Text role="titleSm" tone={commission.status === "settled" ? "success" : "default"}>
          {amountLabel(commission.amountMinorUnits, commission.currency)}
        </Text>
        <Text role="caption" tone="muted">
          {commission.updatedAt || commission.createdAt}
        </Text>
      </View>
      {commission.resolutionNote ? (
        <Text role="caption" tone="danger" style={{ textAlign: "right" }}>
          سبب القرار أو التعديل: {commission.resolutionNote}
        </Text>
      ) : null}
    </View>
  );
}

export function RepresentativeCommissionPanel({
  actorType,
  title = "العمولات",
  embedded = false,
}: RepresentativeCommissionPanelProps) {
  const theme = useTheme() as any;
  const [state, setState] = React.useState<CommissionPanelState>({ kind: "loading" });

  const load = React.useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const commissions = await fetchOwnJrn036Commissions(actorType);
      setState({ kind: "ready", commissions });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "تعذر تحميل العمولات الحاكمة من WLT.",
      });
    }
  }, [actorType]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <StateView
        loading
        title="جارٍ تحميل العمولات"
        description="يتم قراءة السياسة والقيمة والحالة الحقيقية من WLT عبر DSH."
      />
    );
  }

  if (state.kind === "error") {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل العمولات"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void load()}
      />
    );
  }

  return (
    <Box
      padding={embedded ? 3 : 4}
      gap={3}
      style={{ backgroundColor: theme.surfaceInset, borderRadius: 16 }}
    >
      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "center",
          gap: spacing[3],
        }}
      >
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text role="titleMd" style={{ textAlign: "right" }}>{title}</Text>
          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
            القيمة والسياسة والحالة من WLT فقط؛ لا يوجد حساب محلي.
          </Text>
        </View>
        <Button label="تحديث" tone="secondary" size="sm" onPress={() => void load()} />
      </View>
      <Divider />
      {state.commissions.length === 0 ? (
        <StateView
          tone="neutral"
          title="لا توجد عمولات"
          description="ستظهر العمولات بعد تحقق WLT من الدليل التشغيلي وتطبيق السياسة النشطة."
        />
      ) : (
        <View>{state.commissions.map((commission) => (
          <CommissionRow key={commission.id} commission={commission} />
        ))}</View>
      )}
    </Box>
  );
}

export default RepresentativeCommissionPanel;
