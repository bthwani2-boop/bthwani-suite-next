"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, StateView, Text, lightThemeColors } from "@bthwani/ui-kit";
import { resolveDshApiBaseUrl } from "../../shared/_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../shared/_kernel/dsh-http-request";
import type {
  RepresentativeActorType,
  RepresentativeLedgerEntry,
  RepresentativeWallet,
} from "../../shared/finance-wlt-link/actor-wallet";

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-control-panel-representative-wallet",
);

type LookupState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "loaded";
      readonly wallet: RepresentativeWallet;
      readonly ledgerEntries: readonly RepresentativeLedgerEntry[];
      readonly ledgerError: string | null;
    };

function amountLabel(value: number, currency: string): string {
  return `${(value / 100).toLocaleString("ar-YE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "suspended" || status === "frozen") return "warning";
  if (status === "closed") return "danger";
  return "neutral";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { readonly message?: unknown }).message ?? "unknown error");
  }
  return String(error);
}

function ledgerDirectionLabel(entry: RepresentativeLedgerEntry): string {
  return entry.debitCredit === "credit" ? "دائن" : "مدين";
}

export function RepresentativeWalletLookup() {
  const [actorType, setActorType] = useState<RepresentativeActorType>("client");
  const [actorId, setActorId] = useState("");
  const [state, setState] = useState<LookupState>({ kind: "idle" });

  const normalizedActorId = useMemo(() => actorId.trim(), [actorId]);
  const lookup = async () => {
    if (!normalizedActorId || normalizedActorId.length > 200) {
      setState({ kind: "error", message: "أدخل معرف ممثل صحيحًا لا يتجاوز 200 حرف." });
      return;
    }
    setState({ kind: "loading" });

    const encodedActorId = encodeURIComponent(normalizedActorId);
    const [walletResult, ledgerResult] = await Promise.allSettled([
      request<{ readonly wallet: RepresentativeWallet }>(
        `/dsh/control-panel/finance/wallets/${actorType}/${encodedActorId}`,
      ),
      request<{ readonly ledgerEntries: RepresentativeLedgerEntry[] }>(
        `/dsh/control-panel/finance/ledger/entries?actorType=${actorType}&actorId=${encodedActorId}&limit=50`,
      ),
    ]);

    if (walletResult.status === "rejected") {
      setState({ kind: "error", message: errorMessage(walletResult.reason) });
      return;
    }

    setState({
      kind: "loaded",
      wallet: walletResult.value.wallet,
      ledgerEntries: ledgerResult.status === "fulfilled" ? ledgerResult.value.ledgerEntries ?? [] : [],
      ledgerError: ledgerResult.status === "rejected" ? errorMessage(ledgerResult.reason) : null,
    });
  };

  return (
    <Card style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ textAlign: "right" }}>
          <Text role="titleMd">محافظ الممثلين</Text>
          <Text role="body" tone="muted">
            قراءة محكومة بصلاحية finance.read؛ الرصيد والدفتر يظلان مملوكين لـ WLT.
          </Text>
        </div>
        <Badge label="قراءة فقط" tone="info" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 0.35fr) minmax(220px, 1fr) auto", gap: "0.75rem", alignItems: "end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <Text role="caption" tone="muted">نوع الممثل</Text>
          <select
            value={actorType}
            onChange={(event) => setActorType(event.target.value as RepresentativeActorType)}
            style={{ minHeight: 42, border: `1px solid ${lightThemeColors.borderColor}`, borderRadius: 8, padding: "0.5rem" }}
          >
            <option value="client">عميل</option>
            <option value="partner">شريك</option>
            <option value="captain">كابتن</option>
            <option value="field">ميداني</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <Text role="caption" tone="muted">معرف الممثل</Text>
          <input
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void lookup();
            }}
            placeholder="actor-id"
            autoComplete="off"
            style={{ minHeight: 42, border: `1px solid ${lightThemeColors.borderColor}`, borderRadius: 8, padding: "0.5rem", direction: "ltr" }}
          />
        </label>
        <Button
          label={state.kind === "loading" ? "جارٍ الاستعلام..." : "استعلام"}
          tone="primary"
          disabled={state.kind === "loading"}
          onPress={() => void lookup()}
        />
      </div>

      {state.kind === "idle" ? (
        <StateView tone="neutral" title="حدد نوع الممثل ومعرفه" description="لن يتم إرسال أي معرف من تطبيقات الممثلين؛ هذا الإدخال مخصص للمشغّل المخوّل فقط." />
      ) : state.kind === "loading" ? (
        <StateView loading title="جارٍ تحميل المحفظة والدفتر" />
      ) : state.kind === "error" ? (
        <StateView tone="danger" title="تعذر تحميل المحفظة" description={state.message} actionLabel="إعادة المحاولة" onActionPress={() => void lookup()} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <Text role="caption" tone="muted">الرصيد المتاح</Text>
              <Text role="titleLg" style={{ color: lightThemeColors.success }}>
                {amountLabel(state.wallet.availableBalanceMinorUnits, state.wallet.currency)}
              </Text>
            </div>
            <Badge label={state.wallet.status} tone={statusTone(state.wallet.status)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.75rem" }}>
            {[
              ["معلّق", state.wallet.pendingBalanceMinorUnits],
              ["محجوز", state.wallet.heldBalanceMinorUnits],
              ["مكتسب", state.wallet.earnedTotalMinorUnits],
              ["مسوّى", state.wallet.settledTotalMinorUnits],
              ["مدفوع", state.wallet.paidTotalMinorUnits],
            ].map(([label, value]) => (
              <Card key={String(label)} style={{ padding: "0.75rem" }}>
                <Text role="caption" tone="muted">{String(label)}</Text>
                <Text role="body" style={{ fontWeight: 700 }}>{amountLabel(Number(value), state.wallet.currency)}</Text>
              </Card>
            ))}
          </div>
          <Text role="caption" tone="muted">
            المالك: {state.wallet.actorType}/{state.wallet.actorId} · آخر تحديث: {state.wallet.updatedAt ?? "غير متاح"} · آخر قيد: {state.wallet.lastLedgerEntryAt ?? "لا يوجد"}
          </Text>

          <div style={{ borderTop: `1px solid ${lightThemeColors.borderColor}`, paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <Text role="titleSm">دفتر الممثل المرجعي</Text>
              <Badge label={`${state.ledgerEntries.length.toLocaleString("ar-YE")} قيد`} tone="neutral" />
            </div>
            {state.ledgerError ? (
              <StateView
                tone="warning"
                title="تم تحميل المحفظة وتعذر تحميل الدفتر"
                description={state.ledgerError}
                actionLabel="إعادة المحاولة"
                onActionPress={() => void lookup()}
              />
            ) : state.ledgerEntries.length === 0 ? (
              <StateView tone="neutral" title="لا توجد قيود لهذا الممثل" description="لم يسجل WLT حركة مالية مطابقة لنوع الممثل ومعرفه حتى الآن." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${lightThemeColors.borderColor}` }}>
                      {['التاريخ', 'نوع القيد', 'الاتجاه', 'المبلغ', 'الرصيد بعد القيد', 'المرجع'].map((label) => (
                        <th key={label} style={{ padding: "0.65rem", textAlign: "right" }}><Text role="caption" tone="muted">{label}</Text></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.ledgerEntries.map((entry) => (
                      <tr key={entry.id} style={{ borderBottom: `1px solid ${lightThemeColors.borderColor}` }}>
                        <td style={{ padding: "0.65rem" }}><Text role="caption">{entry.createdAt}</Text></td>
                        <td style={{ padding: "0.65rem" }}><Text role="body">{entry.entryType || "قيد مالي"}</Text></td>
                        <td style={{ padding: "0.65rem" }}><Badge label={ledgerDirectionLabel(entry)} tone={entry.debitCredit === "credit" ? "success" : "warning"} /></td>
                        <td style={{ padding: "0.65rem" }}><Text role="body" tone={entry.debitCredit === "credit" ? "success" : "danger"}>{amountLabel(entry.amountMinorUnits, entry.currency)}</Text></td>
                        <td style={{ padding: "0.65rem" }}><Text role="body">{amountLabel(entry.balanceAfter, entry.currency)}</Text></td>
                        <td style={{ padding: "0.65rem" }}><Text role="caption" tone="muted">{entry.referenceId || entry.sourceId || entry.description}</Text></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default RepresentativeWalletLookup;
