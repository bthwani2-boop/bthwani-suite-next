"use client";

import React, { useState } from "react";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import { provisionActor, type ActorSummary } from "../../../shared/identity";
import { generateUUID } from "../../../shared/platform/platform-utils";

export function ActorCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated?: (actor: ActorSummary) => void;
  readonly inline?: boolean;
}) {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [internalRole, setInternalRole] = useState("");
  const [departmentScope, setDepartmentScope] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ActorSummary | null>(null);

  const canSubmit =
    username.trim().length > 0 &&
    role.trim().length > 0 &&
    !submitting &&
    !created;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const idempotencyKey = generateUUID();
      const actor = await provisionActor({
        username: username.trim(),
        phoneE164: phone.trim() || undefined,
        role: role.trim(),
        internalRole: internalRole.trim() || undefined,
        departmentScope: departmentScope.trim() || undefined,
      }, idempotencyKey);
      setCreated(actor);
      if (props.onCreated) {
        props.onCreated(actor);
      }
    } catch (err: any) {
      setError(err?.message || "تعذر إنشاء الهوية.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setUsername("");
    setPhone("");
    setRole("");
    setInternalRole("");
    setDepartmentScope("");
    setCreated(null);
    setError(null);
  };

  const body = (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <CpMutedInline>
        إنشاء الهوية الأولية (Actor) في نظام Identity. يجب استخدام معرّف الهوية الناتج (Actor ID) عند إعداد الحسابات في خدمات Workforce.
      </CpMutedInline>

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>بيانات الهوية (Actor)</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>اسم المستخدم (Username) *</Text>
            <CpTextInput value={username} onChange={setUsername} placeholder="مثال: jdoe" disabled={Boolean(created) || submitting} aria-label="اسم المستخدم" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>رقم الهاتف (E.164)</Text>
            <CpTextInput value={phone} onChange={setPhone} placeholder="مثال: +967777123456" disabled={Boolean(created) || submitting} aria-label="رقم الهاتف" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الدور (Role) *</Text>
            <CpTextInput value={role} onChange={setRole} placeholder="مثال: captain, employee, field" disabled={Boolean(created) || submitting} aria-label="الدور" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الدور الداخلي (اختياري)</Text>
            <CpTextInput value={internalRole} onChange={setInternalRole} placeholder="مثال: admin" disabled={Boolean(created) || submitting} aria-label="الدور الداخلي" />
          </div>
        </div>
      </div>

      {error ? (
        <CpStatePanel role="alert" title="تعذر إنشاء الهوية" description={error} />
      ) : null}

      {created ? (
        <CpStatePanel role="status" title={`تم إنشاء الهوية بنجاح (Actor ID: ${created.actorId})`}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <CpButton variant="primary" onClick={() => navigator.clipboard.writeText(created.actorId)}>نسخ Actor ID</CpButton>
            <CpButton variant="secondary" onClick={reset}>إنشاء هوية أخرى</CpButton>
          </div>
        </CpStatePanel>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <div style={{ minWidth: "240px" }}>
            <CpButton
              variant="primary"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "جاري الإنشاء..." : "إنشاء الهوية"}
            </CpButton>
          </div>
        </div>
      )}
    </div>
  );

  if (props.inline) {
    return body;
  }
  return (
    <EditorPageFrame
      title="إنشاء هوية (Actor) جديدة"
      onBack={props.onBack}
      header={<CpPageHeader title="إنشاء هوية (Actor) جديدة" onBack={props.onBack} />}
    >
      <div style={{ padding: "2rem" }}>{body}</div>
    </EditorPageFrame>
  );
}
