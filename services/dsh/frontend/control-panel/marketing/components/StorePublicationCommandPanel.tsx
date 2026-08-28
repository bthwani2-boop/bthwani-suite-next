"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import { corrId } from "../../../shared/_kernel/dsh-http-request";
import { colorRoles } from "@bthwani/ui-kit";
import { CpButton, CpTextInput } from "@bthwani/control-panel/components";
import {
  decideStorePublication,
  fetchStorePublicationWorkspace,
  type StorePublicationDecision,
  type StorePublicationWorkspace,
} from "../../../shared/marketing";

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "body" in error) {
    const body = (error as { body?: unknown }).body;
    if (typeof body === "string" && body.trim()) {
      try {
        const parsed = JSON.parse(body) as {
          readonly code?: string;
          readonly message?: string;
          readonly error?: { readonly code?: string; readonly message?: string };
        };
        if (parsed.error?.code === "PUBLICATION_GATE_FAILED") {
          return "رُفض النشر: يجب إكمال الموانع المعروضة أو استخدام تجاوز تسمح به السياسة الدائمة.";
        }
        if (parsed.error?.message) return parsed.error.message;
        if (parsed.message) return parsed.message;
      } catch {
        // Preserve a non-JSON upstream response as diagnostic text.
      }
      return body;
    }
  }
  return error instanceof Error ? error.message : "تعذر تنفيذ أمر النشر.";
}

export function StorePublicationCommandPanel() {
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const commandIds = useRef<Record<string, string>>({});
  const commandFor = (scope: string) => {
    if (!actorId) throw new Error("جلسة المشغّل غير جاهزة لاتخاذ قرار النشر.");
    const key = `${actorId}:${scope}`;
    const existing = commandIds.current[key];
    if (existing) return existing;
    const id = corrId("store-publication");
    commandIds.current[key] = id;
    return id;
  };
  const [storeId, setStoreId] = useState("");
  const [workspace, setWorkspace] = useState<StorePublicationWorkspace | null>(null);
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    if (!storeId.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      setWorkspace(await fetchStorePublicationWorkspace(storeId));
    } catch (error) {
      setWorkspace(null);
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: StorePublicationDecision) {
    if (!workspace) return;
    if (!actorId) {
      setMessage("PROVIDERS_UNAUTHENTICATED");
      return;
    }
    const normalizedStoreId = storeId.trim();
    const normalizedReason = reason.trim();
    const normalizedOverrideReason = overrideReason.trim();
    const idempotencyKey = commandFor(`${normalizedStoreId}:${workspace.store.version}:${decision}:${normalizedReason}:${decision === "publish" && override}:${decision === "publish" && override ? normalizedOverrideReason : ""}`);
    setBusy(true);
    setMessage(null);
    try {
      await decideStorePublication(normalizedStoreId, {
        expectedVersion: workspace.store.version,
        decision,
        reason: normalizedReason,
        override: decision === "publish" && override,
        overrideReason: decision === "publish" && override ? normalizedOverrideReason : "",
      }, idempotencyKey);
      const canonical = await fetchStorePublicationWorkspace(storeId);
      setWorkspace(canonical);
      setMessage(decision === "publish" ? "تم نشر المتجر وتحديث القراءة القانونية." : "تم إخفاء المتجر وتحديث القراءة القانونية.");
    } catch (error) {
      setMessage(errorMessage(error));
      try {
        setWorkspace(await fetchStorePublicationWorkspace(storeId));
      } catch {
        // Preserve the last canonical read when the follow-up read is unavailable.
      }
    } finally {
      setBusy(false);
    }
  }

  const overrideAllowed = Boolean(
    workspace?.overridePolicy.enabled &&
      workspace.diagnostics.blockerCodes.every((code) =>
        workspace.overridePolicy.allowedBlockerCodes.includes(code),
      ),
  );

  return (
    <div dir="rtl" style={styles.root}>
      <section style={styles.card}>
        <h3 style={styles.title}>أمر نشر المتجر المركزي</h3>
        <p style={styles.description}>التسويق هو مالك أمر النشر والإخفاء. تُقرأ كل البوابات من DSH وتُطبّق الذرية والتدقيق على معرّف المتجر نفسه.</p>
        <div style={styles.row}>
          <CpTextInput value={storeId} onChange={setStoreId} placeholder="store-id" aria-label="معرف المتجر" disabled={busy} />
          <CpButton variant="secondary" onClick={() => void load()} disabled={busy || !storeId.trim()}>قراءة البوابات</CpButton>
        </div>
      </section>

      {workspace ? (
        <section style={styles.card}>
          <div style={styles.facts}>
            <strong>{workspace.store.displayName}</strong>
            <code>{workspace.store.id}</code>
            <span>الإصدار: {workspace.store.version}</span>
            <span>الحالة: {workspace.store.status}</span>
            <span>الظهور: {workspace.store.isVisible ? "ظاهر" : "مخفي"}</span>
          </div>
          <h4 style={styles.subtitle}>{workspace.diagnostics.isReady ? "جميع بوابات النشر مكتملة" : "موانع النشر الحالية"}</h4>
          {workspace.diagnostics.blockers.length ? (
            <ul style={styles.blockers}>
              {workspace.diagnostics.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          ) : <p style={styles.success}>لا توجد موانع.</p>}

          <CpTextInput value={reason} onChange={setReason} placeholder="سبب القرار (3 أحرف على الأقل)" aria-label="سبب قرار النشر" disabled={busy} />
          {workspace.overridePolicy.enabled ? (
            <label style={styles.overrideRow}>
              <input type="checkbox" checked={override} onChange={(event) => setOverride(event.target.checked)} disabled={busy || !overrideAllowed} />
              تجاوز الموانع المسموح بها في السياسة الدائمة
            </label>
          ) : <p style={styles.description}>التجاوز مغلق في سياسة هذا النطاق.</p>}
          {override ? <CpTextInput value={overrideReason} onChange={setOverrideReason} placeholder="مبرر التجاوز (10 أحرف على الأقل)" aria-label="مبرر تجاوز بوابات النشر" disabled={busy} /> : null}
          <div style={styles.row}>
            <CpButton variant="brand" onClick={() => void decide("publish")} disabled={busy || reason.trim().length < 3 || (override && overrideReason.trim().length < 10)}>نشر</CpButton>
            <CpButton variant="secondary" onClick={() => void decide("hide")} disabled={busy || reason.trim().length < 3}>إخفاء</CpButton>
          </div>
        </section>
      ) : null}

      {message ? <p role="status" style={styles.message}>{message}</p> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: { display: "grid", gap: "1rem", padding: "1rem" },
  card: { display: "grid", gap: "0.85rem", padding: "1.25rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.9rem", background: colorRoles.surfaceBase },
  title: { margin: 0, color: colorRoles.brandStructure },
  subtitle: { margin: 0, color: colorRoles.brandStructure },
  description: { margin: 0, opacity: 0.72, lineHeight: 1.7 },
  row: { display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center" },
  facts: { display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" },
  blockers: { margin: 0, paddingInlineStart: "1.25rem", color: colorRoles.danger, lineHeight: 1.8 },
  success: { margin: 0, color: colorRoles.success, fontWeight: 700 },
  overrideRow: { display: "flex", gap: "0.5rem", alignItems: "center" },
  message: { margin: 0, padding: "0.75rem 1rem", border: `1px solid ${colorRoles.borderSubtle}`, borderRadius: "0.65rem" },
};
