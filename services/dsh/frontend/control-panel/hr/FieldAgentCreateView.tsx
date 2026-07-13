"use client";

import React, { useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing } from "@bthwani/ui-kit";
import { useFieldAgentCreateController, useWorkforceReferenceData } from "../../shared/workforce";
import type { FieldAgent, SupervisorCandidate } from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";
import { ZonePicker } from "./ZonePicker";

import { issueFieldAgentActivationCode } from "../../shared/workforce";

export function FieldAgentCreateView(props: { readonly onBack: () => void; readonly onCreated: (agent: FieldAgent) => void }) {
  const { state, submit } = useFieldAgentCreateController();
  const reference = useWorkforceReferenceData();
  const [fullNameAr, setFullNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [createdAgent, setCreatedAgent] = useState<FieldAgent | null>(null);
  const [autoActivate, setAutoActivate] = useState(true);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit =
    fullNameAr.trim().length > 0 &&
    phone.trim().length >= 9 &&
    zoneId !== "" &&
    shiftCode !== "" &&
    state.kind !== "submitting" &&
    !createdAgent;

  const handleSubmit = async () => {
    const agent = await submit({
      fullNameAr: fullNameAr.trim(),
      phoneE164: phone.trim(),
      engagementType: "independent_contractor",
      serviceZoneId: zoneId,
      shiftCode: shiftCode,
      supervisorActorId: supervisor?.actorId ?? undefined,
    });
    if (agent) {
      setCreatedAgent(agent);
      if (autoActivate) {
        try {
          const res = await issueFieldAgentActivationCode(agent.actorId, agent.version);
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
            إضافة مقدم خدمة — ميداني
          </Text>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          مقدم خدمة مستقل — يتقاضى عمولة عن كل انضمام متجر. رقم الهاتف يُسجَّل في خدمة الهوية ولا
          يُخزَّن في Workforce.
        </Text>

        <TextField label="الاسم الكامل *" value={fullNameAr} onChangeText={setFullNameAr} placeholder="أحمد محمد" disabled={!!createdAgent} />
        <TextField label="رقم الهاتف *" value={phone} onChangeText={setPhone} placeholder="مثال: 777123456" disabled={!!createdAgent} />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>التشغيل والنطاق</Text>
        <ZonePicker
          value={zoneId}
          disabled={!!createdAgent}
          onChange={(zone) => {
            setZoneId(zone?.id ?? "");
          }}
        />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>الوردية *</Text>
        {reference.error && (
          <Text role="caption" tone="danger" style={{ textAlign: "right" }}>{reference.error}</Text>
        )}
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {reference.shifts.map((shift) => (
            <Button
              key={shift.code}
              label={shift.nameAr}
              tone={shiftCode === shift.code ? "primary" : "ghost"}
              disabled={!!createdAgent}
              onPress={() => setShiftCode(shift.code === shiftCode ? "" : shift.code)}
            />
          ))}
        </Box>

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>الإشراف</Text>
        <SupervisorPicker kind="field" selected={supervisor} onSelect={setSupervisor} disabled={!!createdAgent} />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>التفعيل *</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], alignItems: "center" }}>
          <Button
            label={autoActivate ? "تفعيل الحساب فورًا وإصدار كود الدخول ✓" : "إنشاء بدون تفعيل"}
            tone={autoActivate ? "primary" : "ghost"}
            disabled={!!createdAgent}
            onPress={() => setAutoActivate(!autoActivate)}
          />
        </Box>

        {state.kind === "error" && (
          <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{state.message}</Text>
        )}

        {createdAgent ? (
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
                label="إضافة مقدم خدمة جديد"
                tone="secondary"
                onPress={() => {
                  setCreatedAgent(null);
                  setIssuedCode(null);
                  setFullNameAr("");
                  setPhone("");
                  setZoneId("");
                  setShiftCode("");
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

export default FieldAgentCreateView;
