"use client";

import { useMemo, useState } from "react";
import { Card, StateView, Text } from "@bthwani/ui-kit";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import {
  CpBadge,
  CpButton,
  CpMutedInline,
  CpSelect,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { resolveDshApiBaseUrl } from '@bthwani/wlt/dsh';
import { createDshHttpClient } from '@bthwani/wlt/dsh';
import type {
  RepresentativeActorType,
  RepresentativeLedgerEntry,
  RepresentativeWallet,
} from '@bthwani/wlt/dsh';

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

function statusTone(status: string): CpBadgeTone {
  if (status === "active") return "success";
  if (status === "suspended" || status === "frozen") return "warning";
  if (status === "closed") return "danger";
  return "neutral";
}

const ACTOR_TYPE_OPTIONS = [
  { value: "client", label: "عميل" },
  { value: "partner", label: "شريك" },
  { value: "captain", label: "كابتن" },
  { value: "field", label: "ميداني" },
] as const;

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
    const representativeBase = `/dsh/control-panel/finance/wallets/${actorType}/${encodedActorId}`;
    const [walletResult, ledgerResult] = await Promise.allSettled([
      request<{ readonly wallet: RepresentativeWallet }>(representativeBase),
      request<{ readonly ledgerEntries: RepresentativeLedgerEntry[] }>(
        `${representativeBase}/ledger-entries?limit=50`,
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
        <CpBadge tone="info">قراءة فقط</CpBadge>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void lookup();
        }}
        style={{ display: "grid", gridTemplateColumns: "minmax(150px, 0.35fr) minmax(220px, 1fr) auto", gap: "0.75rem", alignItems: "end" }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <Text role="caption" tone="muted">نوع الممثل</Text>
          <CpSelect
            aria-label="نوع الممثل"
            value={actorType}
            onChange={(value) => setActorType(value as RepresentativeActorType)}
            options={ACTOR_TYPE_OPTIONS}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <Text role="caption" tone="muted">معرف الممثل</Text>
          <CpTextInput
            aria-label="معرف الممثل"
            value={actorId}
            onChange={setActorId}
            placeholder="actor-id"
          />
        </label>
        <CpButton type="submit" variant="primary" disabled={state.kind === "loading"}>
          {state.kind === "loading" ? "جارٍ الاستعلام..." : "استعلام"}
        </CpButton>
      </form>

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
              <Text role="titleLg" tone="success">
                {amountLabel(state.wallet.availableBalanceMinorUnits, state.wallet.currency)}
              </Text>
            </div>
            <CpBadge tone={statusTone(state.wallet.status)}>{state.wallet.status}</CpBadge>
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

          <div style={{ paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <Text role="titleSm">دفتر الممثل المرجعي</Text>
              <CpBadge tone="neutral">{`${state.ledgerEntries.length.toLocaleString("ar-YE")} قيد`}</CpBadge>
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
                <CpTable aria-label="دفتر الممثل المرجعي">
                  <thead>
                    <tr>
                      {["التاريخ", "نوع القيد", "الاتجاه", "المبلغ", "الرصيد بعد القيد", "المرجع"].map((label) => (
                        <CpTableHeaderCell key={label}>{label}</CpTableHeaderCell>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.ledgerEntries.map((entry) => (
                      <tr key={entry.id}>
                        <CpTableCell>{entry.createdAt}</CpTableCell>
                        <CpTableCell>{entry.entryType || "قيد مالي"}</CpTableCell>
                        <CpTableCell>
                          <CpBadge tone={entry.debitCredit === "credit" ? "success" : "warning"}>{ledgerDirectionLabel(entry)}</CpBadge>
                        </CpTableCell>
                        <CpTableCell>
                          <Text role="body" tone={entry.debitCredit === "credit" ? "success" : "danger"}>{amountLabel(entry.amountMinorUnits, entry.currency)}</Text>
                        </CpTableCell>
                        <CpTableCell>{amountLabel(entry.balanceAfter, entry.currency)}</CpTableCell>
                        <CpTableCell>
                          <CpMutedInline tight>{entry.referenceId || entry.sourceId || entry.description}</CpMutedInline>
                        </CpTableCell>
                      </tr>
                    ))}
                  </tbody>
                </CpTable>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default RepresentativeWalletLookup;
