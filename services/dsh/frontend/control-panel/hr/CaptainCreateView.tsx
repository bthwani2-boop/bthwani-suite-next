"use client";

import React, { useState } from "react";
import { CpButton, CpMutedInline, CpPageHeader, CpStatePanel, CpTabs, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import { useCaptainCreateAndActivationController } from "../../shared/workforce";
import type { Captain, SupervisorCandidate } from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";
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
  const [vehicleIdentifier, setVehicleIdentifier] = useState("");
  const [licenseExpiresAt, setLicenseExpiresAt] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [autoActivate, setAutoActivate] = useState(true);
  const [copied, setCopied] = useState(false);

  const createdCaptain = state.kind === "created" ? state.provider : null;
  const issuedCode = state.kind === "created" ? state.activation?.code ?? null : null;
  const activationError = state.kind === "created" ? state.activationError : null;

  const canSubmit =
    fullNameAr.trim().length > 0 &&
    phone.trim().length >= 9 &&
    zoneId !== "" &&
    vehicleType !== "" &&
    vehicleIdentifier.trim().length > 0 &&
    state.kind !== "submitting" &&
    state.kind !== "created";

  const handleSubmit = async () => {
    await submit({
      fullNameAr: fullNameAr.trim(),
      phoneE164: phone.trim(),
      engagementType: "independent_contractor",
      vehicleType,
      vehicleIdentifier: vehicleIdentifier.trim(),
      // Account activation must never self-approve a driving licence.
      licenseStatus: "pending_review",
      licenseExpiresAt: licenseExpiresAt.trim() || undefined,
      serviceZoneId: zoneId,
      supervisorActorId: supervisor?.actorId,
    }, { issueActivationCode: autoActivate });
  };

  const resetForm = () => {
    reset();
    setFullNameAr("");
    setPhone("");
    setZoneId("");
    setVehicleType("");
    setVehicleIdentifier("");
    setLicenseExpiresAt("");
    setSupervisor(null);
    setAutoActivate(true);
    setCopied(false);
  };

  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <CpMutedInline>
        مقدم خدمة مستقل — يتقاضى رسوم التوصيل عن كل طلب. رقم الهاتف يُسجَّل في خدمة الهوية ولا
        يُخزَّن في Workforce.
      </CpMutedInline>

      <Text role="bodySm" style={{ fontWeight: "bold" }}>البيانات الأساسية</Text>
      <div>
        <Text role="bodySm">الاسم الكامل *</Text>
        <CpTextInput value={fullNameAr} onChange={setFullNameAr} placeholder="أحمد محمد" disabled={Boolean(createdCaptain)} aria-label="الاسم الكامل" />
      </div>
      <div>
        <Text role="bodySm">رقم الهاتف *</Text>
        <CpTextInput value={phone} onChange={setPhone} placeholder="مثال: 777123456" disabled={Boolean(createdCaptain)} aria-label="رقم الهاتف" />
      </div>

      <Text role="bodySm" style={{ fontWeight: "bold" }}>التشغيل والنطاق</Text>
      <ZonePicker value={zoneId} disabled={Boolean(createdCaptain)} onChange={(zone) => setZoneId(zone?.id ?? "")} />

      <Text role="bodySm" style={{ fontWeight: "bold" }}>المركبة</Text>
      {!createdCaptain ? (
        <CpTabs
          aria-label="نوع المركبة"
          value={vehicleType}
          onChange={(value) => setVehicleType(value === vehicleType ? "" : value)}
          items={VEHICLE_TYPES}
        />
      ) : (
        <Text role="bodySm">{VEHICLE_TYPES.find((v) => v.value === vehicleType)?.label ?? "—"}</Text>
      )}
      <div>
        <Text role="bodySm">رقم أو لوحة المركبة *</Text>
        <CpTextInput value={vehicleIdentifier} onChange={setVehicleIdentifier} placeholder="مثال: صنعاء 12345" disabled={Boolean(createdCaptain)} aria-label="رقم أو لوحة المركبة" />
      </div>
      <div>
        <Text role="bodySm">تاريخ انتهاء الرخصة</Text>
        <CpTextInput value={licenseExpiresAt} onChange={setLicenseExpiresAt} placeholder="YYYY-MM-DD" disabled={Boolean(createdCaptain)} aria-label="تاريخ انتهاء الرخصة" />
      </div>
      <CpMutedInline>
        حالة الرخصة الأولية دائمًا «بانتظار المراجعة». إصدار كود الدخول لا يثبت صلاحية الرخصة ولا
        يتجاوز مراجعة الوثائق.
      </CpMutedInline>

      <Text role="bodySm" style={{ fontWeight: "bold" }}>الإشراف</Text>
      <SupervisorPicker kind="captain" selected={supervisor} onSelect={setSupervisor} disabled={Boolean(createdCaptain)} />

      <Text role="bodySm" style={{ fontWeight: "bold" }}>تفعيل حساب الدخول</Text>
      <CpButton
        variant={autoActivate ? "primary" : "ghost"}
        disabled={Boolean(createdCaptain)}
        onClick={() => setAutoActivate((value) => !value)}
      >
        {autoActivate ? "إصدار كود دخول بعد الإنشاء" : "إنشاء بدون كود دخول"}
      </CpButton>

      {state.kind === "error" ? <CpStatePanel role="alert" title="تعذر إنشاء مقدم الخدمة" description={state.message} /> : null}

      {createdCaptain ? (
        <CpStatePanel role="status" title="تم إنشاء الكابتن وتأكيده من Workforce، والرخصة ما تزال بانتظار المراجعة.">
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
            <Text role="bodySm">تم إنشاء الكابتن، لكن تعذر إصدار كود الدخول: {activationError}</Text>
          ) : (
            <Text role="bodySm">تم الإنشاء بدون تفعيل حساب الدخول. يمكن إصدار الكود من ملف الكابتن.</Text>
          )}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
            <CpButton variant="primary" onClick={() => props.onCreated(createdCaptain)}>فتح ملف الكابتن</CpButton>
            <CpButton variant="secondary" onClick={resetForm}>إضافة كابتن جديد</CpButton>
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
        <CpPageHeader title="إضافة مقدم خدمة — كابتن">
          {props.onBack ? <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton> : null}
        </CpPageHeader>
      }
    >
      {body}
    </EditorPageFrame>
  );
}

export default CaptainCreateView;
