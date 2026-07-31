"use client";

import React, { useState } from "react";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import { useFieldAgentCreateAndActivationController } from "../../shared/workforce";
import type { FieldAgent } from "../../shared/workforce";
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

  const createdAgent = state.kind === "created" ? state.provider : null;

  React.useEffect(() => {
    if (createdAgent) {
      props.onCreated(createdAgent);
    }
  }, [createdAgent, props]);
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
    }, { issueActivationCode: false });
  };

  const resetForm = () => {
    reset();
    setFullNameAr("");
    setPhone("");
    setZoneId("");
  };

  const body = (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <CpMutedInline>
        إنشاء أولي مختصر للميداني. الهوية والضمين والعقد ومصدر الترشيح تُستكمل تدريجيًا من الملف، ولا يصدر كود الدخول قبل اكتمال بوابة التفعيل.
      </CpMutedInline>

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>البيانات الأولية</Text>
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
        <ZonePicker value={zoneId} disabled={Boolean(createdAgent)} onChange={(zone) => setZoneId(zone?.id ?? "")} />
      </div>

      <CpMutedInline>
        الميداني مقدم خدمة مستقل بلا تصنيف وبلا وردية أو حضور. التوفر وعدم التوفر يُداران بإبلاغ مستقل بعد التفعيل.
      </CpMutedInline>

      {state.kind === "error" ? <CpStatePanel role="alert" title="تعذر إنشاء الميداني" description={state.message} /> : null}

      {createdAgent ? (
        <CpStatePanel role="status" title="جارٍ تجهيز ملف الميداني..." />
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <div style={{ minWidth: "240px" }}>
            <CpButton variant="primary" disabled={!canSubmit} onClick={() => void handleSubmit()}>
              {state.kind === "submitting" ? "جارٍ الإنشاء…" : "إنشاء ملف الميداني"}
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
        <CpPageHeader title="إضافة ميداني">
          {props.onBack ? <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton> : null}
        </CpPageHeader>
      }
    >
      {body}
    </EditorPageFrame>
  );
}

export default FieldAgentCreateView;
