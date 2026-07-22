"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, StateView, Text, lightThemeColors } from "@bthwani/ui-kit";
import { resolveDshApiBaseUrl } from "../../shared/_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../shared/_kernel/dsh-http-request";
import type {
  RepresentativeActorType,
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
  | { readonly kind: "loaded"; readonly wallet: RepresentativeWallet };

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
    try {
      const response = await request<{ readonly wallet: RepresentativeWallet }>(
        `/dsh/control-panel/finance/wallets/${actorType}/${encodeURIComponent(normalizedActorId)}`,
      );
      setState({ kind: "loaded", wallet: response.wallet });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
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
        <StateView loading title="جارٍ تحميل المحفظة" />
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
        </div>
      )}
    </Card>
  );
}

export default RepresentativeWalletLookup;
