"use client";

import React, { useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing, colorRoles, alpha } from "@bthwani/ui-kit";
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

  const content = (
    <Card style={{ padding: spacing[4], gap: spacing[3] }}>
      {!props.inline && (
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
            إضافة مقدم خدمة — كابتن
          </Text>
          {props.onBack && <Button label="رجوع" tone="ghost" onPress={props.onBack} />}
        </Box>
      )}
      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
        مقدم خدمة مستقل — يتقاضى رسوم التوصيل عن كل طلب. رقم الهاتف يُسجَّل في خدمة الهوية ولا
        يُخزَّن في Workforce.
      </Text>

      <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>البيانات الأساسية</Text>
      <TextField label="الاسم الكامل *" value={fullNameAr} onChangeText={setFullNameAr} placeholder="أحمد محمد" disabled={Boolean(createdCaptain)} />
      <TextField label="رقم الهاتف *" value={phone} onChangeText={setPhone} placeholder="مثال: 777123456" disabled={Boolean(createdCaptain)} />

      <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>التشغيل والنطاق</Text>
      <ZonePicker
        value={zoneId}
        disabled={Boolean(createdCaptain)}
        onChange={(zone) => setZoneId(zone?.id ?? "")}
      />

      <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>المركبة</Text>
      <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
        {VEHICLE_TYPES.map((option) => (
          <Button
            key={option.value}
            label={option.label}
            tone={vehicleType === option.value ? "primary" : "ghost"}
            disabled={Boolean(createdCaptain)}
            onPress={() => setVehicleType(option.value === vehicleType ? "" : option.value)}
          />
        ))}
      </Box>
      <TextField
        label="رقم أو لوحة المركبة *"
        value={vehicleIdentifier}
        onChangeText={setVehicleIdentifier}
        placeholder="مثال: صنعاء 12345"
        disabled={Boolean(createdCaptain)}
      />
      <TextField
        label="تاريخ انتهاء الرخصة"
        value={licenseExpiresAt}
        onChangeText={setLicenseExpiresAt}
        placeholder="YYYY-MM-DD"
        disabled={Boolean(createdCaptain)}
      />
      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
        حالة الرخصة الأولية دائمًا «بانتظار المراجعة». إصدار كود الدخول لا يثبت صلاحية الرخصة ولا
        يتجاوز مراجعة الوثائق.
      </Text>

      <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>الإشراف</Text>
      <SupervisorPicker kind="captain" selected={supervisor} onSelect={setSupervisor} disabled={Boolean(createdCaptain)} />

      <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>تفعيل حساب الدخول</Text>
      <Box style={{ flexDirection: "row-reverse", gap: spacing[2], alignItems: "center" }}>
        <Button
          label={autoActivate ? "إصدار كود دخول بعد الإنشاء ✓" : "إنشاء بدون كود دخول"}
          tone={autoActivate ? "primary" : "ghost"}
          disabled={Boolean(createdCaptain)}
          onPress={() => setAutoActivate((value) => !value)}
        />
      </Box>

      {state.kind === "error" && (
        <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{state.message}</Text>
      )}

      {createdCaptain ? (
        <Box style={{ gap: spacing[3], marginTop: spacing[3], padding: spacing[3], backgroundColor: alpha(colorRoles.success, 0.08), border: `1px solid ${alpha(colorRoles.success, 0.3)}`, borderRadius: 8 }}>
          <Text role="bodyStrong" tone="success" style={{ textAlign: "right" }}>
            تم إنشاء الكابتن وتأكيده من Workforce، والرخصة ما تزال بانتظار المراجعة.
          </Text>

          {issuedCode ? (
            <Box style={{ gap: spacing[2] }}>
              <Text role="bodySm" style={{ textAlign: "right" }}>كود التفعيل الصادر من خدمة الهوية:</Text>
              <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", backgroundColor: colorRoles.surfaceBase, padding: spacing[2], borderRadius: 4, border: `1px solid ${colorRoles.borderSubtle}` }}>
                <Text role="titleMd" style={{ color: colorRoles.success, letterSpacing: 2, fontWeight: "bold" }}>{issuedCode}</Text>
                <Button
                  label={copied ? "تم النسخ ✓" : "نسخ الكود"}
                  tone="ghost"
                  onPress={() => {
                    if (typeof navigator !== "undefined") {
                      void navigator.clipboard.writeText(issuedCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                />
              </Box>
            </Box>
          ) : activationError ? (
            <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>
              تم إنشاء الكابتن، لكن تعذر إصدار كود الدخول: {activationError}
            </Text>
          ) : (
            <Text role="bodySm" tone="warning" style={{ textAlign: "right" }}>
              تم الإنشاء بدون تفعيل حساب الدخول. يمكن إصدار الكود من ملف الكابتن.
            </Text>
          )}

          <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
            <Button
              label="فتح ملف الكابتن"
              tone="primary"
              onPress={() => props.onCreated(createdCaptain)}
            />
            <Button
              label="إضافة كابتن جديد"
              tone="secondary"
              onPress={resetForm}
            />
          </Box>
        </Box>
      ) : (
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], marginTop: spacing[2] }}>
          <Button
            label="إنشاء مقدم الخدمة"
            tone="primary"
            disabled={!canSubmit}
            loading={state.kind === "submitting"}
            onPress={() => void handleSubmit()}
          />
        </Box>
      )}
    </Card>
  );

  if (props.inline) return content;

  return <ScrollScreen>{content}</ScrollScreen>;
}

export default CaptainCreateView;
