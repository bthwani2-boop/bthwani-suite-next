"use client";

import React, { useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing, colorRoles, alpha } from "@bthwani/ui-kit";
import { useFieldAgentCreateAndActivationController } from "../../shared/workforce";
import type { FieldAgent, SupervisorCandidate } from "../../shared/workforce";
import { SupervisorPicker } from "./SupervisorPicker";
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
  const [supervisor, setSupervisor] = useState<SupervisorCandidate | null>(null);
  const [autoActivate, setAutoActivate] = useState(true);
  const [copied, setCopied] = useState(false);

  const createdAgent = state.kind === "created" ? state.provider : null;
  const issuedCode = state.kind === "created" ? state.activation?.code ?? null : null;
  const activationError = state.kind === "created" ? state.activationError : null;

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
      shiftCode: "full_day",
      supervisorActorId: supervisor?.actorId,
    }, { issueActivationCode: autoActivate });
  };

  const resetForm = () => {
    reset();
    setFullNameAr("");
    setPhone("");
    setZoneId("");
    setSupervisor(null);
    setAutoActivate(true);
    setCopied(false);
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

      <TextField label="الاسم الكامل *" value={fullNameAr} onChangeText={setFullNameAr} placeholder="أحمد محمد" disabled={Boolean(createdAgent)} />
      <TextField label="رقم الهاتف *" value={phone} onChangeText={setPhone} placeholder="مثال: 777123456" disabled={Boolean(createdAgent)} />

      <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>التشغيل والنطاق</Text>
      <ZonePicker
        value={zoneId}
        disabled={Boolean(createdAgent)}
        onChange={(zone) => setZoneId(zone?.id ?? "")}
      />

      <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>الإشراف</Text>
      <SupervisorPicker kind="field" selected={supervisor} onSelect={setSupervisor} disabled={Boolean(createdAgent)} />

      <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>تفعيل حساب الدخول</Text>
      <Box style={{ flexDirection: "row-reverse", gap: spacing[2], alignItems: "center" }}>
        <Button
          label={autoActivate ? "إصدار كود دخول بعد الإنشاء ✓" : "إنشاء بدون كود دخول"}
          tone={autoActivate ? "primary" : "ghost"}
          disabled={Boolean(createdAgent)}
          onPress={() => setAutoActivate((value) => !value)}
        />
      </Box>

      {state.kind === "error" && (
        <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{state.message}</Text>
      )}

      {createdAgent ? (
        <Box style={{ gap: spacing[3], marginTop: spacing[3], padding: spacing[3], backgroundColor: alpha(colorRoles.success, 0.08), border: `1px solid ${alpha(colorRoles.success, 0.3)}`, borderRadius: 8 }}>
          <Text role="bodyStrong" tone="success" style={{ textAlign: "right" }}>
            تم إنشاء مقدم الخدمة وتأكيده من Workforce.
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
              تم إنشاء مقدم الخدمة، لكن تعذر إصدار كود الدخول: {activationError}
            </Text>
          ) : (
            <Text role="bodySm" tone="warning" style={{ textAlign: "right" }}>
              تم الإنشاء بدون تفعيل حساب الدخول. يمكن إصدار الكود من ملف مقدم الخدمة.
            </Text>
          )}

          <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
            <Button
              label="فتح ملف مقدم الخدمة"
              tone="primary"
              onPress={() => props.onCreated(createdAgent)}
            />
            <Button
              label="إضافة مقدم خدمة جديد"
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

export default FieldAgentCreateView;
