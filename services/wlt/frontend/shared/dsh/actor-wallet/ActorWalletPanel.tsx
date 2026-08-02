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
import type { RepresentativeActorType, RepresentativeLedgerEntry } from "./actor-wallet.api";
import { useActorWalletController } from "./use-actor-wallet-controller";

export type ActorWalletPanelProps = {
  readonly actorType: RepresentativeActorType;
  readonly title?: string;
  readonly showLedger?: boolean;
  readonly embedded?: boolean;
};

function amountLabel(minorUnits: number, currency: string): string {
  const normalized = Number.isSafeInteger(minorUnits) ? minorUnits : 0;
  return `${(normalized / 100).toLocaleString("ar-YE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function walletStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "نشطة",
    suspended: "موقوفة",
    frozen: "مجمّدة",
    closed: "مغلقة",
  };
  return labels[status] ?? status;
}

function walletStatusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "suspended" || status === "frozen") return "warning";
  if (status === "closed") return "danger";
  return "neutral";
}

function ledgerTitle(entry: RepresentativeLedgerEntry): string {
  const source = entry.sourceType || entry.referenceType || "مرجع مالي";
  return `${entry.entryType || "قيد"} · ${source}`;
}

function LedgerRow({ entry }: { readonly entry: RepresentativeLedgerEntry }) {
  const theme = useTheme() as any;
  const credit = entry.debitCredit === "credit";
  return (
    <View
      accessibilityLabel={`قيد ${ledgerTitle(entry)} بمبلغ ${amountLabel(entry.amountMinorUnits, entry.currency)}`}
      style={{
        gap: spacing[1],
        paddingVertical: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.line,
      }}
    >
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", gap: spacing[3] }}>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text role="bodyStrong" style={{ textAlign: "right" }}>{ledgerTitle(entry)}</Text>
          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
            {entry.description || entry.referenceId || entry.sourceId}
          </Text>
        </View>
        <Text role="bodyStrong" tone={credit ? "success" : "danger"}>
          {credit ? "+" : "-"}{amountLabel(Math.abs(entry.amountMinorUnits), entry.currency)}
        </Text>
      </View>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
        <Text role="caption" tone="muted">{entry.createdAt}</Text>
        <Text role="caption" tone="muted">
          الرصيد بعد القيد: {amountLabel(entry.balanceAfter, entry.currency)}
        </Text>
      </View>
    </View>
  );
}

export function ActorWalletPanel({
  actorType,
  title = "المحفظة",
  showLedger = true,
  embedded = false,
}: ActorWalletPanelProps) {
  const theme = useTheme() as any;
  const controller = useActorWalletController(actorType);

  if (controller.state.kind === "loading") {
    return (
      <StateView
        loading
        title="جارٍ تحميل المحفظة"
        description="يتم جلب الرصيد والقيود المرجعية من WLT عبر وكيل DSH المحكوم."
      />
    );
  }

  if (controller.state.kind === "error") {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل المحفظة"
        description={controller.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={controller.refresh}
      />
    );
  }

  const { wallet, ledgerEntries, ledgerError } = controller.state;
  return (
    <Box
      padding={embedded ? 3 : 4}
      gap={4}
      style={{ backgroundColor: theme.surfaceInset, borderRadius: 16 }}
    >
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[3] }}>
        <View style={{ alignItems: "flex-end", flex: 1 }}>
          <Text role="titleMd" style={{ textAlign: "right" }}>{title}</Text>
          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
            WLT هو مصدر الحقيقة · المالك {wallet.actorType}
          </Text>
        </View>
        <Badge label={walletStatusLabel(wallet.status)} tone={walletStatusTone(wallet.status)} />
      </View>

      <View style={{ gap: spacing[2] }}>
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>الرصيد المتاح</Text>
        <Text role="titleLg" tone="success" style={{ textAlign: "right" }}>
          {amountLabel(wallet.availableBalanceMinorUnits, wallet.currency)}
        </Text>
      </View>

      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[3] }}>
        {[
          ["معلّق", wallet.pendingBalanceMinorUnits],
          ["محجوز", wallet.heldBalanceMinorUnits],
          ["مكتسب", wallet.earnedTotalMinorUnits],
          ["مسوّى", wallet.settledTotalMinorUnits],
          ["مدفوع", wallet.paidTotalMinorUnits],
        ].map(([label, value]) => (
          <View key={String(label)} style={{ minWidth: 105, flexGrow: 1, alignItems: "flex-end" }}>
            <Text role="caption" tone="muted">{String(label)}</Text>
            <Text role="bodyStrong">{amountLabel(Number(value), wallet.currency)}</Text>
          </View>
        ))}
      </View>

      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
        آخر تحديث: {wallet.updatedAt ?? "غير متاح"} · آخر قيد: {wallet.lastLedgerEntryAt ?? "لا يوجد"}
      </Text>
      <Button label="تحديث" tone="secondary" size="sm" onPress={controller.refresh} />

      {showLedger ? (
        <>
          <Divider />
          <Text role="titleSm" style={{ textAlign: "right" }}>دفتر الحركة المرجعي</Text>
          {ledgerError ? (
            <StateView
              tone="warning"
              title="تعذر تحميل دفتر الحركة"
              description={ledgerError}
              actionLabel="إعادة المحاولة"
              onActionPress={controller.refresh}
            />
          ) : ledgerEntries.length === 0 ? (
            <StateView
              tone="neutral"
              title="لا توجد قيود بعد"
              description="ستظهر القيود المعتمدة هنا عند تسجيل حركة مالية في WLT."
            />
          ) : (
            <View>{ledgerEntries.map((entry) => <LedgerRow key={entry.id} entry={entry} />)}</View>
          )}
        </>
      ) : null}
    </Box>
  );
}

export default ActorWalletPanel;
