"use client";

import { useEffect, useState } from "react";
import { colorRoles } from "@bthwani/ui-kit";
import { ActorWalletPanel, type RepresentativeActorType } from "../../shared/finance-wlt-link/actor-wallet";
import { resolveVisualEvidenceRequestPath } from "../../shared/finance-wlt-link/visual-evidence/request-path";
import { RepresentativeWalletLookup } from "./RepresentativeWalletLookup";

export type Jrn033VisualEvidenceMode = "success" | "empty" | "frozen" | "error" | "loading";

type Props = { readonly mode: Jrn033VisualEvidenceMode };

const actorIds: Record<RepresentativeActorType, string> = {
  client: "client-local-001",
  partner: "partner-local-001",
  captain: "captain-local-001",
  field: "field-local-001",
};

const actorLabels: Record<RepresentativeActorType, string> = {
  client: "تطبيق العميل",
  partner: "تطبيق الشريك",
  captain: "تطبيق الكابتن",
  field: "تطبيق الميداني",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

function walletBody(actorType: RepresentativeActorType, mode: Jrn033VisualEvidenceMode) {
  const available = mode === "empty" ? 0 : actorType === "partner" ? 875000 : actorType === "captain" ? 215000 : actorType === "field" ? 165000 : 125000;
  return {
    wallet: {
      id: `wallet-${actorIds[actorType]}`,
      actorId: actorIds[actorType],
      actorType,
      status: mode === "frozen" ? "frozen" : "active",
      currency: "YER",
      availableBalanceMinorUnits: available,
      pendingBalanceMinorUnits: mode === "empty" ? 0 : 10000,
      heldBalanceMinorUnits: mode === "empty" ? 0 : 5000,
      earnedTotalMinorUnits: available,
      settledTotalMinorUnits: mode === "empty" ? 0 : 10000,
      paidTotalMinorUnits: mode === "empty" ? 0 : 5000,
      lastLedgerEntryAt: mode === "empty" ? null : "2026-07-22T08:00:00Z",
      updatedAt: "2026-07-22T08:05:00Z",
    },
  };
}

function ledgerBody(actorType: RepresentativeActorType, mode: Jrn033VisualEvidenceMode) {
  if (mode === "empty") return { ledgerEntries: [] };
  return {
    ledgerEntries: [
      {
        id: `ledger-${actorIds[actorType]}`,
        entryType: actorType === "captain" ? "earning" : actorType === "field" ? "commission" : "wallet_credit",
        actorId: actorIds[actorType],
        actorType,
        sourceType: "visual_evidence",
        sourceId: `jrn-033-${actorType}`,
        referenceId: `ref-${actorType}`,
        referenceType: "visual_evidence",
        amountMinorUnits: 125000,
        currency: "YER",
        debitCredit: "credit",
        balanceAfter: 125000,
        description: "قيد مرجعي لإثبات العرض فقط",
        createdAt: "2026-07-22T08:00:00Z",
      },
    ],
  };
}

export function Jrn033VisualEvidenceScreen({ mode }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (mode === "loading") return new Promise<Response>(() => undefined);
      const pathname = resolveVisualEvidenceRequestPath(input, window.location.origin);
      const ownMatch = pathname.match(/\/dsh\/(client|partner|captain|field)\/me\/finance\/(wallet|ledger-entries)$/);
      if (ownMatch) {
        const actorType = ownMatch[1] as RepresentativeActorType;
        if (mode === "error") return jsonResponse({ code: "WLT_UNAVAILABLE", message: "تعذر الوصول إلى WLT" }, 503);
        return ownMatch[2] === "wallet" ? jsonResponse(walletBody(actorType, mode)) : jsonResponse(ledgerBody(actorType, mode));
      }
      return originalFetch(input);
    }) as typeof fetch;
    setReady(true);
    return () => { globalThis.fetch = originalFetch; };
  }, [mode]);

  if (!ready) return <div dir="rtl" style={{ padding: 32 }}>تهيئة دليل JRN-033 المرئي…</div>;

  const actors: RepresentativeActorType[] = ["client", "partner", "captain", "field"];
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: colorRoles.surfaceWarm, padding: 28, fontFamily: "system-ui", color: colorRoles.textPrimary }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: colorRoles.brandAction }}>JRN-033 · VISUAL EVIDENCE · {mode.toUpperCase()}</div>
        <h1 style={{ margin: "8px 0", fontSize: 32 }}>محافظ الممثلين والمالية المرجعية</h1>
        <p style={{ margin: 0, maxWidth: 900, lineHeight: 1.8 }}>
          عرض آلي للمكوّنات الفعلية فقط. البيانات في هذه الصفحة fixture بصري محكوم، بينما الحقيقة التشغيلية تُثبت منفصلًا عبر Identity → DSH → WLT.
        </p>
      </header>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, alignItems: "start" }}>
        {actors.map((actorType) => (
          <article key={actorType} style={{ border: `1px solid ${colorRoles.borderStrong}`, borderRadius: 18, padding: 14, background: colorRoles.surfaceBase, boxShadow: `0 10px 26px ${colorRoles.brandStructureTint}` }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>{actorLabels[actorType]}</h2>
            <ActorWalletPanel actorType={actorType} title={`محفظة ${actorLabels[actorType]}`} embedded />
          </article>
        ))}
      </section>
      <section style={{ marginTop: 22 }}>
        <RepresentativeWalletLookup />
      </section>
    </main>
  );
}

export default Jrn033VisualEvidenceScreen;
