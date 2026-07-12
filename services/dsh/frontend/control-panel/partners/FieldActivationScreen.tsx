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
import { useFieldActivationIssuer } from "../../shared/auth/use-field-activation-controller";

type ActiveCode = {
  activationId: string;
  maskedPhone: string;
  expiresAt: string;
  createdAt: string;
};

export function FieldActivationScreen() {
  const issueFieldActivationCode = useFieldActivationIssuer();
  const [phone, setPhone] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [activeCodes, setActiveCodes] = useState<ActiveCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValidPhone = phone.trim().length >= 9;

  const handleGenerate = async () => {
    if (!isValidPhone) {
      setError("يرجى إدخال رقم هاتف صحيح (9 أرقام على الأقل)");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const issued = await issueFieldActivationCode(phone.trim());
      setGeneratedCode(issued.code);
      const newCodeRecord: ActiveCode = {
        activationId: issued.activationId,
        maskedPhone: issued.maskedPhone,
        expiresAt: issued.expiresAt,
        createdAt: new Date().toLocaleTimeString("ar-YE", { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      setActiveCodes((prev) => [newCodeRecord, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الاتصال بخدمة الهوية");
    } finally {
      setLoading(false);
    }
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
            disabled={!isValidPhone || loading}
            loading={loading}
            onPress={() => void handleGenerate()}
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
              {activeCodes[0]?.maskedPhone ?? phone}
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
            تنتهي صلاحية الكود خلال عشر دقائق ولا يظهر مرة أخرى بعد مغادرة هذه الاستجابة.
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
                key={item.activationId}
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
                  <Text role="bodyStrong">{item.maskedPhone}</Text>
                  <Text role="caption" tone="muted">تم التوليد: {item.createdAt}</Text>
                </Box>
                <Box style={{ alignItems: "flex-end" }}>
                  <Text role="caption" tone="muted">ينتهي</Text>
                  <Text role="body" style={{ color: colorRoles.info }}>
                    {new Date(item.expiresAt).toLocaleTimeString("ar-YE", { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Box>
              </Box>
            ))}
          </Box>
        </Card>
      )}
    </ScrollScreen>
  );
}
