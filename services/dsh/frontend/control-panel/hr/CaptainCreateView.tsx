"use client";

import React, { useState } from "react";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTabs, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import { useCaptainCreateAndActivationController } from "../../shared/workforce";
import type { Captain } from "../../shared/workforce";
import { ZonePicker } from "./ZonePicker";

const VEHICLE_TYPES: Array<{ label: string; value: string }> = [
  { label: "دراجة نارية", value: "motorcycle" },
  { label: "سيارة", value: "car" },
  { label: "أخرى", value: "other" },
];

export function CaptainCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated: (captain: Captain) => void;
  readonly inline?: boolean;
}) {
  const { state, submit, reset } = useCaptainCreateAndActivationController();
  const [fullNameAr, setFullNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [vehicleType, setVehicleType] = useState("");

  const createdCaptain = state.kind === "created" ? state.provider : null;
  const canSubmit =
    fullNameAr.trim().length > 0 &&
    phone.trim().length >= 9 &&
    zoneId !== "" &&
    vehicleType !== "" &&
    state.kind !== "submitting" &&
    state.kind !== "created";

  const handleSubmit = async () => {
    await submit({
      fullNameAr: fullNameAr.trim(),
      phoneE164: phone.trim(),
      engagementType: "independent_contractor",
      vehicleType,
      licenseStatus: "missing",
      serviceZoneId: zoneId,
    }, { issueActivationCode: false });
  };

  const resetForm = () => {
    reset();
    setFullNameAr("");
    setPhone("");
    setZoneId("");
    setVehicleType("");
  };

  const body = (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <CpMutedInline>
        إنشاء أولي مختصر للكابتن. يبدأ تلقائيًا بتصنيف Joker، ولا يصدر كود الدخول قبل اكتمال الهوية والرخصة والعقد والعهدة والتدريب والضمانة المالية واعتماد العمليات.
      </CpMutedInline>

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>البيانات الأولية</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم الكامل *</Text>
            <CpTextInput value={fullNameAr} onChange={setFullNameAr} placeholder="أحمد محمد" disabled={Boolean(createdCaptain)} aria-label="الاسم الكامل" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>رقم الهاتف *</Text>
            <CpTextInput value={phone} onChange={setPhone} placeholder="مثال: 777123456" disabled={Boolean(createdCaptain)} aria-label="رقم الهاتف" />
          </div>
        </div>

        <ZonePicker value={zoneId} disabled={Boolean(createdCaptain)} onChange={(zone) => setZoneId(zone?.id ?? "")} />

        {!createdCaptain ? (
          <CpTabs
            aria-label="نوع المركبة"
            value={vehicleType}
            onChange={(value) => setVehicleType(value === vehicleType ? "" : value)}
            items={VEHICLE_TYPES}
          />
        ) : (
          <Text role="bodySm">نوع المركبة: {VEHICLE_TYPES.find((item) => item.value === vehicleType)?.label ?? "—"}</Text>
        )}
      </div>

      <CpMutedInline>
        الضمانة المالية هي نفسها الرصيد الممول لأهلية الإسناد؛ لا يوجد رصيد افتتاحي منفصل. WLT هو مصدر الحقيقة المالي.
      </CpMutedInline>

      {state.kind === "error" ? <CpStatePanel role="alert" title="تعذر إنشاء الكابتن" description={state.message} /> : null}

      {createdCaptain ? (
        <CpStatePanel role="status" title="تم إنشاء ملف الكابتن الأولي بتصنيف Joker.">
          <Text role="bodySm">افتح الملف لاستكمال مصدر الترشيح والضمين والهوية والرخصة والعقد والتجهيز والضمانة المالية قبل التفعيل.</Text>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <CpButton variant="primary" onClick={() => props.onCreated(createdCaptain)}>فتح ملف الكابتن</CpButton>
            <CpButton variant="secondary" onClick={resetForm}>إضافة كابتن جديد</CpButton>
          </div>
        </CpStatePanel>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <div style={{ minWidth: "240px" }}>
            <CpButton variant="primary" disabled={!canSubmit} onClick={() => void handleSubmit()}>
              {state.kind === "submitting" ? "جارٍ الإنشاء…" : "إنشاء ملف الكابتن"}
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
        <CpPageHeader title="إضافة كابتن">
          {props.onBack ? <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton> : null}
        </CpPageHeader>
      }
    >
      {body}
    </EditorPageFrame>
  );
}

export default CaptainCreateView;
