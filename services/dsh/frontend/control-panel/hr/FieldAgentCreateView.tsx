"use client";

import React, { useState } from "react";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import { useFieldAgentCreateAndActivationController } from "../../shared/workforce";
import type { FieldAgent, SupervisorCandidate } from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";
import { ZonePicker } from "./ZonePicker";

export function FieldAgentCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated: (agent: FieldAgent) => void;
  readonly inline?: boolean;
}) {
  const { state, submit, reset } = useFieldAgentCreateAndActivationController();
  const [fullNameAr, setFullNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [autoActivate, setAutoActivate] = useState(true);
  const [copied, setCopied] = useState(false);

  const createdAgent = state.kind === "created" ? state.provider : null;
  const issuedCode = state.kind === "created" ? state.activation?.code ?? null : null;
  const activationError = state.kind === "created" ? state.activationError : null;

  const canSubmit =
    fullNameAr.trim().length > 0 &&
    phone.trim().length >= 9 &&
    zoneId !== "" &&
    state.kind !== "submitting" &&
    state.kind !== "created";

  const handleSubmit = async () => {
    await submit({
      fullNameAr: fullNameAr.trim(),
      phoneE164: phone.trim(),
      engagementType: "independent_contractor",
      serviceZoneId: zoneId,
      shiftCode: "full_day",
      supervisorActorId: supervisor?.actorId,
    }, { issueActivationCode: autoActivate });
  };

  const resetForm = () => {
    reset();
    setFullNameAr("");
    setPhone("");
    setZoneId("");
    setSupervisor(null);
    setAutoActivate(true);
    setCopied(false);
  };

  const body = (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <CpMutedInline>
        مقدم خدمة مستقل — يتقاضى عمولة عن كل انضمام متجر. رقم الهاتف يُسجَّل في خدمة الهوية ولا
        يُخزَّن في Workforce.
      </CpMutedInline>

      {/* Basic Info Card */}
      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>البيانات الأساسية</Text>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم الكامل *</Text>
            <CpTextInput value={fullNameAr} onChange={setFullNameAr} placeholder="أحمد محمد" disabled={Boolean(createdAgent)} aria-label="الاسم الكامل" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>رقم الهاتف *</Text>
            <CpTextInput value={phone} onChange={setPhone} placeholder="مثال: 777123456" disabled={Boolean(createdAgent)} aria-label="رقم الهاتف" />
          </div>
        </div>
      </div>

      {/* Operation & Scope Card */}
      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>التشغيل والنطاق</Text>
        <ZonePicker value={zoneId} disabled={Boolean(createdAgent)} onChange={(zone) => setZoneId(zone?.id ?? "")} />
      </div>

      {/* Supervision & Activation Card */}
      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>الإشراف وتفعيل الدخول</Text>
        
        <SupervisorPicker kind="field" selected={supervisor} onSelect={setSupervisor} disabled={Boolean(createdAgent)} />

        <div style={{ marginTop: "8px" }}>
          <CpButton
            variant={autoActivate ? "primary" : "ghost"}
            disabled={Boolean(createdAgent)}
            onClick={() => setAutoActivate((value) => !value)}
          >
            {autoActivate ? "إصدار كود دخول بعد الإنشاء" : "إنشاء بدون كود دخول"}
          </CpButton>
        </div>
      </div>

      {state.kind === "error" ? <CpStatePanel role="alert" title="تعذر إنشاء مقدم الخدمة" description={state.message} /> : null}

      {/* Action Bar */}
      {createdAgent ? (
        <CpStatePanel role="status" title="تم إنشاء مقدم الخدمة وتأكيده من Workforce.">
          {issuedCode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Text role="bodySm">كود التفعيل الصادر من خدمة الهوية:</Text>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <Text role="titleMd" style={{ letterSpacing: 2, fontWeight: "bold" }}>{issuedCode}</Text>
                <CpButton
                  variant="ghost"
                  onClick={() => {
                    if (typeof navigator !== "undefined") {
                      void navigator.clipboard.writeText(issuedCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                >
                  {copied ? "تم النسخ" : "نسخ الكود"}
                </CpButton>
              </div>
            </div>
          ) : activationError ? (
            <Text role="bodySm">تم إنشاء مقدم الخدمة، لكن تعذر إصدار كود الدخول: {activationError}</Text>
          ) : (
            <Text role="bodySm">تم الإنشاء بدون تفعيل حساب الدخول. يمكن إصدار الكود من ملف مقدم الخدمة.</Text>
          )}

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <CpButton variant="primary" onClick={() => props.onCreated(createdAgent)}>فتح ملف مقدم الخدمة</CpButton>
            <CpButton variant="secondary" onClick={resetForm}>إضافة مقدم خدمة جديد</CpButton>
          </div>
        </CpStatePanel>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <div style={{ minWidth: "240px" }}>
            <CpButton variant="primary" disabled={!canSubmit} onClick={() => void handleSubmit()}>
              {state.kind === "submitting" ? "جارٍ الإنشاء…" : "إنشاء مقدم الخدمة"}
            </CpButton>
          </div>
        </div>
      )}
    </div>
  );

  if (props.inline) return body;

  return (
    <EditorPageFrame
      header={
        <CpPageHeader title="إضافة مقدم خدمة — ميداني">
          {props.onBack ? <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton> : null}
        </CpPageHeader>
      }
    >
      {body}
    </EditorPageFrame>
  );
}

export default FieldAgentCreateView;
