"use client";

import React, { useState } from "react";
import { useIdentityRuntimeStatus } from "@bthwani/core-identity";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import {
  useCanonicalFieldAgentCreateController,
  type SupervisorCandidate,
} from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";
import { ZonePicker } from "./ZonePicker";

export function FieldAgentCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated: (actorId: string) => void;
  readonly inline?: boolean;
}) {
  const { state, submit, reset } = useCanonicalFieldAgentCreateController();
  const identityRuntime = useIdentityRuntimeStatus();
  const runtimeValue = identityRuntime.state.kind === "resolved"
    ? identityRuntime.state.value
    : identityRuntime.state.kind === "checking"
      ? identityRuntime.state.previous
      : undefined;
  const identityReady = runtimeValue?.status === "HEALTHY";
  const identityReason = identityRuntime.state.kind === "unavailable"
    ? identityRuntime.state.code
    : (runtimeValue?.reasonCodes ?? ["IDENTITY_READINESS_UNPROVEN"]).join("، ");

  const [fullNameAr, setFullNameAr] = useState("");
  const [fullNameEn, setFullNameEn] = useState("");
  const [username, setUsername] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);

  const createdAgent = state.kind === "created" ? state.agent : null;
  const isSubmitting = state.kind === "submitting";
  const formLocked = Boolean(createdAgent) || isSubmitting;
  const canSubmit =
    identityReady &&
    fullNameAr.trim().length > 0 &&
    username.trim().length > 0 &&
    phoneE164.trim().length > 0 &&
    zoneId.length > 0 &&
    !formLocked;

  const handleSubmit = async () => {
    if (!identityReady) return;
    await submit({
      fullNameAr: fullNameAr.trim(),
      ...(fullNameEn.trim() ? { fullNameEn: fullNameEn.trim() } : {}),
      username: username.trim(),
      phoneE164: phoneE164.trim(),
      serviceZoneId: zoneId,
      ...(supervisor?.actorId ? { supervisorActorId: supervisor.actorId } : {}),
      engagementType: "independent_contractor",
    });
  };

  const resetForm = () => {
    reset();
    setFullNameAr("");
    setFullNameEn("");
    setUsername("");
    setPhoneE164("");
    setZoneId("");
    setSupervisor(null);
  };

  const body = (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <CpMutedInline>
        إنشاء مقدم خدمة ميداني مستقل. تُنشئ Workforce الهوية داخليًا ثم تحفظ الملف السيادي؛ لا يحتاج المشغل إلى إدخال actorId ولا يوجد مسار provisioning ثانٍ.
      </CpMutedInline>

      {!identityReady ? (
        <CpStatePanel role="alert" title="Identity غير جاهزة؛ إنشاء الميداني متوقف" description={identityReason}>
          <CpButton variant="secondary" onClick={() => void identityRuntime.refresh(true)}>إعادة فحص Identity</CpButton>
        </CpStatePanel>
      ) : null}

      <section style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <Text role="titleMd">الهوية والبيانات الأساسية</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          <CpTextInput value={fullNameAr} onChange={setFullNameAr} placeholder="الاسم بالعربية *" disabled={formLocked} aria-label="الاسم بالعربية" />
          <CpTextInput value={fullNameEn} onChange={setFullNameEn} placeholder="الاسم بالإنجليزية" disabled={formLocked} aria-label="الاسم بالإنجليزية" />
          <CpTextInput value={username} onChange={setUsername} placeholder="اسم المستخدم *" disabled={formLocked} aria-label="اسم المستخدم" />
          <CpTextInput value={phoneE164} onChange={setPhoneE164} placeholder="+967777777777 *" disabled={formLocked} aria-label="رقم الهاتف" />
        </div>
      </section>

      <section style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <Text role="titleMd">النطاق والإشراف</Text>
        <ZonePicker value={zoneId} onChange={(zone) => setZoneId(zone?.id ?? "")} disabled={formLocked} />
        <SupervisorPicker kind="field" selected={supervisor} onSelect={setSupervisor} disabled={formLocked} />
      </section>

      {state.kind === "error" ? <CpStatePanel role="alert" title="تعذر إنشاء الميداني" description={state.message} /> : null}

      {createdAgent ? (
        <CpStatePanel role="status" title="تم إنشاء ملف الميداني" description="أكمل المستندات والمراجعة قبل إصدار التفعيل.">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <CpButton variant="primary" onClick={() => props.onCreated(createdAgent.actorId)}>فتح الملف والمتابعة</CpButton>
            <CpButton variant="secondary" onClick={resetForm}>إضافة ميداني آخر</CpButton>
          </div>
        </CpStatePanel>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <CpButton variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
            {isSubmitting ? "جارٍ الإنشاء…" : "إنشاء مقدم الخدمة الميداني"}
          </CpButton>
        </div>
      )}
    </div>
  );

  if (props.inline) return body;

  return (
    <EditorPageFrame
      header={<CpPageHeader title="إضافة مقدم خدمة ميداني">{props.onBack ? <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton> : null}</CpPageHeader>}
    >
      {body}
    </EditorPageFrame>
  );
}

export default FieldAgentCreateView;
