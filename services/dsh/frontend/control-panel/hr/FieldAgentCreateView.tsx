"use client";

import React, { useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing } from "@bthwani/ui-kit";
import { useFieldAgentCreateController, useWorkforceReferenceData } from "../../shared/workforce";
import type { FieldAgent, SupervisorCandidate } from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";
import { ZonePicker } from "./ZonePicker";

export function FieldAgentCreateView(props: { readonly onBack: () => void; readonly onCreated: (agent: FieldAgent) => void }) {
  const { state, submit } = useFieldAgentCreateController();
  const reference = useWorkforceReferenceData();
  const [fullNameAr, setFullNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [zoneCityCode, setZoneCityCode] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);

  const canSubmit = fullNameAr.trim().length > 0 && phone.trim().length >= 9 && zoneId !== "" && state.kind !== "submitting";

  const handleSubmit = async () => {
    const agent = await submit({
      fullNameAr: fullNameAr.trim(),
      phoneE164: phone.trim(),
      engagementType: "independent_contractor",
      cityCode: zoneCityCode || undefined,
      serviceZoneId: zoneId || undefined,
      shiftCode: shiftCode || undefined,
      supervisorActorId: supervisor?.actorId,
    });
    if (agent) props.onCreated(agent);
  };

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
            إضافة مقدم خدمة — ميداني
          </Text>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          مقدم خدمة مستقل — يتقاضى عمولة عن كل انضمام متجر. رقم الهاتف يُسجَّل في خدمة الهوية ولا
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

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>الوردية</Text>
        {reference.error && (
          <Text role="caption" tone="danger" style={{ textAlign: "right" }}>{reference.error}</Text>
        )}
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {reference.shifts.map((shift) => (
            <Button
              key={shift.code}
              label={shift.nameAr}
              tone={shiftCode === shift.code ? "primary" : "ghost"}
              onPress={() => setShiftCode(shift.code === shiftCode ? "" : shift.code)}
            />
          ))}
        </Box>

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>الإشراف</Text>
        <SupervisorPicker kind="field" selected={supervisor} onSelect={setSupervisor} />

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

export default FieldAgentCreateView;
