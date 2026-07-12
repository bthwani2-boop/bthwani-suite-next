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
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  issueFieldAgentActivationCode,
  useFieldAgentListController,
  useWorkforceReferenceData,
  workforceErrorMessage,
} from "../../shared/workforce";
import type { ActivationCodeResult, FieldAgent } from "../../shared/workforce";

type IssuedRecord = ActivationCodeResult & {
  readonly agentName: string;
  readonly createdAt: string;
};

// Activation is issued for a selected, registered provider — never for a
// hand-typed phone. The backend resolves the phone sovereignly from Identity
// by actor id, so a typo or an unregistered phone can no longer receive a
// code. Providers are created in the HR section first.
export function FieldActivationScreen() {
  const { state, query, setQuery, reload } = useFieldAgentListController("pending_activation");
  const reference = useWorkforceReferenceData();
  const [selected, setSelected] = useState<FieldAgent | null>(null);
  const [generated, setGenerated] = useState<IssuedRecord | null>(null);
  const [history, setHistory] = useState<IssuedRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleIssue = async () => {
    if (!selected) return;
    setError(null);
    setLoading(true);
    try {
      const issued = await issueFieldAgentActivationCode(selected.actorId, selected.version);
      const record: IssuedRecord = {
        ...issued,
        agentName: selected.fullNameAr,
        createdAt: new Date().toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
      setGenerated(record);
      setHistory((prev) => [record, ...prev]);
      await reload();
      setSelected(null);
    } catch (err) {
      setError(workforceErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollScreen>
      <Header
        title="تفعيل حسابات التطبيق الميداني"
        subtitle="اختر مقدم الخدمة الجاهز للتفعيل ثم أصدر كوده — إضافة مقدمي الخدمة تتم من قسم الموارد البشرية."
      />

      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
          جاهزون للتفعيل
        </Text>

        <TextField
          label="بحث بالاسم أو رقم المزود"
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            if (error) setError(null);
          }}
          placeholder="مثال: WF-102 أو أحمد"
        />

        {state.kind === "loading" && (
          <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>جارٍ التحميل…</Text>
        )}
        {state.kind === "error" && (
          <Box style={{ gap: spacing[2] }}>
            <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{state.message}</Text>
            <Box style={{ flexDirection: "row-reverse" }}>
              <Button label="إعادة المحاولة" tone="secondary" onPress={() => void reload()} />
            </Box>
          </Box>
        )}
        {state.kind === "ready" && state.fieldAgents.length === 0 && (
          <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>
            لا يوجد مقدمو خدمة جاهزون للتفعيل — أنشئ الملف من قسم الموارد البشرية أولًا.
          </Text>
        )}
        {state.kind === "ready" &&
          state.fieldAgents.map((agent) => (
            <Box
              key={agent.actorId}
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: spacing[2],
                borderBottomWidth: borders.hairline,
                borderBottomColor: colorRoles.borderSubtle,
              }}
            >
              <Box style={{ alignItems: "flex-end" }}>
                <Text role="bodyStrong">{agent.fullNameAr}</Text>
                <Text role="caption" tone="muted">
                  {agent.providerCode} · {reference.cityLabel(agent.fieldProfile?.cityCode)} ·{" "}
                  {ENGAGEMENT_STATUS_LABEL_AR[agent.engagementStatus]}
                </Text>
              </Box>
              <Button
                label={selected?.actorId === agent.actorId ? "محدد ✓" : "اختيار"}
                tone={selected?.actorId === agent.actorId ? "primary" : "secondary"}
                onPress={() => setSelected(agent)}
              />
            </Box>
          ))}

        {error && (
          <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>
            {error}
          </Text>
        )}

        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], marginTop: spacing[2] }}>
          <Button
            label={selected ? `إصدار كود لـ ${selected.fullNameAr}` : "إصدار كود التفعيل"}
            tone="primary"
            disabled={!selected || loading}
            loading={loading}
            onPress={() => void handleIssue()}
          />
          {selected && <Button label="إلغاء التحديد" tone="ghost" onPress={() => setSelected(null)} />}
        </Box>
      </Card>

      {generated && (
        <Card style={{ padding: spacing[4], gap: spacing[3], backgroundColor: statusScale.infoSoft, borderColor: statusScale.info, borderWidth: 1 }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold", color: statusScale.infoStrong }}>
            ✓ تم توليد كود التفعيل بنجاح
          </Text>
          <Box style={{ gap: spacing[1], alignItems: "flex-end" }}>
            <Text role="body" tone="secondary">
              شارك هذا الكود مع {generated.agentName} المرتبط بالرقم:
            </Text>
            <Text role="titleMd" style={{ fontWeight: "bold", color: statusScale.infoStrong }}>
              {generated.maskedPhone}
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
              {generated.code}
            </Text>
          </Box>

          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
            يدخل مقدم الخدمة هذا الكود ورقم هاتفه في شاشة تسجيل دخول التطبيق الميداني لتفعيل حسابه فوراً.
            تنتهي صلاحية الكود خلال عشر دقائق ولا يظهر مرة أخرى بعد مغادرة هذه الاستجابة.
          </Text>
        </Card>
      )}

      {history.length > 0 && (
        <Card style={{ padding: spacing[4], gap: spacing[3] }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
            الأكواد النشطة في هذه الجلسة
          </Text>
          <Box style={{ gap: spacing[2] }}>
            {history.map((item, idx) => (
              <Box
                key={item.activationId}
                style={{
                  flexDirection: "row-reverse",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: spacing[2],
                  borderBottomWidth: idx < history.length - 1 ? borders.hairline : 0,
                  borderBottomColor: colorRoles.borderSubtle,
                }}
              >
                <Box style={{ alignItems: "flex-end" }}>
                  <Text role="bodyStrong">{item.agentName}</Text>
                  <Text role="caption" tone="muted">
                    {item.maskedPhone} · تم التوليد: {item.createdAt}
                  </Text>
                </Box>
                <Box style={{ alignItems: "flex-end" }}>
                  <Text role="caption" tone="muted">ينتهي</Text>
                  <Text role="body" style={{ color: colorRoles.info }}>
                    {new Date(item.expiresAt).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}
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
