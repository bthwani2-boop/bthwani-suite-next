"use client";

import React, { useState } from "react";
import { useIdentityRuntimeStatus } from "@bthwani/core-identity";
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
  const [actorId, setActorId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [vehicleType, setVehicleType] = useState("");

  const createdCaptain = state.kind === "created" ? state.provider : null;

  React.useEffect(() => {
    if (createdCaptain) {
      props.onCreated(createdCaptain);
    }
  }, [createdCaptain, props]);
  const canSubmit =
    identityReady &&
    fullNameAr.trim().length > 0 &&
    actorId.trim().length > 0 &&
    zoneId !== "" &&
    vehicleType !== "" &&
    state.kind !== "submitting" &&
    state.kind !== "created";

  const handleSubmit = async () => {
    if (!identityReady) return;
    await submit({
      fullNameAr: fullNameAr.trim(),
      actorId: actorId.trim(),
      engagementType: "independent_contractor",
      vehicleType,
      licenseStatus: "missing",
      serviceZoneId: zoneId,
    }, { issueActivationCode: false });
  };

  const resetForm = () => {
    reset();
    setFullNameAr("");
    setActorId("");
    setZoneId("");
    setVehicleType("");
  };

  const body = (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <CpMutedInline>
        إنشاء أولي مختصر للكابتن. يجب إنشاء الهوية مسبقاً في قسم الإدارة (Administration)، ولا يصدر كود الدخول قبل اكتمال الهوية والرخصة والعقد والعهدة والتدريب والضمانة المالية واعتماد العمليات.
      </CpMutedInline>

      {!identityReady ? (
        <CpStatePanel
          role="alert"
          title="Identity غير جاهزة؛ إنشاء ملف الكابتن متوقف"
          description={`السبب: ${identityReason}. لا تُرسل عملية إنشاء جزئية إلى Workforce أثناء تعطل حقيقة الهوية.`}
        >
          <CpButton variant="secondary" onClick={() => void identityRuntime.refresh(true)}>إعادة فحص Identity</CpButton>
        </CpStatePanel>
      ) : null}

      <div style={{ padding: "24px", backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 2px 8px var(--bthwani-overlay-soft)" }}>
        <Text role="titleMd" style={{ fontWeight: "800", color: "var(--bthwani-control-panel-text)", borderBottom: "1px solid var(--bthwani-control-panel-border)", paddingBottom: "12px", marginBottom: "4px" }}>البيانات الأولية</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الاسم الكامل *</Text>
            <CpTextInput value={fullNameAr} onChange={setFullNameAr} placeholder="أحمد محمد" disabled={Boolean(createdCaptain)} aria-label="الاسم الكامل" />
          </div>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>Identity Actor ID *</Text>
            <CpTextInput value={actorId} onChange={setActorId} placeholder="مثال: actor-123" disabled={Boolean(createdCaptain)} aria-label="Actor ID" />
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
        <CpStatePanel role="status" title="جارٍ تجهيز ملف الكابتن..." />
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
