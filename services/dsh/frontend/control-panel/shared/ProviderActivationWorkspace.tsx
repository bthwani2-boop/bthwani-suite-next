import React, { useState } from "react";
import {
  Box,
  borders,
  Button,
  Card,
  Header,
  Text,
  TextField,
  spacing,
  radius,
  colorRoles,
  statusScale,
} from "@bthwani/ui-kit";
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  useProviderActivationController,
  useWorkforceReferenceData,
  useFieldAgentListController,
  useCaptainListController,
} from "../../shared/workforce";
import type { FieldAgent, ProviderKind, EngagementStatus } from "../../shared/workforce";

type ProviderActivationWorkspaceProps = {
  readonly providerKind: "field" | "captain";
  readonly initialActorId?: string;
  readonly entrySource: "hr" | "partners" | "operations";
  readonly onBack?: () => void;
};

const STATUS_TABS: Array<{ label: string; value: EngagementStatus | undefined }> = [
  { label: "بانتظار التفعيل", value: "pending_activation" },
  { label: "نشط", value: "active" },
  { label: "موقوف", value: "suspended" },
  { label: "الكل", value: undefined },
];

export function ProviderActivationWorkspace({
  providerKind,
  initialActorId,
  entrySource,
  onBack,
}: ProviderActivationWorkspaceProps) {
  const [selectedActorId, setSelectedActorId] = useState<string | undefined>(initialActorId);

  // Listing logic (only if not loaded for a single target from HR)
  const isHrDetail = entrySource === "hr";
  const listControllerField = useFieldAgentListController("pending_activation");
  const listControllerCaptain = useCaptainListController("pending_activation");

  const listController = providerKind === "captain" ? listControllerCaptain : listControllerField;
  const providersList = providerKind === "captain" 
    ? (listControllerCaptain.state.kind === "ready" ? listControllerCaptain.state.captains : [])
    : (listControllerField.state.kind === "ready" ? listControllerField.state.fieldAgents : []);

  const reference = useWorkforceReferenceData();

  if (isHrDetail && !selectedActorId) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <Text role="bodySm" tone="danger" align="center">معرف مقدم الخدمة غير محدد</Text>
      </Card>
    );
  }

  return (
    <Box style={{ gap: spacing[3] }}>
      {!isHrDetail && (
        <Card style={{ padding: spacing[4], gap: spacing[3] }}>
          <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
            {STATUS_TABS.map((tab) => (
              <Button
                key={tab.label}
                label={tab.label}
                tone={listController.status === tab.value ? "primary" : "ghost"}
                onPress={() => {
                  listController.setStatus(tab.value);
                  setSelectedActorId(undefined);
                }}
              />
            ))}
          </Box>

          <TextField
            label="بحث بالاسم أو رقم مقدم الخدمة"
            value={listController.query}
            onChangeText={(value) => {
              listController.setQuery(value);
            }}
            placeholder="مثال: FLD-000123 أو أحمد"
          />

          {listController.state.kind === "loading" && (
            <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>جارٍ التحميل…</Text>
          )}

          {listController.state.kind === "ready" && providersList.length === 0 && (
            <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>
              لا يوجد مقدمو خدمة مطابقون — أنشئ الملف من قسم الموارد البشرية أولًا.
            </Text>
          )}

          {listController.state.kind === "ready" &&
            providersList.map((provider) => (
              <Box
                key={provider.actorId}
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
                  <Text role="bodyStrong">{provider.fullNameAr}</Text>
                  <Text role="caption" tone="muted">
                    {provider.providerCode} ·{" "}
                    {providerKind === "captain"
                      ? reference.cityLabel(provider.captainProfile?.operatingCityCode)
                      : reference.cityLabel(provider.fieldProfile?.cityCode)}{" "}
                    · {ENGAGEMENT_STATUS_LABEL_AR[provider.engagementStatus]}
                  </Text>
                </Box>
                <Button
                  label={selectedActorId === provider.actorId ? "محدد ✓" : "اختيار"}
                  tone={selectedActorId === provider.actorId ? "primary" : "secondary"}
                  onPress={() => setSelectedActorId(provider.actorId)}
                />
              </Box>
            ))}
        </Card>
      )}

      {selectedActorId && (
        <ProviderActivationWorkspaceInner
          providerKind={providerKind}
          actorId={selectedActorId}
          entrySource={entrySource}
          onBack={isHrDetail ? undefined : () => setSelectedActorId(undefined)}
          onReloadList={() => listController.reload()}
        />
      )}
    </Box>
  );
}

type InnerProps = {
  readonly providerKind: "field" | "captain";
  readonly actorId: string;
  readonly entrySource: "hr" | "partners" | "operations";
  readonly onBack?: () => void;
  readonly onReloadList: () => void;
};

function ProviderActivationWorkspaceInner({
  providerKind,
  actorId,
  entrySource,
  onBack,
  onReloadList,
}: InnerProps) {
  const {
    loading,
    error,
    detail,
    issuedCode,
    actionBusy,
    actionError,
    issueCode,
    revokeCode,
    suspend,
    reactivate,
    reload,
  } = useProviderActivationController(providerKind, actorId);

  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "—";
    return new Date(timeStr).toLocaleTimeString("ar-YE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined") {
      void navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <Text role="bodySm" tone="muted" align="center">جارٍ تحميل بيانات التفعيل…</Text>
      </Card>
    );
  }

  if (error || !detail) {
    return (
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Text role="bodySm" tone="danger" align="center">
          {error || "حدث خطأ أثناء تحميل بيانات مقدم الخدمة"}
        </Text>
        {onBack && (
          <Box style={{ flexDirection: "row-reverse", justifyContent: "center" }}>
            <Button label="رجوع" tone="ghost" onPress={onBack} />
          </Box>
        )}
      </Card>
    );
  }

  // License status check (only for Captains)
  const isCaptain = providerKind === "captain";
  const licenseStatus = detail.captainProfile?.licenseStatus;
  const isLicenseValid = !isCaptain || licenseStatus === "valid";

  // License status warning message
  let licenseWarning: string | null = null;
  if (isCaptain && !isLicenseValid) {
    switch (licenseStatus) {
      case "pending_review":
        licenseWarning = "لا يمكن إصدار الكود: رخصة الكابتن ما زالت بانتظار المراجعة.";
        break;
      case "missing":
        licenseWarning = "لا يمكن إصدار الكود: رخصة الكابتن مفقودة.";
        break;
      case "rejected":
        licenseWarning = "لا يمكن إصدار الكود: تم رفض رخصة الكابتن.";
        break;
      case "expired":
        licenseWarning = "لا يمكن إصدار الكود: رخصة الكابتن منتهية الصلاحية.";
        break;
      default:
        licenseWarning = "لا يمكن إصدار الكود: حالة الرخصة غير صالحة.";
    }
  }

  const latest = detail.latestActivation;
  const activeCode = issuedCode;

  return (
    <Box style={{ gap: spacing[3] }}>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
            إدارة حالة الدخول وتفعيل التطبيق
          </Text>
          {onBack && <Button label="إلغاء التحديد" tone="ghost" onPress={onBack} />}
        </Box>

        {licenseWarning ? (
          <Box
            style={{
              padding: spacing[3],
              backgroundColor: statusScale.dangerSoft,
              borderColor: statusScale.danger,
              borderWidth: 1,
              borderRadius: radius.md,
              alignItems: "flex-end",
            }}
          >
            <Text role="bodySm" style={{ color: statusScale.dangerStrong, fontWeight: "bold" }}>
              {licenseWarning}
            </Text>
          </Box>
        ) : (
          <Box style={{ gap: spacing[2], borderBottomWidth: borders.hairline, borderBottomColor: colorRoles.borderSubtle, paddingBottom: spacing[3] }}>
            {/* Activation Row */}
            {!latest && !activeCode ? (
              <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Box style={{ flexDirection: "row-reverse", gap: spacing[4] }}>
                  <Text role="bodyStrong" tone="muted">كود التفعيل</Text>
                  <Text role="body" tone="muted">لم يصدر بعد</Text>
                </Box>
                <Button
                  label="إصدار كود"
                  tone="primary"
                  loading={actionBusy}
                  disabled={actionBusy}
                  onPress={() => void issueCode().then(onReloadList)}
                />
              </Box>
            ) : (
              <Box style={{ gap: spacing[3] }}>
                {activeCode ? (
                  // Active Code issued in this session
                  <Box style={{ gap: spacing[2] }}>
                    <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                      <Box style={{ flexDirection: "row-reverse", gap: spacing[4], alignItems: "center" }}>
                        <Text role="bodyStrong" tone="muted">كود التفعيل</Text>
                        <Text
                          role="titleSm"
                          style={{
                            fontFamily: "monospace",
                            letterSpacing: 1,
                            fontWeight: "bold",
                            color: colorRoles.textPrimary,
                          }}
                        >
                          {activeCode.code}
                        </Text>
                      </Box>
                      <Button
                        label={copied ? "نسخ ✓" : "نسخ الكود"}
                        tone="secondary"
                        onPress={() => handleCopy(activeCode.code)}
                      />
                    </Box>

                    <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                      <Text role="bodySm" tone="muted">الهاتف</Text>
                      <Text role="bodyStrong">{activeCode.maskedPhone}</Text>
                    </Box>

                    <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                      <Text role="bodySm" tone="muted">ينتهي</Text>
                      <Text role="bodyStrong">{formatTime(activeCode.expiresAt)}</Text>
                    </Box>

                    <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                      <Text role="bodySm" tone="muted">الحالة</Text>
                      <Text role="bodyStrong" style={{ color: colorRoles.success }}>صالح للاستخدام</Text>
                    </Box>
                  </Box>
                ) : (
                  // Latest Activation metadata from DB
                  latest && (
                    <Box style={{ gap: spacing[2] }}>
                      <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                        <Box style={{ flexDirection: "row-reverse", gap: spacing[4], alignItems: "center" }}>
                          <Text role="bodyStrong" tone="muted">كود التفعيل</Text>
                          <Text role="body" tone="muted">******</Text>
                        </Box>
                        <Button
                          label="إصدار كود جديد"
                          tone="primary"
                          loading={actionBusy}
                          disabled={actionBusy}
                          onPress={() => void issueCode().then(onReloadList)}
                        />
                      </Box>

                      <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                        <Text role="bodySm" tone="muted">الهاتف</Text>
                        <Text role="bodyStrong">{latest.maskedPhone}</Text>
                      </Box>

                      <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                        <Text role="bodySm" tone="muted">ينتهي</Text>
                        <Text role="bodyStrong">{formatTime(latest.expiresAt)}</Text>
                      </Box>

                      <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                        <Text role="bodySm" tone="muted">الحالة</Text>
                        <Text
                          role="bodyStrong"
                          style={{
                            color:
                              latest.status === "pending"
                                ? colorRoles.success
                                : latest.status === "consumed"
                                ? colorRoles.info
                                : colorRoles.textSecondary,
                          }}
                        >
                          {latest.status === "pending"
                            ? "صالح للاستخدام"
                            : latest.status === "consumed"
                            ? "مستخدم"
                            : latest.status === "revoked"
                            ? "مبطل"
                            : latest.status === "expired"
                            ? "منتهي الصلاحية"
                            : latest.status}
                        </Text>
                      </Box>
                    </Box>
                  )
                )}

                {/* Revoke action */}
                {((latest && latest.status === "pending") || activeCode) && (
                  <Box style={{ alignItems: "flex-end" }}>
                    <Button
                      label="إبطال الكود"
                      tone="danger"
                      loading={actionBusy}
                      disabled={actionBusy}
                      onPress={() => void revokeCode().then(onReloadList)}
                    />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Action errors */}
        {actionError && (
          <Text role="caption" tone="danger" style={{ textAlign: "right" }}>
            {actionError}
          </Text>
        )}

        {/* Suspend / Reactivate Controls */}
        <Box style={{ gap: spacing[3], marginTop: spacing[2] }}>
          <Text role="bodyStrong" style={{ textAlign: "right" }}>الحالة التشغيلية والارتباط</Text>
          <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
            <Text role="bodySm" tone="muted">حالة الارتباط الحالية</Text>
            <Text role="bodyStrong">{ENGAGEMENT_STATUS_LABEL_AR[detail.engagementStatus]}</Text>
          </Box>

          <TextField
            label="سبب الإيقاف / إعادة التفعيل"
            value={reason}
            onChangeText={setReason}
            placeholder="مطلوب للإيقاف، اختياري لإعادة التفعيل"
          />

          <Box style={{ flexDirection: "row-reverse", gap: spacing[2] }}>
            {detail.engagementStatus !== "suspended" && detail.engagementStatus !== "terminated" && (
              <Button
                label="إيقاف الحساب"
                tone="danger"
                loading={actionBusy}
                disabled={actionBusy || reason.trim().length === 0}
                onPress={() =>
                  void suspend(reason.trim()).then(() => {
                    setReason("");
                    onReloadList();
                  })
                }
              />
            )}
            {detail.engagementStatus === "suspended" && (
              <Button
                label="إعادة تفعيل"
                tone="primary"
                loading={actionBusy}
                disabled={actionBusy}
                onPress={() =>
                  void reactivate(reason.trim()).then(() => {
                    setReason("");
                    onReloadList();
                  })
                }
              />
            )}
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
