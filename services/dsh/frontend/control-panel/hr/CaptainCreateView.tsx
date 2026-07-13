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

export function CaptainCreateView(props: { readonly onBack: () => void; readonly onCreated: (captain: Captain) => void }) {
  const { state, submit } = useCaptainCreateController();
  const [fullNameAr, setFullNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [zoneCityCode, setZoneCityCode] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleIdentifier, setVehicleIdentifier] = useState("");
  const [licenseExpiresAt, setLicenseExpiresAt] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);

  const canSubmit =
    fullNameAr.trim().length > 0 &&
    phone.trim().length >= 9 &&
    zoneId !== "" &&
    vehicleType !== "" &&
    vehicleIdentifier.trim().length > 0 &&
    state.kind !== "submitting";

  const handleSubmit = async () => {
    const licenseStatus: LicenseStatus = "pending_review";
    const captain = await submit({
      fullNameAr: fullNameAr.trim(),
      phoneE164: phone.trim(),
      engagementType: "independent_contractor",
      vehicleType,
      vehicleIdentifier: vehicleIdentifier.trim(),
      licenseStatus,
      licenseExpiresAt: licenseExpiresAt.trim() || undefined,
      operatingCityCode: zoneCityCode || undefined,
      serviceZoneId: zoneId || undefined,
      supervisorActorId: supervisor?.actorId,
    });
    if (captain) props.onCreated(captain);
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
        <TextField label="الاسم الكامل *" value={fullNameAr} onChangeText={setFullNameAr} placeholder="أحمد محمد" />
        <TextField label="رقم الهاتف *" value={phone} onChangeText={setPhone} placeholder="مثال: 777123456" />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>التشغيل والنطاق</Text>
        <ZonePicker
          value={zoneId}
          onChange={(zone) => {
            setZoneId(zone?.id ?? "");
            setZoneCityCode(zone?.cityCode ?? "");
          }}
        />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>المركبة</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {VEHICLE_TYPES.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              tone={vehicleType === option.value ? "primary" : "ghost"}
              onPress={() => setVehicleType(option.value === vehicleType ? "" : option.value)}
            />
          ))}
        </Box>
        <TextField
          label="رقم أو لوحة المركبة *"
          value={vehicleIdentifier}
          onChangeText={setVehicleIdentifier}
          placeholder="مثال: صنعاء 12345"
        />
        <TextField
          label="تاريخ انتهاء الرخصة"
          value={licenseExpiresAt}
          onChangeText={setLicenseExpiresAt}
          placeholder="YYYY-MM-DD"
        />
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          حالة الرخصة الأولية: بانتظار المراجعة. يمكن رفع وثائق المركبة والرخصة من ملف مقدم
          الخدمة بعد إنشائه.
        </Text>

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>الإشراف</Text>
        <SupervisorPicker kind="captain" selected={supervisor} onSelect={setSupervisor} />

        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          سيتم توليد رقم مقدم الخدمة ومعرف الحساب وتاريخ الارتباط تلقائيًا، وستكون الحالة الأولية
          "بانتظار التفعيل".
        </Text>

        {state.kind === "error" && (
          <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{state.message}</Text>
        )}

        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], marginTop: spacing[2] }}>
          <Button
            label="إنشاء مقدم الخدمة"
            tone="primary"
            disabled={!canSubmit}
            loading={state.kind === "submitting"}
            onPress={() => void handleSubmit()}
          />
        </Box>
      </Card>
    </ScrollScreen>
  );
}

export default CaptainCreateView;
