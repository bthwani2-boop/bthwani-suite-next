import React from "react";
import { View } from "react-native";
import { Badge, Box, Button, Divider, StateView, Text, spacing, useTheme } from "@bthwani/ui-kit";
import { corrId } from "../../shared/_kernel/dsh-http-request";
import { formatWltMoney } from "../finance/wlt-money";
import {
  fetchOwnCaptainCollateral,
  releaseCaptainCollateral,
  type CaptainCollateralReadback,
} from "./captain-collateral.api";

type PanelState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly readback: CaptainCollateralReadback };

function errorMessage(error: unknown): string {
  const value = error as { readonly message?: string; readonly code?: string };
  return value?.message || value?.code || "تعذر قراءة الضمانة من WLT.";
}

function blockerLabel(reason: string | undefined): string {
  const labels: Record<string, string> = {
    WLT_COLLATERAL_RELEASE_PENDING_FUNDS: "لا يمكن التحرير مع وجود أموال معلقة.",
    WLT_COLLATERAL_RELEASE_HELD_FUNDS: "لا يمكن التحرير مع وجود أموال محجوزة.",
    WLT_COLLATERAL_RELEASE_PROVIDER_DEBT_OPEN: "لا يمكن التحرير مع وجود ذمم مزود مفتوحة.",
  };
  return labels[reason ?? ""] ?? reason ?? "تحرير الفائض مشروط بسلامة كل التعرضات المالية.";
}

export function CaptainCollateralPanel({ embedded = false }: { readonly embedded?: boolean }) {
  const theme = useTheme() as any;
  const [state, setState] = React.useState<PanelState>({ kind: "loading" });
  const [busyPosition, setBusyPosition] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", readback: await fetchOwnCaptainCollateral() });
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const release = React.useCallback(async (positionId: string) => {
    if (busyPosition) return;
    setBusyPosition(positionId);
    setActionError(null);
    try {
      await releaseCaptainCollateral({
        positionId,
        releaseReason: "captain_self_service_excess_release",
        idempotencyKey: corrId(`captain-collateral-release-${positionId}`),
        correlationId: corrId(`captain-collateral-release-${positionId}`),
      });
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusyPosition(null);
    }
  }, [busyPosition, load]);

  if (state.kind === "loading") return <StateView loading title="جارٍ تحميل الضمانة" description="تُقرأ المراكز المقيدة والحد المحمي من WLT." />;
  if (state.kind === "error") return <StateView tone="danger" title="تعذر تحميل الضمانة" description={state.message} actionLabel="إعادة المحاولة" onActionPress={load} />;

  const { readback } = state;
  const currency = readback.policy?.currency ?? "YER";
  const activePositions = readback.positions.filter((position) => position.status === "active");
  return (
    <Box padding={embedded ? 3 : 4} gap={4} style={{ backgroundColor: theme.surfaceInset, borderRadius: 16 }}>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[3] }}>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text role="titleMd" style={{ textAlign: "right" }}>الضمانة المحمية</Text>
          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>WLT يربط كل تخصيص بمصدر Cash-In ويمنع تحريره عند وجود تعرض مالي.</Text>
        </View>
        <Badge label={readback.policy?.enabled ? "مفعلة" : "غير مفعلة"} tone={readback.policy?.enabled ? "success" : "warning"} />
      </View>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[3] }}>
        {[
          ["المحجوز", readback.wallet.collateralReservedMinorUnits],
          ["الحد المحمي", readback.policy?.minimumCollateralMinorUnits ?? 0],
          ["الفائض القابل للتحرير", readback.wallet.releasableExcessMinorUnits],
          ["الذمم المفتوحة", readback.wallet.outstandingDebtMinorUnits],
        ].map(([label, value]) => (
          <View key={String(label)} style={{ minWidth: 130, flexGrow: 1, alignItems: "flex-end" }}>
            <Text role="caption" tone="muted">{String(label)}</Text>
            <Text role="bodyStrong">{formatWltMoney(Number(value), currency)}</Text>
          </View>
        ))}
      </View>
      {readback.releaseBlockedReason ? <StateView tone="warning" title="التحرير محظور حاليًا" description={blockerLabel(readback.releaseBlockedReason)} /> : null}
      {actionError ? <StateView tone="danger" title="تعذر تحرير الضمانة" description={actionError} /> : null}
      <Divider />
      <Text role="titleSm" style={{ textAlign: "right" }}>مراكز الضمانة ومصادرها</Text>
      {activePositions.length === 0 ? (
        <StateView tone="neutral" title="لا توجد مراكز نشطة" description="بعد التقاط Cash-In يمكنك تخصيصه صراحةً كضمانة محمية." />
      ) : (
        <View style={{ gap: spacing[3] }}>
          {activePositions.map((position) => (
            <View key={position.id} style={{ gap: spacing[1], alignItems: "flex-end" }}>
              <Text role="bodyStrong">{formatWltMoney(position.restrictedAmountMinorUnits, position.currency)}</Text>
              <Text role="caption" tone="muted" style={{ textAlign: "right" }}>المصدر: {position.sourcePaymentSessionId} · السياسة {position.policyId} v{position.policyVersion}</Text>
              <Button label={busyPosition === position.id ? "جارٍ التحقق من WLT" : "تحرير الفائض"} tone="secondary" disabled={busyPosition !== null} onPress={() => void release(position.id)} />
            </View>
          ))}
        </View>
      )}
      <Button label="تحديث الضمانة" tone="ghost" disabled={busyPosition !== null} onPress={() => void load()} />
    </Box>
  );
}

export default CaptainCollateralPanel;
