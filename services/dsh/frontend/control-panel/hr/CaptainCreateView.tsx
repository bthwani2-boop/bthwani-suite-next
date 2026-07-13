"use client";

import React, { useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing } from "@bthwani/ui-kit";
import { useCaptainCreateController } from "../../shared/workforce";
import type { Captain, LicenseStatus, SupervisorCandidate } from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";
import { ZonePicker } from "./ZonePicker";

const VEHICLE_TYPES: Array<{ label: string; value: string }> = [
  { label: "دراجة نارية", value: "motorcycle" },
  { label: "سيارة", value: "car" },
  { label: "أخرى", value: "other" },
];

import { issueCaptainActivationCode } from "../../shared/workforce";

export function CaptainCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated: (captain: Captain) => void;
  readonly inline?: boolean;
}) {
  const { state, submit } = useCaptainCreateController();
  const [fullNameAr, setFullNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleIdentifier, setVehicleIdentifier] = useState("");
  const [licenseExpiresAt, setLicenseExpiresAt] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [createdCaptain, setCreatedCaptain] = useState<Captain | null>(null);
  const [autoActivate, setAutoActivate] = useState(true);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit =
    fullNameAr.trim().length > 0 &&
    phone.trim().length >= 9 &&
    zoneId !== "" &&
    vehicleType !== "" &&
    vehicleIdentifier.trim().length > 0 &&
    state.kind !== "submitting" &&
    !createdCaptain;

  const handleSubmit = async () => {
    const licenseStatus: LicenseStatus = autoActivate ? "valid" : "pending_review";
    const captain = await submit({
      fullNameAr: fullNameAr.trim(),
      phoneE164: phone.trim(),
      engagementType: "independent_contractor",
      vehicleType,
      vehicleIdentifier: vehicleIdentifier.trim(),
      licenseStatus,
      licenseExpiresAt: licenseExpiresAt.trim() || undefined,
      serviceZoneId: zoneId,
      supervisorActorId: supervisor?.actorId ?? undefined,
    });
    if (captain) {
      setCreatedCaptain(captain);
      if (autoActivate) {
        try {
          const res = await issueCaptainActivationCode(captain.actorId, captain.version);
          setIssuedCode(res.code);
        } catch (err) {
          console.error("Auto activation failed", err);
        }
      }
    }
  };

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
            إضافة مقدم خدمة — كابتن
          </Text>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          مقدم خدمة مستقل — يتقاضى رسوم التوصيل عن كل طلب. رقم الهاتف يُسجَّل في خدمة الهوية ولا
          يُخزَّن في Workforce.
        </Text>

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>البيانات الأساسية</Text>
        <TextField label="الاسم الكامل *" value={fullNameAr} onChangeText={setFullNameAr} placeholder="أحمد محمد" disabled={!!createdCaptain} />
        <TextField label="رقم الهاتف *" value={phone} onChangeText={setPhone} placeholder="مثال: 777123456" disabled={!!createdCaptain} />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>التشغيل والنطاق</Text>
        <ZonePicker
          value={zoneId}
          disabled={!!createdCaptain}
          onChange={(zone) => {
            setZoneId(zone?.id ?? "");
          }}
        />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>المركبة</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {VEHICLE_TYPES.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              tone={vehicleType === option.value ? "primary" : "ghost"}
              disabled={!!createdCaptain}
              onPress={() => setVehicleType(option.value === vehicleType ? "" : option.value)}
            />
          ))}
        </Box>
        <TextField
          label="رقم أو لوحة المركبة *"
          value={vehicleIdentifier}
          onChangeText={setVehicleIdentifier}
          placeholder="مثال: صنعاء 12345"
          disabled={!!createdCaptain}
        />
        <TextField
          label="تاريخ انتهاء الرخصة"
          value={licenseExpiresAt}
          onChangeText={setLicenseExpiresAt}
          placeholder="YYYY-MM-DD"
          disabled={!!createdCaptain}
        />
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          حالة الرخصة الأولية: بانتظار المراجعة. يمكن رفع وثائق المركبة والرخصة من ملف مقدم
          الخدمة بعد إنشائه.
        </Text>

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>الإشراف</Text>
        <SupervisorPicker kind="captain" selected={supervisor} onSelect={setSupervisor} disabled={!!createdCaptain} />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>التفعيل *</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], alignItems: "center" }}>
          <Button
            label={autoActivate ? "تفعيل الحساب فورًا وإصدار كود الدخول ✓" : "إنشاء بدون تفعيل"}
            tone={autoActivate ? "primary" : "ghost"}
            disabled={!!createdCaptain}
            onPress={() => setAutoActivate(!autoActivate)}
          />
        </Box>

        {state.kind === "error" && (
          <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{state.message}</Text>
        )}

        {createdCaptain ? (
          <Box style={{ gap: spacing[3], marginTop: spacing[3], padding: spacing[3], backgroundColor: "#f6fdf9", border: "1px solid #c2f0d5", borderRadius: 8 }}>
            <Text role="bodyStrong" tone="success" style={{ textAlign: "right" }}>
              تم إنشاء حساب مقدم الخدمة بنجاح!
            </Text>
            {issuedCode ? (
              <Box style={{ gap: spacing[2] }}>
                <Text role="bodySm" style={{ textAlign: "right" }}>كود التفعيل لتطبيق الهواتف:</Text>
                <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", padding: spacing[2], borderRadius: 4, border: "1px solid #d3d3d3" }}>
                  <Text role="titleMd" style={{ color: "#2e7d32", letterSpacing: 2, fontWeight: "bold" }}>{issuedCode}</Text>
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
            ) : (
              <Text role="bodySm" tone="warning" style={{ textAlign: "right" }}>
                لم يتم تفعيل الحساب بعد. يمكنك توليد كود التفعيل لاحقًا من شاشة إدارة التفعيل.
              </Text>
            )}
            <Box style={{ flexDirection: "row-reverse", marginTop: spacing[2] }}>
              <Button
                label="إضافة كابتن جديد"
                tone="secondary"
                onPress={() => {
                  setCreatedCaptain(null);
                  setIssuedCode(null);
                  setFullNameAr("");
                  setPhone("");
                  setZoneId("");
                  setVehicleType("");
                  setVehicleIdentifier("");
                  setLicenseExpiresAt("");
                  setSupervisor(null);
                  setAutoActivate(true);
                }}
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
    </ScrollScreen>
  );
}

export default CaptainCreateView;
