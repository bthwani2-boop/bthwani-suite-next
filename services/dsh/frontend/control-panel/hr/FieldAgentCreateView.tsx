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
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <CpMutedInline>
        مقدم خدمة مستقل — يتقاضى عمولة عن كل انضمام متجر. رقم الهاتف يُسجَّل في خدمة الهوية ولا
        يُخزَّن في Workforce.
      </CpMutedInline>

      <div>
        <Text role="bodySm">الاسم الكامل *</Text>
        <CpTextInput value={fullNameAr} onChange={setFullNameAr} placeholder="أحمد محمد" disabled={Boolean(createdAgent)} aria-label="الاسم الكامل" />
      </div>
      <div>
        <Text role="bodySm">رقم الهاتف *</Text>
        <CpTextInput value={phone} onChange={setPhone} placeholder="مثال: 777123456" disabled={Boolean(createdAgent)} aria-label="رقم الهاتف" />
      </div>

      <Text role="bodySm" style={{ fontWeight: "bold" }}>التشغيل والنطاق</Text>
      <ZonePicker value={zoneId} disabled={Boolean(createdAgent)} onChange={(zone) => setZoneId(zone?.id ?? "")} />

      <Text role="bodySm" style={{ fontWeight: "bold" }}>الإشراف</Text>
      <SupervisorPicker kind="field" selected={supervisor} onSelect={setSupervisor} disabled={Boolean(createdAgent)} />

      <Text role="bodySm" style={{ fontWeight: "bold" }}>تفعيل حساب الدخول</Text>
      <CpButton
        variant={autoActivate ? "primary" : "ghost"}
        disabled={Boolean(createdAgent)}
        onClick={() => setAutoActivate((value) => !value)}
      >
        {autoActivate ? "إصدار كود دخول بعد الإنشاء" : "إنشاء بدون كود دخول"}
      </CpButton>

      {state.kind === "error" ? <CpStatePanel role="alert" title="تعذر إنشاء مقدم الخدمة" description={state.message} /> : null}

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

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
            <CpButton variant="primary" onClick={() => props.onCreated(createdAgent)}>فتح ملف مقدم الخدمة</CpButton>
            <CpButton variant="secondary" onClick={resetForm}>إضافة مقدم خدمة جديد</CpButton>
          </div>
        </CpStatePanel>
      ) : (
        <CpButton variant="primary" disabled={!canSubmit} onClick={() => void handleSubmit()}>
          {state.kind === "submitting" ? "جارٍ الإنشاء…" : "إنشاء مقدم الخدمة"}
        </CpButton>
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
