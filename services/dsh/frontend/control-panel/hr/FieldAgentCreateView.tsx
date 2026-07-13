"use client";

import React, { useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing, colorRoles, alpha } from "@bthwani/ui-kit";
import { useFieldAgentCreateController } from "../../shared/workforce";
import type { FieldAgent, SupervisorCandidate } from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";
import { ZonePicker } from "./ZonePicker";

import { issueFieldAgentActivationCode } from "../../shared/workforce";

export function FieldAgentCreateView(props: {
  readonly onBack?: () => void;
  readonly onCreated: (agent: FieldAgent) => void;
  readonly inline?: boolean;
}) {
  const { state, submit } = useFieldAgentCreateController();
  const [fullNameAr, setFullNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [createdAgent, setCreatedAgent] = useState<FieldAgent | null>(null);
  const [autoActivate, setAutoActivate] = useState(true);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit =
    fullNameAr.trim().length > 0 &&
    phone.trim().length >= 9 &&
    zoneId !== "" &&
    state.kind !== "submitting" &&
    !createdAgent;

  const handleSubmit = async () => {
    const agent = await submit({
      fullNameAr: fullNameAr.trim(),
      phoneE164: phone.trim(),
      engagementType: "independent_contractor",
      serviceZoneId: zoneId,
      shiftCode: "full_day",
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

  const content = (
    <Card style={{ padding: spacing[4], gap: spacing[3] }}>
      {!props.inline && (
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
            إضافة مقدم خدمة — ميداني
          </Text>
          {props.onBack && <Button label="رجوع" tone="ghost" onPress={props.onBack} />}
        </Box>
      )}
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
        <Box style={{ gap: spacing[3], marginTop: spacing[3], padding: spacing[3], backgroundColor: alpha(colorRoles.success, 0.08), border: `1px solid ${alpha(colorRoles.success, 0.3)}`, borderRadius: 8 }}>
          <Text role="bodyStrong" tone="success" style={{ textAlign: "right" }}>
            تم إنشاء حساب مقدم الخدمة بنجاح!
          </Text>
          {issuedCode ? (
            <Box style={{ gap: spacing[2] }}>
              <Text role="bodySm" style={{ textAlign: "right" }}>كود التفعيل لتطبيق الهواتف:</Text>
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
          ) : (
            <Text role="bodySm" tone="warning" style={{ textAlign: "right" }}>
              لم يتم تفعيل الحساب بعد. يمكنك توليد كود التفعيل لاحقًا من ملف مقدم الخدمة.
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
  );

  if (props.inline) {
    return content;
  }

  return (
    <ScrollScreen>
      {content}
    </ScrollScreen>
  );
}

export default FieldAgentCreateView;
