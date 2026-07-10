import React, { useState } from "react";
import {
  Box,
  borders,
  Button,
  Card,
  Header,
  ScrollScreen,
  Text,
  TextField,
  spacing,
  radius,
  colorRoles,
  statusScale,
} from "@bthwani/ui-kit";

type ActiveCode = {
  phone: string;
  code: string;
  createdAt: string;
};

export function FieldActivationScreen() {
  const [phone, setPhone] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [activeCodes, setActiveCodes] = useState<ActiveCode[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isValidPhone = phone.trim().length >= 9;

  const handleGenerate = () => {
    if (!isValidPhone) {
      setError("يرجى إدخال رقم هاتف صحيح (9 أرقام على الأقل)");
      return;
    }
    setError(null);
    const digits = Math.floor(1000 + Math.random() * 9000).toString();
    const code = `CP-FIELD-${digits}`;
    setGeneratedCode(code);
    
    const newCodeRecord: ActiveCode = {
      phone: phone.trim(),
      code,
      createdAt: new Date().toLocaleTimeString("ar-YE", { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setActiveCodes((prev) => [newCodeRecord, ...prev]);
  };

  const handleReset = () => {
    setPhone("");
    setGeneratedCode(null);
  };

  return (
    <ScrollScreen>
      <Header
        title="تفعيل حسابات التطبيق الميداني"
        subtitle="أدخل رقم هاتف الموظف الميداني لتوليد كود التفعيل الفوري لتطبيقه."
      />

      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
          طلب كود تفعيل جديد
        </Text>
        
        <TextField
          label="رقم هاتف الموظف الميداني"
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            if (error) setError(null);
          }}
          placeholder="مثال: 777123456"
        />

        {error && (
          <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>
            {error}
          </Text>
        )}

        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], marginTop: spacing[2] }}>
          <Button
            label="توليد كود التفعيل"
            tone="primary"
            disabled={!isValidPhone}
            onPress={handleGenerate}
          />
          {(phone || generatedCode) && (
            <Button
              label="مسح الحقول"
              tone="ghost"
              onPress={handleReset}
            />
          )}
        </Box>
      </Card>

      {generatedCode && (
        <Card style={{ padding: spacing[4], gap: spacing[3], backgroundColor: statusScale.infoSoft, borderColor: statusScale.info, borderWidth: 1 }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold", color: statusScale.infoStrong }}>
            ✓ تم توليد كود التفعيل بنجاح
          </Text>
          <Box style={{ gap: spacing[1], alignItems: "flex-end" }}>
            <Text role="body" tone="secondary">
              شارك هذا الكود مع الموظف الميداني المرتبط بالرقم:
            </Text>
            <Text role="titleMd" style={{ fontWeight: "bold", color: statusScale.infoStrong }}>
              {phone}
            </Text>
          </Box>

          <Box
            style={{
              padding: spacing[4],
              backgroundColor: colorRoles.surfaceBase,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colorRoles.borderStrong,
              alignItems: "center",
              justifyContent: "center",
              marginVertical: spacing[2],
            }}
          >
            <Text
              role="titleLg"
              style={{
                fontFamily: "monospace",
                letterSpacing: 2,
                fontWeight: "bold",
                color: colorRoles.textPrimary,
              }}
            >
              {generatedCode}
            </Text>
          </Box>

          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
            يدخل الموظف هذا الكود ورقم هاتفه في شاشة تسجيل دخول التطبيق الميداني لتفعيل حسابه فوراً.
          </Text>
        </Card>
      )}

      {activeCodes.length > 0 && (
        <Card style={{ padding: spacing[4], gap: spacing[3] }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
            الأكواد النشطة في هذه الجلسة
          </Text>
          <Box style={{ gap: spacing[2] }}>
            {activeCodes.map((item, idx) => (
              <Box
                key={idx}
                style={{
                  flexDirection: "row-reverse",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: spacing[2],
                  borderBottomWidth: idx < activeCodes.length - 1 ? borders.hairline : 0,
                  borderBottomColor: colorRoles.borderSubtle,
                }}
              >
                <Box style={{ alignItems: "flex-end" }}>
                  <Text role="bodyStrong">{item.phone}</Text>
                  <Text role="caption" tone="muted">تم التوليد: {item.createdAt}</Text>
                </Box>
                <Text
                  role="body"
                  style={{
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    color: colorRoles.info,
                    backgroundColor: statusScale.infoSoft,
                    paddingHorizontal: spacing[2],
                    paddingVertical: spacing[1],
                    borderRadius: radius.sm,
                  }}
                >
                  {item.code}
                </Text>
              </Box>
            ))}
          </Box>
        </Card>
      )}
    </ScrollScreen>
  );
}
